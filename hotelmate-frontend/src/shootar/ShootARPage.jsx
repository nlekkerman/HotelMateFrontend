import React, { useRef, useState, useCallback } from "react";
import CameraLayer from "./CameraLayer.jsx";
import ThreeLayer from "./ThreeLayer.jsx";
import HUD from "./HUD.jsx";
import { CONFIG } from "./config.js";

export default function ShootARPage() {
  const threeRef = useRef(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(CONFIG.MAX_HEALTH);
  const [gameOver, setGameOver] = useState(false);

  const handleShoot = useCallback(() => {
    threeRef.current?.shoot();
  }, []);

  const handleRestart = useCallback(() => {
    setScore(0);
    setHealth(CONFIG.MAX_HEALTH);
    setGameOver(false);
    threeRef.current?.restart();
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
  }, []);

  return (
    <div style={styles.container}>
      <CameraLayer />
      <ThreeLayer
        ref={threeRef}
        onScoreChange={setScore}
        onHealthChange={setHealth}
        onGameOver={handleGameOver}
      />
      <HUD
        score={score}
        health={health}
        onShoot={handleShoot}
        gameOver={gameOver}
        onRestart={handleRestart}
      />
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#000",
  },
};
