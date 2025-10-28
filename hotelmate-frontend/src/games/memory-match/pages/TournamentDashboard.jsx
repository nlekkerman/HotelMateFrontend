import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import memoryGameAPI from '@/services/memoryGameAPI';
import TournamentRules from '../components/TournamentRules';

export default function TournamentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const flashIntervalRef = useRef(null);
  const [flashState, setFlashState] = useState(false);
  const [allTournaments, setAllTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [nextTournament, setNextTournament] = useState(null);
  const [showRules, setShowRules] = useState(false);
  
  // Get hotel from URL params (e.g., ?hotel=hotel-killarney)
  const hotelSlug = searchParams.get('hotel') || 'hotel-killarney';

  useEffect(() => {
    fetchAllTournaments();
    
    // Refresh tournaments every 30 seconds to check for changes
    const interval = setInterval(fetchAllTournaments, 30000);
    return () => clearInterval(interval);
  }, [hotelSlug]); // Re-fetch when hotel changes

  // Fetch leaderboard when tournament changes
  useEffect(() => {
    fetchLeaderboardData();
    
    // Refresh leaderboard every 60 seconds to get new scores
    const leaderboardInterval = setInterval(fetchLeaderboardData, 60000);
    return () => clearInterval(leaderboardInterval);
  }, [nextTournament]); // Re-fetch when tournament changes

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      
      // If we have an active tournament, show its leaderboard
      if (nextTournament && nextTournament.id) {
        console.log(`📊 Fetching leaderboard for tournament: ${nextTournament.name} (ID: ${nextTournament.id})`);
        const response = await memoryGameAPI.getTournamentLeaderboard(nextTournament.id);
        
        console.log(`📋 Tournament leaderboard response:`, response);
        
        let leaderboardArray = [];
        
        // Handle different response formats from backend
        if (Array.isArray(response)) {
          // Direct array of session objects
          leaderboardArray = response;
        } else if (response && response.sessions && Array.isArray(response.sessions)) {
          // Wrapped in sessions key
          leaderboardArray = response.sessions;
        } else if (response && response.results && Array.isArray(response.results)) {
          // Paginated response
          leaderboardArray = response.results;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Wrapped in data key
          leaderboardArray = response.data;
        } else {
          console.log(`📋 No leaderboard data found for tournament ${nextTournament.id}`);
          leaderboardArray = [];
        }
        
        // Log the actual data structure to debug player names
        if (leaderboardArray.length > 0) {
          console.log(`📋 First leaderboard entry structure:`, leaderboardArray[0]);
          console.log(`📋 Available fields:`, Object.keys(leaderboardArray[0]));
        }
        
        setLeaderboardData(leaderboardArray);
      } else {
        // No active tournament - show general leaderboard as fallback
        console.log(`📊 No active tournament - showing general leaderboard`);
        const response = await memoryGameAPI.getGeneralLeaderboard();
        
        if (response && response.leaderboard) {
          setLeaderboardData(response.leaderboard);
        } else {
          setLeaderboardData([]);
        }
      }
      
    } catch (error) {
      console.warn('Leaderboard API not available:', error.message);
      setLeaderboardError('Unable to load rankings. Please try again later.');
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchAllTournaments = async () => {
    try {
      setTournamentLoading(true);
      console.log(`🔍 Fetching tournaments from database for ${hotelSlug}...`);
      
      // Get tournaments for this specific hotel
      const tournaments = await memoryGameAPI.getTournaments(hotelSlug);
      console.log(`📋 Raw tournaments response:`, tournaments);
      console.log(`📋 Number of tournaments found:`, tournaments ? tournaments.length : 0);
      
      if (tournaments && tournaments.length > 0) {
        tournaments.forEach((tournament, index) => {
          const now = new Date();
          const startTime = new Date(tournament.start_date);
          const endTime = new Date(tournament.end_date);
          
          console.log(`📋 Tournament ${index + 1}:`, {
            id: tournament.id,
            name: tournament.name,
            hotel: tournament.hotel,
            status: tournament.status,
            is_active: tournament.is_active,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
            now: now.toISOString(),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            nowTimestamp: now.getTime(),
            startTimestamp: startTime.getTime(),
            endTimestamp: endTime.getTime(),
            isNowAfterStart: now >= startTime,
            isNowBeforeEnd: now <= endTime,
            isActiveByTime: now >= startTime && now <= endTime,
            minutesToStart: Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60)),
            minutesToEnd: Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60))
          });
        });
      }
      
      setAllTournaments(tournaments || []);
      
      // Get the next relevant tournament (active or upcoming) for this hotel
      const result = await memoryGameAPI.getNextTournament(hotelSlug);
      console.log(`🎯 getNextTournament result:`, result);
      
      if (result.tournament) {
        setNextTournament(result.tournament);
        console.log(`🎯 Next tournament for ${hotelSlug}: "${result.tournament.name}" (${result.status})`);
      } else {
        setNextTournament(null);
        console.log(`❌ No next tournament found for ${hotelSlug}. Result:`, result);
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch tournaments for ${hotelSlug}:`, error);
      console.error(`❌ Error details:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setAllTournaments([]);
      setNextTournament(null);
    } finally {
      setTournamentLoading(false);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle countdown flashing and colors for REAL tournaments only
  useEffect(() => {
    if (!nextTournament) {
      // No tournament - no flashing
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      setFlashState(false);
      return;
    }

    const tournamentStartTime = new Date(nextTournament.start_date);
    const timeUntilTournament = tournamentStartTime.getTime() - currentTime.getTime();
    const minutesUntil = Math.floor(timeUntilTournament / (1000 * 60));
    
    // Clear existing flash interval
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    
    // Set up flashing based on time remaining until REAL tournament
    if (minutesUntil <= 5 && minutesUntil > 1 && timeUntilTournament > 0) {
      // Orange flashing (every second)
      flashIntervalRef.current = setInterval(() => {
        setFlashState(prev => !prev);
      }, 1000);
    } else if (minutesUntil <= 1 && timeUntilTournament > 0) {
      // Red flashing (twice per second)
      flashIntervalRef.current = setInterval(() => {
        setFlashState(prev => !prev);
      }, 500);
    } else {
      // No flashing
      setFlashState(false);
    }

    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, [currentTime, nextTournament]);

  const getTournamentState = () => {
    if (!nextTournament) {
      // NO TOURNAMENTS AT ALL - show message
      return {
        state: 'no-tournaments',
        timeRemaining: 0,
        tournament: null,
        canPlay: false,
        message: 'No tournaments available'
      };
    }

    const now = currentTime;
    const startTime = new Date(nextTournament.start_date);
    const endTime = new Date(nextTournament.end_date);
    const timeUntilStart = startTime.getTime() - now.getTime();
    
    if (now >= startTime && now <= endTime) {
      // Tournament is ACTIVE right now
      return {
        state: 'active',
        timeRemaining: 0,
        tournamentTime: startTime,
        canPlay: true,
        endTime: endTime,
        tournament: nextTournament,
        tournamentId: nextTournament.id
      };
    } else if (timeUntilStart > 0) {
      // Tournament is UPCOMING - show countdown
      return {
        state: 'countdown',
        timeRemaining: timeUntilStart,
        tournamentTime: startTime,
        canPlay: false,
        endTime: endTime,
        tournament: nextTournament,
        tournamentId: nextTournament.id
      };
    } else {
      // Tournament ENDED
      return {
        state: 'ended',
        timeRemaining: 0,
        tournamentTime: startTime,
        canPlay: false,
        endTime: endTime,
        tournament: nextTournament
      };
    }
  };  const formatCountdown = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCountdownStyle = () => {
    const { timeRemaining } = getTournamentState();
    const minutesUntil = Math.floor(timeRemaining / (1000 * 60));
    
    let baseStyle = {
      transition: 'all 0.3s ease',
      borderRadius: '15px',
      padding: '20px',
      margin: '10px 0'
    };

    if (minutesUntil <= 5 && minutesUntil > 1) {
      // Orange warning phase
      return {
        ...baseStyle,
        backgroundColor: flashState ? '#ff8c00' : '#ffa500',
        color: 'white',
        boxShadow: flashState ? '0 0 20px rgba(255, 140, 0, 0.7)' : '0 4px 8px rgba(0,0,0,0.1)'
      };
    } else if (minutesUntil <= 1 && timeRemaining > 0) {
      // Red critical phase
      return {
        ...baseStyle,
        backgroundColor: flashState ? '#dc3545' : '#ff0000',
        color: 'white',
        boxShadow: flashState ? '0 0 25px rgba(220, 53, 69, 0.8)' : '0 4px 8px rgba(0,0,0,0.1)',
        animation: flashState ? 'pulse 0.5s ease-in-out' : 'none'
      };
    } else {
      // Normal phase
      return {
        ...baseStyle,
        backgroundColor: '#e9ecef',
        color: '#495057'
      };
    }
  };

  const handlePlayTournament = () => {
    const { canPlay, tournamentId } = getTournamentState();
    if (canPlay && tournamentId) {
      // Show rules screen first before starting tournament
      setShowRules(true);
    }
  };

  const handleStartTournamentGame = () => {
    const { canPlay, tournamentId } = getTournamentState();
    if (canPlay && tournamentId) {
      // Navigate to actual tournament game
      navigate(`/games/memory-match/tournament/${tournamentId}`);
    }
  };

  const handleGoBackToTournament = () => {
    setShowRules(false);
  };

  const handlePlayPractice = () => {
    navigate('/games/memory-match/practice');
  };

  const tournamentState = getTournamentState();

  // Show rules screen if requested
  if (showRules && nextTournament) {
    return (
      <TournamentRules
        tournament={nextTournament}
        onStartGame={handleStartTournamentGame}
        onGoBack={handleGoBackToTournament}
      />
    );
  }

  return (
    <div className="container-fluid min-vh-100 bg-gradient" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        .tournament-card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
          border: none;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .countdown-display {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          text-align: center;
        }
        
        .btn-tournament {
          transition: all 0.2s ease;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
        }
        
        .btn-tournament:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .btn-tournament:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="row justify-content-center py-4">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Header */}
          <header className="text-center text-white mb-4">
            <h1 className="h2 mb-0">🏆 Memory Match Tournament</h1>
            {tournamentLoading ? (
              <p className="lead">Loading tournaments from database...</p>
            ) : nextTournament ? (
              <p className="lead">{nextTournament.name}</p>
            ) : (
              <p className="lead">No tournaments available</p>
            )}
          </header>

          {/* Tournament Display - REAL TOURNAMENTS ONLY */}
          <div className="card tournament-card mb-4">
            <div className="card-body">
              {tournamentState.state === 'no-tournaments' && (
                <div className="text-center" style={{
                  backgroundColor: '#e9ecef',
                  color: '#495057',
                  borderRadius: '15px',
                  padding: '20px',
                  margin: '10px 0'
                }}>
                  <h4 className="mb-2">📅 No Tournaments Available</h4>
                  <p className="mb-3">Check back later for upcoming tournaments!</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={fetchAllTournaments}
                    disabled={tournamentLoading}
                  >
                    {tournamentLoading ? '🔄 Loading...' : '🔄 Refresh'}
                  </button>
                </div>
              )}

              {tournamentState.state === 'countdown' && (
                <div className="countdown-display" style={getCountdownStyle()}>
                  <h4 className="mb-2">⏰ {tournamentState.tournament.name} Starting In:</h4>
                  <h2 className="display-4 mb-3" style={{ fontSize: '2.5rem' }}>
                    {formatCountdown(tournamentState.timeRemaining)}
                  </h2>
                  <p className="mb-2">
                    Starts: {tournamentState.tournamentTime.toLocaleString('en-US', { 
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="mb-0 small text-muted">
                    Ends: {tournamentState.endTime.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {tournamentState.state === 'active' && (
                <div className="text-center" style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '20px',
                  margin: '10px 0'
                }}>
                  <h4 className="mb-2">🔥 {tournamentState.tournament.name} is LIVE!</h4>
                  <h3 className="display-5 mb-3">Play Now!</h3>
                  <p className="mb-2">
                    Started: {tournamentState.tournamentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="mb-0">
                    Ends: {tournamentState.endTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              )}

              {tournamentState.state === 'ended' && (
                <div className="text-center" style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '20px',
                  margin: '10px 0'
                }}>
                  <h4 className="mb-2">📊 {tournamentState.tournament.name} Ended</h4>
                  <h5 className="mb-3">Check the Results!</h5>
                  <p className="mb-0">
                    Ended: {tournamentState.endTime.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                  <button 
                    className="btn btn-light btn-sm mt-3"
                    onClick={fetchAllTournaments}
                    disabled={tournamentLoading}
                  >
                    {tournamentLoading ? '🔄 Checking...' : '🔄 Check for New Tournaments'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Game Buttons */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6">
              <div className="card tournament-card h-100">
                <div className="card-body text-center p-4">
                  <div className="display-1 mb-3">🏃‍♀️</div>
                  <h3 className="text-primary mb-3">Practice Mode</h3>
                  <p className="text-muted mb-4">
                    Play anytime • Perfect your skills • No pressure!
                  </p>
                  <button
                    className="btn btn-primary btn-tournament w-100"
                    onClick={handlePlayPractice}
                    aria-label="Start practice game"
                  >
                    🎮 Practice Now
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card tournament-card h-100">
                <div className="card-body text-center p-4">
                  <div className="display-1 mb-3">🏆</div>
                  <h3 className="text-warning mb-3">Tournament Mode</h3>
                  <p className="text-muted mb-4">
                    Compete for the leaderboard • Win amazing prizes!
                  </p>
                  <button
                    className={`btn btn-tournament w-100 ${
                      tournamentState.canPlay ? 'btn-warning' : 'btn-secondary'
                    }`}
                    onClick={handlePlayTournament}
                    disabled={!tournamentState.canPlay}
                    aria-label={tournamentState.canPlay ? 'Play tournament game' : 'Tournament not available'}
                  >
                    {tournamentState.state === 'no-tournaments' && '❌ No Tournaments Available'}
                    {tournamentState.state === 'countdown' && '⏰ Tournament Starts Soon'}
                    {tournamentState.state === 'active' && '🔥 Play Tournament!'}
                    {tournamentState.state === 'ended' && '📊 Tournament Ended'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Leaderboard Preview */}
          <div className="card tournament-card mb-4">
            <div className="card-header bg-info text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🏆 Current Rankings</h5>
              </div>
            </div>
            <div className="card-body">
              <QuickLeaderboard 
                leaderboardData={leaderboardData}
                leaderboardLoading={leaderboardLoading}
                leaderboardError={leaderboardError}
                nextTournament={nextTournament}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Leaderboard Component
const QuickLeaderboard = ({ leaderboardData, leaderboardLoading, leaderboardError, nextTournament }) => {
  if (leaderboardLoading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-2 text-muted">Loading rankings...</div>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="alert alert-warning text-center mb-0">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Unable to load leaderboard data
      </div>
    );
  }

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="text-center py-3 text-muted">
        <i className="fas fa-trophy fa-2x mb-2 opacity-50"></i>
        <div>No rankings yet</div>
        <small>Play some games to see the leaderboard!</small>
      </div>
    );
  }

  const topPlayers = leaderboardData.slice(0, 5); // Show top 5 instead of 3

  return (
    <div>
      <p className="text-muted mb-3 text-center">
        {nextTournament ? `${nextTournament.name} - Top Players` : 'Top players today'}
        {leaderboardData.length > 0 && (
          <span className="badge bg-secondary ms-2">{leaderboardData.length} total</span>
        )}
      </p>
      <div className="d-grid gap-2">
        {topPlayers.map((session, index) => (
          <div 
            key={session.id || index} 
            className="d-flex justify-content-between align-items-center p-3 bg-light rounded border"
          >
            <div className="d-flex align-items-center flex-grow-1">
              <span className="me-3 fw-bold fs-4">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              <div className="d-flex flex-column flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold fs-5 text-dark">
                    {session.player_name || session.name || session.playerName || `Anonymous Player ${index + 1}`}
                  </span>
                  <span className="badge bg-primary fs-6 ms-2">{session.score || 0} pts</span>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="d-flex gap-3">
                    {session.room_number && session.room_number !== "Not specified" && (
                      <small className="text-info fw-semibold">
                        🏠 Room {session.room_number}
                      </small>
                    )}
                    {session.time_seconds && session.moves_count && (
                      <small className="text-muted">
                        ⏱️ {Math.floor(session.time_seconds / 60)}:{(session.time_seconds % 60).toString().padStart(2, '0')} • 
                        🎯 {session.moves_count} moves
                      </small>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};