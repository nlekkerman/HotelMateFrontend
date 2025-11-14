import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import quizGameAPI from '@/services/quizGameAPI';
import { TimerDisplay } from '../components/QuizTimer';

export default function QuizResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const [sessionData, setSessionData] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.sessionData) {
      setSessionData(location.state.sessionData);
      loadRankData();
    } else {
      // No session data, redirect to start
      navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`);
    }
  }, [location.state, navigate, hotelParam]);

  const loadRankData = async () => {
    try {
      const rankData = await quizGameAPI.getMyRank();
      setMyRank(rankData);
    } catch (err) {
      console.error('Failed to load rank:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!sessionData) return null;

    const correctAnswers = sessionData.correct_answers || 0;
    const totalQuestions = sessionData.total_questions || 0;
    const percentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

    // Group answers by category
    const categoryStats = {};
    if (sessionData.answers) {
      sessionData.answers.forEach(answer => {
        const category = answer.category_name || 'Unknown';
        if (!categoryStats[category]) {
          categoryStats[category] = { correct: 0, total: 0 };
        }
        categoryStats[category].total++;
        if (answer.is_correct) {
          categoryStats[category].correct++;
        }
      });
    }

    return {
      correctAnswers,
      totalQuestions,
      percentage,
      categoryStats
    };
  };

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { text: 'Outstanding!', color: 'success', icon: 'trophy-fill' };
    if (percentage >= 75) return { text: 'Great Job!', color: 'primary', icon: 'star-fill' };
    if (percentage >= 60) return { text: 'Good Effort!', color: 'info', icon: 'hand-thumbs-up-fill' };
    if (percentage >= 40) return { text: 'Keep Trying!', color: 'warning', icon: 'emoji-smile' };
    return { text: 'Practice More!', color: 'secondary', icon: 'book' };
  };

  const handlePlayAgain = () => {
    navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`);
  };

  const handleViewLeaderboard = () => {
    navigate(`/games/quiz/leaderboard${hotelParam ? `?hotel=${hotelParam}` : ''}`);
  };

  const handleBackToGames = () => {
    navigate(`/games${hotelParam ? `?hotel=${hotelParam}` : ''}`);
  };

  if (loading || !sessionData) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: mainColor }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading results...</p>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const performance = getPerformanceLevel(stats.percentage);

  return (
    <div className="container mt-5 pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Main Results Card */}
          <div className="card shadow-lg border-0 mb-4">
            <div className="card-header text-center py-4" style={{ backgroundColor: mainColor, color: 'white' }}>
              <h1 className="display-4 mb-2">
                <i className={`bi bi-${performance.icon} me-2`}></i>
                Quiz Complete!
              </h1>
              <h3 className={`text-white mb-0`}>{performance.text}</h3>
            </div>

            <div className="card-body p-4">
              {/* Score Display */}
              <div className="text-center mb-4">
                <div className="display-1 fw-bold" style={{ color: mainColor }}>
                  {sessionData.score}
                </div>
                <p className="lead text-muted">Total Score</p>
              </div>

              {/* Stats Grid */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card bg-light h-100">
                    <div className="card-body text-center">
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '2rem' }}></i>
                      <h3 className="mt-2 mb-0">{stats.correctAnswers}</h3>
                      <small className="text-muted">Correct</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light h-100">
                    <div className="card-body text-center">
                      <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '2rem' }}></i>
                      <h3 className="mt-2 mb-0">{stats.totalQuestions - stats.correctAnswers}</h3>
                      <small className="text-muted">Wrong</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light h-100">
                    <div className="card-body text-center">
                      <i className="bi bi-percent" style={{ fontSize: '2rem', color: mainColor }}></i>
                      <h3 className="mt-2 mb-0">{stats.percentage}%</h3>
                      <small className="text-muted">Accuracy</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light h-100">
                    <div className="card-body text-center">
                      <i className="bi bi-clock-fill text-info" style={{ fontSize: '2rem' }}></i>
                      <h3 className="mt-2 mb-0">
                        <TimerDisplay seconds={sessionData.time_seconds || 0} />
                      </h3>
                      <small className="text-muted">Time</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank Display */}
              {myRank && (
                <div className="alert alert-info d-flex align-items-center justify-content-between">
                  <div>
                    <i className="bi bi-trophy me-2"></i>
                    <strong>Your Global Rank:</strong> #{myRank.rank}
                  </div>
                  <div>
                    <span className="badge bg-primary me-2">Best: {myRank.best_score}</span>
                    <span className="badge bg-secondary">Games: {myRank.total_games_played}</span>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {Object.keys(stats.categoryStats).length > 0 && (
                <div className="mb-4">
                  <h5 className="mb-3">
                    <i className="bi bi-bar-chart-fill me-2"></i>
                    Performance by Category
                  </h5>
                  <div className="row g-3">
                    {Object.entries(stats.categoryStats).map(([category, data]) => {
                      const categoryPercentage = ((data.correct / data.total) * 100).toFixed(0);
                      return (
                        <div key={category} className="col-md-6">
                          <div className="card">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong>{category}</strong>
                                <span>{data.correct}/{data.total}</span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  style={{ 
                                    width: `${categoryPercentage}%`,
                                    backgroundColor: mainColor 
                                  }}
                                ></div>
                              </div>
                              <small className="text-muted">{categoryPercentage}% correct</small>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button
                  className="btn btn-lg btn-primary"
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={handlePlayAgain}
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Play Again
                </button>

                <button
                  className="btn btn-lg btn-outline-primary"
                  onClick={handleViewLeaderboard}
                >
                  <i className="bi bi-trophy-fill me-2"></i>
                  View Leaderboard
                </button>

                <button
                  className="btn btn-lg btn-outline-secondary"
                  onClick={handleBackToGames}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Games
                </button>
              </div>
            </div>
          </div>

          {/* Tournament Info */}
          {sessionData.tournament_name && (
            <div className="alert alert-warning">
              <i className="bi bi-trophy me-2"></i>
              <strong>Tournament:</strong> {sessionData.tournament_name}
              <br />
              <small>Your score has been recorded for tournament rankings!</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
