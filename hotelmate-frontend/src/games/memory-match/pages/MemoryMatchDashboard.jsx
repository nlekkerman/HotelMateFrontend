import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import { useAuth } from '@/context/AuthContext';

const MemoryMatchDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    dailyTournamentTime: '12:00',
    tournamentDuration: 2, // hours
    maxParticipants: 50,
    prizesEnabled: true
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const hotelSlug = searchParams.get('hotel');

  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: true,
    max_participants: 50,
    prize_description: ''
  });

  useEffect(() => {
    // If no hotel parameter but user is logged in, redirect with their hotel
    if (!hotelSlug && user?.hotel_slug) {
      setSearchParams({ hotel: user.hotel_slug });
      return;
    }

    // Load tournaments for management
    fetchActiveTournaments();
  }, [hotelSlug, user?.hotel_slug, setSearchParams]);

  const fetchActiveTournaments = async () => {
    try {
      setError(null);
      
      // Fetch all tournaments for management
      const data = await memoryGameAPI.getTournaments();
      
      if (data && data.length > 0) {
        setTournaments(data);
      } else {
        setTournaments([]);
      }
      
    } catch (error) {
      setError(`Tournament API unavailable: ${error.message}`);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    
    if (!newTournament.name.trim()) {
      toast.error('Tournament name is required');
      return;
    }

    try {
      const response = await memoryGameAPI.createTournament(newTournament);
      setTournaments([response.data || response, ...tournaments]);
      setShowCreateForm(false);
      setNewTournament({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true,
        max_participants: 50,
        prize_description: ''
      });
      
      toast.success('🏆 Tournament created successfully!');
    } catch (error) {
      console.warn('Tournament API not available, creating mock tournament:', error.message);
      
      // Create mock tournament until backend is ready
      const mockTournament = {
        id: `mock-${Date.now()}`,
        ...newTournament,
        participant_count: 0,
        created_at: new Date().toISOString()
      };
      
      setTournaments([mockTournament, ...tournaments]);
      setShowCreateForm(false);
      setNewTournament({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true,
        max_participants: 50,
        prize_description: ''
      });
      
      toast.success('🏆 Demo Tournament created! (Backend API needed for full functionality)');
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) {
      return;
    }

    try {
      await memoryGameAPI.deleteTournament(tournamentId);
      setTournaments(tournaments.filter(t => t.id !== tournamentId));
      toast.success('Tournament deleted successfully');
    } catch (error) {
      // Mock deletion for now
      setTournaments(tournaments.filter(t => t.id !== tournamentId));
      toast.success('Tournament removed (demo mode)');
    }
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
      <div className="row justify-content-center py-4">
        <div className="col-12">
          {/* Header */}
          <header className="text-center text-white mb-4">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <button 
                className="btn btn-outline-light me-3"
                onClick={() => navigate('/games')}
              >
                ← Back to Games
              </button>
              <h1 className="h2 mb-0">⚙️ Memory Match Management</h1>
            </div>
            <p className="lead">Create and manage Memory Match tournaments</p>
            {hotelSlug && (
              <div className="badge bg-light text-dark fs-6 px-3 py-2">
                🏨 Managing {hotelSlug.replace('-', ' ').toUpperCase()}
              </div>
            )}
          </header>

          {/* Quick Actions */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card text-center bg-white bg-opacity-90 h-100">
                <div className="card-body">
                  <div className="display-6 text-success mb-2">🏆</div>
                  <h6 className="card-title">Kids Tournament</h6>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => navigate('/games/memory-match/tournaments')}
                  >
                    🎮 Open Kids Page
                  </button>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card text-center bg-white bg-opacity-90 h-100">
                <div className="card-body">
                  <div className="display-6 text-primary mb-2">➕</div>
                  <h6 className="card-title">New Tournament</h6>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create Tournament
                  </button>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card text-center bg-white bg-opacity-90 h-100">
                <div className="card-body">
                  <div className="display-6 text-info mb-2">📊</div>
                  <h6 className="card-title">Leaderboards</h6>
                  <button 
                    className="btn btn-info btn-sm"
                    onClick={() => navigate('/games/memory-match/leaderboard')}
                  >
                    View Rankings
                  </button>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card text-center bg-white bg-opacity-90 h-100">
                <div className="card-body">
                  <div className="display-6 text-warning mb-2">📈</div>
                  <h6 className="card-title">Analytics</h6>
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => navigate('/games/memory-match/stats')}
                  >
                    View Stats
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create Tournament Form */}
          {showCreateForm && (
            <div className="card bg-white bg-opacity-95 mb-4">
              <div className="card-header bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">➕ Create New Tournament</h5>
                  <button 
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setShowCreateForm(false)}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleCreateTournament}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">Tournament Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newTournament.name}
                        onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                        placeholder="e.g., Kids Memory Championship 2025"
                        required
                      />
                    </div>
                    
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">Max Participants</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newTournament.max_participants}
                        onChange={(e) => setNewTournament({...newTournament, max_participants: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={newTournament.description}
                        onChange={(e) => setNewTournament({...newTournament, description: e.target.value})}
                        placeholder="Fun memory game tournament for all ages!"
                      />
                    </div>
                    
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={newTournament.start_date}
                        onChange={(e) => setNewTournament({...newTournament, start_date: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">End Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={newTournament.end_date}
                        onChange={(e) => setNewTournament({...newTournament, end_date: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Prize Description</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newTournament.prize_description}
                        onChange={(e) => setNewTournament({...newTournament, prize_description: e.target.value})}
                        placeholder="e.g., Winner gets a special prize!"
                      />
                    </div>
                  </div>

                  <div className="alert alert-info mt-3">
                    <h6>🎮 Tournament Settings (Fixed):</h6>
                    <ul className="mb-0 small">
                      <li>✅ Fixed 3×4 grid (6 pairs, 12 cards) - fair for all ages</li>
                      <li>✅ Simple scoring system - time + moves</li>
                      <li>✅ Kid-friendly interface with countdown timer</li>
                      <li>✅ Real-time leaderboard updates</li>
                    </ul>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button type="submit" className="btn btn-primary">
                      🏆 Create Tournament
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tournament Management */}
          <div className="card bg-white bg-opacity-95">
            <div className="card-header bg-secondary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🏆 Tournament Management</h5>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-outline-light btn-sm"
                    onClick={fetchActiveTournaments}
                    disabled={loading}
                  >
                    � Refresh
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateForm(true)}
                  >
                    ➕ New Tournament
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Loading tournaments...</p>
                </div>
              ) : error ? (
                <div className="alert alert-warning">
                  <h6 className="alert-heading">⚠️ API Status</h6>
                  <p className="mb-0">{error}</p>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="text-center py-5">
                  <div className="display-1 mb-3">🏆</div>
                  <h5 className="text-muted">No tournaments created yet</h5>
                  <p className="text-muted mb-3">Create your first Memory Match tournament!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                  >
                    ➕ Create Tournament
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Tournament</th>
                        <th>Status</th>
                        <th>Participants</th>
                        <th>Schedule</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map(tournament => {
                        const now = new Date();
                        const startTime = new Date(tournament.start_date);
                        const endTime = new Date(tournament.end_date);
                        
                        const isActive = now >= startTime && now <= endTime;
                        const isUpcoming = now < startTime;
                        const isEnded = now > endTime;
                        
                        let statusBadge = '';
                        let statusClass = '';
                        
                        if (isActive) {
                          statusBadge = 'LIVE';
                          statusClass = 'bg-success';
                        } else if (isUpcoming) {
                          statusBadge = 'Upcoming';
                          statusClass = 'bg-warning';
                        } else if (isEnded) {
                          statusBadge = 'Ended';
                          statusClass = 'bg-secondary';
                        }
                        
                        return (
                          <tr key={tournament.id}>
                            <td>
                              <div>
                                <h6 className="mb-1">{tournament.name}</h6>
                                <small className="text-muted">{tournament.description}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusClass}`}>
                                {statusBadge}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info text-dark">
                                {tournament.participant_count || 0}/{tournament.max_participants || 50}
                              </span>
                            </td>
                            <td>
                              <div className="small">
                                <div>📅 {startTime.toLocaleDateString()}</div>
                                <div>🕐 {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => navigate(`/games/memory-match/leaderboard?tournament=${tournament.id}`)}
                                  title="View Leaderboard"
                                >
                                  🏆
                                </button>
                                <button 
                                  className="btn btn-outline-info"
                                  onClick={() => navigate('/games/memory-match/tournaments')}
                                  title="Open Kids Page"
                                >
                                  🎮
                                </button>
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteTournament(tournament.id)}
                                  title="Delete Tournament"
                                >
                                  🗑️
                                </button>
                              </div>
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
        </div>
      </div>
    </div>
  );
};

export default MemoryMatchDashboard;
