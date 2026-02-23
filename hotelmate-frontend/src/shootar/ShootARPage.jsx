// ShootAR — Main page component (A-Frame + GLB rewrite)
// Fully isolated fullscreen container. No dependency on existing app layout.

import React, { useEffect, useRef, useState, useCallback } from "react";
import "aframe";
import * as THREE from "three";

// GLB Model paths (must live in public/shootar/)
const GLB_MODELS = [
  "/shootar/military_drone.glb",
  "/shootar/scific_drone_for_free.glb",
];

/* ------------------------------------------------------------------ */
/*  Register custom A-Frame component ONCE                            */
/* ------------------------------------------------------------------ */
if (!AFRAME.components["enemy-brain"]) {
  AFRAME.registerComponent("enemy-brain", {
    schema: {
      speed: { type: "number", default: 3 },
      id: { type: "string" },
    },

    init() {
      this.camera = document.querySelector("[camera]");
      this.pos = { ...this.el.getAttribute("position") };
      this.isDead = false;
      this._loadModel();

      // Click / tap to shoot
      this.el.addEventListener("click", () => {
        if (!this.isDead) this.die();
      });
    },

    _loadModel() {
      const modelPath =
        GLB_MODELS[Math.floor(Math.random() * GLB_MODELS.length)];

      const modelEl = document.createElement("a-gltf-model");
      modelEl.setAttribute("src", modelPath);
      modelEl.setAttribute("scale", "3 3 3");
      modelEl.setAttribute("animation-mixer", "");

      // Invisible hit-box so raycasting works reliably
      const hitBox = document.createElement("a-box");
      hitBox.setAttribute("class", "hitbox");
      hitBox.setAttribute("visible", "false");
      hitBox.setAttribute("scale", "2 2 2");
      hitBox.setAttribute("position", "0 0 0");

      this.el.appendChild(modelEl);
      this.el.appendChild(hitBox);
    },

    die() {
      this.isDead = true;
      this.el.setAttribute("animation", {
        property: "scale",
        to: "0.1 0.1 0.1",
        dur: 200,
      });
      setTimeout(() => {
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
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

      if (dist > 6) {
        // Move toward camera
        const dir = new THREE.Vector3()
          .subVectors(camPos, myPos)
          .normalize();
        const step = dir.multiplyScalar(this.data.speed * (timeDelta / 1000));

        this.pos.x += step.x;
        this.pos.y += step.y;
        this.pos.z += step.z;
        if (this.pos.y < 1) this.pos.y = 1; // floor

        this.el.setAttribute("position", this.pos);
        this.el.object3D.lookAt(camPos.x, camPos.y, camPos.z);
      } else {
        // Hover / orbit at close range
        const hoverY = Math.sin(time / 500) * 0.2;
        this.el.setAttribute("position", {
          x: this.pos.x,
          y: this.pos.y + hoverY,
          z: this.pos.z,
        });
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/*  React component                                                    */
/* ------------------------------------------------------------------ */
export default function ShootARPage() {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [enemies, setEnemies] = useState([]);
  const sceneRef = useRef(null);
  const enemyIdCounter = useRef(0);

  /* ---- spawn / destroy helpers ---- */
  const spawnEnemy = useCallback(() => {
    const id = `enemy-${enemyIdCounter.current++}`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 30; // 20-50 m away
    const x = Math.sin(angle) * dist;
    const z = Math.cos(angle) * dist;
    const y = 2 + Math.random() * 3; // 2-5 m height
    const speed = 2 + Math.random() * 4;
    setEnemies((prev) => [...prev, { id, x, y, z, speed }]);
  }, []);

  const destroyEnemy = useCallback((id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    setScore((s) => s + 100);
  }, []);

  /* ---- lifecycle ---- */
  useEffect(() => {
    const onEnemyDied = (e) => {
      destroyEnemy(e.detail);
      // Respawn a replacement enemy after a short delay
      setTimeout(() => spawnEnemy(), 1500);
    };
    window.addEventListener("enemy-died", onEnemyDied);

    // Spawn initial wave of enemies on load
    const INITIAL_ENEMY_COUNT = 5;
    for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
      spawnEnemy();
    }

    // Continuously spawn new enemies every few seconds (up to a max)
    const MAX_ENEMIES = 10;
    const spawnInterval = setInterval(() => {
      if (gameOver) return;
      setEnemies((prev) => {
        if (prev.length < MAX_ENEMIES) {
          const id = `enemy-${enemyIdCounter.current++}`;
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 30;
          return [
            ...prev,
            {
              id,
              x: Math.sin(angle) * dist,
              y: 2 + Math.random() * 3,
              z: Math.cos(angle) * dist,
              speed: 2 + Math.random() * 4,
            },
          ];
        }
        return prev;
      });
    }, 4000);

    // Damage tick — enemies within 6 m hurt the player
    const damageInterval = setInterval(() => {
      if (gameOver) return;
      const enemyEls = document.querySelectorAll("[enemy-brain]");
      const cam = document.querySelector("[camera]");
      if (!cam) return;

      let closeCount = 0;
      enemyEls.forEach((el) => {
        if (el.object3D.position.distanceTo(cam.object3D.position) < 6)
          closeCount++;
      });

      if (closeCount > 0) {
        setHealth((h) => {
          const next = Math.max(0, h - closeCount * 5);
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
  }, [gameOver, destroyEnemy, spawnEnemy]);

  /* ---- shooting ---- */
  const shoot = useCallback(() => {
    const cam = document.querySelector("[camera]");
    if (!cam) return;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    const threeCamera = cam.components.camera.camera;
    raycaster.setFromCamera(center, threeCamera);

    const hitboxes = document.querySelectorAll(".hitbox");
    const objects = Array.from(hitboxes).map((hb) => hb.object3D);

    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.el?.hasAttribute("enemy-brain")) {
        target = target.parent;
      }
      if (target?.el) {
        const comp = target.el.components["enemy-brain"];
        if (comp && !comp.isDead) {
          comp.die();
        }
      }
    }
  }, []);

  /* ---- restart ---- */
  const restart = useCallback(() => {
    setScore(0);
    setHealth(100);
    setGameOver(false);
    setEnemies([]);
    document.querySelectorAll("[enemy-brain]").forEach((e) => e.remove());
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ---- A-Frame Scene ---- */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: false"
        renderer="antialias: true; alpha: true; colorManagement: true"
        background="color: transparent"
      >
        {/* Pre-load GLB assets */}
        <a-assets>
          {GLB_MODELS.map((path, i) => (
            <a-asset-item
              key={i}
              id={`model-${i}`}
              src={path}
              crossOrigin="anonymous"
            />
          ))}
        </a-assets>

        {/* Camera + crosshair */}
        <a-entity
          camera
          look-controls="touchEnabled: true; magicWindowTrackingEnabled: true"
          position="0 1.6 0"
          wasd-controls="enabled: false"
        >
          <a-ring
            position="0 0 -2"
            radius-inner="0.02"
            radius-outer="0.03"
            color="#0f0"
            shader="flat"
          />
          <a-circle
            position="0 0 -2"
            radius="0.005"
            color="#0f0"
            shader="flat"
          />
        </a-entity>

        {/* Lighting */}
        <a-light type="ambient" intensity="0.6" />
        <a-light
          type="directional"
          position="10 20 10"
          intensity="0.8"
          castShadow
        />

        {/* Enemies */}
        {enemies.map((enemy) => (
          <a-entity
            key={enemy.id}
            id={enemy.id}
            enemy-brain={`speed: ${enemy.speed}; id: ${enemy.id}`}
            position={`${enemy.x} ${enemy.y} ${enemy.z}`}
          />
        ))}

        {/* Transparent sky + invisible floor */}
        <a-sky color="#000" opacity="0" />
        <a-plane
          position="0 0 0"
          rotation="-90 0 0"
          width="200"
          height="200"
          visible="false"
        />
      </a-scene>

      {/* ---- HUD ---- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <div
          style={{
            color: "#0f0",
            fontFamily: "monospace",
            fontSize: "28px",
            fontWeight: "bold",
            textShadow: "0 0 10px #0f0",
          }}
        >
          SCORE: {score}
        </div>
        <div
          style={{
            color: health < 30 ? "#f00" : "#0f0",
            fontFamily: "monospace",
            fontSize: "28px",
            fontWeight: "bold",
            textShadow: `0 0 10px ${health < 30 ? "#f00" : "#0f0"}`,
          }}
        >
          HP: {health}
        </div>
      </div>

      {/* ---- Fire button ---- */}
      <button
        onClick={shoot}
        onTouchStart={(e) => {
          e.preventDefault();
          shoot();
        }}
        style={{
          position: "absolute",
          bottom: "50px",
          right: "50px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #ff4444 0%, #aa0000 100%)",
          border: "4px solid #fff",
          color: "#fff",
          fontSize: "20px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 100,
          boxShadow:
            "0 0 30px rgba(255,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        FIRE
      </button>

      {/* ---- Debug info ---- */}
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "20px",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "14px",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      >
        Enemies: {enemies.length}
      </div>

      {/* ---- Game Over overlay ---- */}
      {gameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              color: "#f00",
              fontSize: "64px",
              fontFamily: "monospace",
              fontWeight: "bold",
              textShadow: "0 0 20px #f00",
              marginBottom: "20px",
            }}
          >
            GAME OVER
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "32px",
              fontFamily: "monospace",
              marginBottom: "40px",
            }}
          >
            Final Score: {score}
          </div>
          <button
            onClick={restart}
            style={{
              padding: "20px 60px",
              fontSize: "28px",
              background: "#0f0",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 0 20px #0f0",
            }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
