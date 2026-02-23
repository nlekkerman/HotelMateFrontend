import React from "react";
import { CONFIG } from "./config.js";

export default function HUD({ score, health, onShoot, gameOver, onRestart }) {
  const hearts = Array.from({ length: CONFIG.MAX_HEALTH }, (_, i) => i < health);

  return (
    <div style={styles.hud}>
      {/* Score - top left */}
      <div style={styles.score}>⚡ {score}</div>

      {/* Health - top right */}
      <div style={styles.health}>
        {hearts.map((alive, i) => (
          <span key={i} style={{ opacity: alive ? 1 : 0.25 }}>
            ❤️
          </span>
        ))}
      </div>

      {/* Crosshair - center */}
      <div style={styles.crosshairContainer}>
        <div style={styles.crosshairH} />
        <div style={styles.crosshairV} />
      </div>

      {/* Shoot button - bottom right */}
      {!gameOver && (
        <button style={styles.shootBtn} onPointerDown={onShoot}>
          🔫
        </button>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <div style={styles.overlayTitle}>GAME OVER</div>
            <div style={styles.overlayScore}>Score: {score}</div>
            <button style={styles.restartBtn} onClick={onRestart}>
              ↺ Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  hud: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
    pointerEvents: "none",
  },
  score: {
    position: "absolute",
    top: 16,
    left: 16,
    color: "#fff",
    fontSize: "1.4rem",
    fontWeight: "bold",
    textShadow: "0 0 6px #000",
    fontFamily: "monospace",
  },
  health: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: "1.4rem",
    textShadow: "0 0 6px #000",
  },
  crosshairContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: 40,
    height: 40,
  },
  crosshairH: {
    position: "absolute",
    top: "50%",
    left: 0,
    width: "100%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
    transform: "translateY(-50%)",
    borderRadius: 1,
  },
  crosshairV: {
    position: "absolute",
    left: "50%",
    top: 0,
    height: "100%",
    width: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
    transform: "translateX(-50%)",
    borderRadius: 1,
  },
  shootBtn: {
    position: "absolute",
    bottom: 32,
    right: 32,
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,50,50,0.55)",
    fontSize: "2rem",
    cursor: "pointer",
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 16px rgba(255,80,80,0.6)",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "all",
  },
  overlayBox: {
    backgroundColor: "rgba(20,20,20,0.9)",
    border: "2px solid #ff3333",
    borderRadius: 16,
    padding: "2rem 3rem",
    textAlign: "center",
    color: "#fff",
  },
  overlayTitle: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#ff3333",
    marginBottom: 8,
    fontFamily: "monospace",
    letterSpacing: 4,
  },
  overlayScore: {
    fontSize: "1.2rem",
    marginBottom: 20,
    color: "#ccc",
  },
  restartBtn: {
    padding: "0.6rem 2rem",
    fontSize: "1.1rem",
    backgroundColor: "#ff3333",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
};
