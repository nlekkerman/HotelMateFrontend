import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import backImg from "../assets/images/card-back.png";
import GameRules from "../components/GameRules";
import { memoryGameAPI } from "@/services/memoryGameAPI";


// Static images removed - now using API cards from database

// 🎵 Sounds
import correctSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";
import wrongSoundFile from "@/games/whack-a-mole/assets/sounds/iihh.wav";
import winSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";

// Helper: get number of pairs per difficulty
const getPairsForDifficulty = (level) => {
  if (level === "easy") return 8;         // 4x4 grid (8 pairs, 16 cards total)
  if (level === "intermediate") return 12; // 6x4 grid (12 pairs, 24 cards total) - Tournament standard
  return 16;  // hard = 6x4 or 8x3 grid (16 pairs, 32 cards total)
};

// Custom hook for game logic with API cards
function useMemoryGame(difficulty) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGameCards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const pairs = getPairsForDifficulty(difficulty);
      const response = await memoryGameAPI.getGameCards(difficulty, pairs);
      
      // Create card pairs for memory game
      const cardPairs = [];
      response.cards.forEach((card, index) => {
        cardPairs.push(
          { id: `${card.id}a`, pairId: index, cardData: card },
          { id: `${card.id}b`, pairId: index, cardData: card }
        );
      });
      
      // Shuffle cards
      const shuffledCards = cardPairs.sort(() => Math.random() - 0.5)
        .map((card, index) => ({ ...card, gameIndex: index }));
      
      setCards(shuffledCards);
      setFlipped([]);
      setMatched([]);
      setLastAction(null);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load game cards:', error);
      setError('Failed to load cards. Please try again.');
      setLoading(false);
    }
  };

  const resetGame = () => {
    loadGameCards();
  };

  useEffect(() => {
    loadGameCards();
  }, [difficulty]);

  const handleFlip = (gameIndex) => {
    if (flipped.length === 2 || flipped.includes(gameIndex) || matched.includes(gameIndex)) return;
    const newFlipped = [...flipped, gameIndex];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].pairId === cards[second].pairId) {
        setMatched((prev) => [...prev, first, second]);
        setLastAction("match");
      } else {
        setLastAction("mismatch");
      }
      setTimeout(() => setFlipped([]), 800);
    }
  };

  return { cards, flipped, matched, handleFlip, resetGame, lastAction, setLastAction, loading, error };
}

export default function MemoryGame({ tournamentId: propTournamentId = null, currentView: propCurrentView = 'game', practiceMode = false }) {
  // Get tournament ID from URL params if not passed as prop
  const { tournamentId: urlTournamentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tournamentId = propTournamentId || urlTournamentId;
  
  // Always use intermediate difficulty (6x4) - both practice and tournament
  const [difficulty, setDifficulty] = useState("intermediate");
  const { cards, flipped, matched, handleFlip, resetGame, lastAction, setLastAction, loading, error } = useMemoryGame(difficulty);

  // Game state
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, completed, saving
  const [startTime, setStartTime] = useState(Date.now());
  const [moves, setMoves] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [currentView, setCurrentView] = useState(propCurrentView);
  
  // Rules display state
  const [showRules, setShowRules] = useState(false);
  const [hasSeenRules, setHasSeenRules] = useState(false);
  
  // Player info collection for tournament mode
  const [gameStarted, setGameStarted] = useState(false);
  
  // Game mode state
  const [gameMode, setGameMode] = useState(practiceMode ? 'practice' : (tournamentId ? 'tournament' : 'selection'));

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

  // Initialize audio settings
  useEffect(() => {
    const setupAudio = (audio) => {
      audio.preload = 'auto';
      audio.volume = 0.7;
    };
    
    setupAudio(correctSound.current);
    setupAudio(wrongSound.current);
    setupAudio(winSound.current);
  }, []);

  useEffect(() => {
    if (lastAction === "match") {
      correctSound.current.currentTime = 0; // Reset audio to beginning
      correctSound.current.play().catch(e => console.log('Audio play failed:', e));
    }
    if (lastAction === "mismatch") {
      wrongSound.current.currentTime = 0; // Reset audio to beginning
      wrongSound.current.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Reset lastAction after a short delay to allow for consecutive sounds
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 100);
      return () => clearTimeout(timer);
    }
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
    const localScore = memoryGameAPI.calculateScore(difficulty, timeSeconds, moves);
    
    setFinalScore(localScore);
    
    if (gameMode === 'practice') {
      // Practice mode - save to localStorage only
      const practiceGame = {
        difficulty,
        timeSeconds,
        moves,
        score: localScore,
        timestamp: Date.now()
      };
      
      const existingGames = JSON.parse(localStorage.getItem('practiceGames') || '[]');
      existingGames.push(practiceGame);
      localStorage.setItem('practiceGames', JSON.stringify(existingGames));
      
      setGameState('completed');
      alert(`� Practice completed! Score: ${localScore} points`);
      
    } else if (gameMode === 'tournament') {
      // Tournament mode - save anonymously (free kids tournament)
      setGameState('completed');
      saveTournamentScore();
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

  // Save tournament score anonymously (free kids tournament)
  const saveTournamentScore = async () => {
    setGameState('saving');
    
    try {
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      // Create anonymous session for kids tournament
      const gameSession = await memoryGameAPI.saveGameSession({
        difficulty,
        time_seconds: timeSeconds,
        moves_count: moves,
        completed: true,
        tournament: tournamentId || 'kids-tournament', // Use generic tournament ID for kids
        player_name: `Player ${Date.now().toString().slice(-4)}`, // Anonymous player
        room_number: "Kids Tournament" // No real room number needed
      });
      
      alert(`🎉 Fantastic job!\n\nYour score: ${gameSession.score} points\nTime: ${formatTime(timeSeconds)}\nMoves: ${moves}\n\n🎁 You've earned a symbolic reward for playing!`);
      
      // Navigate back to games after showing success
      setTimeout(() => {
        navigate('/games');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save tournament score:', error);
      // Even if API fails, show success message for kids
      alert(`🎮 Amazing game!\n\nYour score: ${finalScore} points\nTime: ${formatTime(time)}\nMoves: ${moves}\n\n🌟 Great job playing!`);
      
      setTimeout(() => {
        navigate('/games');
      }, 3000);
    }
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

  const startGame = () => {
    setGameStarted(true);
    setIsRunning(true);
    setStartTime(Date.now());
    setTime(0);
    setMoves(0);
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

  // Show rules automatically for tournament mode
  useEffect(() => {
    if (tournamentId && gameMode === 'tournament' && gameStarted && !hasSeenRules) {
      setShowRules(true);
      setHasSeenRules(true);
    }
  }, [tournamentId, gameMode, gameStarted, hasSeenRules]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // QR Code Tournament Welcome Screen for Kids
  if (tournamentId && gameMode === 'tournament' && !gameStarted) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-gradient" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: 1050}}>
        <div className="text-center text-white px-3" style={{maxWidth: '90vw'}}>
          <h1 className="display-4 fw-bold mb-4 text-shadow">🎮 Kids Tournament!</h1>
          <div className="card bg-white bg-opacity-90 shadow-lg mx-auto mb-4" style={{maxWidth: '400px'}}>
            <div className="card-body p-4">
              <h3 className="text-primary mb-3">📱 Welcome!</h3>
              <div className="text-start">
                <p className="mb-2">🎯 <strong>Your Mission:</strong> Find matching pairs</p>
                <p className="mb-2">📱 <strong>Mobile Optimized:</strong> Perfect for your phone</p>
                <p className="mb-2">🎁 <strong>Free & Fun:</strong> No registration needed</p>
                <p className="mb-2">🏆 <strong>Show Off:</strong> Get on the champions board</p>
              </div>
            </div>
          </div>
          
          <div className="d-grid gap-3" style={{maxWidth: '300px', margin: '0 auto'}}>
            <button 
              className="btn btn-success btn-lg py-3 fw-bold"
              onClick={() => {
                setGameStarted(true);
                startGame();
              }}
              style={{fontSize: '1.2rem'}}
            >
              🚀 START PLAYING!
            </button>
          </div>
          
          <p className="mt-4 small text-white-50">
            💡 Tip: Turn your phone to landscape mode for the best experience!
          </p>
        </div>
      </div>
    );
  }

  // Mode Selection Screen (only for non-QR access)
  if (gameMode === 'selection') {
    return (
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-warning bg-opacity-25 py-5">
        <h1 className="display-4 fw-bold mb-4 text-center">🧠 Memory Match Game 🧠</h1>
        
        <div className="card shadow-lg" style={{maxWidth: '500px', width: '100%'}}>
          <div className="card-body text-center p-5">
            <h3 className="card-title mb-4">Choose Game Mode</h3>
            
            <div className="d-grid gap-3">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => setGameMode('practice')}
              >
                🎮 Practice Mode
                <div className="small text-light mt-1">Play for fun • Scores saved locally • No time limits</div>
              </button>
              
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/games/memory-match/stats')}
              >
                📊 View Practice Statistics
              </button>
              
              <button 
                className="btn btn-success btn-lg"
                onClick={() => setGameMode('tournament')}
              >
                🏆 Kids Tournament
                <div className="small text-light mt-1">Free fun tournament • No registration • Symbolic rewards only</div>
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-light rounded">
              <small className="text-muted">
                <strong>All games use 6x4 grid format (12 pairs, 24 cards)</strong><br/>
                Practice to improve your skills before entering tournaments!
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use full screen layout for QR tournament access (kids on mobile)
  const isQRTournament = tournamentId && gameMode === 'tournament';
  
  return (
    <div className={`${isQRTournament ? 'position-fixed top-0 start-0 w-100 h-100 overflow-auto' : 'container-fluid min-vh-100'} d-flex flex-column align-items-center justify-content-center ${isQRTournament ? 'bg-gradient' : 'bg-warning bg-opacity-25'} ${isQRTournament ? 'py-2' : 'py-5'}`} style={isQRTournament ? {background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: 1050} : {}}>
      <h1 className={`${isQRTournament ? 'display-6' : 'display-5'} fw-bold mb-3 text-center ${isQRTournament ? 'text-white text-shadow' : ''}`}>🧠 Memory Match Game 🧠</h1>

      {/* Mode Banner */}
      {gameMode === 'practice' && !isQRTournament && (
        <div className="alert alert-primary text-center mb-4" style={{maxWidth: '600px'}}>
          <h4>🎮 Practice Mode</h4>
          <p className="mb-0">Sharpen your skills! Scores are saved locally for your reference.</p>
        </div>
      )}
      
      {gameMode === 'tournament' && isQRTournament && (
        <div className="alert alert-light text-center mb-3 mx-2" style={{maxWidth: '90vw'}}>
          <h5 className="text-primary mb-2">🏆 Kids Tournament</h5>
          <p className="mb-0 small">Find all matching pairs as fast as you can! 🎮✨</p>
        </div>
      )}
      
      {gameMode === 'tournament' && !isQRTournament && (
        <div className="alert alert-success text-center mb-4" style={{maxWidth: '600px'}}>
          <h4>🏆 Kids Tournament</h4>
          <p className="mb-0">Free fun tournament! Play for symbolic rewards and the joy of learning! 🎮🎁</p>
        </div>
      )}

      {/* Game Controls */}
      <div className="mb-4 d-flex gap-2 justify-content-center flex-wrap">
        {!isQRTournament && (
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setGameMode('selection')}
          >
            ← Back to Mode Selection
          </button>
        )}
        <button 
          className="btn btn-info"
          onClick={() => setShowRules(true)}
        >
          📋 Rules & Tips
        </button>
      </div>

      <>
          {/* Timer and Game Info - Mobile Optimized for QR Tournament */}
          {isQRTournament ? (
            <div className="d-flex justify-content-center gap-2 mb-3 px-2">
              <div className="bg-white bg-opacity-90 rounded px-3 py-2 text-center flex-fill" style={{maxWidth: '100px'}}>
                <div className="small fw-bold text-muted">⏱️ TIME</div>
                <div className="h6 mb-0 text-primary">{formatTime(time)}</div>
              </div>
              <div className="bg-white bg-opacity-90 rounded px-3 py-2 text-center flex-fill" style={{maxWidth: '100px'}}>
                <div className="small fw-bold text-muted">🎯 MOVES</div>
                <div className="h6 mb-0 text-primary">{moves}</div>
              </div>
              <div className="bg-white bg-opacity-90 rounded px-3 py-2 text-center flex-fill" style={{maxWidth: '100px'}}>
                <div className="small fw-bold text-muted">✅ FOUND</div>
                <div className="h6 mb-0 text-primary">{matched.length / 2}/{getPairsForDifficulty(difficulty)}</div>
              </div>
              {gameState === 'saving' && (
                <div className="bg-warning bg-opacity-90 rounded px-2 py-2 text-center">
                  <div className="small fw-bold">💾 SAVING</div>
                </div>
              )}
            </div>
          ) : (
            <div className="fs-5 fw-semibold mb-3 text-dark">
              ⏱ Time: <span className="text-primary">{formatTime(time)}</span>
              {moves > 0 && <span className="ms-3">🔄 Moves: {moves}</span>}
              {gameState === 'saving' && <span className="ms-3 text-warning">💾 Saving...</span>}
              {tournamentId && <span className="ms-3 text-info">🏆 Tournament Mode</span>}
            </div>
          )}

          {/* Game Format Info */}
          {!isQRTournament && (
            <div className="text-center mb-4">
              <div className={`badge ${gameMode === 'tournament' ? 'bg-success' : 'bg-primary'} fs-6 px-3 py-2`}>
                {gameMode === 'tournament' ? '🏆 Tournament' : '🎮 Practice'} Mode: 3x4 Grid (6 pairs)
              </div>
            </div>
          )}

          {/* Game Grid - Mobile Responsive */}
          <div
            className="d-grid justify-content-center align-items-center"
            style={{
              gridTemplateColumns: isQRTournament 
                ? "repeat(6, minmax(55px, 1fr))" // Mobile 6x4 grid for tournament (12 pairs)
                : difficulty === "easy"
                ? "repeat(4, 90px)"  // 4x4 grid (8 pairs)
                : difficulty === "intermediate"
                ? "repeat(6, 75px)"  // 6x4 grid (12 pairs)
                : "repeat(6, 70px)", // 6x5+ grid for hard (16 pairs)
              gap: isQRTournament ? "0.8rem" : "1.2rem",
              maxWidth: isQRTournament ? "95vw" : "650px",
              width: "100%",
              padding: isQRTournament ? "0.5rem" : "1rem",
            }}
          >
            {loading ? (
              <div className="text-center">Loading cards...</div>
            ) : error ? (
              <div className="text-center text-danger">
                <p>{error}</p>
                <button onClick={resetGame} className="btn btn-primary">
                  Retry
                </button>
              </div>
            ) : (
              cards.map((card, index) => (
                <Card
                  key={card.id}
                  img={card.cardData.image_url}
                  backImg={backImg}
                  flipped={flipped.includes(index) || matched.includes(index)}
                  onClick={() => handleFlip(index)}
                />
              ))
            )}
          </div>

          {gameState === 'completed' && (
            <div className="mt-4 fs-4 fw-semibold text-success text-center">
              🎉 You Win! 🎉
              <div className="fs-6 mt-2">
                Time: {formatTime(time)} | Moves: {moves} | Score: {finalScore}
              </div>
              {gameMode === 'practice' && (
                <div className="fs-6 mt-2 text-muted">
                  Score saved locally for practice tracking
                </div>
              )}
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

      {/* Game Rules Modal */}
      <GameRules 
        isVisible={showRules}
        onClose={() => setShowRules(false)}
        isQRTournament={isQRTournament}
      />
    </div>
  );
}
