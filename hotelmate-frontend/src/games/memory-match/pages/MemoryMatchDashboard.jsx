import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { memoryGameAPI } from '@/services/memoryGameAPI';

const MemoryMatchDashboard = () => {
  const [searchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const hotelSlug = searchParams.get('hotel');

  useEffect(() => {
    if (hotelSlug) {
      fetchActiveTournaments();
    } else {
      // No hotel specified - show general options
      setLoading(false);
    }
  }, [hotelSlug]);

  const fetchActiveTournaments = async () => {
    try {
      setError(null);
      console.log(`🎮 Fetching tournaments for hotel: ${hotelSlug}`);
      
      // Use the updated memoryGameAPI method
      const data = await memoryGameAPI.getActiveTournamentsForHotel(hotelSlug);
      
      if (data.tournaments && data.tournaments.length > 0) {
        console.log(`🎯 Found ${data.tournaments.length} tournaments from API!`);
        setTournaments(data.tournaments);
      } else {
        console.log('🔄 No API tournaments found, using mock data...');
        
        // Mock data for testing when no real tournaments available
        const mockTournaments = [
          {
            id: 16,
            name: "Memory Match Daily - Monday",
            description: "Daily Memory Match for October 27, 2025. 3×4 grid (6 pairs) - Test tournament!",
            start_date: "2025-10-27T12:00:00Z",
            end_date: "2025-10-27T19:00:00Z", 
            status: "active",
            participant_count: 0,
            first_prize: "Hotel Game Room Pass",
            second_prize: "Pool Day Pass",
            third_prize: "Ice Cream Voucher"
          },
          {
            id: 17,
            name: "Memory Match Daily - Tuesday",
            description: "Tomorrow's tournament - 3×4 grid challenge!",
            start_date: "2025-10-28T12:00:00Z",
            end_date: "2025-10-28T19:00:00Z",
            status: "upcoming",
            participant_count: 5,
            first_prize: "Spa Day Voucher",
            second_prize: "Restaurant Credit",
            third_prize: "Gift Shop Voucher"
          },
          {
            id: 18,
            name: "Memory Match Weekend Special",
            description: "Weekend tournament with special prizes!",
            start_date: "2025-10-26T09:00:00Z",
            end_date: "2025-10-26T18:00:00Z",
            status: "completed",
            participant_count: 15,
            first_prize: "Weekend Getaway",
            second_prize: "Dinner for Two", 
            third_prize: "Cocktail Voucher"
          }
        ];
        
        setTournaments(mockTournaments);
        setError('Using demo tournaments - connect to backend for real tournaments');
      }
      
    } catch (error) {
      console.error('❌ Error fetching tournaments:', error);
      setError(`Tournament API unavailable: ${error.message}`);
      
      // Fallback mock data
      setTournaments([
        {
          id: 999,
          name: "Demo Tournament - Offline Mode", 
          description: "Test tournament for offline demonstration",
          start_date: "2025-10-27T10:00:00Z",
          end_date: "2025-10-27T22:00:00Z",
          status: "active",
          participant_count: 0,
          first_prize: "Demo Prize",
          second_prize: "Second Prize",
          third_prize: "Third Prize"
        }
      ]);
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
      alert(`🕒 Tournament Not Started Yet!\n\n${tournament.name}\nStarts: ${startDateTime}`);
      
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
      alert(`🏁 Tournament Has Ended!\n\n${tournament.name}\nEnded: ${endDateTime}\n\nCheck the leaderboard to see results!`);
      
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
                    Play without limits • Scores saved locally
                  </p>
                  <ul className="list-unstyled mb-4 text-start">
                    <li className="mb-2">✅ No registration needed</li>
                    <li className="mb-2">✅ Unlimited attempts</li>
                    <li className="mb-2">✅ Track your best scores</li>
                    <li className="mb-2">✅ Perfect for learning</li>
                  </ul>
                  <button 
                    className="btn btn-primary btn-lg w-100"
                    onClick={startPractice}
                  >
                    Start Practice
                  </button>
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
                    Compete with other guests • Win prizes!
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
                  
                  {/* Debug Info */}
                  {hotelSlug && (
                    <div className="alert alert-info mb-3">
                      <div className="d-flex align-items-start">
                        <span className="me-2">🔧</span>
                        <div>
                          <div className="fw-bold">Debug Info</div>
                          <small>
                            Hotel: {hotelSlug}<br/>
                            Tournaments loaded: {tournaments.length}<br/>
                            API Base: {window.location.hostname === 'localhost' ? 'localhost:8000' : 'production'}
                          </small>
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
                                <div className="d-flex justify-content-end">
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
                  <h5 className="card-title mb-2">💡 How to Play</h5>
                  <p className="card-text mb-0">
                    Flip cards to find matching pairs. Complete all 6 pairs in the fewest moves and fastest time! 
                    Perfect game is 12 moves in under 30 seconds.
                  </p>
                </div>
                <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
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
  );
};

export default MemoryMatchDashboard;