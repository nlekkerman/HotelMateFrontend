import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import quizGameAPI from '@/services/quizGameAPI';

export default function QuizTournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await quizGameAPI.getTournaments(null, hotelParam);
      setTournaments(data);
      
      // Auto-select first active tournament
      const activeTournament = data.find(t => t.status === 'active');
      if (activeTournament) {
        handleSelectTournament(activeTournament);
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError('Failed to load tournaments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (tournament) => {
    setSelectedTournament(tournament);
    setLoadingLeaderboard(true);
    
    try {
      const leaderboardData = await quizGameAPI.getTournamentLeaderboard(tournament.id, 50);
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to load tournament leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleJoinTournament = (tournament) => {
    navigate(`/games/quiz?hotel=${hotelParam || ''}`, {
      state: { tournamentId: tournament.id }
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: { color: 'info', text: 'Upcoming', icon: 'calendar-event' },
      active: { color: 'success', text: 'Active', icon: 'play-circle-fill' },
      completed: { color: 'secondary', text: 'Completed', icon: 'check-circle-fill' },
      cancelled: { color: 'danger', text: 'Cancelled', icon: 'x-circle-fill' }
    };
    return badges[status] || badges.upcoming;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: 'trophy-fill', color: '#FFD700' };
    if (rank === 2) return { icon: 'trophy-fill', color: '#C0C0C0' };
    if (rank === 3) return { icon: 'trophy-fill', color: '#CD7F32' };
    return { icon: 'award-fill', color: mainColor };
  };

  const isMyEntry = (entry) => {
    const myToken = quizGameAPI.getPlayerToken();
    return entry.player_name.includes(myToken);
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: mainColor }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 pb-5">
      <div className="row">
        {/* Tournaments List */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header" style={{ backgroundColor: mainColor, color: 'white' }}>
              <h5 className="mb-0">
                <i className="bi bi-trophy me-2"></i>
                Tournaments
              </h5>
            </div>
            <div className="card-body p-0">
              {error && (
                <div className="alert alert-danger m-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {tournaments.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                  <p className="text-muted mt-3">No tournaments available</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {tournaments.map((tournament) => {
                    const badge = getStatusBadge(tournament.status);
                    const isSelected = selectedTournament?.id === tournament.id;
                    
                    return (
                      <button
                        key={tournament.id}
                        className={`list-group-item list-group-item-action ${isSelected ? 'active' : ''}`}
                        style={isSelected ? { backgroundColor: mainColor, borderColor: mainColor } : {}}
                        onClick={() => handleSelectTournament(tournament)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{tournament.name}</h6>
                            <small className={isSelected ? 'text-white-50' : 'text-muted'}>
                              {quizGameAPI.formatDate(tournament.start_date)} - {quizGameAPI.formatDate(tournament.end_date)}
                            </small>
                          </div>
                          <span className={`badge bg-${badge.color}`}>
                            <i className={`bi bi-${badge.icon} me-1`}></i>
                            {badge.text}
                          </span>
                        </div>
                        <div className="mt-2">
                          <small className={isSelected ? 'text-white-50' : 'text-muted'}>
                            <i className="bi bi-people-fill me-1"></i>
                            {tournament.participant_count}/{tournament.max_participants} players
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn btn-outline-secondary w-100 mt-3"
            onClick={() => navigate(`/games${hotelParam ? `?hotel=${hotelParam}` : ''}`)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Games
          </button>
        </div>

        {/* Tournament Details & Leaderboard */}
        <div className="col-lg-8">
          {selectedTournament ? (
            <>
              {/* Tournament Info Card */}
              <div className="card shadow mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h3 className="mb-0">{selectedTournament.name}</h3>
                    <span className={`badge bg-${getStatusBadge(selectedTournament.status).color} fs-6`}>
                      {selectedTournament.status_display}
                    </span>
                  </div>

                  <p className="text-muted">{selectedTournament.description}</p>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <i className="bi bi-people-fill" style={{ fontSize: '2rem', color: mainColor }}></i>
                          <h5 className="mt-2 mb-0">{selectedTournament.participant_count}</h5>
                          <small className="text-muted">Participants</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <i className="bi bi-question-circle-fill" style={{ fontSize: '2rem', color: mainColor }}></i>
                          <h5 className="mt-2 mb-0">{selectedTournament.questions_per_quiz}</h5>
                          <small className="text-muted">Questions</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <i className="bi bi-calendar-check" style={{ fontSize: '2rem', color: mainColor }}></i>
                          <h5 className="mt-2 mb-0">
                            {selectedTournament.is_registration_open ? 'Open' : 'Closed'}
                          </h5>
                          <small className="text-muted">Registration</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prizes */}
                  {(selectedTournament.first_prize || selectedTournament.second_prize || selectedTournament.third_prize) && (
                    <div className="card bg-warning bg-opacity-10 border-warning mb-3">
                      <div className="card-body">
                        <h6 className="mb-2">
                          <i className="bi bi-gift-fill me-2"></i>
                          Prizes
                        </h6>
                        <ul className="mb-0">
                          {selectedTournament.first_prize && <li><strong>1st Place:</strong> {selectedTournament.first_prize}</li>}
                          {selectedTournament.second_prize && <li><strong>2nd Place:</strong> {selectedTournament.second_prize}</li>}
                          {selectedTournament.third_prize && <li><strong>3rd Place:</strong> {selectedTournament.third_prize}</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {selectedTournament.rules && (
                    <div className="card bg-light mb-3">
                      <div className="card-body">
                        <h6 className="mb-2">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          Rules
                        </h6>
                        <p className="mb-0 small">{selectedTournament.rules}</p>
                      </div>
                    </div>
                  )}

                  {selectedTournament.status === 'active' && selectedTournament.is_registration_open && (
                    <button
                      className="btn btn-lg btn-primary w-100"
                      style={{ backgroundColor: mainColor, borderColor: mainColor }}
                      onClick={() => handleJoinTournament(selectedTournament)}
                    >
                      <i className="bi bi-play-fill me-2"></i>
                      Join Tournament
                    </button>
                  )}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="card shadow">
                <div className="card-header" style={{ backgroundColor: mainColor, color: 'white' }}>
                  <h5 className="mb-0">
                    <i className="bi bi-list-ol me-2"></i>
                    Tournament Leaderboard
                  </h5>
                  <small className="opacity-75">All plays ranked (players can appear multiple times)</small>
                </div>
                <div className="card-body p-0">
                  {loadingLeaderboard ? (
                    <div className="text-center py-5">
                      <div className="spinner-border" role="status" style={{ color: mainColor }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                      <p className="text-muted mt-3">No scores yet. Be the first to play!</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Rank</th>
                            <th>Player</th>
                            <th className="text-end">Score</th>
                            <th className="text-center">Correct</th>
                            <th className="text-end">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry) => {
                            const badge = getRankBadge(entry.rank);
                            const isMe = isMyEntry(entry);
                            
                            return (
                              <tr 
                                key={entry.id}
                                className={isMe ? 'table-active' : ''}
                                style={isMe ? { backgroundColor: `${mainColor}10` } : {}}
                              >
                                <td className="align-middle">
                                  <div className="d-flex align-items-center">
                                    <i 
                                      className={`bi bi-${badge.icon} me-2`}
                                      style={{ color: badge.color, fontSize: '1.5rem' }}
                                    ></i>
                                    <span className="fw-bold">{entry.rank}</span>
                                  </div>
                                </td>
                                <td className="align-middle">
                                  <div className="d-flex align-items-center">
                                    <span>{entry.player_display_name}</span>
                                    {isMe && (
                                      <span className="badge bg-primary ms-2">You</span>
                                    )}
                                  </div>
                                </td>
                                <td className="align-middle text-end">
                                  <span 
                                    className="badge p-2"
                                    style={{ 
                                      backgroundColor: mainColor,
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    {entry.score}
                                  </span>
                                </td>
                                <td className="align-middle text-center">
                                  <span className="badge bg-secondary">
                                    {entry.correct_answers}/{entry.total_questions}
                                  </span>
                                </td>
                                <td className="align-middle text-end text-muted small">
                                  {quizGameAPI.formatTime(entry.time_seconds)}
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
            </>
          ) : (
            <div className="card shadow">
              <div className="card-body text-center py-5">
                <i className="bi bi-trophy" style={{ fontSize: '4rem', color: '#ccc' }}></i>
                <p className="text-muted mt-3">Select a tournament to view details and leaderboard</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
