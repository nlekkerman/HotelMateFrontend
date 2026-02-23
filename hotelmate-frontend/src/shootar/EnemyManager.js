// ShootAR — EnemyManager
// Spawns, moves, and manages enemy meshes in the Three.js scene.
// Movement: enemies approach slowly, then do a sudden lateral "step" every STEP_INTERVAL ms.
// Supports GLB model templates (cloned) with primitive-mesh fallback.

import * as THREE from "three";
import CONFIG from "./config.js";

/* ── helpers ─────────────────────────────────────────────── */

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
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

function positionFromPolar(bearing, radius, height) {
  return new THREE.Vector3(
    Math.cos(bearing) * radius,
    height,
    Math.sin(bearing) * radius
  );
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
  constructor(scene) {
    this.scene = scene;
    this.enemies = []; // { id, mesh, alive, bearing, radius, height, nextStepAt }
    this._idCounter = 0;
    this._modelTemplates = []; // Object3D roots loaded from GLBs
    this._lastTime = performance.now() / 1000;
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

  /** Initial spawn up to MAX_ENEMIES_ACTIVE. */
  spawnAll() {
    this.clear();
    for (let i = 0; i < CONFIG.MAX_ENEMIES_ACTIVE; i++) {
      this._spawnOne();
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

  _spawnOne() {
    if (!this.canSpawn()) return null;

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    const bearing = Math.random() * Math.PI * 2;
    const radius = Math.max(
      randomBetween(CONFIG.SPAWN_RADIUS_MIN, CONFIG.SPAWN_RADIUS_MAX),
      CONFIG.SPAWN_MIN_DISTANCE
    );
    const height = randomBetween(CONFIG.ENEMY_HEIGHT_MIN, CONFIG.ENEMY_HEIGHT_MAX);

    mesh.position.copy(positionFromPolar(bearing, radius, height));
    this.scene.add(mesh);

    const enemy = {
      id,
      mesh,
      alive: true,
      bearing,
      radius,
      height,
      nextStepAt: Date.now() + CONFIG.STEP_INTERVAL,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  /* ── per-frame update (delta-time based) ───────────────── */

  update() {
    const now = performance.now() / 1000;
    const dt = Math.min(now - this._lastTime, 0.1); // clamp large jumps
    this._lastTime = now;

    const nowMs = Date.now();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Approach player — shrink radius at APPROACH_SPEED m/s
      enemy.radius = Math.max(0, enemy.radius - CONFIG.APPROACH_SPEED * dt);

      // Sudden lateral step
      if (nowMs >= enemy.nextStepAt) {
        enemy.bearing += randomBetween(
          -CONFIG.STEP_BEARING_DELTA,
          CONFIG.STEP_BEARING_DELTA
        );
        enemy.height = clamp(
          enemy.height +
            randomBetween(-CONFIG.STEP_HEIGHT_DELTA, CONFIG.STEP_HEIGHT_DELTA),
          CONFIG.ENEMY_HEIGHT_MIN,
          CONFIG.ENEMY_HEIGHT_MAX
        );
        enemy.nextStepAt = nowMs + CONFIG.STEP_INTERVAL;
      }

      // Always clamp height
      enemy.height = clamp(
        enemy.height,
        CONFIG.ENEMY_HEIGHT_MIN,
        CONFIG.ENEMY_HEIGHT_MAX
      );

      // Recompute world position from polar coords
      enemy.mesh.position.copy(
        positionFromPolar(enemy.bearing, enemy.radius, enemy.height)
      );

      // Rotate for visual flair
      enemy.mesh.rotation.y += 0.01;
      enemy.mesh.rotation.x += 0.005;
    }
  }

  /* ── queries ───────────────────────────────────────────── */

  /** Returns ids of enemies closer than ENEMY_DAMAGE_DISTANCE. */
  getCloseEnemies() {
    const close = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.radius < CONFIG.ENEMY_DAMAGE_DISTANCE) {
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
    this.scene.remove(enemy.mesh);
    disposeMesh(enemy.mesh);

    // Respawn after delay, still obeying MAX_ENEMIES_ACTIVE
    setTimeout(() => {
      this._respawnSlot(enemy);
    }, CONFIG.RESPAWN_DELAY);
  }

  _respawnSlot(oldEnemy) {
    if (!this.canSpawn()) return;

    const id = this._idCounter++;
    const mesh = this._createMesh(id);

    const bearing = Math.random() * Math.PI * 2;
    const radius = Math.max(
      randomBetween(CONFIG.SPAWN_RADIUS_MIN, CONFIG.SPAWN_RADIUS_MAX),
      CONFIG.SPAWN_MIN_DISTANCE
    );
    const height = randomBetween(CONFIG.ENEMY_HEIGHT_MIN, CONFIG.ENEMY_HEIGHT_MAX);

    mesh.position.copy(positionFromPolar(bearing, radius, height));
    this.scene.add(mesh);

    // Reuse array slot
    const idx = this.enemies.indexOf(oldEnemy);
    const entry = {
      id,
      mesh,
      alive: true,
      bearing,
      radius,
      height,
      nextStepAt: Date.now() + CONFIG.STEP_INTERVAL,
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
        this.scene.remove(enemy.mesh);
        disposeMesh(enemy.mesh);
      }
    }
    this.enemies = [];
  }
}
