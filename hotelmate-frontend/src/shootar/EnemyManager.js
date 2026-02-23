// ShootAR — EnemyManager
// Spawns and manages enemy meshes in the Three.js scene.
// True world-space static anchors: enemies spawn at fixed 360°
// positions around the player and NEVER move. The player must
// physically rotate the device to find them.

import * as THREE from "three";
import CONFIG from "./config.js";

/* ── helpers ─────────────────────────────────────────────── */

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * Compute a world-space anchor in a random 360° direction around the camera.
 * Used only at spawn / respawn — position is permanent after that.
 * @param {THREE.Camera} camera
 * @returns {THREE.Vector3}
 */
function computeAnchor(camera) {
  // Random direction on a full sphere around the player
  const theta  = randomBetween(0, Math.PI * 2);   // horizontal 360°
  const phi    = randomBetween(0, Math.PI);        // vertical 180°
  const radius = randomBetween(CONFIG.ANCHOR_DISTANCE_MIN, CONFIG.ANCHOR_DISTANCE_MAX);

  // Spherical → Cartesian (centred on camera)
  const x = camera.position.x + radius * Math.sin(phi) * Math.cos(theta);
  const y = camera.position.y + radius * Math.cos(phi) + randomBetween(-5, 5);
  const z = camera.position.z + radius * Math.sin(phi) * Math.sin(theta);

  // Floor at 0.5 m so enemies never clip underground
  return new THREE.Vector3(x, Math.max(0.5, y), z);
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
    this.enemies = []; // { id, mesh, alive, pos, anchor, spawnTime }
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

    // Compute fixed world-space anchor (360° around player)
    const anchor = computeAnchor(camera);
    const pos = anchor.clone();

    mesh.position.copy(pos);
    this.parentGroup.add(mesh);

    const enemy = {
      id,
      mesh,
      alive: true,
      pos,            // THREE.Vector3 — authoritative world-space position
      anchor,         // THREE.Vector3 — fixed forever
      spawnTime: Date.now(),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  /* ── per-frame update (static world-anchor system) ─────── */

  /**
   * @param {THREE.Camera} camera – stashed for async respawn only.
   *   Enemies are NOT repositioned relative to the camera.
   */
  update(camera) {
    this._camera = camera; // keep for respawn only

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // --- NO ANCHOR RETARGETING ---
      // Enemy stays at its fixed world-space position forever.

      // Gentle settle toward anchor (only matters right after spawn)
      enemy.pos.lerp(enemy.anchor, 0.02);
      enemy.mesh.position.copy(enemy.pos);

      // --- Visual flair rotation only ---
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

    const anchor = computeAnchor(this._camera); // new random 360° position
    const pos = anchor.clone();
    mesh.position.copy(pos);
    this.parentGroup.add(mesh);

    const entry = {
      id,
      mesh,
      alive: true,
      pos,
      anchor,          // fixed forever
      spawnTime: Date.now(),
    };

    const idx = this.enemies.indexOf(oldEnemy);
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
