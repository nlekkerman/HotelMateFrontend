// ShootAR — EnemyManager
// Spawns, moves, and manages enemy meshes in the Three.js scene.

import * as THREE from "three";
import CONFIG from "./config.js";

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
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

function randomSpawnPosition() {
  const angle = Math.random() * Math.PI * 2;
  const radius = randomBetween(CONFIG.SPAWN_RADIUS_MIN, CONFIG.SPAWN_RADIUS_MAX);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = randomBetween(CONFIG.SPAWN_HEIGHT_MIN, CONFIG.SPAWN_HEIGHT_MAX);
  return new THREE.Vector3(x, y, z);
}

export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = []; // { id, mesh, alive, driftOffset }
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
    const pos = randomSpawnPosition();
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const id = this._idCounter++;
    this.enemies.push({
      id,
      mesh,
      alive: true,
      driftOffset: Math.random() * 1000,
      color,
    });
  }

  update(frameCount) {
    const origin = new THREE.Vector3(0, 0, 0);

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Approach player (origin)
      const dir = origin.clone().sub(enemy.mesh.position).normalize();
      enemy.mesh.position.add(dir.multiplyScalar(CONFIG.APPROACH_SPEED));

      // Drift (hover)
      const t = frameCount * CONFIG.DRIFT_SPEED + enemy.driftOffset;
      enemy.mesh.position.x += Math.sin(t) * CONFIG.DRIFT_AMPLITUDE;
      enemy.mesh.position.y += Math.cos(t * 1.3) * CONFIG.DRIFT_AMPLITUDE * 0.5;

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
      if (enemy.mesh.position.length() < CONFIG.ENEMY_DAMAGE_DISTANCE) {
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
    const pos = randomSpawnPosition();
    mesh.position.copy(pos);
    this.scene.add(mesh);

    enemy.mesh = mesh;
    enemy.alive = true;
    enemy.color = color;
    enemy.driftOffset = Math.random() * 1000;
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
