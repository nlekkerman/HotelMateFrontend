import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWhackAMole } from "@/games/whack-a-mole/hooks/useWhackAMole";
import { useGameHighScore } from "@/games/whack-a-mole/hooks/useGameHighScore";
import WhackAMoleLeaderboard from "@/games/whack-a-mole/components/WhackAMoleLeaderboard";

import smiley from "@/games/whack-a-mole/assets/images/smiley.png";
import bgImage from "@/games/whack-a-mole/assets/images/mole-gameboard-background.jpg";

export default function GamePage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [bgMusic, setBgMusic] = useState(true);
  const [effects, setEffects] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [topEligible, setTopEligible] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState(null);
  const [refreshLeaderboard, setRefreshLeaderboard] = useState(0);

  const gameSlug = "whack-a-mole";

  const {
    holes,
    feedback,
    holeColors,
    score,
    timeLeft,
    showModal,
    setShowModal,
    startGame,
    handleClick,
    gameOver,
  } = useWhackAMole(difficulty, bgMusic, effects);

  const { isScoreTop, submitScore } = useGameHighScore(gameSlug);

  // Check eligibility when game ends
  useEffect(() => {
    if (!gameOver) return;

    const checkEligibility = async () => {
      const eligible = await isScoreTop(score);
      setTopEligible(eligible);
    };

    checkEligibility();
  }, [gameOver, score, isScoreTop]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return alert("Enter your name!");

    const saved = await submitScore(score, playerName);
    const scoreObject = saved?.data ?? saved;

    if (scoreObject) {
      // Optimistically highlight the new score
      setCurrentScore({ ...scoreObject, player_name: playerName, score });
      setScoreSubmitted(true);

      // Refresh leaderboard
      setRefreshLeaderboard(prev => prev + 1);
      setShowModal(true);
    }
    setPlayerName("");
  };
const handlePlayAgain = () => {
  setScoreSubmitted(false);
  setTopEligible(false);
  setCurrentScore(null);
  setPlayerName("");
  startGame();
};
  return (
    <div
      className="gamepage-container"
      style={{
        backgroundImage: `url(${bgImage})`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
        backgroundSize: "cover",
      }}
    >
      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center w-100 mb-3" style={{ maxWidth: "600px" }}>
        <select className="form-select w-auto" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option>Easy</option>
          <option>Intermediate</option>
          <option>Hard</option>
        </select>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${bgMusic ? "btn-success" : "btn-secondary"}`} onClick={() => setBgMusic(!bgMusic)}>🎵</button>
          <button className={`btn btn-sm ${effects ? "btn-success" : "btn-secondary"}`} onClick={() => setEffects(!effects)}>🔊</button>
        </div>
      </div>

      <h1 className="game-title text-center">Hit me You Baby!!</h1>
      <p className="score-text text-center">Score: {score}</p>
      <p className="score-text text-center">Time: {timeLeft}s</p>

      {/* Game Board */}
<div className="gameboard d-flex justify-content-center flex-wrap gap-3 mt-3">
  {holes.map((active, i) => {
    let hitClass = "";
    if (feedback[i] === "correct") hitClass = "hole-correct";
    else if (feedback[i] === "wrong") hitClass = "hole-wrong";

    return (
      <div key={i} className={`hole  ${holeColors[i]}`} onClick={() => handleClick(i)}>

        <motion.img
  src={feedback[i] || smiley} // ✅ use feedback if set
  alt="mole"
  className="mole"
  initial={{ y: 60, opacity: 0 }}
  animate={{
    y: active || feedback[i] ? -50 : 60,
    opacity: active || feedback[i] ? 1 : 0,
  }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
/>

      </div>
    );
  })}
</div>


      <button className="btn custom-button mt-3" onClick={() => navigate("/games")}>Exit</button>

      {/* Game Over Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="p-4 rounded text-center game-over-modal-body">
            <div className="text-center p-4 rounded-4 text-white shadow-lg" style={{ maxWidth: "400px", margin: "auto" }}>
              <h2 className="display-5 fw-bold mb-3">Game Over!</h2>
              <p className="fs-4 mb-0">Your score: <span className="fw-bold">{score}</span></p>
            </div>

            {topEligible && !scoreSubmitted && (
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="form-control mt-2 mb-2 rounded-pill text-white"
              />
            )}

            {(!topEligible || scoreSubmitted) && (
              <WhackAMoleLeaderboard
                gameSlug={gameSlug}
                currentScore={currentScore}
                refresh={refreshLeaderboard}
              />
            )}

            <div className="d-flex gap-2 justify-content-center mt-3">
              <button className="btn btn-primary" onClick={() => navigate("/games")}>Back to Dashboard</button>
              {topEligible && !scoreSubmitted && <button className="btn btn-success" onClick={handleSubmitScore}>Submit Score</button>}
              <button className="btn btn-secondary" onClick={handlePlayAgain}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
