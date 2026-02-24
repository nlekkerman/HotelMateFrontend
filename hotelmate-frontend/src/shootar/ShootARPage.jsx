// ShootAR — Main page component (A-Frame + GLB rewrite)
// Fixed shooting + added rocket projectiles

import React, { useEffect, useRef, useState, useCallback } from "react";
import "aframe";
import * as THREE from "three";

const GLB_MODELS = [
  "/shootar/space_ship_low_poly.glb",
];

/* ------------------------------------------------------------------ */
/*  ROCKET PROJECTILE COMPONENT                                       */
/* ------------------------------------------------------------------ */
if (!AFRAME.components["rocket-projectile"]) {
  AFRAME.registerComponent("rocket-projectile", {
    schema: {
      velocity: { type: "vec3" },
      speed: { type: "number", default: 50 },
    },

    init() {
      this.life = 4.0; // seconds — travels far enough to reach distant enemies
      // Read world direction from element dataset (set by shoot())
      const dx = parseFloat(this.el.dataset.dirX) || 0;
      const dy = parseFloat(this.el.dataset.dirY) || 0;
      const dz = parseFloat(this.el.dataset.dirZ) || -1;
      this._worldDir = new THREE.Vector3(dx, dy, dz).normalize();

      // Red laser bolt
      const bolt = document.createElement("a-cylinder");
      bolt.setAttribute("radius", 0.09);
      bolt.setAttribute("height", 0.6);
      bolt.setAttribute("color", "#ff0000");
      bolt.setAttribute("shader", "");
      bolt.setAttribute("rotation", "90 0 0");
      this.el.appendChild(bolt);

      // Small glow around the bolt
      const glow = document.createElement("a-cylinder");
      glow.setAttribute("radius", 0.06);
      glow.setAttribute("height", 0.6);
      glow.setAttribute("color", "#ff3333");
      glow.setAttribute("shader", "flat");
      glow.setAttribute("opacity", 0.3);
      glow.setAttribute("rotation", "90 0 0");
      this.el.appendChild(glow);
    },

    tick(time, timeDelta) {
      if (!this.el.parentNode || !this.el.object3D) return;
      const dt = timeDelta / 1000;
      this.life -= dt;
      
      if (this.life <= 0) {
        if (this.el.parentNode) this.el.remove();
        return;
      }

      // Move forward using stored world direction
      const pos = this.el.object3D.position;
      const moveVec = this._worldDir.clone().multiplyScalar(this.data.speed * dt);
      const prevPos = pos.clone();
      pos.add(moveVec);
      
      // Check collisions with enemies (swept check along travel path)
      const enemies = document.querySelectorAll("[enemy-brain]");
      const HIT_RADIUS = 15.0;
      
      for (const enemy of enemies) {
        const brain = enemy.components["enemy-brain"];
        if (!brain || brain.isDead) continue;
        const enemyPos = enemy.object3D.position;
        
        const dist = pos.distanceTo(enemyPos);
        const q1 = prevPos.clone().lerp(pos, 0.25);
        const q2 = prevPos.clone().lerp(pos, 0.5);
        const q3 = prevPos.clone().lerp(pos, 0.75);
        
        if (dist < HIT_RADIUS || q1.distanceTo(enemyPos) < HIT_RADIUS || q2.distanceTo(enemyPos) < HIT_RADIUS || q3.distanceTo(enemyPos) < HIT_RADIUS) {
          // Remove rocket
          if (this.el.parentNode) this.el.remove();
          // Kill enemy
          brain.die();
          return;
        }
      }

      // Check collisions with health packs
      const packs = document.querySelectorAll("[health-pack]");
      const PACK_HIT_RADIUS = 10.0;
      for (const pack of packs) {
        const hp = pack.components["health-pack"];
        if (!hp || hp.isDead) continue;
        const packPos = pack.object3D.position;
        if (pos.distanceTo(packPos) < PACK_HIT_RADIUS || q2.distanceTo(packPos) < PACK_HIT_RADIUS) {
          if (this.el.parentNode) this.el.remove();
          hp.die();
          return;
        }
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/*  HEALTH PACK COMPONENT — red cross, gives +10 HP when shot         */
/* ------------------------------------------------------------------ */
if (!AFRAME.components["health-pack"]) {
  AFRAME.registerComponent("health-pack", {
    schema: {
      id: { type: "string" },
    },

    init() {
      this.isDead = false;
      this.hoverOffset = Math.random() * Math.PI * 2;
      this.initialY = this.el.getAttribute("position").y;

      // Build a red cross shape
      const cross = document.createElement("a-entity");

      // Vertical bar
      const vBar = document.createElement("a-box");
      vBar.setAttribute("width", 0.4);
      vBar.setAttribute("height", 1.6);
      vBar.setAttribute("depth", 0.2);
      vBar.setAttribute("color", "#ff0000");
      vBar.setAttribute("shader", "flat");

      // Horizontal bar
      const hBar = document.createElement("a-box");
      hBar.setAttribute("width", 1.6);
      hBar.setAttribute("height", 0.4);
      hBar.setAttribute("depth", 0.2);
      hBar.setAttribute("color", "#ff0000");
      hBar.setAttribute("shader", "flat");

      // White outline glow
      const glow = document.createElement("a-box");
      glow.setAttribute("width", 0.6);
      glow.setAttribute("height", 1.8);
      glow.setAttribute("depth", 0.1);
      glow.setAttribute("color", "#ffffff");
      glow.setAttribute("shader", "flat");
      glow.setAttribute("opacity", 0.3);

      const glow2 = document.createElement("a-box");
      glow2.setAttribute("width", 1.8);
      glow2.setAttribute("height", 0.6);
      glow2.setAttribute("depth", 0.1);
      glow2.setAttribute("color", "#ffffff");
      glow2.setAttribute("shader", "flat");
      glow2.setAttribute("opacity", 0.3);

      cross.appendChild(glow);
      cross.appendChild(glow2);
      cross.appendChild(vBar);
      cross.appendChild(hBar);
      this.el.appendChild(cross);
    },

    die() {
      if (this.isDead) return;
      this.isDead = true;
      this.el.setAttribute("visible", false);
      this.el.object3D.position.set(0, -9999, 0);
      window.dispatchEvent(
        new CustomEvent("health-pack-collected", { detail: this.data.id })
      );
    },

    tick(time) {
      if (this.isDead || !this.el.parentNode || !this.el.object3D) return;
      // Gentle spin + bob
      const t = time / 1000;
      this.el.object3D.rotation.y = t * 1.5;
      this.el.object3D.position.y = this.initialY + Math.sin(t * 2 + this.hoverOffset) * 1.5;
    },
  });
}

/* ------------------------------------------------------------------ */
/*  ENEMY COMPONENT - FIXED                                           */
/* ------------------------------------------------------------------ */
if (!AFRAME.components["enemy-brain"]) {
  AFRAME.registerComponent("enemy-brain", {
    schema: {
      speed: { type: "number", default: 8 },
      id: { type: "string" },
    },

    init() {
      this.camera = document.querySelector("[camera]");
      this.isDead = false;
      this.hoverOffset = Math.random() * Math.PI * 2;
      this.swingPhase = Math.random() * Math.PI * 2;
      this.swingSpeedX = 1.5 + Math.random() * 1.5; // swing speed left/right
      this.swingSpeedY = 1.0 + Math.random() * 1.5; // bob speed up/down
      this.swingRangeX = 8 + Math.random() * 10;    // 8-18m swing left/right
      this.swingRangeY = 4 + Math.random() * 8;     // 4-12m bob up/down
      this.baseY = 0;
      this.hasDealtDamage = false;
      
      // Create visual model immediately
      this._createVisuals();
    },

    _createVisuals() {
      const container = document.createElement("a-entity");
      
      // Main model
      const modelPath = GLB_MODELS[Math.floor(Math.random() * GLB_MODELS.length)];
      const model = document.createElement("a-gltf-model");
      model.setAttribute("src", modelPath);
      model.setAttribute("scale", "1.5 1.5 1.5");
      
      // Hit sphere (invisible collision volume)
      const hitSphere = document.createElement("a-sphere");
      hitSphere.setAttribute("radius", 1.0);
      hitSphere.setAttribute("visible", "false");
      hitSphere.setAttribute("class", "enemy-hitbox");
      
      container.appendChild(model);
      container.appendChild(hitSphere);
      this.el.appendChild(container);
      
      this.modelContainer = container;
    },

    die() {
      if (this.isDead) return;
      this.isDead = true;
      
      this.el.setAttribute("visible", false);
      this.el.object3D.position.set(0, -9999, 0);
      
      const id = this.data.id;
      window.dispatchEvent(
        new CustomEvent("enemy-died", { detail: id })
      );
    },

    tick(time, timeDelta) {
      if (this.isDead || !this.camera || !this.el.parentNode || !this.el.object3D) return;

      const camPos = this.camera.object3D.position;
      const myPos = this.el.object3D.position;
      const dist = myPos.distanceTo(camPos);

      // Always face player
      this.el.object3D.lookAt(camPos.x, camPos.y, camPos.z);

      // Kamikaze: if close enough, hit the player and die
      if (dist < 5) {
        window.dispatchEvent(new CustomEvent("enemy-hit-player", { detail: 10 }));
        this.die();
        return;
      }

      // Take HP earlier — start dealing damage when within 50m
      if (dist < 50 && !this.hasDealtDamage) {
        this.hasDealtDamage = true;
        window.dispatchEvent(new CustomEvent("enemy-hit-player", { detail: 10 }));
      }

      // Move toward player
      const dir = new THREE.Vector3().subVectors(camPos, myPos).normalize();
      const speed = this.data.speed * (timeDelta / 1000);
      myPos.add(dir.multiplyScalar(speed));

      // Get a perpendicular axis for swinging left/right
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const t = time / 1000;

      // Swing left/right
      const swingX = Math.sin(t * this.swingSpeedX + this.swingPhase) * this.swingRangeX;
      myPos.add(right.multiplyScalar(swingX * (timeDelta / 1000)));

      // Bob up/down
      if (this.baseY === 0) this.baseY = myPos.y;
      myPos.y = this.baseY + Math.sin(t * this.swingSpeedY + this.hoverOffset) * this.swingRangeY;
      if (myPos.y < 0.5) myPos.y = 0.5;

      this.el.object3D.position.copy(myPos);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  CAMERA BACKGROUND                                                 */
/* ------------------------------------------------------------------ */
if (!AFRAME.components["camera-background"]) {
  AFRAME.registerComponent("camera-background", {
    init() {
      this._video = document.createElement("video");
      this._video.setAttribute("autoplay", "");
      this._video.setAttribute("playsinline", "");
      this._video.setAttribute("muted", "");
      this._video.style.display = "none";
      document.body.appendChild(this._video);

      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((stream) => {
          this._stream = stream;
          this._video.srcObject = stream;
          const texture = new THREE.VideoTexture(this._video);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          this.el.sceneEl.object3D.background = texture;
        })
        .catch((err) => {
          console.warn("[ShootAR] Camera failed:", err);
          this.el.sceneEl.object3D.background = new THREE.Color(0x000000);
        });
    },

    remove() {
      if (this._stream) {
        this._stream.getTracks().forEach((t) => t.stop());
      }
      if (this._video?.parentNode) {
        this._video.parentNode.removeChild(this._video);
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                    */
/* ------------------------------------------------------------------ */
export default function ShootARPage() {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [enemies, setEnemies] = useState([]);
  const [healthPacks, setHealthPacks] = useState([]);
  const [gameKey, setGameKey] = useState(0);
  const sceneRef = useRef(null);
  const enemyIdCounter = useRef(0);
  const packIdCounter = useRef(0);
  const gameOverRef = useRef(false);
  const cameraRef = useRef(null);
  gameOverRef.current = gameOver;

  // Spawn enemy at far distance
  const spawnEnemy = useCallback(() => {
    const id = `enemy-${enemyIdCounter.current++}`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 500; // always spawn at 500m
    const x = Math.sin(angle) * dist;
    const z = Math.cos(angle) * dist;
    const y = 5 + Math.random() * 20; // 5-25m height
    const speed = 15 + Math.random() * 15; // 15-30 m/s
    setEnemies((prev) => {
      if (prev.length >= 5) return prev; // max 5 at a time
      return [...prev, { id, x, y, z, speed }];
    });
  }, []);

  // Spawn health pack at random position
  const spawnHealthPack = useCallback(() => {
    const id = `hp-${packIdCounter.current++}`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 200; // 80-280m away (closer than enemies)
    const x = Math.sin(angle) * dist;
    const z = Math.cos(angle) * dist;
    const y = 3 + Math.random() * 15;
    setHealthPacks((prev) => {
      if (prev.length >= 3) return prev; // max 3 health packs
      return [...prev, { id, x, y, z }];
    });
  }, []);

  const destroyEnemy = useCallback((id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    setScore((s) => s + 100);
  }, []);

  // Game loop
  useEffect(() => {
    document.querySelectorAll("[enemy-brain]").forEach((e) => e.remove());

    const onEnemyDied = (e) => {
      destroyEnemy(e.detail);
      if (!gameOverRef.current) {
        setTimeout(() => {
          if (!gameOverRef.current) spawnEnemy();
        }, 2000);
      }
    };
    window.addEventListener("enemy-died", onEnemyDied);

    // Initial wave — exactly 5
    for (let i = 0; i < 5; i++) spawnEnemy();

    // Spawn initial health packs
    for (let i = 0; i < 2; i++) spawnHealthPack();

    // Respawn health packs periodically
    const hpSpawnInterval = setInterval(() => {
      if (gameOverRef.current) return;
      setHealthPacks((prev) => {
        if (prev.length < 3) {
          const id = `hp-${packIdCounter.current++}`;
          const angle = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 200;
          return [...prev, { id, x: Math.sin(angle) * dist, y: 3 + Math.random() * 15, z: Math.cos(angle) * dist }];
        }
        return prev;
      });
    }, 10000);

    // Listen for health pack collection
    const onHealthPackCollected = (e) => {
      const packId = e.detail;
      setHealthPacks((prev) => prev.filter((p) => p.id !== packId));
      setHealth((h) => Math.min(100, h + 10));
      setScore((s) => s + 50);
    };
    window.addEventListener("health-pack-collected", onHealthPackCollected);

    // Listen for kamikaze hits (enemy reaches player)
    const onEnemyHitPlayer = (e) => {
      const dmg = e.detail || 10;
      setHealth((h) => {
        const next = Math.max(0, h - dmg);
        if (next <= 0) setGameOver(true);
        return next;
      });
    };
    window.addEventListener("enemy-hit-player", onEnemyHitPlayer);

    return () => {
      window.removeEventListener("enemy-died", onEnemyDied);
      window.removeEventListener("enemy-hit-player", onEnemyHitPlayer);
      window.removeEventListener("health-pack-collected", onHealthPackCollected);
      clearInterval(hpSpawnInterval);
    };
  }, [gameKey, destroyEnemy, spawnEnemy, spawnHealthPack]);

  // SHOOT - Now fires a rocket projectile!
  const shoot = useCallback(() => {
    if (gameOverRef.current) return;
    const cam = document.querySelector("[camera]");
    if (!cam || !cam.sceneEl) return;

    // Get camera world position and direction
    const camPos = new THREE.Vector3();
    const camQuat = new THREE.Quaternion();
    cam.object3D.getWorldPosition(camPos);
    cam.object3D.getWorldQuaternion(camQuat);
    
    // World-space forward direction from camera
    const worldDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat).normalize();
    
    // Spawn rocket slightly ahead + right of camera
    const offset = new THREE.Vector3(0.3, -0.2, -0.5).applyQuaternion(camQuat);
    const spawnPos = camPos.clone().add(offset);
    
    const rocket = document.createElement("a-entity");
    rocket.setAttribute("position", { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
    
    // Store direction on the element so the component can read it in init()
    rocket.dataset.dirX = worldDir.x;
    rocket.dataset.dirY = worldDir.y;
    rocket.dataset.dirZ = worldDir.z;
    
    rocket.setAttribute("rocket-projectile", { speed: 120 });
    
    cam.sceneEl.appendChild(rocket);
    
    // Screen flash (muzzle effect)
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed; inset: 0; background: #ff0000; opacity: 0.15;
      pointer-events: none; z-index: 9999; transition: opacity 0.08s;
    `;
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => { if (flash.parentNode) flash.remove(); }, 100);
    }, 50);
    
  }, []);

  const restart = useCallback(() => {
    document.querySelectorAll("[enemy-brain]").forEach((e) => e.remove());
    document.querySelectorAll("[rocket-projectile]").forEach((e) => e.remove());
    document.querySelectorAll("[health-pack]").forEach((e) => e.remove());
    setScore(0);
    setHealth(100);
    setEnemies([]);
    setHealthPacks([]);
    setGameOver(false);
    setGameKey((k) => k + 1);
  }, []);

  return (
    <>
      {/* ---- 3D LAYER: camera + A-Frame (z-index 1) ---- */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, overflow: "hidden"
      }}>
        <video
          id="shootar-camera-fallback"
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0
          }}
        />

        <a-scene
          ref={sceneRef}
          embedded
          vr-mode-ui="enabled: false"
          renderer="antialias: true; alpha: true; colorManagement: true"
          background="color: transparent"
          camera-background
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <a-assets>
            {GLB_MODELS.map((path, i) => (
              <a-asset-item key={i} id={`model-${i}`} src={path} crossOrigin="anonymous" />
            ))}
          </a-assets>

          {/* Camera with weapon sight */}
          <a-entity
            camera
            look-controls="touchEnabled: true; magicWindowTrackingEnabled: true"
            position="0 1.6 0"
            wasd-controls="enabled: false"
          >
            {/* Rocket launcher sight */}
            <a-entity position="0.3 -0.2 -0.8">
              <a-cylinder
                position="0 0 0" rotation="90 0 0"
                radius="0.06" height="0.8" color="#444"
                metalness="0.8" roughness="0.2"
              />
              <a-torus
                position="0 0 -0.2" rotation="90 0 0"
                radius="0.07" radius-tubular="0.01"
                color="#00ffff" shader="flat"
                animation="property: rotation; to: 90 360 0; dur: 1000; loop: true; easing: linear"
              />
              <a-ring
                position="0 0 -0.4" rotation="0 0 0"
                radius-inner="0.05" radius-outer="0.08"
                color="#ff6600" shader="flat"
              />
            </a-entity>

            {/* Crosshair */}
            <a-ring position="0 0 -2" radius-inner="0.015" radius-outer="0.025" color="#0f0" shader="flat" />
            <a-circle position="0 0 -2" radius="0.003" color="#0f0" shader="flat" />

            {/* Range finder arcs */}
            <a-torus position="0 0 -2" rotation="0 0 0" radius="0.08" radius-tubular="0.002" color="#0f0" arc="60" />
            <a-torus position="0 0 -2" rotation="0 0 180" radius="0.08" radius-tubular="0.002" color="#0f0" arc="60" />
          </a-entity>

          <a-light type="ambient" intensity="0.4" />
          <a-light type="directional" position="10 20 10" intensity="0.8" castShadow />

          {enemies.map((enemy) => (
            <a-entity
              key={enemy.id}
              id={enemy.id}
              enemy-brain={`speed: ${enemy.speed}; id: ${enemy.id}`}
              position={`${enemy.x} ${enemy.y} ${enemy.z}`}
            />
          ))}

          {healthPacks.map((pack) => (
            <a-entity
              key={pack.id}
              id={pack.id}
              health-pack={`id: ${pack.id}`}
              position={`${pack.x} ${pack.y} ${pack.z}`}
            />
          ))}
        </a-scene>
      </div>

      {/* ---- UI LAYER: HUD + buttons (z-index 10, above A-Frame) ---- */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 10,
        pointerEvents: "none" /* let touches pass through to 3D except on UI elements */
      }}>
        {/* HUD — score & health */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, padding: "20px",
          display: "flex", justifyContent: "space-between"
        }}>
          <div style={{ color: "#0f0", fontFamily: "monospace", fontSize: "28px", fontWeight: "bold", textShadow: "0 0 10px #0f0" }}>
            SCORE: {score}
          </div>
          <div style={{
            color: health < 30 ? "#f00" : "#0f0",
            fontFamily: "monospace", fontSize: "28px", fontWeight: "bold",
            textShadow: `0 0 10px ${health < 30 ? "#f00" : "#0f0"}`
          }}>
            HP: {health}
          </div>
        </div>

        {/* FIRE button — pointerEvents auto so it catches clicks */}
        <button
          onClick={shoot}
          onTouchStart={(e) => { e.preventDefault(); shoot(); }}
          style={{
            position: "absolute", bottom: "40px", right: "40px",
            width: "100px", height: "100px", borderRadius: "50%",
            background: "radial-gradient(circle, #ff6600 0%, #cc3300 100%)",
            border: "3px solid #fff", color: "#fff", fontSize: "16px",
            fontWeight: "bold", cursor: "pointer",
            pointerEvents: "auto",
            touchAction: "manipulation",
            boxShadow: "0 0 40px rgba(255,100,0,0.8), inset 0 0 20px rgba(0,0,0,0.3)",
            userSelect: "none", WebkitTapHighlightColor: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          � FIRE
        </button>

        {/* Ammo indicator */}
        <div style={{
          position: "absolute", bottom: "40px", right: "160px",
          color: "#ff6600", fontFamily: "monospace", fontSize: "20px",
          fontWeight: "bold", textShadow: "0 0 10px #ff6600"
        }}>
          ∞
        </div>

        {/* Enemy count */}
        <div style={{
          position: "absolute", top: "80px", left: "20px",
          color: "#0f0", fontFamily: "monospace", fontSize: "14px", opacity: 0.7
        }}>
          Threats: {enemies.length}
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", pointerEvents: "auto"
          }}>
            <div style={{ color: "#f00", fontSize: "64px", fontFamily: "monospace", fontWeight: "bold", textShadow: "0 0 20px #f00" }}>
              GAME OVER
            </div>
            <div style={{ color: "#fff", fontSize: "32px", fontFamily: "monospace", marginBottom: "40px" }}>
              Final Score: {score}
            </div>
            <button
              onClick={restart}
              style={{
                padding: "20px 60px", fontSize: "28px", background: "#0f0",
                color: "#000", border: "none", borderRadius: "10px",
                cursor: "pointer", fontWeight: "bold", boxShadow: "0 0 20px #0f0",
                pointerEvents: "auto", touchAction: "manipulation"
              }}
            >
              RESTART
            </button>
          </div>
        )}
      </div>
    </>
  );
}