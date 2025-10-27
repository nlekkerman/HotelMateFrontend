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
  if (level === "easy") return 6;         // 3x4 grid (6 pairs, 12 cards total)
  if (level === "intermediate") return 6; // 3x4 grid (6 pairs, 12 cards total) - Tournament standard
  return 8;  // hard = 4x4 grid (8 pairs, 16 cards total)
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
  // Get tournament info from URL params if not passed as prop
  const { tournamentId: urlTournamentId, hotelSlug, tournamentSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Tournament state
  const [tournament, setTournament] = useState(null);
  const [loadingTournament, setLoadingTournament] = useState(false);
  
  // Determine tournament ID - either from props, URL params, or fetch by slug
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
  const [gameStarted, setGameStarted] = useState(tournamentId ? true : false); // Start immediately for tournaments
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  // Game mode state
  const [gameMode, setGameMode] = useState(practiceMode ? 'practice' : (tournamentId ? 'tournament' : 'selection'));

  // Fetch tournament data if accessing via hotel/tournament slug
  useEffect(() => {
    if (hotelSlug && tournamentSlug && !tournamentId) {
      setLoadingTournament(true);
      memoryGameAPI.getTournamentBySlug(hotelSlug, tournamentSlug)
        .then(tournamentData => {
          if (tournamentData) {
            setTournament(tournamentData);
            setGameMode('tournament');
            setGameStarted(true);
          } else {
            console.error('Tournament not found');
            navigate('/games/memory-match');
          }
        })
        .catch(error => {
          console.error('Error fetching tournament:', error);
          navigate('/games/memory-match');
        })
        .finally(() => {
          setLoadingTournament(false);
        });
    }
  }, [hotelSlug, tournamentSlug, tournamentId, navigate]);

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
      // Practice mode - use backend practice endpoint for score calculation only
      try {
        const practiceResult = await memoryGameAPI.savePracticeSession({
          difficulty,
          time_seconds: timeSeconds,
          moves_count: moves
        });
        
        // Save to localStorage for local tracking
        const practiceGame = {
          difficulty,
          timeSeconds,
          moves,
          score: practiceResult.score,
          timestamp: Date.now()
        };
        
        const existingGames = JSON.parse(localStorage.getItem('practiceGames') || '[]');
        existingGames.push(practiceGame);
        localStorage.setItem('practiceGames', JSON.stringify(existingGames.slice(-10))); // Keep last 10
        
        setGameState('completed');
        alert(`🎯 Practice completed! Score: ${practiceResult.score} points`);
      } catch (error) {
        // Fallback to local calculation if API fails
        const practiceGame = {
          difficulty,
          timeSeconds,
          moves,
          score: localScore,
          timestamp: Date.now()
        };
        
        const existingGames = JSON.parse(localStorage.getItem('practiceGames') || '[]');
        existingGames.push(practiceGame);
        localStorage.setItem('practiceGames', JSON.stringify(existingGames.slice(-10)));
        
        setGameState('completed');
        alert(`🎯 Practice completed! Score: ${localScore} points (offline)`);
      }
      
    } else if (gameMode === 'tournament') {
      // Tournament mode - show player form to collect name and room number
      setGameState('completed');
      setShowPlayerForm(true);
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

  // Save tournament score with player info (collected after game completion)
  const saveTournamentScore = async () => {
    setGameState('saving');
    
    try {
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      // Use the new submit_score endpoint from backend instructions
      const gameSession = await memoryGameAPI.submitTournamentScore(tournamentId, {
        player_name: playerName || `Player ${Date.now().toString().slice(-4)}`,
        room_number: roomNumber || "Not specified",
        time_seconds: timeSeconds,
        moves_count: moves
      });
      
      const playerInfo = playerName ? ` by ${playerName}` : '';
      const rankInfo = gameSession.rank ? ` (Rank: #${gameSession.rank})` : '';
      alert(`🎉 Score Submitted${playerInfo}!\n\nYour score: ${gameSession.score} points${rankInfo}\nTime: ${formatTime(timeSeconds)}\nMoves: ${moves}\n\n🏆 ${gameSession.message || 'Check the leaderboard to see your ranking!'}`);
      
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
    setShowPlayerForm(false);
    setPlayerName('');
    setRoomNumber('');
  };

  const startGame = () => {
    setGameStarted(true);
    setIsRunning(true);
    setStartTime(Date.now());
    setTime(0);
    setMoves(0);
  };

  const handlePlayerFormSubmit = () => {
    if (!playerName.trim()) {
      alert('Please enter your name to continue');
      return;
    }
    setShowPlayerForm(false);
    saveTournamentScore();
  };

  const handleSkipPlayerForm = () => {
    setPlayerName('');
    setRoomNumber('');
    setShowPlayerForm(false);
    saveTournamentScore();
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
                <strong>All games use 4x3 grid format (6 pairs, 12 cards)</strong><br/>
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
                ? "repeat(4, minmax(60px, 1fr))" // Mobile 4x3 grid for tournament (6 pairs, 12 cards)
                : difficulty === "easy"
                ? "repeat(4, 90px)"  // 4x3 grid (6 pairs, 12 cards)
                : difficulty === "intermediate"
                ? "repeat(4, 90px)"  // 4x3 grid (6 pairs, 12 cards)
                : "repeat(4, 85px)", // 4x4 grid for hard (8 pairs, 16 cards)
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

      {/* Player Info Modal for Tournament */}
      {showPlayerForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060}}>
          <div className="card shadow-lg mx-3" style={{maxWidth: '400px', width: '100%'}}>
            <div className="card-header bg-success text-white text-center">
              <h4 className="mb-0">🎉 Congratulations!</h4>
              <p className="mb-0 small">You completed the tournament!</p>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="fs-5 fw-bold text-success">Final Score: {finalScore} points</div>
                <div className="text-muted">Time: {formatTime(time)} | Moves: {moves}</div>
              </div>
              
              <p className="text-center mb-4">
                <strong>Enter your details to appear on the leaderboard:</strong>
              </p>
              
              <div className="mb-3">
                <label className="form-label">Your Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                />
              </div>
              
              <div className="mb-4">
                <label className="form-label">Room Number <span className="text-muted">(optional)</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g., 205"
                  maxLength={10}
                />
              </div>
              
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-success btn-lg"
                  onClick={handlePlayerFormSubmit}
                  disabled={!playerName.trim()}
                >
                  🏆 Submit Score to Leaderboard
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={handleSkipPlayerForm}
                >
                  Skip (Play Anonymously)
                </button>
              </div>
              
              <div className="text-center mt-3">
                <small className="text-muted">
                  Your information is only used for the tournament leaderboard
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Rules Modal */}
      <GameRules 
        isVisible={showRules}
        onClose={() => setShowRules(false)}
        isQRTournament={isQRTournament}
      />
    </div>
  );
}
