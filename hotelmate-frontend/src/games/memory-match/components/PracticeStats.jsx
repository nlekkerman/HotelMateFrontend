import React, { useState, useEffect } from 'react';

export default function PracticeStats() {
  const [practiceGames, setPracticeGames] = useState([]);

  useEffect(() => {
    const games = JSON.parse(localStorage.getItem('practiceGames') || '[]');
    // Sort by timestamp, most recent first
    games.sort((a, b) => b.timestamp - a.timestamp);
    setPracticeGames(games);
  }, []);

  const clearPracticeHistory = () => {
    if (confirm('Are you sure you want to clear all practice game history?')) {
      localStorage.removeItem('practiceGames');
      setPracticeGames([]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBestScore = () => {
    if (practiceGames.length === 0) return 0;
    return Math.max(...practiceGames.map(game => game.score));
  };

  const getAverageScore = () => {
    if (practiceGames.length === 0) return 0;
    const total = practiceGames.reduce((sum, game) => sum + game.score, 0);
    return Math.round(total / practiceGames.length);
  };

  const getBestTime = () => {
    if (practiceGames.length === 0) return 0;
    return Math.min(...practiceGames.map(game => game.timeSeconds));
  };

  return (
    <div className="container py-4">
      <h3 className="mb-4">🎮 Practice Game Statistics</h3>
      
      {practiceGames.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">No practice games played yet.</p>
          <p>Start practicing to see your statistics here!</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h4 className="text-primary">{practiceGames.length}</h4>
                  <small>Games Played</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h4 className="text-success">{getBestScore()}</h4>
                  <small>Best Score</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h4 className="text-info">{getAverageScore()}</h4>
                  <small>Average Score</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h4 className="text-warning">{formatTime(getBestTime())}</h4>
                  <small>Best Time</small>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Practice Games</h5>
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={clearPracticeHistory}
              >
                Clear History
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Time</th>
                      <th>Moves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practiceGames.slice(0, 10).map((game, index) => (
                      <tr key={index}>
                        <td>{formatDate(game.timestamp)}</td>
                        <td>
                          <span className={game.score === getBestScore() ? 'fw-bold text-success' : ''}>
                            {game.score}
                            {game.score === getBestScore() && ' 🏆'}
                          </span>
                        </td>
                        <td>
                          <span className={game.timeSeconds === getBestTime() ? 'fw-bold text-warning' : ''}>
                            {formatTime(game.timeSeconds)}
                            {game.timeSeconds === getBestTime() && ' ⚡'}
                          </span>
                        </td>
                        <td>{game.moves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {practiceGames.length > 10 && (
                <p className="text-muted text-center mt-3">
                  Showing 10 most recent games of {practiceGames.length} total
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}