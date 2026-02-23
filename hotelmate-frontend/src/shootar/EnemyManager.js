// ShootAR — EnemyManager
// Spawns and manages enemy meshes in the Three.js scene.
// Spawn-on-shoot system: enemies appear near where the player fires,
// then home directly toward the player at a constant speed.
// Miss = spawn, Hit = destroy + score.

import * as THREE from "three";
import CONFIG from "./config.js";

/* ── helpers ─────────────────────────────────────────────── */

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
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
    this.enemies = []; // { id, mesh, alive, pos, anchor, spawnTime, speed }
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
   * Spawn enemy near the player's aim ray with a slight offset.
   * Called when a shot misses all existing enemies.
   * @param {THREE.Raycaster} raycaster – player's aim ray
   * @param {THREE.Camera} camera – for distance reference
   * @returns {Object|null} the spawned enemy record, or null
   */
  spawnOnShoot(raycaster, camera) {
    if (!this.canSpawn()) return null;

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    // Point along aim ray at spawn distance
    const spawnDist = randomBetween(CONFIG.SPAWN_DISTANCE_MIN, CONFIG.SPAWN_DISTANCE_MAX);
    const aimPoint = new THREE.Vector3()
      .copy(raycaster.ray.origin)
      .addScaledVector(raycaster.ray.direction, spawnDist);

    // Slight offset so enemy doesn't appear exactly on crosshair
    const off = CONFIG.SPAWN_OFFSET;
    const offset = new THREE.Vector3(
      randomBetween(-off, off),
      randomBetween(-off / 2, off / 2),
      randomBetween(-off, off)
    );
    const spawnPos = aimPoint.add(offset);

    // Absolute world-Y limits
    spawnPos.y = Math.max(0.5, Math.min(8, spawnPos.y));

    const anchor = spawnPos.clone();
    const pos = spawnPos.clone();

    mesh.position.copy(pos);
    mesh.lookAt(camera.position); // face the player immediately
    this.parentGroup.add(mesh);

    const enemy = {
      id,
      mesh,
      alive: true,
      pos,             // THREE.Vector3 — authoritative world-space position
      anchor,          // kept in sync with pos
      spawnTime: Date.now(),
      speed: randomBetween(CONFIG.ENEMY_SPEED_MIN, CONFIG.ENEMY_SPEED_MAX),
    };
    this.enemies.push(enemy);
    return enemy;
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

  /* ── per-frame update (homing movement) ────────────────── */

  /**
   * @param {THREE.Camera} camera – target for homing movement
   * @param {number} [deltaTime] – frame delta in seconds (defaults to ~60 fps)
   */
  update(camera, deltaTime) {
    this._camera = camera;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // --- DIRECT HOMING TOWARD PLAYER ---
      const toPlayer = new THREE.Vector3().subVectors(camera.position, enemy.pos);
      const distToPlayer = toPlayer.length();

      if (distToPlayer < CONFIG.MIN_PLAYER_DISTANCE) {
        // Close enough — hover / orbit at minimum distance
        enemy.mesh.lookAt(camera.position);
        continue;
      }

      // Move toward player at constant speed
      toPlayer.normalize();
      const moveDist = enemy.speed * (deltaTime || 0.016);

      enemy.pos.addScaledVector(toPlayer, moveDist);
      enemy.anchor.copy(enemy.pos); // keep anchor synced

      enemy.mesh.position.copy(enemy.pos);
      enemy.mesh.lookAt(camera.position); // always face player

      // --- Visual flair ---
      enemy.mesh.rotation.z += 0.02; // slight roll while approaching
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
   * Recycle a destroyed enemy slot with a fresh spawn near the player's
   * forward direction. Uses stashed camera reference.
   */
  _respawnSlot(oldEnemy) {
    if (!this.canSpawn()) return;
    if (!this._camera) return;

    // Build a raycaster pointing from camera center (forward)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this._camera);

    // Offset the direction randomly so respawns aren't dead-centre
    const jitter = new THREE.Vector3(
      randomBetween(-0.3, 0.3),
      randomBetween(-0.15, 0.15),
      randomBetween(-0.3, 0.3)
    );
    raycaster.ray.direction.add(jitter).normalize();

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    const spawnDist = randomBetween(CONFIG.SPAWN_DISTANCE_MIN, CONFIG.SPAWN_DISTANCE_MAX);
    const spawnPos = new THREE.Vector3()
      .copy(raycaster.ray.origin)
      .addScaledVector(raycaster.ray.direction, spawnDist);
    spawnPos.y = Math.max(0.5, Math.min(8, spawnPos.y));

    const anchor = spawnPos.clone();
    const pos = spawnPos.clone();
    mesh.position.copy(pos);
    mesh.lookAt(this._camera.position);
    this.parentGroup.add(mesh);

    const entry = {
      id,
      mesh,
      alive: true,
      pos,
      anchor,
      spawnTime: Date.now(),
      speed: randomBetween(CONFIG.ENEMY_SPEED_MIN, CONFIG.ENEMY_SPEED_MAX),
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
