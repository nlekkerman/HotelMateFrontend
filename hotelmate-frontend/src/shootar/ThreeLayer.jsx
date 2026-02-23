// ShootAR — ThreeLayer
// Transparent Three.js canvas overlay. Handles scene, camera, lighting,
// enemy updates, shooting, and damage via a single rAF loop.
// Loads GLB enemy models; falls back to primitive meshes while loading.

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import CONFIG from "./config.js";
import EnemyManager from "./EnemyManager.js";

const canvasContainerStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 1,
  pointerEvents: "none",
};

const ThreeLayer = forwardRef(function ThreeLayer({ gameEngine }, ref) {
  const containerRef = useRef(null);
  const internals = useRef(null);

  // Expose shoot() to parent
  useImperativeHandle(ref, () => ({
    shoot: () => {
      const ctx = internals.current;
      if (!ctx || !gameEngine.running) return;
      const { camera, enemyManager } = ctx;

      // Raycast from center of screen (forward)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const hit = enemyManager.hitTest(raycaster);
      if (hit) {
        // Hit existing enemy → destroy + score
        enemyManager.destroyEnemy(hit);
        gameEngine.addScore(CONFIG.SCORE_PER_KILL);
      } else {
        // Miss → spawn new enemy near aim point
        enemyManager.spawnOnShoot(raycaster, camera);
      }
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();

    // --- World root group (enemies live here; counter-rotated to anchor in space) ---
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
      CONFIG.FOV,
      container.clientWidth / container.clientHeight,
      CONFIG.NEAR,
      CONFIG.FAR
    );
    camera.position.set(0, CONFIG.PLAYER_EYE_HEIGHT ?? 1.65, 0);

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // --- Enemies (added to worldRoot, not scene directly) ---
    const enemyManager = new EnemyManager(worldRoot);
    // No initial spawn — enemies appear when the player shoots and misses

    // --- Load GLB enemy models (async) ---
    const gltfLoader = new GLTFLoader();
    const modelPromises = CONFIG.GLB_MODELS.map(
      (url) =>
        new Promise((resolve) => {
          gltfLoader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => {
              console.warn(`[ShootAR] Failed to load ${url}:`, err);
              resolve(null); // don't reject — just skip this model
            }
          );
        })
    );

    Promise.all(modelPromises).then((results) => {
      const templates = results.filter(Boolean);
      if (templates.length > 0) {
        enemyManager.setModelTemplates(templates);
      }
    });

    // --- Device orientation for camera rotation ---
    let deviceQuaternion = new THREE.Quaternion();
    let orientationAvailable = false;

    function handleOrientation(event) {
      if (event.alpha === null) return;
      orientationAvailable = true;

      const alpha = THREE.MathUtils.degToRad(event.alpha);
      const beta = THREE.MathUtils.degToRad(event.beta);
      const gamma = THREE.MathUtils.degToRad(event.gamma);

      // ZXY Euler order matches device orientation convention
      const euler = new THREE.Euler(beta, alpha, -gamma, "YXZ");
      deviceQuaternion.setFromEuler(euler);

      // Apply screen orientation offset (portrait)
      const screenOrient = window.screen.orientation
        ? THREE.MathUtils.degToRad(window.screen.orientation.angle || 0)
        : 0;
      const screenQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        -screenOrient
      );
      deviceQuaternion.multiply(screenQ);

      // Remap from device coords to Three.js (camera looks down -Z initially,
      // device sensors assume phone screen facing user)
      const fixQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -Math.PI / 2
      );
      deviceQuaternion.premultiply(fixQ);
    }

    window.addEventListener("deviceorientation", handleOrientation, true);

    // --- Touch drag fallback for desktop / no gyroscope ---
    let dragYaw = 0;
    let dragPitch = 0;
    let pointerDown = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    function onPointerDown(e) {
      pointerDown = true;
      lastPointerX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      lastPointerY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    }
    function onPointerMove(e) {
      if (!pointerDown || orientationAvailable) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      dragYaw -= (x - lastPointerX) * 0.004;
      dragPitch -= (y - lastPointerY) * 0.004;
      dragPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragPitch));
      lastPointerX = x;
      lastPointerY = y;
    }
    function onPointerUp() {
      pointerDown = false;
    }

    container.style.pointerEvents = "auto";
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("touchstart", onPointerDown, { passive: true });
    container.addEventListener("touchmove", onPointerMove, { passive: true });
    container.addEventListener("touchend", onPointerUp);

    // --- Resize handler ---
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    // Store internals
    internals.current = { scene, camera, renderer, enemyManager, worldRoot };

    // --- Animation loop ---
    let frameId = 0;
    let frameCount = 0;

    function animate() {
      frameId = requestAnimationFrame(animate);
      frameCount++;

      // Camera orientation
      if (orientationAvailable) {
        camera.quaternion.copy(deviceQuaternion);
      } else {
        camera.rotation.set(dragPitch, dragYaw, 0, "YXZ");
      }

      // No worldRoot rotation needed — enemies are already in world-space
      // coordinates. Turning the camera naturally reveals/hides them.

      // Game logic
      if (gameEngine.running) {
        enemyManager.update(camera);

        // Damage check (camera-distance based, with spawn grace)
        const closeIds = enemyManager.getCloseEnemies(camera);
        for (const id of closeIds) {
          gameEngine.takeDamage(id);
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("touchstart", onPointerDown);
      container.removeEventListener("touchmove", onPointerMove);
      container.removeEventListener("touchend", onPointerUp);
      enemyManager.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      internals.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={canvasContainerStyle} />;
});

export default ThreeLayer;
