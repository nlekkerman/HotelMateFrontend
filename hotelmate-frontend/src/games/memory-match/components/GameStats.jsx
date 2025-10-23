import { useState, useEffect } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';

export default function GameStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await memoryGameAPI.getUserStats();
        setStats(data);
        setError(null);
      } catch (error) {
        console.error('Failed to load stats:', error);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatTime = (seconds) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
          <p>Your offline games will sync when you're back online.</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_games === 0) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="alert alert-info" role="alert">
            No game data found. Play some games first!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <h2 className="text-center mb-4">Your Game Statistics</h2>
      
      {/* Overview Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">Games Played</h5>
              <div className="display-6 text-primary">{stats.total_games}</div>
              <small className="text-muted">Total completed games</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">Total Score</h5>
              <div className="display-6 text-success">{stats.total_score.toLocaleString()}</div>
              <small className="text-muted">All-time points</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">Total Time</h5>
              <div className="display-6 text-info">{formatTime(stats.total_time_played)}</div>
              <small className="text-muted">Time spent playing</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">Avg Moves</h5>
              <div className="display-6 text-warning">{stats.average_moves_per_game?.toFixed(1) || '--'}</div>
              <small className="text-muted">Per game</small>
            </div>
          </div>
        </div>
      </div>

      {/* Best Performances by Difficulty */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-success text-white text-center">
              <h5 className="mb-0">🟢 Easy (4x4)</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6">
                  <strong>Best Time</strong>
                  <div className="text-success fs-5">{formatTime(stats.best_time_easy)}</div>
                </div>
                <div className="col-6">
                  <strong>Best Score</strong>
                  <div className="text-success fs-5">{stats.best_score_easy || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-warning text-dark text-center">
              <h5 className="mb-0">🟡 Intermediate (6x6)</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6">
                  <strong>Best Time</strong>
                  <div className="text-warning fs-5">{formatTime(stats.best_time_intermediate)}</div>
                </div>
                <div className="col-6">
                  <strong>Best Score</strong>
                  <div className="text-warning fs-5">{stats.best_score_intermediate || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-danger text-white text-center">
              <h5 className="mb-0">🔴 Hard (8x8)</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6">
                  <strong>Best Time</strong>
                  <div className="text-danger fs-5">{formatTime(stats.best_time_hard)}</div>
                </div>
                <div className="col-6">
                  <strong>Best Score</strong>
                  <div className="text-danger fs-5">{stats.best_score_hard || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">🏆 Personal Records</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <div className="border-end">
                    <strong>First Game</strong>
                    <div className="text-muted">{formatDate(stats.first_game_at)}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="ps-3">
                    <strong>Latest Game</strong>
                    <div className="text-muted">{formatDate(stats.last_game_at)}</div>
                  </div>
                </div>
              </div>
              
              {stats.total_games > 0 && (
                <div className="mt-3">
                  <div className="row text-center">
                    <div className="col-4">
                      <strong>Win Rate</strong>
                      <div className="text-success">
                        {Math.round((stats.games_won / stats.total_games) * 100)}%
                      </div>
                    </div>
                    <div className="col-4">
                      <strong>Avg Score</strong>
                      <div className="text-primary">
                        {Math.round(stats.total_score / stats.total_games)}
                      </div>
                    </div>
                    <div className="col-4">
                      <strong>Avg Time</strong>
                      <div className="text-info">
                        {formatTime(Math.round(stats.total_time_played / stats.total_games))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">📊 Performance Breakdown</h5>
            </div>
            <div className="card-body">
              <div className="row text-center mb-3">
                <div className="col-12">
                  <strong>Most Played Difficulty</strong>
                  <div className="text-primary fs-5">
                    {stats.most_played_difficulty ? 
                      memoryGameAPI.getDifficultyDisplay(stats.most_played_difficulty) : 
                      'Play more games!'
                    }
                  </div>
                </div>
              </div>
              
              <div className="row text-center">
                <div className="col-6">
                  <strong>Best Overall Score</strong>
                  <div className="text-success fs-5">
                    {Math.max(
                      stats.best_score_easy || 0,
                      stats.best_score_intermediate || 0,
                      stats.best_score_hard || 0
                    )}
                  </div>
                </div>
                <div className="col-6">
                  <strong>Fastest Game</strong>
                  <div className="text-warning fs-5">
                    {formatTime(Math.min(
                      stats.best_time_easy || Infinity,
                      stats.best_time_intermediate || Infinity,
                      stats.best_time_hard || Infinity
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Preview */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">🎖️ Quick Achievements</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <div className={`badge ${stats.total_games >= 10 ? 'bg-success' : 'bg-secondary'} p-2 mb-2`}>
                    {stats.total_games >= 10 ? '✅' : '🔒'} Player
                  </div>
                  <div><small>Play 10 games</small></div>
                </div>
                <div className="col-md-3">
                  <div className={`badge ${stats.total_games >= 50 ? 'bg-success' : 'bg-secondary'} p-2 mb-2`}>
                    {stats.total_games >= 50 ? '✅' : '🔒'} Enthusiast
                  </div>
                  <div><small>Play 50 games</small></div>
                </div>
                <div className="col-md-3">
                  <div className={`badge ${stats.best_score_easy >= 800 ? 'bg-success' : 'bg-secondary'} p-2 mb-2`}>
                    {stats.best_score_easy >= 800 ? '✅' : '🔒'} Speed Demon
                  </div>
                  <div><small>Score 800+ on Easy</small></div>
                </div>
                <div className="col-md-3">
                  <div className={`badge ${stats.best_time_hard && stats.best_time_hard <= 300 ? 'bg-success' : 'bg-secondary'} p-2 mb-2`}>
                    {stats.best_time_hard && stats.best_time_hard <= 300 ? '✅' : '🔒'} Master
                  </div>
                  <div><small>Complete Hard in 5min</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}