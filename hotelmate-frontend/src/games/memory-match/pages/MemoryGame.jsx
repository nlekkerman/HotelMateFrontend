import { useState, useEffect, useRef } from "react";
import Card from "../components/Card";
import backImg from "../assets/images/card-back.png";
import { memoryGameAPI } from "@/services/memoryGameAPI";
import GameStats from "../components/GameStats";
import Leaderboard from "../components/Leaderboard";
import TournamentList from "../components/TournamentList";

// 🎭 Smileys
import alienChill from "../assets/images/smileys/alien-chill.png";
import alien from "../assets/images/smileys/alien.png";
import blarb from "../assets/images/smileys/blarb.png";
import blib from "../assets/images/smileys/blib.png";
import blurb from "../assets/images/smileys/blurb.png";
import cute from "../assets/images/smileys/cute.png";
import face from "../assets/images/smileys/face.png";
import fox from "../assets/images/smileys/fox.png";
import hihi from "../assets/images/smileys/hihi.png";
import hit2 from "../assets/images/smileys/hit (2).png";
import hit from "../assets/images/smileys/hit.png";
import iceman from "../assets/images/smileys/iceman.png";
import miss from "../assets/images/smileys/miss.png";
import smiley from "../assets/images/smileys/smiley.png";

// 🎵 Sounds
import correctSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";
import wrongSoundFile from "@/games/whack-a-mole/assets/sounds/iihh.wav";
import winSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";

const allSmileys = [
  alienChill, alien, blarb, blib, blurb, cute, face,
  fox, hihi, hit2, hit, iceman, miss, smiley
];

// Helper: get images per difficulty
const getImagesForDifficulty = (level) => {
  const shuffled = [...allSmileys].sort(() => Math.random() - 0.5);
  if (level === "easy") return shuffled.slice(0, 4);
  if (level === "intermediate") return shuffled.slice(0, 7);
  return shuffled; // hard = all
};

// Custom hook for game logic
function useMemoryGame(images) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  const resetGame = () => {
    const shuffled = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({ id: index, img }));
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setLastAction(null);
  };

  useEffect(() => {
    resetGame();
  }, [images]);

  const handleFlip = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].img === cards[second].img) {
        setMatched((prev) => [...prev, first, second]);
        setLastAction("match");
      } else {
        setLastAction("mismatch");
      }
      setTimeout(() => setFlipped([]), 800);
    }
  };

  return { cards, flipped, matched, handleFlip, resetGame, lastAction };
}

export default function MemoryGame({ tournamentId = null }) {
  const [difficulty, setDifficulty] = useState("easy");
  const [images, setImages] = useState(getImagesForDifficulty("easy"));
  const { cards, flipped, matched, handleFlip, resetGame, lastAction } = useMemoryGame(images);

  // Game state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, completed, saving
  const [startTime, setStartTime] = useState(Date.now());
  const [moves, setMoves] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [currentView, setCurrentView] = useState('game');

  // Track moves
  useEffect(() => {
    if (flipped.length === 1) {
      setMoves(prev => prev + 1);
    }
  }, [flipped]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Sounds
  const correctSound = useRef(new Audio(correctSoundFile));
  const wrongSound = useRef(new Audio(wrongSoundFile));
  const winSound = useRef(new Audio(winSoundFile));

  useEffect(() => {
    if (lastAction === "match") correctSound.current.play();
    if (lastAction === "mismatch") wrongSound.current.play();
  }, [lastAction]);

  // Handle game completion
  useEffect(() => {
    if (matched.length && matched.length === cards.length) {
      setIsRunning(false);
      handleGameComplete();
      winSound.current.play();
    }
  }, [matched, cards]);

  const handleGameComplete = async () => {
    const endTime = Date.now();
    const timeSeconds = Math.floor((endTime - startTime) / 1000);
    
    setGameState('saving');
    
    try {
      const gameSession = await memoryGameAPI.saveGameSession({
        difficulty,
        time_seconds: timeSeconds,
        moves_count: moves,
        completed: true,
        tournament: tournamentId // if playing in tournament
      });
      
      setFinalScore(gameSession.score);
      setGameState('completed');
      
      // Show success message
      const isNewBest = checkIfNewBest(gameSession);
      const message = `🎉 Game completed! Score: ${gameSession.score} points${isNewBest ? ' - New Personal Best!' : ''}`;
      alert(message);
      
    } catch (error) {
      console.error('Failed to save game:', error);
      const localScore = memoryGameAPI.calculateScore(difficulty, timeSeconds, moves);
      setFinalScore(localScore);
      setGameState('completed');
      alert('Game completed! Saved locally and will sync when online.');
    }
  };

  const checkIfNewBest = (gameSession) => {
    const key = `best_${gameSession.difficulty}_score`;
    const previousBest = localStorage.getItem(key);
    if (!previousBest || gameSession.score > parseInt(previousBest)) {
      localStorage.setItem(key, gameSession.score.toString());
      return true;
    }
    return false;
  };

  const handleReset = () => {
    resetGame();
    setTime(0);
    setIsRunning(true);
    setGameState('playing');
    setStartTime(Date.now());
    setMoves(0);
    setFinalScore(0);
  };

  const handleDifficultyChange = (level) => {
    setDifficulty(level);
    setImages(getImagesForDifficulty(level));
    handleReset();
  };

  // Auto-sync pending sessions and migrate old data on mount
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        await memoryGameAPI.migrateLocalStorageData();
        await memoryGameAPI.syncPendingSessions();
      } catch (error) {
        console.error('Failed to initialize API:', error);
      }
    };
    
    initializeAPI();
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-warning bg-opacity-25 py-5">
      <h1 className="display-5 fw-bold mb-4 text-center">🧠 Memory Match Game 🧠</h1>

      {/* Navigation */}
      <div className="btn-group mb-4" role="group" aria-label="Game sections">
        {['game', 'stats', 'leaderboard', 'tournaments'].map((view) => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`btn btn-${currentView === view ? "primary" : "outline-primary"} text-capitalize`}
          >
            {view === 'stats' ? 'My Stats' : view}
          </button>
        ))}
      </div>

      {currentView === 'game' && (
        <>
          {/* Timer and Game Info */}
          <div className="fs-5 fw-semibold mb-3 text-dark">
            ⏱ Time: <span className="text-primary">{formatTime(time)}</span>
            {moves > 0 && <span className="ms-3">🔄 Moves: {moves}</span>}
            {gameState === 'saving' && <span className="ms-3 text-warning">💾 Saving...</span>}
            {tournamentId && <span className="ms-3 text-info">🏆 Tournament Mode</span>}
          </div>

          {/* Difficulty Selector */}
          <div className="btn-group mb-4" role="group" aria-label="Difficulty levels">
            {["easy", "intermediate", "hard"].map((level) => (
              <button
                key={level}
                onClick={() => handleDifficultyChange(level)}
                className={`btn btn-${difficulty === level ? "primary" : "outline-primary"} text-capitalize`}
                disabled={gameState === 'saving'}
              >
                {level} ({level === 'easy' ? '4x4' : level === 'intermediate' ? '6x6' : '8x8'})
              </button>
            ))}
          </div>

          {/* Game Grid */}
          <div
            className="d-grid justify-content-center align-items-center"
            style={{
              gridTemplateColumns:
                difficulty === "easy"
                  ? "repeat(4, 90px)"
                  : difficulty === "intermediate"
                  ? "repeat(7, 80px)"
                  : "repeat(8, 70px)",
              gap: "1.2rem",
              maxWidth: "650px",
              width: "100%",
              padding: "1rem",
            }}
          >
            {cards.map((card, index) => (
              <Card
                key={card.id}
                img={card.img}
                backImg={backImg}
                flipped={flipped.includes(index) || matched.includes(index)}
                onClick={() => handleFlip(index)}
              />
            ))}
          </div>

          {gameState === 'completed' && (
            <div className="mt-4 fs-4 fw-semibold text-success text-center">
              🎉 You Win! 🎉
              <div className="fs-6 mt-2">
                Time: {formatTime(time)} | Moves: {moves} | Score: {finalScore}
              </div>
            </div>
          )}

          <button 
            onClick={handleReset} 
            className="btn btn-success mt-4 px-4 py-2 shadow-sm"
            disabled={gameState === 'saving'}
          >
            Restart 🔁
          </button>
        </>
      )}

      {currentView === 'stats' && <GameStats />}
      {currentView === 'leaderboard' && <Leaderboard difficulty={difficulty} tournamentId={tournamentId} />}
      {currentView === 'tournaments' && <TournamentList onTournamentSelect={(id) => setCurrentView('game')} />}
    </div>
  );
}
