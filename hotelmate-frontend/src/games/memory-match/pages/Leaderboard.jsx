import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import { useAuth } from '@/context/AuthContext';

const Leaderboard = () => {
  const [searchParams] = useSearchParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const tournamentId = searchParams.get('tournament');
  const hotelSlug = searchParams.get('hotel') || user?.hotel_slug;

  useEffect(() => {
    fetchLeaderboard();
  }, [tournamentId]);

  const fetchLeaderboard = async () => {
    try {
      setError(null);
      setLoading(true);
      
      let data;
      if (tournamentId) {
        // Tournament-specific leaderboard
        data = await memoryGameAPI.getTournamentLeaderboard(tournamentId);
        setTournamentInfo(data.tournament);
        setLeaderboard(data.leaderboard || []);
      } else {
        // General leaderboard
        data = await memoryGameAPI.getGeneralLeaderboard(hotelSlug);
        setLeaderboard(data.leaderboard || []);
      }
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError(`Failed to load leaderboard: ${error.message}`);
      setLeaderboard([]);
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

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  if (loading) {
    return (
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-primary bg-opacity-10">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h2 className="h4">🏆 Loading Leaderboard...</h2>
        </div>
      </div>
    );
  }

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
              <h1 className="h2 mb-0">
                🏆 {tournamentId ? 'Tournament Rankings' : 'Global Leaderboard'}
              </h1>
            </div>
            
            {tournamentInfo && (
              <div className="card bg-white bg-opacity-90 text-dark mb-4">
                <div className="card-body p-3">
                  <h5 className="card-title mb-2">{tournamentInfo.name}</h5>
                  <p className="card-text small mb-0">{tournamentInfo.description}</p>
                  <div className="small text-muted mt-1">
                    {new Date(tournamentInfo.start_date).toLocaleDateString()} - 
                    {new Date(tournamentInfo.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
            
            {!tournamentId && hotelSlug && (
              <div className="badge bg-light text-dark fs-6 px-3 py-2">
                🏨 {hotelSlug.replace('-', ' ').toUpperCase()} Leaderboard
              </div>
            )}
          </header>

          {/* Error */}
          {error && (
            <div className="alert alert-warning mb-4">
              <h6 className="alert-heading">⚠️ API Error</h6>
              <p className="mb-0">{error}</p>
            </div>
          )}

          {/* Leaderboard */}
          <div className="card shadow-lg border-0 bg-white bg-opacity-95">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">
                🎮 Memory Match Rankings ({leaderboard.length} {leaderboard.length === 1 ? 'Player' : 'Players'})
              </h5>
            </div>
            <div className="card-body p-0">
              {leaderboard.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{width: '60px'}}>Rank</th>
                        <th>Player</th>
                        <th className="text-center">Best Score</th>
                        <th className="text-center">Best Time</th>
                        <th className="text-center">Games Played</th>
                        <th className="text-center">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((player, index) => {
                        const rank = index + 1;
                        const isCurrentUser = user && player.player_name === user.username;
                        
                        return (
                          <tr key={player.id || index} className={isCurrentUser ? 'table-primary' : ''}>
                            <td className="text-center fw-bold">
                              <span className="fs-5">{getRankEmoji(rank)}</span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className={`fw-${isCurrentUser ? 'bold' : 'normal'}`}>
                                  {player.player_name}
                                  {isCurrentUser && ' (You)'}
                                </span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-success fs-6">
                                {player.best_score || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-info text-dark fs-6">
                                {formatTime(player.best_time)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary fs-6">
                                {player.games_played || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-warning text-dark fs-6">
                                {player.win_rate ? `${(player.win_rate * 100).toFixed(1)}%` : '0%'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="display-1 mb-3">🎮</div>
                  <h5 className="text-muted">No Rankings Yet</h5>
                  <p className="text-muted mb-3">
                    {tournamentId ? 'No one has played in this tournament yet.' : 'No games have been played yet.'}
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/games/memory-match/practice')}
                  >
                    Start Playing
                  </button>
                </div>
              )}
            </div>
          </div>

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
              {!tournamentId && (
                <button 
                  className="btn btn-outline-light"
                  onClick={() => navigate('/games/memory-match/stats')}
                >
                  📊 My Stats
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;