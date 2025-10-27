import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import { useAuth } from '@/context/AuthContext';

const PersonalStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPersonalStats();
  }, [user]);

  const fetchPersonalStats = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const data = await memoryGameAPI.getMyStats();
      setStats(data);
      
    } catch (error) {
      console.error('Error fetching personal stats:', error);
      setError(`Failed to load your statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getPerformanceLevel = (winRate) => {
    if (winRate >= 0.8) return { label: 'Expert', color: 'success', emoji: '🏆' };
    if (winRate >= 0.6) return { label: 'Advanced', color: 'info', emoji: '🎯' };
    if (winRate >= 0.4) return { label: 'Intermediate', color: 'warning', emoji: '📈' };
    if (winRate >= 0.2) return { label: 'Beginner', color: 'secondary', emoji: '🎮' };
    return { label: 'Novice', color: 'light', emoji: '🎯' };
  };

  if (loading) {
    return (
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-primary bg-opacity-10">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h2 className="h4">📊 Loading Your Stats...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-primary bg-opacity-10">
        <div className="text-center">
          <h2 className="h4">🔒 Authentication Required</h2>
          <p className="text-muted">Please log in to view your statistics.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  const performanceLevel = stats ? getPerformanceLevel(stats.win_rate) : null;

  return (
    <div className="container-fluid min-vh-100 bg-gradient" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="row justify-content-center py-4">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Header */}
          <header className="text-center text-white mb-4">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <button 
                className="btn btn-outline-light me-3"
                onClick={() => navigate('/games/memory-match')}
              >
                ← Back to Dashboard
              </button>
              <h1 className="h2 mb-0">📊 My Memory Match Stats</h1>
            </div>
            
            <div className="badge bg-light text-dark fs-6 px-3 py-2">
              👤 Welcome back, {user.username}!
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="alert alert-warning mb-4">
              <h6 className="alert-heading">⚠️ API Error</h6>
              <p className="mb-0">{error}</p>
            </div>
          )}

          {stats ? (
            <>
              {/* Performance Overview */}
              <div className="card shadow-lg border-0 bg-white bg-opacity-95 mb-4">
                <div className="card-header bg-primary text-white">
                  <h5 className="card-title mb-0">🎯 Performance Overview</h5>
                </div>
                <div className="card-body text-center">
                  <div className="row g-3">
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded">
                        <div className="display-6 text-primary">🎮</div>
                        <h6 className="mt-2 mb-1">Games Played</h6>
                        <h4 className="text-primary">{stats.total_games || 0}</h4>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded">
                        <div className="display-6 text-success">🏆</div>
                        <h6 className="mt-2 mb-1">Games Won</h6>
                        <h4 className="text-success">{stats.games_won || 0}</h4>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded">
                        <div className="display-6 text-info">⏱️</div>
                        <h6 className="mt-2 mb-1">Best Time</h6>
                        <h4 className="text-info">{formatTime(stats.best_time)}</h4>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-light rounded">
                        <div className="display-6 text-warning">⭐</div>
                        <h6 className="mt-2 mb-1">Best Score</h6>
                        <h4 className="text-warning">{stats.best_score || 0}</h4>
                      </div>
                    </div>
                  </div>
                  
                  {performanceLevel && (
                    <div className="mt-4">
                      <h6 className="mb-3">Your Skill Level:</h6>
                      <span className={`badge bg-${performanceLevel.color} fs-5 px-4 py-3`}>
                        {performanceLevel.emoji} {performanceLevel.label}
                      </span>
                      <div className="mt-2 small text-muted">
                        Win Rate: {((stats.win_rate || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Statistics */}
              <div className="card shadow-lg border-0 bg-white bg-opacity-95 mb-4">
                <div className="card-header bg-secondary text-white">
                  <h5 className="card-title mb-0">📈 Detailed Statistics</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <h6 className="text-primary mb-3">🎯 Game Performance</h6>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Win Rate:</span>
                          <strong>{((stats.win_rate || 0) * 100).toFixed(1)}%</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Average Score:</span>
                          <strong>{stats.average_score?.toFixed(0) || 0}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Average Time:</span>
                          <strong>{formatTime(stats.average_time)}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Perfect Games:</span>
                          <strong>{stats.perfect_games || 0}</strong>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="col-12 col-md-6">
                      <h6 className="text-success mb-3">🏆 Achievements</h6>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Tournament Wins:</span>
                          <strong>{stats.tournament_wins || 0}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Best Rank:</span>
                          <strong>{stats.best_rank ? `#${stats.best_rank}` : 'N/A'}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Current Streak:</span>
                          <strong>{stats.current_streak || 0}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Longest Streak:</span>
                          <strong>{stats.longest_streak || 0}</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {stats.recent_games && stats.recent_games.length > 0 && (
                <div className="card shadow-lg border-0 bg-white bg-opacity-95">
                  <div className="card-header bg-info text-white">
                    <h5 className="card-title mb-0">🕐 Recent Games</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th className="text-center">Score</th>
                            <th className="text-center">Time</th>
                            <th className="text-center">Result</th>
                            <th className="text-center">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_games.slice(0, 10).map((game, index) => (
                            <tr key={game.id || index}>
                              <td>
                                {new Date(game.created_at).toLocaleDateString()}
                                <small className="text-muted d-block">
                                  {new Date(game.created_at).toLocaleTimeString()}
                                </small>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary">{game.score}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-info text-dark">{formatTime(game.time_taken)}</span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${game.completed ? 'bg-success' : 'bg-danger'}`}>
                                  {game.completed ? '✅ Won' : '❌ Lost'}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-secondary">
                                  {game.tournament_id ? 'Tournament' : 'Practice'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card shadow-lg border-0 bg-white bg-opacity-95">
              <div className="card-body text-center py-5">
                <div className="display-1 mb-3">🎮</div>
                <h5 className="text-muted">No Statistics Yet</h5>
                <p className="text-muted mb-3">
                  You haven't played any Memory Match games yet. Start playing to build your statistics!
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/games/memory-match/practice')}
                >
                  Start Your First Game
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="text-center mt-4">
            <div className="d-grid d-sm-flex gap-2 justify-content-center">
              <button 
                className="btn btn-outline-light"
                onClick={() => navigate('/games/memory-match')}
              >
                🎮 Back to Game
              </button>
              <button 
                className="btn btn-outline-light"
                onClick={() => navigate('/games/memory-match/practice')}
              >
                🏃‍♀️ Practice Mode
              </button>
              <button 
                className="btn btn-outline-light"
                onClick={() => navigate('/games/memory-match/leaderboard')}
              >
                🏆 Global Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalStats;