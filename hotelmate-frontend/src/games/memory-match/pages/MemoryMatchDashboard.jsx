import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import { useAuth } from '@/context/AuthContext';

const MemoryMatchDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const hotelSlug = searchParams.get('hotel');

  useEffect(() => {
    // If no hotel parameter but user is logged in, redirect with their hotel
    if (!hotelSlug && user?.hotel_slug) {
      setSearchParams({ hotel: user.hotel_slug });
      return;
    }

    if (hotelSlug) {
      fetchActiveTournaments();
    } else {
      // No hotel specified - show general options
      setLoading(false);
    }
  }, [hotelSlug, user?.hotel_slug, setSearchParams]);

  const fetchActiveTournaments = async () => {
    try {
      setError(null);
      
      // Use the updated memoryGameAPI method
      const data = await memoryGameAPI.getActiveTournamentsForHotel(hotelSlug);
      
      if (data.tournaments && data.tournaments.length > 0) {
        setTournaments(data.tournaments);
      } else {
        // No tournaments available from API
        setTournaments([]);
        setError('No active tournaments found for this hotel');
      }
      
    } catch (error) {
      setError(`Tournament API unavailable: ${error.message}`);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    navigate('/games/memory-match/practice');
  };

  const startTournament = (tournament) => {
    const now = new Date();
    const startTime = new Date(tournament.start_date);
    const endTime = new Date(tournament.end_date);

    if (now < startTime) {
      // Tournament hasn't started yet
      const startDateTime = startTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Show alert notification
      
      return;
    }

    if (now > endTime) {
      // Tournament has ended
      const endDateTime = endTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Show alert notification
      
      return;
    }

    // Tournament is active - proceed
    navigate(`/games/memory-match/tournament/${tournament.id}`);
  };

  const goToTournamentManagement = () => {
    navigate('/games/memory-match/tournaments');
  };

  if (loading) {
    return (
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-primary bg-opacity-10">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h2 className="h4">🎮 Memory Match</h2>
          <p className="text-muted">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid min-vh-100 bg-gradient" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="row justify-content-center align-items-center min-vh-100 py-4">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Header */}
          <header className="text-center text-white mb-5">
            <h1 className="display-4 fw-bold mb-3">
              🎮 Memory Match
            </h1>
            <p className="lead mb-2">3×4 Grid • Match 6 Pairs • Test Your Memory!</p>
            <div className="badge bg-light text-dark fs-6 px-3 py-2 mb-2">
              🎯 Simplified Game: No Difficulty Selection • Fixed 3×4 Grid for Fair Play
            </div>
            {hotelSlug && (
              <div className="badge bg-light text-dark fs-6 px-3 py-2">
                🏨 Welcome to {hotelSlug.replace('-', ' ').toUpperCase()}
              </div>
            )}
          </header>

          {/* Game Modes */}
          <div className="row g-4 mb-4">
            {/* Practice Mode */}
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-lg border-0" style={{backgroundColor: 'rgba(255,255,255,0.95)'}}>
                <div className="card-body p-4 text-center">
                  <div className="display-1 mb-3">🏃‍♀️</div>
                  <h2 className="card-title h3 text-primary mb-3">Practice Mode</h2>
                  <p className="card-text text-muted mb-4">
                    Play without limits • Fixed 3×4 grid • Scores saved locally
                  </p>
                  <ul className="list-unstyled mb-4 text-start">
                    <li className="mb-2">✅ No registration needed</li>
                    <li className="mb-2">✅ Unlimited attempts</li>
                    <li className="mb-2">✅ Simple 3×4 grid (6 pairs)</li>
                    <li className="mb-2">✅ Perfect for all skill levels</li>
                  </ul>
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={startPractice}
                    >
                      Start Practice
                    </button>
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => navigate('/games/memory-match/stats')}
                    >
                      📊 View My Scores
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Mode */}
            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-lg border-0" style={{backgroundColor: 'rgba(255,255,255,0.95)'}}>
                <div className="card-body p-4 text-center">
                  <div className="display-1 mb-3">🏆</div>
                  <h2 className="card-title h3 text-success mb-3">Tournament Mode</h2>
                  <p className="card-text text-muted mb-4">
                    Compete with other guests • Fixed 3×4 grid for fair play • Win prizes!
                  </p>
                  
                  {error && (
                    <div className="alert alert-warning mb-3">
                      <div className="d-flex align-items-start">
                        <span className="me-2">⚠️</span>
                        <div>
                          <div className="fw-bold">API Status</div>
                          <small>{error}</small>
                        </div>
                      </div>
                    </div>
                  )}
                  
                 
                  
                  {tournaments.length > 0 ? (
                    <div className="tournaments-list mb-4">
                      <p className="fw-bold text-success mb-3">🎯 Active Tournaments:</p>
                      <div className="d-grid gap-3">
                        {tournaments.map(tournament => {
                          const now = new Date();
                          const startTime = new Date(tournament.start_date);
                          const endTime = new Date(tournament.end_date);
                          
                          const isActive = now >= startTime && now <= endTime;
                          const isUpcoming = now < startTime;
                          const isEnded = now > endTime;
                          
                          let statusBadge = '';
                          let statusClass = '';
                          let buttonClass = '';
                          let buttonText = '';
                          
                          if (isActive) {
                            statusBadge = '🟢 LIVE';
                            statusClass = 'text-success';
                            buttonClass = 'btn-success';
                            buttonText = 'Enter →';
                          } else if (isUpcoming) {
                            statusBadge = '🕒 Starts Soon';
                            statusClass = 'text-warning';
                            buttonClass = 'btn-outline-warning';
                            buttonText = 'Not Started';
                          } else if (isEnded) {
                            statusBadge = '🏁 Ended';
                            statusClass = 'text-danger';
                            buttonClass = 'btn-outline-danger';
                            buttonText = 'View Results';
                          }
                          
                          return (
                            <div key={tournament.id} className="border rounded p-3 bg-light">
                              <div className="text-start">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h6 className="fw-bold mb-1">{tournament.name}</h6>
                                  <span className={`badge ${statusClass} bg-opacity-10 border`}>
                                    {statusBadge}
                                  </span>
                                </div>
                                <p className="small text-muted mb-2">{tournament.description}</p>
                                <div className="small text-muted mb-2">
                                  <div>📅 {startTime.toLocaleDateString()} • {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                  <div>👥 {tournament.participant_count} players • 🎯 6 pairs (12 cards)</div>
                                </div>
                                <div className="d-flex justify-content-end gap-2">
                                  <button 
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => navigate(`/games/memory-match/leaderboard?tournament=${tournament.id}`)}
                                  >
                                    🏆 Rankings
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${buttonClass}`}
                                    onClick={() => startTournament(tournament)}
                                    disabled={!isActive && !isEnded}
                                  >
                                    {buttonText}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="alert alert-info mb-3">
                        <h6 className="alert-heading">🕒 No Active Tournaments</h6>
                        <p className="mb-0 small">
                          No tournaments available right now for this hotel.
                          Try practice mode or check back later!
                        </p>
                      </div>
                    </div>
                  )}

                  {!tournaments.length && (
                    <button 
                      className="btn btn-outline-success btn-lg w-100"
                      onClick={startPractice}
                    >
                      Try Practice Mode Instead
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="card shadow border-0 bg-white bg-opacity-90">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-12 col-md-8">
                  <h5 className="card-title mb-2">💡 How to Play (Simplified)</h5>
                  <p className="card-text mb-0">
                    <strong>3×4 Grid Only:</strong> Flip cards to find all 6 matching pairs. Everyone plays the same layout for fair competition! 
                    Perfect game is 12 moves in under 30 seconds.
                  </p>
                </div>
                <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
                  <div className="d-grid d-md-block gap-2">
                    <button 
                      className="btn btn-outline-primary me-md-2 mb-2 mb-md-0"
                      onClick={() => navigate('/games/memory-match/leaderboard')}
                    >
                      🏆 Leaderboard
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={goToTournamentManagement}
                    >
                      📊 Tournament Management
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryMatchDashboard;
