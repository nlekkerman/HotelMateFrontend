import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { quizGameAPI } from '@/services/quizGameAPI';
import QuizPlay from './pages/QuizPlay';
import QuizResults from './pages/QuizResults';
import QuizLeaderboard from './pages/QuizLeaderboard';
import PlayerNameModal from './components/PlayerNameModal';
import CategoryTransition from './components/CategoryTransition';
import useQuizGame from './hooks/useQuizGame';
import quizBg from './assets/sounds/Guessticulator-img.png';
import playCasualImg from './assets/images/play-game-img.png';
import enterTournamentImg from './assets/images/enter-tour-img.png';

export default function QuizGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState('mode-select'); // 'mode-select' | 'name-entry' | 'playing' | 'results' | 'leaderboard'
  const [isTournamentMode, setIsTournamentMode] = useState(false);
  const [tournamentSlug, setTournamentSlug] = useState(null);
  const [playerName, setPlayerName] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tournament, setTournament] = useState(null);

  // Check for tournament parameter in URL
  useEffect(() => {
    const tournamentParam = quizGameAPI.parseTournamentFromURL();
    if (tournamentParam) {
      loadTournament(tournamentParam);
    }
  }, []);

  const loadTournament = async (slug) => {
    try {
      const tournamentData = await quizGameAPI.getTournamentDetail(slug);
      setTournament(tournamentData);
      setTournamentSlug(slug);
      setIsTournamentMode(true);
      console.log('🏆 Tournament loaded:', tournamentData);
    } catch (error) {
      console.error('Failed to load tournament:', error);
    }
  };

  const handleSelectTournament = () => {
    setIsTournamentMode(true);
    setShowNameModal(true);
  };

  const handleSelectCasual = () => {
    setIsTournamentMode(false);
    setShowNameModal(true);
  };

  const handleNameSubmit = (name) => {
    setPlayerName(name);
    setShowNameModal(false);
    setGameState('playing');
  };

  const handleViewLeaderboard = () => {
    setGameState('leaderboard');
  };

  const handleBackToMenu = () => {
    setGameState('mode-select');
    setIsTournamentMode(false);
    setPlayerName(null);
    setTournamentSlug(null);
  };

  const handlePlayAgain = () => {
    // Generate new session token for fresh start
    quizGameAPI.generateNewSessionToken();
    setPlayerName(null);
    setShowNameModal(true);
  };

  return (
    <div className="quiz-game-container" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Hero Section */}
      {gameState === 'mode-select' && (
        <>
          <div 
            className="hero-section"
            style={{
              width: '100vw',
              marginLeft: 'calc(-50vw + 50%)',
              marginRight: 'calc(-50vw + 50%)',
              marginBottom: '1.5rem'
            }}
          >
            <img 
              src={quizBg} 
              alt="Quiz Challenge" 
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '500px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
          <div className="container" style={{ padding: '0 1rem', marginBottom: '3rem' }}>
            {/* Welcome Text */}
            <div style={{
              textAlign: 'center',
              marginTop: '40px',
              marginBottom: '30px',
              padding: '0 20px'
            }}>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '15px'
              }}>
                Welcome to Guessticulator!
              </h2>
              <p style={{
                fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                color: '#666',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Test your knowledge and compete with players worldwide. Choose your game mode below!
              </p>
            </div>

            <div className="d-flex flex-column flex-md-row gap-4 align-items-center justify-content-center">
              {/* Play Casual Button */}
              <button
                onClick={handleSelectCasual}
                style={{
                  backgroundImage: `url(${playCasualImg})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: 'transparent',
                  border: 'none',
                  width: '100%',
                  maxWidth: '500px',
                  height: '150px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, filter 0.2s',
                  filter: 'brightness(1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.filter = 'brightness(1)';
                }}
                aria-label="Play Casual"
              />

              {/* Enter Tournament Button */}
              <button
                onClick={handleSelectTournament}
                style={{
                  backgroundImage: `url(${enterTournamentImg})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: 'transparent',
                  border: 'none',
                  width: '100%',
                  maxWidth: '500px',
                  height: '150px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, filter 0.2s',
                  filter: 'brightness(1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.filter = 'brightness(1)';
                }}
                aria-label="Enter Tournament"
              />
            </div>
          </div>
        </>
      )}

      {/* Quick Actions for Non-Mode-Select States */}
      {gameState !== 'mode-select' && (
        <div className="container-fluid bg-white shadow-sm py-2 mb-3">
          <div className="container d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-primary">
              <i className="bi bi-question-circle-fill me-2"></i>
              Quiz Challenge
            </h5>
            <div className="btn-group btn-group-sm">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={handleBackToMenu}
              >
                <i className="bi bi-house me-1"></i>
                Menu
              </button>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={handleViewLeaderboard}
              >
                <i className="bi bi-trophy me-1"></i>
                Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Player Name Modal */}
      {showNameModal && (
        <PlayerNameModal
          show={showNameModal}
          onSubmit={handleNameSubmit}
          onSkip={null}
        />
      )}

      {/* Playing State */}
      {gameState === 'playing' && playerName && (
        <GamePlayWrapper
          playerName={playerName}
          isTournamentMode={isTournamentMode}
          tournamentSlug={tournamentSlug}
          onFinish={() => setGameState('results')}
        />
      )}

      {/* Results State */}
      {gameState === 'results' && (
        <div className="container mt-5 text-center">
          <h2>Results</h2>
          <div className="d-flex gap-3 justify-content-center mt-4">
            <button className="btn btn-primary" onClick={handlePlayAgain}>
              Play Again
            </button>
            <button className="btn btn-outline-secondary" onClick={handleBackToMenu}>
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard State */}
      {gameState === 'leaderboard' && (
        <QuizLeaderboard />
      )}
    </div>
  );
}

// Wrapper component to handle game play with the hook
function GamePlayWrapper({ playerName, isTournamentMode, tournamentSlug, onFinish }) {
  const [showResumeNotice, setShowResumeNotice] = useState(false);
  
  const {
    session,
    sessionId,
    currentCategory,
    currentCategoryIndex,
    totalCategories,
    questionsPerCategory,
    totalQuestions,
    totalQuestionsAnswered,
    currentQuestion,
    currentQuestionIndex,
    questions,
    selectedAnswer,
    isAnswered,
    lastAnswerFeedback,
    timeLeft,
    score,
    consecutiveCorrect,
    isTurboActive,
    gameState,
    loading,
    error,
    handleAnswerSelect,
    handleTimeout,
    isResumed
  } = useQuizGame(playerName, isTournamentMode, tournamentSlug);

  // Handle game state changes
  useEffect(() => {
    if (gameState === 'finished') {
      onFinish();
    }
  }, [gameState, onFinish]);

  // Show resume notice if session was resumed
  useEffect(() => {
    if (isResumed && totalQuestionsAnswered > 0) {
      setShowResumeNotice(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowResumeNotice(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isResumed, totalQuestionsAnswered]);

  if (loading && gameState === 'initializing') {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4>Starting your quiz...</h4>
        <p className="text-muted">Preparing {totalQuestions} questions across {totalCategories} categories</p>
        <div className="alert alert-info mt-3 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-info-circle me-2"></i>
          If you have an incomplete session, you'll resume from where you left off!
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Error
          </h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (gameState === 'category-transition') {
    return (
      <CategoryTransition
        currentCategory={currentCategory}
        nextCategory={null}
        categoryNumber={currentCategoryIndex + 1}
        totalCategories={totalCategories}
        score={score}
      />
    );
  }

  if (gameState === 'playing') {
    return (
      <>
        {/* Resume Notice */}
        {showResumeNotice && (
          <div className="container mt-3">
            <div className="alert alert-info alert-dismissible fade show" role="alert">
              <i className="bi bi-arrow-clockwise me-2"></i>
              <strong>Session Resumed!</strong> Continuing from question {totalQuestionsAnswered + 1} of 50 
              (Score: {score} points)
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowResumeNotice(false)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}
        
        <QuizPlay
          currentCategory={currentCategory}
          currentCategoryIndex={currentCategoryIndex}
          totalCategories={totalCategories}
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          questions={questions}
          selectedAnswer={selectedAnswer}
          isAnswered={isAnswered}
          lastAnswerFeedback={lastAnswerFeedback}
          timeLeft={timeLeft}
          score={score}
          consecutiveCorrect={consecutiveCorrect}
          isTurboActive={isTurboActive}
          totalQuestionsAnswered={totalQuestionsAnswered}
          onAnswerSelect={handleAnswerSelect}
        />
      </>
    );
  }

  if (gameState === 'finished') {
    return (
      <QuizResults
        session={session}
        score={score}
        isTournamentMode={isTournamentMode}
      />
    );
  }

  return null;
}
