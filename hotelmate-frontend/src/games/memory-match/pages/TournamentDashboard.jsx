import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import memoryGameAPI from '@/services/memoryGameAPI';
import TournamentQRGenerator from '../components/TournamentQRGenerator';

export default function TournamentDashboard() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      // Try to fetch from API, fallback to mock data if backend not ready
      const response = await memoryGameAPI.getTournaments();
      console.log('API Response:', response);
      
      // Handle different response structures
      let tournamentData = [];
      if (Array.isArray(response)) {
        tournamentData = response;
      } else if (response && Array.isArray(response.results)) {
        tournamentData = response.results;
      } else if (response && Array.isArray(response.data)) {
        tournamentData = response.data;
      } else {
        tournamentData = [];
      }
      
      setTournaments(tournamentData);
    } catch (error) {
      console.warn('Tournament API not available yet, using mock data:', error.message);
      // Use mock data until backend is ready
      const mockTournaments = [
        {
          id: 'demo-1',
          name: 'Kids Memory Challenge 2025',
          description: 'Fun memory game tournament for kids!',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        }
      ];
      setTournaments(mockTournaments);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      const response = await memoryGameAPI.createTournament(newTournament);
      setTournaments([response.data || response, ...tournaments]);
      setShowCreateForm(false);
      setNewTournament({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true
      });
      alert('🏆 Kids Tournament created successfully!');
    } catch (error) {
      console.warn('Tournament API not available, creating mock tournament:', error.message);
      // Create mock tournament until backend is ready
      const mockTournament = {
        id: `mock-${Date.now()}`,
        ...newTournament,
        is_active: true
      };
      setTournaments([mockTournament, ...tournaments]);
      setShowCreateForm(false);
      setNewTournament({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true
      });
      alert('🏆 Demo Tournament created! (Backend API will be needed for full functionality)');
    }
  };

  const handleGenerateQR = (tournament) => {
    setSelectedTournament(tournament);
    setShowQRGenerator(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showQRGenerator && selectedTournament) {
    return (
      <TournamentQRGenerator
        tournament={selectedTournament}
        onClose={() => {
          setShowQRGenerator(false);
          setSelectedTournament(null);
        }}
      />
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>🏆 Kids Tournament Dashboard</h2>
          <p className="text-muted">Create and manage fun tournaments for kids</p>
          
          {/* Backend Status Alert */}
          <div className="alert alert-warning alert-sm mt-2">
            <small>
              <strong>⚠️ Development Mode:</strong> Tournament management requires backend API endpoints. 
              Currently using mock data for demonstration. See BACKEND_INSTRUCTIONS.md for implementation details.
            </small>
          </div>
        </div>
        <div>
          <button
            className="btn btn-success me-2"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '❌ Cancel' : '➕ Create Tournament'}
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate('/games')}
          >
            🎮 Back to Games
          </button>
        </div>
      </div>

      {/* Create Tournament Form */}
      {showCreateForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">➕ Create New Kids Tournament</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateTournament}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Tournament Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                      placeholder="e.g., Kids Memory Challenge 2025"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newTournament.description}
                      onChange={(e) => setNewTournament({...newTournament, description: e.target.value})}
                      placeholder="Fun memory game tournament for kids!"
                    />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={newTournament.start_date}
                      onChange={(e) => setNewTournament({...newTournament, start_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">End Date & Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={newTournament.end_date}
                      onChange={(e) => setNewTournament({...newTournament, end_date: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="alert alert-info">
                <h6>🎮 Tournament Settings:</h6>
                <ul className="mb-0 small">
                  <li>✅ Free entry - no registration required</li>
                  <li>🎁 Symbolic rewards only</li>
                  <li>📱 Mobile-friendly for kids</li>
                  <li>🏆 Anonymous leaderboard</li>
                </ul>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success">
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

      {/* Tournaments List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">🏆 Active Tournaments</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2">Loading tournaments...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-trophy" style={{fontSize: '3rem', color: '#6c757d'}}></i>
              <h5 className="mt-3">No tournaments yet</h5>
              <p className="text-muted">Create your first kids tournament!</p>
            </div>
          ) : (
            <div className="row g-3">
              {Array.isArray(tournaments) && tournaments.map(tournament => (
                <div key={tournament.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 border-start border-primary border-4">
                    <div className="card-body">
                      <h6 className="card-title d-flex align-items-center">
                        🏆 {tournament.name}
                        {tournament.is_active && (
                          <span className="badge bg-success ms-2 small">Active</span>
                        )}
                      </h6>
                      
                      {tournament.description && (
                        <p className="card-text small text-muted">
                          {tournament.description}
                        </p>
                      )}
                      
                      <div className="small text-muted mb-3">
                        {tournament.start_date && (
                          <div>📅 Starts: {formatDate(tournament.start_date)}</div>
                        )}
                        {tournament.end_date && (
                          <div>🏁 Ends: {formatDate(tournament.end_date)}</div>
                        )}
                      </div>

                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleGenerateQR(tournament)}
                        >
                          📱 Generate QR Code
                        </button>
                        
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-info btn-sm"
                            onClick={() => navigate(`/tournament/${tournament.id}/leaderboard`)}
                          >
                            🏆 Leaderboard
                          </button>
                          <button
                            className="btn btn-outline-success btn-sm"
                            onClick={() => navigate(`/tournament/${tournament.id}`)}
                          >
                            🎮 Play
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}