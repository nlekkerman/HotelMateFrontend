import * as THREE from "three";
import { CONFIG } from "./config.js";

// Enemy shapes to cycle through
const SHAPES = ["sphere", "box", "cone"];
const COLORS = [0xff2222, 0xff8800, 0xcc00ff];

function randomBearing() {
  return Math.random() * Math.PI * 2;
}

function createEnemyMesh(shape) {
  let geometry;
  if (shape === "sphere") {
    geometry = new THREE.SphereGeometry(0.5, 16, 16);
  } else if (shape === "box") {
    geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  } else {
    geometry = new THREE.ConeGeometry(0.5, 1, 16);
  }
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const material = new THREE.MeshStandardMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export function createEnemy(index) {
  const bearing = randomBearing();
  const elevation = (Math.random() - 0.5) * 0.6; // slight vertical spread
  const distance = CONFIG.ENEMY_SPAWN_RADIUS * (0.7 + Math.random() * 0.3);
  const shape = SHAPES[index % SHAPES.length];
  const mesh = createEnemyMesh(shape);

  const x = Math.sin(bearing) * distance;
  const y = elevation * distance;
  const z = -Math.cos(bearing) * distance;

  mesh.position.set(x, y, z);

  return {
    id: index,
    mesh,
    bearing,
    elevation,
    distance,
    driftOffset: Math.random() * Math.PI * 2,
    alive: true,
  };
}

export function updateEnemies(enemies, clock) {
  const t = clock;
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;

    // Slowly approach player
    enemy.distance -= CONFIG.ENEMY_APPROACH_SPEED;

    // Hover and lateral drift
    const drift =
      Math.sin(t * CONFIG.ENEMY_DRIFT_SPEED + enemy.driftOffset) *
      CONFIG.ENEMY_DRIFT_AMPLITUDE *
      enemy.distance;

    const lateralBearing = enemy.bearing + Math.PI / 2;
    const x =
      Math.sin(enemy.bearing) * enemy.distance +
      Math.sin(lateralBearing) * drift;
    const y =
      enemy.elevation * enemy.distance +
      Math.cos(t * CONFIG.ENEMY_DRIFT_SPEED * 0.7 + enemy.driftOffset) * 0.3;
    const z = -Math.cos(enemy.bearing) * enemy.distance;

    enemy.mesh.position.set(x, y, z);
    enemy.mesh.rotation.y += 0.01;
    enemy.mesh.rotation.x += 0.005;
  });
}

export function respawnEnemy(enemy) {
  const bearing = randomBearing();
  const elevation = (Math.random() - 0.5) * 0.6;
  enemy.bearing = bearing;
  enemy.elevation = elevation;
  enemy.distance = CONFIG.ENEMY_SPAWN_RADIUS;
  enemy.driftOffset = Math.random() * Math.PI * 2;
  enemy.alive = true;
  enemy.mesh.visible = true;
}
