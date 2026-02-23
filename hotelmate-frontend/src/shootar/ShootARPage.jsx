// ShootAR — Main page component (A-Frame + GLB rewrite)
// Fixed shooting + added rocket projectiles

import React, { useEffect, useRef, useState, useCallback } from "react";
import "aframe";
import * as THREE from "three";

const GLB_MODELS = [
  "/shootar/military_drone.glb",
  "/shootar/scific_drone_for_free.glb",
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
      this.life = 2.0; // seconds
      // Create rocket mesh
      const rocket = document.createElement("a-entity");
      
      // Rocket body (cylinder)
      const body = document.createElement("a-cylinder");
      body.setAttribute("radius", 0.05);
      body.setAttribute("height", 0.4);
      body.setAttribute("color", "#ff4400");
      body.setAttribute("position", "0 0 0");
      body.setAttribute("rotation", "90 0 0");
      
      // Rocket nose
      const nose = document.createElement("a-cone");
      nose.setAttribute("radius-bottom", 0.05);
      nose.setAttribute("radius-top", 0);
      nose.setAttribute("height", 0.15);
      nose.setAttribute("color", "#ff6600");
      nose.setAttribute("position", "0 0 -0.25");
      nose.setAttribute("rotation", "90 0 0");
      
      // Fire trail particles
      const trail = document.createElement("a-entity");
      trail.setAttribute("particle-system", {
        preset: "dust",
        color: "#ff4400,#ffff00,#ff0000",
        particleCount: 20,
        maxAge: 0.3,
        maxParticleCount: 50,
        velocityValue: "0 0 -5",
        accelerationValue: "0 2 0",
        opacity: 0.8,
        blending: 1,
        size: 0.1,
      });

      // Engine glow
      const glow = document.createElement("a-sphere");
      glow.setAttribute("radius", 0.08);
      glow.setAttribute("color", "#ffff00");
      glow.setAttribute("position", "0 0 0.2");
      glow.setAttribute("shader", "flat");
      
      rocket.appendChild(body);
      rocket.appendChild(nose);
      rocket.appendChild(trail);
      rocket.appendChild(glow);
      
      this.el.appendChild(rocket);
      this.rocketMesh = rocket;
      
      // Muzzle flash light
      const light = document.createElement("a-light");
      light.setAttribute("type", "point");
      light.setAttribute("color", "#ff6600");
      light.setAttribute("intensity", 2);
      light.setAttribute("distance", 10);
      this.el.appendChild(light);
      setTimeout(() => light.remove(), 100);
    },

    tick(time, timeDelta) {
      const dt = timeDelta / 1000;
      this.life -= dt;
      
      if (this.life <= 0) {
        this.el.remove();
        return;
      }

      // Move forward
      const pos = this.el.object3D.position;
      const dir = new THREE.Vector3(0, 0, -1);
      dir.applyQuaternion(this.el.object3D.quaternion);
      dir.multiplyScalar(this.data.speed * dt);
      
      pos.add(dir);
      this.el.object3D.position.copy(pos);
      
      // Check collisions with enemies
      const enemies = document.querySelectorAll("[enemy-brain]");
      const myPos = this.el.object3D.position;
      
      for (const enemy of enemies) {
        if (enemy.components["enemy-brain"].isDead) continue;
        const enemyPos = enemy.object3D.position;
        const dist = myPos.distanceTo(enemyPos);
        
        if (dist < 1.5) { // Hit radius
          // Explosion effect
          this._explode(enemyPos);
          // Kill enemy
          enemy.components["enemy-brain"].die();
          // Remove rocket
          this.el.remove();
          return;
        }
      }
    },

    _explode(pos) {
      const explosion = document.createElement("a-entity");
      explosion.setAttribute("position", pos);
      
      // Shockwave ring
      const ring = document.createElement("a-ring");
      ring.setAttribute("radius-inner", 0.1);
      ring.setAttribute("radius-outer", 0.2);
      ring.setAttribute("color", "#ffff00");
      ring.setAttribute("shader", "flat");
      ring.setAttribute("animation", {
        property: "scale",
        to: "10 10 10",
        dur: 300,
        easing: "easeOutQuad"
      });
      ring.setAttribute("animation__fade", {
        property: "material.opacity",
        from: 1,
        to: 0,
        dur: 300,
        easing: "easeOutQuad"
      });
      
      // Light flash
      const light = document.createElement("a-light");
      light.setAttribute("type", "point");
      light.setAttribute("color", "#ff4400");
      light.setAttribute("intensity", 5);
      light.setAttribute("distance", 20);
      light.setAttribute("animation", {
        property: "intensity",
        to: 0,
        dur: 200
      });
      
      explosion.appendChild(ring);
      explosion.appendChild(light);
      this.el.sceneEl.appendChild(explosion);
      
      setTimeout(() => explosion.remove(), 350);
    }
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
      this.initialY = this.el.getAttribute("position").y;
      this.hoverOffset = Math.random() * Math.PI * 2;
      
      // Create visual model immediately
      this._createVisuals();
    },

    _createVisuals() {
      const container = document.createElement("a-entity");
      
      // Main model
      const modelPath = GLB_MODELS[Math.floor(Math.random() * GLB_MODELS.length)];
      const model = document.createElement("a-gltf-model");
      model.setAttribute("src", modelPath);
      model.setAttribute("scale", "2 2 2");
      
      // Hit sphere (invisible collision volume)
      const hitSphere = document.createElement("a-sphere");
      hitSphere.setAttribute("radius", 1.2);
      hitSphere.setAttribute("visible", "false");
      hitSphere.setAttribute("class", "enemy-hitbox");
      
      // Engine glow
      const engine = document.createElement("a-sphere");
      engine.setAttribute("radius", 0.3);
      engine.setAttribute("color", "#00ffff");
      engine.setAttribute("position", "0 0 1");
      engine.setAttribute("shader", "flat");
      engine.setAttribute("animation", {
        property: "scale",
        to: "1.2 1.2 1.2",
        dir: "alternate",
        dur: 200,
        loop: true
      });
      
      container.appendChild(model);
      container.appendChild(hitSphere);
      container.appendChild(engine);
      this.el.appendChild(container);
      
      this.modelContainer = container;
    },

    die() {
      if (this.isDead) return;
      this.isDead = true;
      
      // Explosion animation
      this.el.setAttribute("animation", {
        property: "scale",
        to: "0.1 0.1 0.1",
        dur: 200,
        easing: "easeInBack"
      });
      
      // Spin out
      this.el.setAttribute("animation__spin", {
        property: "rotation",
        to: "360 360 360",
        dur: 200,
        easing: "linear"
      });
      
      setTimeout(() => {
        if (this.el.parentNode) {
          this.el.parentNode.removeChild(this.el);
        }
        window.dispatchEvent(
          new CustomEvent("enemy-died", { detail: this.data.id })
        );
      }, 200);
    },

    tick(time, timeDelta) {
      if (this.isDead || !this.camera) return;

      const camPos = this.camera.object3D.position;
      const myPos = this.el.object3D.position;
      const dist = myPos.distanceTo(camPos);

      // Always face player
      this.el.object3D.lookAt(camPos.x, camPos.y, camPos.z);

      if (dist > 4) {
        // Move toward camera aggressively
        const dir = new THREE.Vector3().subVectors(camPos, myPos).normalize();
        const speed = this.data.speed * (timeDelta / 1000);
        
        myPos.add(dir.multiplyScalar(speed));
        
        // Add slight bobbing while moving
        myPos.y = this.initialY + Math.sin(time / 500 + this.hoverOffset) * 0.3;
        
        // Floor collision
        if (myPos.y < 0.5) myPos.y = 0.5;
        
        this.el.object3D.position.copy(myPos);
      } else {
        // Close range: aggressive circling
        const t = time / 1000;
        const angle = t * 2 + this.hoverOffset;
        const radius = 3 + Math.sin(t * 3) * 0.5;
        
        const offset = new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(t * 4) * 0.5,
          Math.sin(angle) * radius
        );
        
        // Orbit around camera
        const targetPos = camPos.clone().add(offset);
        myPos.lerp(targetPos, 0.1);
        this.el.object3D.position.copy(myPos);
      }
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
  const [gameKey, setGameKey] = useState(0);
  const sceneRef = useRef(null);
  const enemyIdCounter = useRef(0);
  const gameOverRef = useRef(false);
  const cameraRef = useRef(null);
  gameOverRef.current = gameOver;

  // Spawn enemy at far distance
  const spawnEnemy = useCallback(() => {
    const id = `enemy-${enemyIdCounter.current++}`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 80; // 60-140m away
    const x = Math.sin(angle) * dist;
    const z = Math.cos(angle) * dist;
    const y = 2 + Math.random() * 8; // 2-10m height
    const speed = 10 + Math.random() * 8; // 10-18 m/s
    setEnemies((prev) => [...prev, { id, x, y, z, speed }]);
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

    // Initial wave
    for (let i = 0; i < 5; i++) spawnEnemy();

    // Spawn interval
    const spawnInterval = setInterval(() => {
      if (gameOverRef.current) return;
      setEnemies((prev) => {
        if (prev.length < 8) {
          const id = `enemy-${enemyIdCounter.current++}`;
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 80;
          return [
            ...prev,
            {
              id,
              x: Math.sin(angle) * dist,
              y: 2 + Math.random() * 8,
              z: Math.cos(angle) * dist,
              speed: 10 + Math.random() * 8,
            },
          ];
        }
        return prev;
      });
    }, 5000);

    // Damage from close enemies
    const damageInterval = setInterval(() => {
      if (gameOverRef.current) return;
      const enemyEls = document.querySelectorAll("[enemy-brain]");
      const cam = document.querySelector("[camera]");
      if (!cam) return;

      let closeCount = 0;
      enemyEls.forEach((el) => {
        if (el.components["enemy-brain"]?.isDead) return;
        if (el.object3D.position.distanceTo(cam.object3D.position) < 5)
          closeCount++;
      });

      if (closeCount > 0) {
        setHealth((h) => {
          const next = Math.max(0, h - closeCount * 8);
          if (next <= 0) setGameOver(true);
          return next;
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener("enemy-died", onEnemyDied);
      clearInterval(damageInterval);
      clearInterval(spawnInterval);
    };
  }, [gameKey, destroyEnemy, spawnEnemy]);

  // SHOOT - Now fires a rocket projectile!
  const shoot = useCallback(() => {
    const cam = document.querySelector("[camera]");
    if (!cam) return;

    // Create rocket at camera position
    const rocket = document.createElement("a-entity");
    
    // Get camera world position and rotation
    const camPos = new THREE.Vector3();
    const camQuat = new THREE.Quaternion();
    cam.object3D.getWorldPosition(camPos);
    cam.object3D.getWorldQuaternion(camQuat);
    
    // Offset to right side of screen (like holding a rocket launcher)
    const offset = new THREE.Vector3(0.3, -0.2, -0.5);
    offset.applyQuaternion(camQuat);
    const spawnPos = camPos.clone().add(offset);
    
    rocket.setAttribute("position", spawnPos);
    rocket.setAttribute("rotation", {
      x: cam.object3D.rotation.x * (180/Math.PI),
      y: cam.object3D.rotation.y * (180/Math.PI),
      z: cam.object3D.rotation.z * (180/Math.PI)
    });
    
    rocket.setAttribute("rocket-projectile", {
      speed: 80 // m/s
    });
    
    cam.sceneEl.appendChild(rocket);
    
    // Recoil animation on camera
    cam.setAttribute("animation", {
      property: "position",
      to: {
        x: camPos.x,
        y: camPos.y - 0.05,
        z: camPos.z
      },
      dur: 50,
      dir: "alternate",
      loop: 1
    });
    
    // Screen flash
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed; inset: 0; background: #ff6600; opacity: 0.3;
      pointer-events: none; z-index: 9999; transition: opacity 0.1s;
    `;
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 100);
    }, 50);
    
  }, []);

  const restart = useCallback(() => {
    document.querySelectorAll("[enemy-brain]").forEach((e) => e.remove());
    document.querySelectorAll("[rocket-projectile]").forEach((e) => e.remove());
    setScore(0);
    setHealth(100);
    setEnemies([]);
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
              >
                <a-animation attribute="rotation" to="90 360 0" dur="1000" loop="true" easing="linear"/>
              </a-torus>
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
          🚀 FIRE
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