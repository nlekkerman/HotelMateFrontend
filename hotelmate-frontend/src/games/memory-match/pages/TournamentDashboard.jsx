import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import memoryGameAPI from '@/services/memoryGameAPI';

export default function TournamentDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const flashIntervalRef = useRef(null);
  const [flashState, setFlashState] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      
      // Fetch general leaderboard data
      const response = await memoryGameAPI.getGeneralLeaderboard();
      
      if (response && response.leaderboard) {
        setLeaderboardData(response.leaderboard);
      } else {
        setLeaderboardData([]);
      }
      
    } catch (error) {
      console.warn('Leaderboard API not available:', error.message);
      setLeaderboardError('Unable to load rankings. Please try again later.');
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Mock daily tournament at 12:00 PM hotel time
  const getTodayTournamentTime = useCallback(() => {
    const today = new Date();
    const tournamentTime = new Date(today);
    tournamentTime.setHours(12, 0, 0, 0); // 12:00 PM
    
    // If it's past 12 PM today, set it for tomorrow
    if (currentTime >= tournamentTime) {
      tournamentTime.setDate(tournamentTime.getDate() + 1);
    }
    
    return tournamentTime;
  }, [currentTime]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle countdown flashing and colors
  useEffect(() => {
    const tournamentTime = getTodayTournamentTime();
    const timeUntilTournament = tournamentTime.getTime() - currentTime.getTime();
    const minutesUntil = Math.floor(timeUntilTournament / (1000 * 60));
    
    // Clear existing flash interval
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    
    // Set up flashing based on time remaining
    if (minutesUntil <= 5 && minutesUntil > 1) {
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
  }, [currentTime, getTodayTournamentTime]);

  const getTournamentState = () => {
    const tournamentTime = getTodayTournamentTime();
    const timeUntilTournament = tournamentTime.getTime() - currentTime.getTime();
    const tournamentEndTime = new Date(tournamentTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours duration
    
    if (timeUntilTournament > 0) {
      return {
        state: 'countdown',
        timeRemaining: timeUntilTournament,
        tournamentTime,
        canPlay: false
      };
    } else if (currentTime < tournamentEndTime) {
      return {
        state: 'active',
        timeRemaining: 0,
        tournamentTime,
        canPlay: true,
        endTime: tournamentEndTime
      };
    } else {
      return {
        state: 'ended',
        timeRemaining: 0,
        tournamentTime,
        canPlay: false,
        endTime: tournamentEndTime
      };
    }
  };

  const formatCountdown = (milliseconds) => {
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
    const { canPlay } = getTournamentState();
    if (canPlay) {
      navigate('/games/memory-match/practice');
    }
  };

  const handlePlayPractice = () => {
    navigate('/games/memory-match/practice');
  };

  const tournamentState = getTournamentState();

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
            <h1 className="h2 mb-0">🏆 Daily Tournament</h1>
            <p className="lead">Daily Memory Match Tournament at 12:00 PM</p>
          </header>

          {/* Tournament Countdown Display */}
          <div className="card tournament-card mb-4">
            <div className="card-body">
              {tournamentState.state === 'countdown' && (
                <div className="countdown-display" style={getCountdownStyle()}>
                  <h4 className="mb-2">⏰ Next Tournament Starting In:</h4>
                  <h2 className="display-4 mb-3" style={{ fontSize: '2.5rem' }}>
                    {formatCountdown(tournamentState.timeRemaining)}
                  </h2>
                  <p className="mb-0">
                    Tournament starts at {tournamentState.tournamentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} today
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
                  <h4 className="mb-2">🔥 Tournament is LIVE!</h4>
                  <h3 className="display-5 mb-3">Play Now!</h3>
                  <p className="mb-0">
                    Tournament ends at {tournamentState.endTime.toLocaleTimeString('en-US', { 
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
                  <h4 className="mb-2">📊 Tournament Ended</h4>
                  <h5 className="mb-3">Check the Results!</h5>
                  <p className="mb-3">Next tournament tomorrow at 12:00 PM</p>
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Leaderboard Component
const QuickLeaderboard = ({ leaderboardData, leaderboardLoading, leaderboardError }) => {
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

  const topThree = leaderboardData.slice(0, 3);

  return (
    <div>
      <p className="text-muted mb-3 text-center">Top 3 players today</p>
      <div className="d-grid gap-2">
        {topThree.map((player, index) => (
          <div 
            key={player.id || index} 
            className="d-flex justify-content-between align-items-center p-2 bg-light rounded"
          >
            <div className="d-flex align-items-center">
              <span className="me-2 fw-bold fs-5">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </span>
              <span className="fw-bold">{player.player_name}</span>
            </div>
            <span className="badge bg-primary fs-6">{player.score || 0} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};