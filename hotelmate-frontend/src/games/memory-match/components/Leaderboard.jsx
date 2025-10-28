import { useState, useEffect, useRef } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import { PlayerTokenManager } from '@/utils/playerToken';

export default function Leaderboard({ difficulty = 'easy', tournamentId = null }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const leaderboardRef = useRef(null);
  
  // Player identification
  const playerName = PlayerTokenManager.getDisplayName();
  const playerRoom = PlayerTokenManager.getDisplayRoom();
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let data;
        if (tournamentId) {
          // Load tournament leaderboard
          data = await memoryGameAPI.getTournamentLeaderboard(tournamentId);
        } else {
          // Load global leaderboard
          data = await memoryGameAPI.getLeaderboard(selectedDifficulty, 20);
        }
        setLeaderboard(data || []);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setError('Failed to load leaderboard');
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadLeaderboard();
  }, [selectedDifficulty, tournamentId]);

  const formatTime = (seconds) => {
    if (!seconds) return '--';
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

  // Check if an entry belongs to current player
  const isCurrentPlayerEntry = (entry) => {
    const nameMatch = playerName && entry.player_name === playerName;
    const roomMatch = !playerRoom || !entry.room_number || entry.room_number === playerRoom || entry.room_number === "Not specified";
    return nameMatch && roomMatch;
  };

  // Auto-scroll to current player's entry
  useEffect(() => {
    if (leaderboard.length > 0 && playerName && leaderboardRef.current) {
      const playerEntryIndex = leaderboard.findIndex(isCurrentPlayerEntry);
      if (playerEntryIndex >= 0) {
        setTimeout(() => {
          const playerRow = leaderboardRef.current.querySelector('.current-player-row');
          if (playerRow) {
            playerRow.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 500);
      }
    }
  }, [leaderboard, playerName]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1: return 'table-warning';
      case 2: return 'table-secondary';
      case 3: return 'table-light';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <h2 className="text-center mb-4">
        {tournamentId ? '🏆 Tournament' : '🌍 Global'} Leaderboard
      </h2>

      {!tournamentId && (
        <div className="text-center mb-4">
          <div className="btn-group" role="group" aria-label="Difficulty filter">
            {['easy', 'intermediate', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`btn btn-${selectedDifficulty === level ? 'primary' : 'outline-primary'} text-capitalize`}
              >
                {level} ({level === 'easy' ? '4x4' : level === 'intermediate' ? '6x6' : '8x8'})
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-warning text-center" role="alert">
          {error}
        </div>
      )}

      {leaderboard.length === 0 && !loading && !error && (
        <div className="text-center">
          <div className="alert alert-info" role="alert">
            No scores yet for this {tournamentId ? 'tournament' : 'difficulty level'}. Be the first to play!
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0 text-center">
                  {tournamentId ? 'Tournament Rankings' : `Best Scores - ${memoryGameAPI.getDifficultyDisplay(selectedDifficulty)}`}
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" className="text-center" style={{width: '80px'}}>Rank</th>
                        <th scope="col">Player</th>
                        {tournamentId && <th scope="col" className="text-center">Age</th>}
                        <th scope="col" className="text-center">Score</th>
                        <th scope="col" className="text-center">Time</th>
                        <th scope="col" className="text-center">Moves</th>
                        <th scope="col" className="text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody ref={leaderboardRef}>
                      {leaderboard.map((entry, index) => {
                        const rank = entry.rank || (index + 1);
                        const isCurrentPlayer = isCurrentPlayerEntry(entry);
                        return (
                          <tr 
                            key={index} 
                            className={`${getRankClass(rank)} ${isCurrentPlayer ? 'table-success current-player-row' : ''}`}
                            style={isCurrentPlayer ? { 
                              boxShadow: '0 0 10px rgba(25, 135, 84, 0.3)',
                              transform: 'scale(1.01)' 
                            } : {}}
                          >
                            <td className="text-center fw-bold">
                              <span className="fs-5">{getRankIcon(rank)}</span>
                              {isCurrentPlayer && <span className="ms-2 text-success">👤</span>}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div>
                                  <div className={`fw-semibold ${isCurrentPlayer ? 'text-success' : ''}`}>
                                    {isCurrentPlayer ? '👤 You' : (entry.player_name || entry.participant_name || entry.user || 'Anonymous')}
                                    {isCurrentPlayer && entry.player_name && (
                                      <span className="text-muted small ms-2">({entry.player_name})</span>
                                    )}
                                  </div>
                                  {entry.user && entry.participant_name && (
                                    <small className="text-muted">({entry.user})</small>
                                  )}
                                </div>
                              </div>
                            </td>
                            {tournamentId && (
                              <td className="text-center">
                                {entry.participant_age ? `${entry.participant_age} years` : '--'}
                              </td>
                            )}
                            <td className="text-center">
                              <span className="fw-bold text-success fs-5">
                                {entry.score?.toLocaleString() || 0}
                              </span>
                              <div>
                                <small className="text-muted">points</small>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="fw-semibold text-primary">
                                {formatTime(entry.time_seconds)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="text-warning">
                                {entry.moves_count || '--'}
                              </span>
                            </td>
                            <td className="text-center">
                              <small className="text-muted">
                                {formatDate(entry.created_at || entry.achieved_at)}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Top 3 Podium for tournaments */}
            {tournamentId && leaderboard.length >= 3 && (
              <div className="row mt-4 text-center">
                <div className="col-12">
                  <h4 className="mb-3">🏆 Tournament Podium</h4>
                </div>
                <div className="col-md-4 order-md-2">
                  {/* 1st Place */}
                  <div className="card border-warning shadow">
                    <div className="card-body">
                      <div className="display-1">🥇</div>
                      <h5 className="card-title text-warning">1st Place</h5>
                      <h6 className="card-subtitle mb-2">
                        {leaderboard[0].player_name || leaderboard[0].participant_name || leaderboard[0].user}
                      </h6>
                      <p className="card-text">
                        <strong>{leaderboard[0].score?.toLocaleString()}</strong> points
                        <br />
                        <small className="text-muted">
                          {formatTime(leaderboard[0].time_seconds)} | {leaderboard[0].moves_count} moves
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 order-md-1">
                  {/* 2nd Place */}
                  <div className="card border-secondary shadow" style={{marginTop: '2rem'}}>
                    <div className="card-body">
                      <div className="display-2">🥈</div>
                      <h5 className="card-title text-secondary">2nd Place</h5>
                      <h6 className="card-subtitle mb-2">
                        {leaderboard[1].player_name || leaderboard[1].participant_name || leaderboard[1].user}
                      </h6>
                      <p className="card-text">
                        <strong>{leaderboard[1].score?.toLocaleString()}</strong> points
                        <br />
                        <small className="text-muted">
                          {formatTime(leaderboard[1].time_seconds)} | {leaderboard[1].moves_count} moves
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 order-md-3">
                  {/* 3rd Place */}
                  <div className="card border-danger shadow" style={{marginTop: '2rem'}}>
                    <div className="card-body">
                      <div className="display-2">🥉</div>
                      <h5 className="card-title text-danger">3rd Place</h5>
                      <h6 className="card-subtitle mb-2">
                        {leaderboard[2].player_name || leaderboard[2].participant_name || leaderboard[2].user}
                      </h6>
                      <p className="card-text">
                        <strong>{leaderboard[2].score?.toLocaleString()}</strong> points
                        <br />
                        <small className="text-muted">
                          {formatTime(leaderboard[2].time_seconds)} | {leaderboard[2].moves_count} moves
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scoring Info */}
            <div className="card mt-4">
              <div className="card-header">
                <h6 className="mb-0">📊 Scoring System</h6>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-4">
                    <strong>Base Score</strong>
                    <div className="text-muted">
                      <small>Easy: 1000 pts | Intermediate: 1500 pts | Hard: 2000 pts</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Time Penalty</strong>
                    <div className="text-muted">
                      <small>-2 points per second</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Move Penalty</strong>
                    <div className="text-muted">
                      <small>-5 points per extra move</small>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <small className="text-info">
                    💡 Tip: Complete games quickly with fewer moves to maximize your score!
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}