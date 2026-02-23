// ShootAR — Main page component
// Fully isolated fullscreen container. No dependency on existing app layout.

import React, { useState, useRef, useCallback, useEffect } from "react";
import CameraLayer from "./CameraLayer.jsx";
import ThreeLayer from "./ThreeLayer.jsx";
import HUD from "./HUD.jsx";
import GameEngine from "./GameEngine.js";

const containerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  background: "#000",
  zIndex: 99999,
  touchAction: "none",
  userSelect: "none",
};

export default function ShootARPage() {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0); // force full remount on restart
  const threeRef = useRef(null);

  const gameEngineRef = useRef(null);
  if (!gameEngineRef.current) {
    gameEngineRef.current = new GameEngine({
      onScoreChange: (s) => setScore(s),
      onHealthChange: (h) => setHealth(h),
      onGameOver: () => setGameOver(true),
    });
  }

  const gameEngine = gameEngineRef.current;

  // Start game on mount
  useEffect(() => {
    gameEngine.start();
    setGameOver(false);
    return () => gameEngine.stop();
  }, [gameKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShoot = useCallback(() => {
    if (threeRef.current) {
      threeRef.current.shoot();
    }
  }, []);

  const handleRestart = useCallback(() => {
    gameEngine.reset();
    setGameOver(false);
    setGameKey((k) => k + 1); // remount Three layer to respawn enemies
  }, [gameEngine]);

  return (
    <div style={containerStyle}>
      <CameraLayer />
      <ThreeLayer key={gameKey} ref={threeRef} gameEngine={gameEngine} />
      <HUD
        score={score}
        health={health}
        gameOver={gameOver}
        onShoot={handleShoot}
        onRestart={handleRestart}
      />
    </div>
  );
}
