import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createEnemy, updateEnemies, respawnEnemy } from "./EnemyManager.js";

export function createGameEngine({ canvas, onScoreChange, onHealthChange, onGameOver }) {
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0); // transparent

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(5, 10, 7);
  scene.add(directional);

  // Game state
  let score = 0;
  let health = CONFIG.MAX_HEALTH;
  let gameOver = false;
  let lastDamageTime = 0;
  let clock = 0;
  let lastTime = null;
  let rafId = null;

  // Enemies
  const enemies = [];
  for (let i = 0; i < CONFIG.ENEMY_COUNT; i++) {
    const enemy = createEnemy(i);
    enemies.push(enemy);
    scene.add(enemy.mesh);
  }

  // Raycaster for shooting
  const raycaster = new THREE.Raycaster();
  const shootDirection = new THREE.Vector3(0, 0, -1);

  function shoot() {
    if (gameOver) return;
    raycaster.set(camera.position, shootDirection);
    const meshes = enemies.filter((e) => e.alive).map((e) => e.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const enemy = enemies.find((e) => e.mesh === hitMesh);
      if (enemy && enemy.alive) {
        enemy.alive = false;
        enemy.mesh.visible = false;
        score += 1;
        onScoreChange(score);
        // Respawn after 2 seconds
        setTimeout(() => respawnEnemy(enemy), 2000);
      }
    }
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function loop(timestamp) {
    rafId = requestAnimationFrame(loop);
    if (gameOver) return;

    const dt = lastTime === null ? 0.016 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    clock += dt;
    updateEnemies(enemies, clock);

    // Check if any enemy reached min distance
    const now = Date.now();
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      if (
        enemy.distance <= CONFIG.ENEMY_MIN_DISTANCE &&
        now - lastDamageTime > CONFIG.DAMAGE_COOLDOWN
      ) {
        health = Math.max(0, health - 1);
        lastDamageTime = now;
        onHealthChange(health);
        respawnEnemy(enemy);
        if (health <= 0) {
          gameOver = true;
          onGameOver();
        }
      }
    });

    renderer.render(scene, camera);
  }

  function restart() {
    score = 0;
    health = CONFIG.MAX_HEALTH;
    gameOver = false;
    lastDamageTime = 0;
    clock = 0;
    lastTime = null;
    enemies.forEach((enemy) => respawnEnemy(enemy));
    onScoreChange(score);
    onHealthChange(health);
  }

  function dispose() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", handleResize);
    enemies.forEach((enemy) => {
      enemy.mesh.geometry.dispose();
      enemy.mesh.material.dispose();
      scene.remove(enemy.mesh);
    });
    renderer.dispose();
  }

  window.addEventListener("resize", handleResize);
  loop(performance.now());

  return { shoot, restart, dispose };}
