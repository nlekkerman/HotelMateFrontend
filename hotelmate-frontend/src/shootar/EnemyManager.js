// ShootAR — EnemyManager
// Spawns, moves, and manages enemy meshes in the Three.js scene.
// Movement: enemies hold position, then do a sudden lateral "step" every STEP_INTERVAL ms.

import * as THREE from "three";
import CONFIG from "./config.js";

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function createEnemyMesh(color) {
  const geometry = new THREE.SphereGeometry(1.2, 16, 16);
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

export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = []; // { id, mesh, alive, bearing, radius, height, nextStepAt, color }
    this._idCounter = 0;
  }

  spawnAll() {
    this.clear();
    for (let i = 0; i < CONFIG.ENEMY_COUNT; i++) {
      this._spawnOne();
    }
  }

  _spawnOne() {
    const color =
      CONFIG.ENEMY_COLORS[Math.floor(Math.random() * CONFIG.ENEMY_COLORS.length)];
    const mesh = createEnemyMesh(color);

    const bearing = Math.random() * Math.PI * 2;
    const radius = randomBetween(CONFIG.SPAWN_RADIUS_MIN, CONFIG.SPAWN_RADIUS_MAX);
    const height = randomBetween(CONFIG.SPAWN_HEIGHT_MIN, CONFIG.SPAWN_HEIGHT_MAX);

    mesh.position.copy(positionFromPolar(bearing, radius, height));
    this.scene.add(mesh);

    const id = this._idCounter++;
    this.enemies.push({
      id,
      mesh,
      alive: true,
      bearing,
      radius,
      height,
      nextStepAt: Date.now() + CONFIG.STEP_INTERVAL,
      color,
    });
  }

  update() {
    const now = Date.now();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Approach player: shrink radius each frame
      enemy.radius -= CONFIG.APPROACH_SPEED;

      // Sudden lateral step
      if (now >= enemy.nextStepAt) {
        enemy.bearing += randomBetween(
          -CONFIG.STEP_BEARING_DELTA,
          CONFIG.STEP_BEARING_DELTA
        );
        enemy.height = clamp(
          enemy.height +
            randomBetween(-CONFIG.STEP_HEIGHT_DELTA, CONFIG.STEP_HEIGHT_DELTA),
          CONFIG.SPAWN_HEIGHT_MIN,
          CONFIG.SPAWN_HEIGHT_MAX
        );
        enemy.nextStepAt = now + CONFIG.STEP_INTERVAL;
      }

      // Recompute world position from polar coords
      enemy.mesh.position.copy(
        positionFromPolar(enemy.bearing, enemy.radius, enemy.height)
      );

      // Rotate for visual flair
      enemy.mesh.rotation.y += 0.01;
      enemy.mesh.rotation.x += 0.005;
    }
  }

  // Returns enemy ids that are too close
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

  // Raycast hit test — returns first hit enemy or null
  hitTest(raycaster) {
    const aliveMeshes = this.enemies
      .filter((e) => e.alive)
      .map((e) => e.mesh);
    const intersects = raycaster.intersectObjects(aliveMeshes, false);
    if (intersects.length > 0 && intersects[0].distance < CONFIG.HIT_DISTANCE) {
      const hitMesh = intersects[0].object;
      const enemy = this.enemies.find((e) => e.mesh === hitMesh);
      return enemy || null;
    }
    return null;
  }

  destroyEnemy(enemy) {
    enemy.alive = false;
    this.scene.remove(enemy.mesh);
    enemy.mesh.geometry.dispose();
    enemy.mesh.material.dispose();

    // Respawn after delay
    setTimeout(() => {
      this._respawn(enemy);
    }, CONFIG.RESPAWN_DELAY);
  }

  _respawn(enemy) {
    const color =
      CONFIG.ENEMY_COLORS[Math.floor(Math.random() * CONFIG.ENEMY_COLORS.length)];
    const mesh = createEnemyMesh(color);

    const bearing = Math.random() * Math.PI * 2;
    const radius = randomBetween(CONFIG.SPAWN_RADIUS_MIN, CONFIG.SPAWN_RADIUS_MAX);
    const height = randomBetween(CONFIG.SPAWN_HEIGHT_MIN, CONFIG.SPAWN_HEIGHT_MAX);

    mesh.position.copy(positionFromPolar(bearing, radius, height));
    this.scene.add(mesh);

    enemy.mesh = mesh;
    enemy.alive = true;
    enemy.color = color;
    enemy.bearing = bearing;
    enemy.radius = radius;
    enemy.height = height;
    enemy.nextStepAt = Date.now() + CONFIG.STEP_INTERVAL;
  }

  clear() {
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        this.scene.remove(enemy.mesh);
        enemy.mesh.geometry.dispose();
        enemy.mesh.material.dispose();
      }
    }
    this.enemies = [];
  }
}
