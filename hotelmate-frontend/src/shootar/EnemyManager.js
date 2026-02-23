// ShootAR — EnemyManager
// Spawns and manages enemy meshes in the Three.js scene.
// Spawn-on-shoot system: enemies appear near where the player fires,
// then home directly toward the player at a constant speed.
// Miss = spawn, Hit = destroy + score.

import * as THREE from "three";
import CONFIG from "./config.js";
import { debugLog, debugWarn } from "./DebugConsole.jsx";

/* ── helpers ─────────────────────────────────────────────── */

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function createFallbackMesh(color) {
  // Realistic drone-sized sphere
  const geometry = new THREE.SphereGeometry(CONFIG.ENEMY_HEIGHT / 2, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.8,
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.5,
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
    debugLog("SPAWN ATTEMPT", this.activeCount, "of", CONFIG.MAX_ENEMIES_ACTIVE);

    if (!this.canSpawn()) {
      debugLog("CANNOT SPAWN - MAX REACHED");
      return null;
    }

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    // Forward direction from camera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Distance in front of camera
    const distance = randomBetween(CONFIG.SPAWN_DISTANCE_MIN, CONFIG.SPAWN_DISTANCE_MAX);

    // Lateral offset (left/right of aim)
    const lateral = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(randomBetween(-3, 3));

    // Position = camera + forward * distance + lateral
    const spawnPos = new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .add(lateral);

    // HEIGHT: eye level range (-0.5 to +1.5 from eye), never below floor + 1m
    const eyeY = camera.position.y;
    const floorY = Math.max(0, eyeY - CONFIG.PLAYER_EYE_HEIGHT);
    spawnPos.y = randomBetween(eyeY - 0.5, eyeY + 1.5);
    spawnPos.y = Math.max(floorY + 1.0, spawnPos.y); // at least 1m above floor

    debugLog("SPAWN POS:", spawnPos.x.toFixed(2), spawnPos.y.toFixed(2), spawnPos.z.toFixed(2),
             "cam:", camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2));

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

    const floorY = Math.max(0, camera.position.y - CONFIG.PLAYER_EYE_HEIGHT);
    const ceilingY = floorY + CONFIG.ROOM_HEIGHT;

    // Periodic debug log
    if (Date.now() % 1000 < 50) {
      debugLog("Enemies:", this.activeCount, "positions:",
        this.enemies.filter(e => e.alive).map(e => ({
          x: e.pos.x.toFixed(1), y: e.pos.y.toFixed(1), z: e.pos.z.toFixed(1)
        }))
      );
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // --- DIRECT HOMING TOWARD PLAYER ---
      const toPlayer = new THREE.Vector3().subVectors(camera.position, enemy.pos);
      const distToPlayer = toPlayer.length();

      if (distToPlayer < CONFIG.MIN_PLAYER_DISTANCE) {
        // Close enough — hover in place, don't get closer
        this._hoverInPlace(enemy, floorY, ceilingY);
        enemy.mesh.lookAt(camera.position);
        continue;
      }

      // Move toward player at constant speed
      toPlayer.normalize();
      const moveDist = enemy.speed * (deltaTime || 0.016);

      enemy.pos.addScaledVector(toPlayer, moveDist);
      enemy.anchor.copy(enemy.pos); // keep anchor synced

      // HARD FLOOR COLLISION — never clip through floor
      if (enemy.pos.y < floorY + CONFIG.ENEMY_HEIGHT / 2) {
        enemy.pos.y = floorY + CONFIG.ENEMY_HEIGHT / 2;
      }

      // CEILING COLLISION
      if (enemy.pos.y > ceilingY - CONFIG.ENEMY_HEIGHT / 2) {
        enemy.pos.y = ceilingY - CONFIG.ENEMY_HEIGHT / 2;
      }

      // Keep enemies from clipping through floor/ceiling (world Y is always valid)
      // No X/Z world-space clamping — spawn positions are camera-relative
      // and the camera can face any direction via gyroscope

      enemy.mesh.position.copy(enemy.pos);
      enemy.mesh.lookAt(camera.position); // always face player

      // --- Visual flair ---
      enemy.mesh.rotation.z += 0.02; // slight roll while approaching
    }
  }

  /**
   * Gentle bobbing hover when enemy is close enough to the player.
   * Keeps enemy within floor/ceiling bounds.
   */
  _hoverInPlace(enemy, floorY, ceilingY) {
    const time = Date.now() * 0.001;
    const hoverY = Math.sin(time) * 0.1;
    enemy.pos.y += hoverY * 0.01;

    // Keep in bounds while hovering
    enemy.pos.y = Math.max(floorY + 1, Math.min(ceilingY - 1, enemy.pos.y));
    enemy.mesh.position.copy(enemy.pos);
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

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    // Forward direction + lateral offset (same logic as spawnOnShoot)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
    const spawnDist = randomBetween(CONFIG.SPAWN_DISTANCE_MIN, CONFIG.SPAWN_DISTANCE_MAX);
    const lateral = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(this._camera.quaternion)
      .multiplyScalar(randomBetween(-3, 3));

    const spawnPos = new THREE.Vector3()
      .copy(this._camera.position)
      .addScaledVector(forward, spawnDist)
      .add(lateral);

    // Eye-level height, never below floor + 1m
    const eyeY = this._camera.position.y;
    const floorY = Math.max(0, eyeY - CONFIG.PLAYER_EYE_HEIGHT);
    spawnPos.y = randomBetween(eyeY - 0.5, eyeY + 1.5);
    spawnPos.y = Math.max(floorY + 1.0, spawnPos.y);

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
