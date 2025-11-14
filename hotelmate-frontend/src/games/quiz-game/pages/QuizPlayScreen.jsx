import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import useQuizSession from '../hooks/useQuizSession';
import QuestionCard from '../components/QuestionCard';
import { QuestionTimer, TimerDisplay } from '../components/QuizTimer';

export default function QuizPlayScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const {
    session,
    questions,
    currentQuestion,
    currentQuestionIndex,
    answers,
    loading,
    error,
    progressPercentage,
    currentQuestionTime,
    totalQuizTime,
    initializeSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    resetSession,
    setError
  } = useQuizSession();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);

  // Initialize session from start screen
  useEffect(() => {
    if (location.state?.quizData) {
      initializeSession(location.state.quizData);
      setIsTimerRunning(true);
    } else {
      // No quiz data, redirect to start
      navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`);
    }
  }, [location.state, initializeSession, navigate, hotelParam]);

  // Reset answer state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setSubmittedResult(null);
    setIsTimerRunning(true);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = async (answer) => {
    if (showFeedback || loading) return; // Prevent multiple selections

    setSelectedAnswer(answer);
    setIsTimerRunning(false);

    try {
      const result = await submitAnswer(answer);
      setSubmittedResult(result);
      setShowFeedback(true);

      // Update running score
      if (result.is_correct) {
        setCurrentScore(prev => prev + (currentQuestion?.points || 0));
      }

      // Auto-advance after showing feedback
      setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setIsTimerRunning(true); // Restart timer on error
    }
  };

  const handleNextQuestion = () => {
    const hasMore = nextQuestion();
    
    if (!hasMore) {
      // Last question completed, finish quiz
      handleCompleteQuiz();
    }
  };

  const handleCompleteQuiz = async () => {
    try {
      setIsTimerRunning(false);
      const completedSession = await completeSession();
      
      // Navigate to results with session data
      navigate(`/games/quiz/results${hotelParam ? `?hotel=${hotelParam}` : ''}`, {
        state: { sessionData: completedSession }
      });
    } catch (err) {
      console.error('Failed to complete quiz:', err);
    }
  };

  const handleQuitQuiz = () => {
    if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
      resetSession();
      navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`);
    }
  };

  if (!session || !currentQuestion) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: mainColor }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 pb-5">
      {/* Header with progress and timer */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3">
              <div className="d-flex align-items-center">
                <i className="bi bi-person-circle me-2" style={{ fontSize: '1.5rem', color: mainColor }}></i>
                <div>
                  <small className="text-muted">Player</small>
                  <div className="fw-bold">{session.player_display_name}</div>
                </div>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted">Progress</span>
                  <span className="small fw-bold">
                    {currentQuestionIndex + 1} / {questions.length}
                  </span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${progressPercentage}%`, backgroundColor: mainColor }}
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="d-flex justify-content-end align-items-center gap-3">
                <div className="text-end">
                  <small className="text-muted d-block">Question Time</small>
                  <QuestionTimer 
                    seconds={currentQuestionTime}
                    isRunning={isTimerRunning}
                  />
                </div>
                <div className="text-end">
                  <small className="text-muted d-block">Total Time</small>
                  <TimerDisplay seconds={totalQuizTime} />
                </div>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="row mt-3">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="badge bg-success me-2">
                    Correct: {answers.filter(a => a.is_correct).length}
                  </span>
                  <span className="badge bg-danger">
                    Wrong: {answers.filter(a => !a.is_correct).length}
                  </span>
                </div>
                <div>
                  <span className="badge" style={{ backgroundColor: mainColor, fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    <i className="bi bi-star-fill me-1"></i>
                    Score: {session.score || currentScore}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {/* Question Card */}
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={showFeedback}
            isCorrect={submittedResult?.is_correct}
            disabled={loading || showFeedback}
          />

          {/* Action Buttons */}
          <div className="d-flex justify-content-between mt-4">
            <button
              className="btn btn-outline-danger"
              onClick={handleQuitQuiz}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Quit Quiz
            </button>

            {showFeedback && (
              <button
                className="btn btn-primary"
                style={{ backgroundColor: mainColor, borderColor: mainColor }}
                onClick={handleNextQuestion}
                disabled={loading}
              >
                {currentQuestionIndex < questions.length - 1 ? (
                  <>
                    Next Question
                    <i className="bi bi-arrow-right ms-2"></i>
                  </>
                ) : (
                  <>
                    Finish Quiz
                    <i className="bi bi-check-circle ms-2"></i>
                  </>
                )}
              </button>
            )}
          </div>

          {loading && (
            <div className="text-center mt-3">
              <div className="spinner-border spinner-border-sm" role="status" style={{ color: mainColor }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="ms-2">Submitting answer...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
