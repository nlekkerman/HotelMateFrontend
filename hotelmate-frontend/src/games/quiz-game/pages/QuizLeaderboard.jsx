import React, { useState, useEffect } from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';

export default function QuizLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadLeaderboard();
  }, [limit]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await quizGameAPI.getAllTimeLeaderboard(limit);
      setLeaderboard(data || []);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Header */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2>
                <i className="bi bi-trophy-fill text-warning me-2"></i>
                All-Time Leaderboard
              </h2>
              
              <button 
                className="btn btn-outline-primary"
                onClick={loadLeaderboard}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-trophy-fill me-2"></i>
                Top Quiz Players
              </h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading leaderboard...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
                  <p>No scores yet. Be the first to play!</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Player</th>
                        <th className="text-center">Best Score</th>
                        <th className="text-center">Games</th>
                        <th className="text-end">Last Played</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => {
                        const rank = entry.rank || index + 1;
                        const medal = getMedalIcon(rank);

                        return (
                          <tr key={index} className={rank <= 3 ? 'table-warning' : ''}>
                            <td className="fw-bold fs-5">
                              {medal || `#${rank}`}
                            </td>
                            <td>
                              <div className="fw-bold">{entry.player_name || 'Anonymous'}</div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-primary fs-6">{entry.best_score}</span>
                            </td>
                            <td className="text-center">
                              {entry.games_played}
                            </td>
                            <td className="text-end text-muted small">
                              {entry.last_played ? new Date(entry.last_played).toLocaleDateString() : '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
