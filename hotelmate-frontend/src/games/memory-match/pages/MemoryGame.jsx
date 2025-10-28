import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import backImg from "../assets/images/card-back.png";
import GameRules from "../components/GameRules";
import PlayerInfoForm from "../components/PlayerInfoForm";
import { memoryGameAPI } from "@/services/memoryGameAPI";
import { usePersonalBest } from "../hooks/usePersonalBest";
import { PlayerTokenManager } from "@/utils/playerToken";


// Static images removed - now using API cards from database

// 🎵 Sounds
import correctSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";
import wrongSoundFile from "@/games/whack-a-mole/assets/sounds/iihh.wav";
import winSoundFile from "@/games/whack-a-mole/assets/sounds/yes.wav";

// Fixed configuration: Always 6 pairs for 3x4 grid (no difficulty selection)
const FIXED_PAIRS_COUNT = 6; // Always 6 pairs for 3x4 grid (12 total cards)

// Custom hook for game logic with API cards (NO DIFFICULTY - fixed 3x4 grid)
function useMemoryGame() {
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
      // Always load 6 pairs for 3x4 grid
      const response = await memoryGameAPI.getGameCards();
      
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
      console.error('❌ Backend API failed to load game cards:', error);
      setError(`Backend API Error: ${error.message}. Game cannot start without backend cards.`);
      setLoading(false);
    }
  };

  const resetGame = () => {
    loadGameCards();
  };

  useEffect(() => {
    loadGameCards();
  }, []); // No dependency on difficulty since we removed it

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
  
  // Fixed 3x4 grid - no difficulty selection needed
  const { cards, flipped, matched, handleFlip, resetGame, lastAction, setLastAction, loading, error } = useMemoryGame();

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
  
  // Player info collection for tournament mode with token support
  const [gameStarted, setGameStarted] = useState(true); // Always start immediately - no welcome screen
  const [showPlayerForm, setShowPlayerForm] = useState(false); // Only show form for high scores after game completion
  const [playerName, setPlayerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [playerToken, setPlayerToken] = useState('');
  const [hasPlayedBefore, setHasPlayedBefore] = useState(false);
  
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
      correctSound.current.play().catch(e => {/* Audio play failed */});
    }
    if (lastAction === "mismatch") {
      wrongSound.current.currentTime = 0; // Reset audio to beginning
      wrongSound.current.play().catch(e => {/* Audio play failed */});
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
    const localScore = memoryGameAPI.calculateScore(timeSeconds, moves);
    
    setFinalScore(localScore);
    
    if (gameMode === 'practice') {
      // Practice mode - use backend practice endpoint for score calculation only
      try {
        const practiceResult = await memoryGameAPI.savePracticeSession({
          time_seconds: timeSeconds,
          moves_count: moves
        });
        
        // Save to localStorage for local tracking
        const practiceGame = {
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
      // Tournament mode - check if it's a high score first
      setGameState('completed');
      
      try {
        const highScoreCheck = await memoryGameAPI.isHighScore(tournamentId, timeSeconds, moves);
        
        if (highScoreCheck.isHighScore) {
          // Show player form to collect name and room number
          setShowPlayerForm(true);
        } else {
          // Just show completion message without collecting player info
          alert(`🎮 Game completed!\n\nYour score: ${localScore} points\nTime: ${formatTime(timeSeconds)}\nMoves: ${moves}\n\n${highScoreCheck.reason}\nKeep practicing to make it to the leaderboard! 💪`);
          
          // Navigate back to tournament dashboard after showing message
          setTimeout(() => {
            navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to check high score status:', error);
        // If check fails, default to showing the form to be safe
        setShowPlayerForm(true);
      }
    }
  };

  const checkIfNewBest = (gameSession) => {
    const key = `best_score`; // No difficulty differentiation - single best score
    const previousBest = localStorage.getItem(key);
    if (!previousBest || gameSession.score > parseInt(previousBest)) {
      localStorage.setItem(key, gameSession.score.toString());
      return true;
    }
    return false;
  };

  // Save tournament score with player info and token (collected after game completion)
  const saveTournamentScore = async () => {
    setGameState('saving');
    
    try {
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      // Prepare score data with token for backend tracking
      const scoreData = {
        player_token: playerToken,
        player_name: playerName || `Player ${Date.now().toString().slice(-4)}`,
        room_number: roomNumber || "Not specified",
        time_seconds: timeSeconds,
        moves_count: moves
      };
      
      // Submit to backend with token-based tracking
      const gameSession = await memoryGameAPI.submitTournamentScore(tournamentId, scoreData);
      
      // Store player info for future sessions
      if (playerName && roomNumber) {
        PlayerTokenManager.storePlayerInfo(playerName, roomNumber);
      }
      
      // Handle different response types from token-based backend
      const playerInfo = playerName ? ` by ${playerName}` : '';
      const rankInfo = gameSession.rank ? ` (Rank: #${gameSession.rank})` : '';
      
      let alertMessage = '';
      let alertTitle = '';
      
      if (gameSession.updated === false) {
        // Player has a better existing score - this score was not saved
        alertTitle = '🎮 Good Try!';
        alertMessage = `This game: ${gameSession.score} points\nYour best: ${gameSession.best_score} points${rankInfo}\n\n${gameSession.message}\n\nYour best score stays on the leaderboard! 🏆\nPlay unlimited times to beat your record! �`;
      } else if (gameSession.is_personal_best) {
        // New or improved personal best
        const isFirstTime = gameSession.score === gameSession.best_score && hasPlayedBefore === false;
        alertTitle = isFirstTime ? '🎉 Welcome to the Tournament!' : '🚀 New Personal Best!';
        alertMessage = `${gameSession.message}\n\nYour score: ${gameSession.score} points${rankInfo}\nTime: ${formatTime(timeSeconds)}\nMoves: ${moves}\n\n🏆 Check the leaderboard to see your ranking!`;
      } else {
        // Default case
        alertTitle = '🎉 Score Submitted!';
        alertMessage = `Your score: ${gameSession.score} points${rankInfo}\nTime: ${formatTime(timeSeconds)}\nMoves: ${moves}\n\n🏆 ${gameSession.message || 'Check the leaderboard to see your ranking!'}`;
      }
      
      alert(`${alertTitle}\n\n${alertMessage}`);
      
      // Navigate back to tournament dashboard after showing success
      setTimeout(() => {
        navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save tournament score:', error);
      
      // Check if tournament ended while playing
      if (error.response?.status === 400 && error.response?.data?.error?.includes('not currently active')) {
        alert(`⏰ Tournament Ended!\n\nThe tournament ended while you were playing.\n\nYour score: ${finalScore} points\nTime: ${formatTime(time)}\nMoves: ${moves}\n\n🏆 Great game! Check for new tournaments on the dashboard.`);
      } else {
        // General error - show encouraging message for kids
        alert(`🎮 Amazing game!\n\nYour score: ${finalScore} points\nTime: ${formatTime(time)}\nMoves: ${moves}\n\n🌟 Great job playing!`);
      }
      
      setTimeout(() => {
        navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
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

  const handlePlayerFormSubmit = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name to continue');
      return;
    }
    
    setGameState('saving');
    
    setShowPlayerForm(false);
    saveTournamentScore();
  };

  const handleSkipPlayerForm = () => {
    setPlayerName('');
    setRoomNumber('');
    setShowPlayerForm(false);
    saveTournamentScore();
  };

  // New handlers for PlayerInfoForm
  const handleStartGame = (playerInfo) => {
    setPlayerData(playerInfo);
    setPlayerName(playerInfo.name);
    setRoomNumber(playerInfo.room);
    setShowPlayerForm(false);
    setGameStarted(true);
    startGame();
  };

  const handleBackToDashboard = () => {
    navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
  };



  // Initialize player token and stored info on mount
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        // Initialize player token system
        const token = PlayerTokenManager.getPlayerToken();
        setPlayerToken(token);
        
        // Check if player has played before and get stored info
        const playedBefore = PlayerTokenManager.hasPlayedBefore();
        setHasPlayedBefore(playedBefore);
        
        if (playedBefore) {
          const storedInfo = PlayerTokenManager.getStoredPlayerInfo();
          setPlayerName(storedInfo.name);
          setRoomNumber(storedInfo.room);
        }
        
        // Initialize API
        await memoryGameAPI.migrateLocalStorageData();
        await memoryGameAPI.syncPendingSessions();
      } catch (error) {
        console.error('Failed to initialize player/API:', error);
      }
    };
    
    initializePlayer();
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



  // Auto-redirect to tournament dashboard instead of mode selection
  if (gameMode === 'selection') {
    // Redirect directly to tournament dashboard
    navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
    return null;
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
            onClick={() => {
              // Always navigate back to Tournament Dashboard
              navigate('/games/memory-match/tournaments?hotel=hotel-killarney');
            }}
          >
            ← Back to Tournament
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
                <div className="h6 mb-0 text-primary">{matched.length / 2}/{FIXED_PAIRS_COUNT}</div>
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

          {/* Game Format Info - Always 3x4 Grid */}
          {!isQRTournament && (
            <div className="text-center mb-4">
              <div className={`badge ${gameMode === 'tournament' ? 'bg-success' : 'bg-primary'} fs-6 px-3 py-2`}>
                {gameMode === 'tournament' ? '🏆 Tournament' : '🎮 Practice'} Mode: Fixed 3×4 Grid (6 pairs) • No Difficulty Selection
              </div>
            </div>
          )}

          {/* Game Grid - Mobile Responsive */}
          <div
            className="d-grid justify-content-center align-items-center"
            style={{
              gridTemplateColumns: isQRTournament 
                ? "repeat(4, minmax(60px, 1fr))" // Mobile 3x4 grid for tournament (6 pairs, 12 cards)
                : "repeat(4, 90px)", // Fixed 3x4 grid (6 pairs, 12 cards) - no difficulty variations
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
          <div className="card shadow-lg mx-3" style={{maxWidth: '450px', width: '100%'}}>
            <div className="card-header bg-success text-white text-center">
              <h4 className="mb-0">🎉 Congratulations!</h4>
              <p className="mb-0 small">You completed the tournament!</p>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="fs-5 fw-bold text-success">Final Score: {finalScore} points</div>
                <div className="text-muted">Time: {formatTime(time)} | Moves: {moves}</div>
              </div>
              
              {hasPlayedBefore && (
                <div className="alert alert-info small mb-3">
                  👋 Welcome back! We'll update your best score if this is better.
                </div>
              )}
              
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
              
              {hasPlayedBefore && (
                <div className="text-center mt-3 pt-3 border-top">
                  <small className="text-muted d-block mb-2">Playing for someone else?</small>
                  <button 
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      PlayerTokenManager.clearPlayerToken();
                      setPlayerName('');
                      setRoomNumber('');
                      setHasPlayedBefore(false);
                      setPlayerToken(PlayerTokenManager.getPlayerToken());
                    }}
                  >
                    🔄 Start as New Player
                  </button>
                </div>
              )}
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
