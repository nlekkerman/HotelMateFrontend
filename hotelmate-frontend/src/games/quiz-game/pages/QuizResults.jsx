import React, { useState, useEffect } from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';

export default function QuizResults({ session, score, isTournamentMode = false }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadResults();
    }
  }, [session]);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Load all-time leaderboard
      const leaderboardData = await quizGameAPI.getAllTimeLeaderboard(10);
      setLeaderboard(leaderboardData);
      
      // Load player stats
      const stats = await quizGameAPI.getPlayerStats();
      setPlayerStats(stats);
      
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Results Header */}
          <div className="card mb-4 border-success">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                {isTournamentMode ? (
                  <i className="bi bi-trophy-fill text-warning" style={{ fontSize: '4rem' }}></i>
                ) : (
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                )}
              </div>
              <h2 className="mb-3">
                {isTournamentMode ? '🏆 Tournament Complete!' : '🎉 Quiz Complete!'}
              </h2>
              <h1 className="display-3 text-primary mb-0">{score}</h1>
              <p className="text-muted">Final Score</p>
              
              <div className="mt-3 d-flex gap-2 justify-content-center flex-wrap">
                {isTournamentMode ? (
                  <span className="badge bg-warning text-dark fs-6">
                    <i className="bi bi-trophy me-2"></i>
                    Tournament Mode
                  </span>
                ) : (
                  <span className="badge bg-info fs-6">
                    <i className="bi bi-controller me-2"></i>
                    Casual Mode
                  </span>
                )}
                {playerStats && (
                  <>
                    <span className="badge bg-success fs-6">
                      <i className="bi bi-award me-2"></i>
                      Rank #{playerStats.rank || '--'}
                    </span>
                    <span className="badge bg-primary fs-6">
                      <i className="bi bi-graph-up me-2"></i>
                      Games Played: {playerStats.games_played || 0}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-star-fill text-warning fs-2 mb-2"></i>
                  <h4 className="mb-0">{score}</h4>
                  <p className="text-muted small mb-0">Total Points</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-clock text-info fs-2 mb-2"></i>
                  <h4 className="mb-0">{session ? formatTime(session.time_spent_seconds) : '--'}</h4>
                  <p className="text-muted small mb-0">Time Taken</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-list-ol text-success fs-2 mb-2"></i>
                  <h4 className="mb-0">50</h4>
                  <p className="text-muted small mb-0">Questions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          {!loading && leaderboard.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-trophy-fill me-2"></i>
                  Top Players
                </h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {leaderboard.slice(0, 10).map((entry, index) => {
                    const isCurrentPlayer = playerStats && entry.player_name === playerStats.player_name;
                    return (
                      <div
                        key={index}
                        className={`list-group-item d-flex justify-content-between align-items-center ${
                          isCurrentPlayer ? 'bg-light' : ''
                        }`}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <span className="badge bg-primary rounded-circle" style={{ width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                            {entry.rank || index + 1}
                          </span>
                          <div>
                            <div className="fw-bold">
                              {entry.player_name || 'Anonymous'}
                              {isCurrentPlayer && (
                                <span className="badge bg-success ms-2">You</span>
                              )}
                            </div>
                            <small className="text-muted">
                              {entry.games_played} game{entry.games_played !== 1 ? 's' : ''}
                            </small>
                          </div>
                        </div>
                        <span className="badge bg-primary fs-6">{entry.best_score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
