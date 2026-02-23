import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { createGameEngine } from "./GameEngine.js";

const ThreeLayer = forwardRef(function ThreeLayer(
  { onScoreChange, onHealthChange, onGameOver },
  ref
) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useImperativeHandle(ref, () => ({
    shoot: () => engineRef.current?.shoot(),
    restart: () => engineRef.current?.restart(),
  }));

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = createGameEngine({
      canvas: canvasRef.current,
      onScoreChange,
      onHealthChange,
      onGameOver,
    });

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [onScoreChange, onHealthChange, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
});

export default ThreeLayer;
