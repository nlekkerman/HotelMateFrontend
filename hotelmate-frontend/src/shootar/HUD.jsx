// ShootAR — HUD
// Crosshair, shoot button, score, health, and game-over overlay.

import React from "react";

const hudStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 2,
  pointerEvents: "none",
};

const crosshairStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 40,
  height: 40,
};

const scoreStyle = {
  position: "absolute",
  top: 16,
  left: 16,
  color: "#fff",
  fontSize: "1.2rem",
  fontFamily: "monospace",
  textShadow: "0 0 6px rgba(0,0,0,0.8)",
  userSelect: "none",
};

const healthStyle = {
  position: "absolute",
  top: 16,
  right: 16,
  color: "#ff4444",
  fontSize: "1.2rem",
  fontFamily: "monospace",
  textShadow: "0 0 6px rgba(0,0,0,0.8)",
  userSelect: "none",
};

const shootBtnStyle = {
  position: "absolute",
  bottom: 40,
  right: 30,
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "3px solid #fff",
  background: "rgba(255,50,50,0.7)",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: "bold",
  fontFamily: "monospace",
  cursor: "pointer",
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
};

const overlayStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  pointerEvents: "auto",
};

const restartBtnStyle = {
  marginTop: 24,
  padding: "14px 36px",
  fontSize: "1.1rem",
  fontWeight: "bold",
  fontFamily: "monospace",
  background: "#ff4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

function Crosshair() {
  return (
    <svg style={crosshairStyle} viewBox="0 0 40 40">
      <line x1="20" y1="0" x2="20" y2="15" stroke="#fff" strokeWidth="2" opacity="0.8" />
      <line x1="20" y1="25" x2="20" y2="40" stroke="#fff" strokeWidth="2" opacity="0.8" />
      <line x1="0" y1="20" x2="15" y2="20" stroke="#fff" strokeWidth="2" opacity="0.8" />
      <line x1="25" y1="20" x2="40" y2="20" stroke="#fff" strokeWidth="2" opacity="0.8" />
      <circle cx="20" cy="20" r="3" fill="none" stroke="#ff4444" strokeWidth="1.5" />
    </svg>
  );
}

export default function HUD({ score, health, gameOver, onShoot, onRestart }) {
  return (
    <div style={hudStyle}>
      <Crosshair />

      <div style={scoreStyle}>SCORE: {score}</div>
      <div style={healthStyle}>HP: {health}</div>

      {!gameOver && (
        <button
          style={shootBtnStyle}
          onPointerDown={(e) => {
            e.stopPropagation();
            onShoot();
          }}
        >
          FIRE
        </button>
      )}

      {gameOver && (
        <div style={overlayStyle}>
          <div style={{ color: "#ff4444", fontSize: "2.5rem", fontFamily: "monospace", fontWeight: "bold" }}>
            GAME OVER
          </div>
          <div style={{ color: "#fff", fontSize: "1.3rem", fontFamily: "monospace", marginTop: 12 }}>
            Final Score: {score}
          </div>
          <button style={restartBtnStyle} onClick={onRestart}>
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
