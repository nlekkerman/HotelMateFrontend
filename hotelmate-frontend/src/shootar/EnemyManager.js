// ShootAR — EnemyManager
// Spawns, moves, and manages enemy meshes in the Three.js scene.
// World-Anchor system: enemies hold persistent world-space positions
// and glide toward periodically-retargeted anchors.
// Camera rotation alone reveals/hides enemies — no per-frame
// camera-relative repositioning.

import * as THREE from "three";
import CONFIG from "./config.js";

/* ── helpers ─────────────────────────────────────────────── */

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * Compute a world-space anchor point in front of the given camera.
 * Use only for initial spawn / respawn, NOT for periodic retargeting.
 * @param {THREE.Camera} camera
 * @returns {THREE.Vector3}
 */
function computeAnchor(camera) {
  // Camera forward direction (world-space)
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

  const distance = randomBetween(CONFIG.ANCHOR_DISTANCE_MIN, CONFIG.ANCHOR_DISTANCE_MAX);
  const lateral  = randomBetween(-CONFIG.ANCHOR_HORIZONTAL_SPREAD, CONFIG.ANCHOR_HORIZONTAL_SPREAD);
  const height   = randomBetween(CONFIG.ANCHOR_HEIGHT_MIN, CONFIG.ANCHOR_HEIGHT_MAX);

  const anchor = new THREE.Vector3()
    .copy(camera.position)
    .addScaledVector(forward, distance)
    .addScaledVector(right, lateral);

  anchor.y = camera.position.y + height;
  return anchor;
}

/**
 * Smoothly move an enemy toward its anchor.
 * @param {Object} enemy  – enemy record with .pos and .mesh
 * @param {number} deltaTime – frame delta in seconds (unused for lerp-style, but available)
 */
function updateEnemyMovement(enemy) {
  const lerpFactor = randomBetween(CONFIG.ANCHOR_LERP_MIN, CONFIG.ANCHOR_LERP_MAX);
  enemy.pos.lerp(enemy.anchor, lerpFactor);
  enemy.mesh.position.copy(enemy.pos);
}

function createFallbackMesh(color) {
  const geometry = new THREE.SphereGeometry(0.4, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
    roughness: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

function disposeMesh(root) {
  if (!root) return;
  root.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}

/* ── EnemyManager ────────────────────────────────────────── */

export default class EnemyManager {
  /**
   * @param {THREE.Group} parentGroup – the world-root group to add meshes to
   */
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.enemies = []; // { id, mesh, alive, pos, anchor, spawnTime, lastAnchorUpdate, anchorInterval, lerpFactor }
    this._idCounter = 0;
    this._modelTemplates = []; // Object3D roots loaded from GLBs
  }

  /** Call once GLBs have loaded (may be called with empty array). */
  setModelTemplates(templates) {
    this._modelTemplates = templates;
  }

  /* ── spawning ──────────────────────────────────────────── */

  get activeCount() {
    return this.enemies.filter((e) => e.alive).length;
  }

  canSpawn() {
    return this.activeCount < CONFIG.MAX_ENEMIES_ACTIVE;
  }

  /**
   * Initial spawn up to MAX_ENEMIES_ACTIVE.
   * @param {THREE.Camera} camera – needed to compute initial anchors
   */
  spawnAll(camera) {
    this.clear();
    for (let i = 0; i < CONFIG.MAX_ENEMIES_ACTIVE; i++) {
      this._spawnOne(camera);
    }
  }

  _createMesh(enemyId) {
    let root;

    if (this._modelTemplates.length > 0) {
      const template =
        this._modelTemplates[
          Math.floor(Math.random() * this._modelTemplates.length)
        ];
      root = template.clone();
      const s = CONFIG.ENEMY_MODEL_SCALE;
      root.scale.set(s, s, s);
    } else {
      // Fallback primitive
      const color =
        CONFIG.ENEMY_COLORS[
          Math.floor(Math.random() * CONFIG.ENEMY_COLORS.length)
        ];
      root = createFallbackMesh(color);
    }

    // Tag root + every descendant so raycast can resolve to enemy
    root.userData.enemyId = enemyId;
    root.traverse((child) => {
      child.userData.enemyId = enemyId;
    });

    return root;
  }

  _spawnOne(camera) {
    if (!this.canSpawn()) return null;

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    // Compute world-space anchor in front of camera
    const anchor = computeAnchor(camera);

    // Enemy starts at anchor position
    const pos = anchor.clone();
    mesh.position.copy(pos);
    this.parentGroup.add(mesh);

    const nowMs = Date.now();
    const enemy = {
      id,
      mesh,
      alive: true,
      pos,                  // THREE.Vector3 — authoritative world-space position
      anchor,               // THREE.Vector3 — current glide target
      spawnTime: nowMs,
      lastAnchorUpdate: nowMs,
      anchorInterval: randomBetween(CONFIG.ANCHOR_INTERVAL_MIN, CONFIG.ANCHOR_INTERVAL_MAX),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  /* ── per-frame update (world-anchor system) ────────────── */

  /**
   * @param {THREE.Camera} camera – used only for anchor retargeting, NOT
   *   for repositioning enemies relative to camera orientation.
   */
  update(camera) {
    this._camera = camera; // stash for async respawn
    const nowMs = Date.now();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // --- Anchor retarget (world-space drift, NOT camera-relative) ---
      if (nowMs - enemy.lastAnchorUpdate >= enemy.anchorInterval) {
        const driftRange = 10; // meters
        enemy.anchor.x += randomBetween(-driftRange, driftRange);
        enemy.anchor.y += randomBetween(-driftRange / 2, driftRange / 2);
        enemy.anchor.z += randomBetween(-driftRange, driftRange);

        // Clamp height relative to camera so enemies stay in a visible vertical band
        const minY = camera.position.y + CONFIG.ANCHOR_HEIGHT_MIN;
        const maxY = camera.position.y + CONFIG.ANCHOR_HEIGHT_MAX;
        enemy.anchor.y = Math.max(minY, Math.min(maxY, enemy.anchor.y));

        // If enemy drifted too far from origin, respawn in front of camera
        const maxRange = 60;
        const origin = new THREE.Vector3(0, CONFIG.PLAYER_EYE_HEIGHT, 0);
        if (enemy.anchor.distanceTo(origin) > maxRange) {
          enemy.anchor.copy(computeAnchor(camera));
        }

        enemy.lastAnchorUpdate = nowMs;
        enemy.anchorInterval = randomBetween(
          CONFIG.ANCHOR_INTERVAL_MIN,
          CONFIG.ANCHOR_INTERVAL_MAX
        );
      }

      // --- Smooth glide toward anchor (no direct velocity toward player) ---
      updateEnemyMovement(enemy);

      // --- Visual flair rotation ---
      enemy.mesh.rotation.y += 0.01;
      enemy.mesh.rotation.x += 0.005;
    }
  }

  /* ── queries ───────────────────────────────────────────── */

  /**
   * Returns ids of enemies close enough to deal damage.
   * Respects SPAWN_DAMAGE_GRACE — no instant spawn damage.
   * @param {THREE.Camera} camera
   */
  getCloseEnemies(camera) {
    const close = [];
    const nowMs = Date.now();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      // Grace period — no damage right after spawn
      if (nowMs - enemy.spawnTime < CONFIG.SPAWN_DAMAGE_GRACE) continue;
      // 3D distance from camera position
      const dist = enemy.pos.distanceTo(camera.position);
      if (dist < CONFIG.ENEMY_DAMAGE_DISTANCE) {
        close.push(enemy.id);
      }
    }
    return close;
  }

  /**
   * Raycast hit test — returns first hit enemy or null.
   * Uses recursive intersect (true) so child meshes inside GLB groups are hit,
   * then walks up the parent chain to find the enemy root.
   */
  hitTest(raycaster) {
    const aliveMeshes = this.enemies
      .filter((e) => e.alive)
      .map((e) => e.mesh);

    const intersects = raycaster.intersectObjects(aliveMeshes, true);

    if (intersects.length > 0 && intersects[0].distance < CONFIG.HIT_DISTANCE) {
      let current = intersects[0].object;
      while (current) {
        if (current.userData.enemyId !== undefined) {
          const enemy = this.enemies.find(
            (e) => e.id === current.userData.enemyId && e.alive
          );
          if (enemy) return enemy;
        }
        current = current.parent;
      }
    }
    return null;
  }

  /* ── destroy / respawn ─────────────────────────────────── */

  destroyEnemy(enemy) {
    enemy.alive = false;
    this.parentGroup.remove(enemy.mesh);
    disposeMesh(enemy.mesh);

    // Respawn after delay, still obeying MAX_ENEMIES_ACTIVE
    setTimeout(() => {
      this._respawnSlot(enemy);
    }, CONFIG.RESPAWN_DELAY);
  }

  /**
   * Respawn needs a camera reference to compute the new anchor.
   * We store the camera on the instance during update() so respawn
   * can access it asynchronously.
   */
  _respawnSlot(oldEnemy) {
    if (!this.canSpawn()) return;
    if (!this._camera) return; // safety — need camera for anchor

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    const anchor = computeAnchor(this._camera);
    const pos = anchor.clone();
    mesh.position.copy(pos);
    this.parentGroup.add(mesh);

    const nowMs = Date.now();
    const idx = this.enemies.indexOf(oldEnemy);
    const entry = {
      id,
      mesh,
      alive: true,
      pos,
      anchor,
      spawnTime: nowMs,
      lastAnchorUpdate: nowMs,
      anchorInterval: randomBetween(CONFIG.ANCHOR_INTERVAL_MIN, CONFIG.ANCHOR_INTERVAL_MAX),
    };

    if (idx !== -1) {
      this.enemies[idx] = entry;
    } else {
      this.enemies.push(entry);
    }
  }

  /* ── cleanup ───────────────────────────────────────────── */

  clear() {
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        this.parentGroup.remove(enemy.mesh);
        disposeMesh(enemy.mesh);
      }
    }
    this.enemies = [];
  }
}
