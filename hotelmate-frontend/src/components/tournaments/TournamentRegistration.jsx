import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicApi from '@/services/publicApi';

export default function TournamentRegistration() {
  const { tournamentSlug, hotelSlug } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');

  useEffect(() => {
    loadTournamentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentSlug]);

  const loadTournamentDetails = async () => {
    setLoading(true);
    try {
      // Parse tournament ID from slug - assuming format like "tournament-123" or just use the slug as ID
      const tournamentId = tournamentSlug.match(/\d+/) ? tournamentSlug.match(/\d+/)[0] : tournamentSlug;
      
      const resp = await publicApi.get(`entertainment/tournaments/${tournamentId}/`);
      setTournament(resp.data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
      setTournament(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!tournament) return;
    if (!playerName.trim() || !playerAge) {
      alert('Please enter name and age');
      return;
    }

    try {
      const resp = await publicApi.post(`entertainment/tournaments/${tournament.id}/register/`, {
        participant_name: playerName, 
        participant_age: parseInt(playerAge, 10)
      });

      // navigate to play
      navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/play`);
    } catch (err) {
      console.error('Registration error:', err);
      const errorData = err.response?.data || {};
      alert('Registration failed: ' + (errorData.detail || errorData.error || err.message || 'Please try again'));
    }
  };

  const playAsGuest = () => {
    navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/play`);
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading tournament details...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-warning">Tournament not found</div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{maxWidth: 900}}>
      <div className="text-center mb-4">
        <h1>🎮 {tournament.name}</h1>
        <p className="text-muted">{tournament.description}</p>
        <div>
          <small>📅 {new Date(tournament.start_date).toLocaleString()} — {new Date(tournament.end_date).toLocaleString()}</small>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card p-3">
            <h5>Register for Tournament</h5>
            <div className="mb-3">
              <label className="form-label">Your Name</label>
              <input className="form-control" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Your Age</label>
              <input type="number" className="form-control" value={playerAge} onChange={(e) => setPlayerAge(e.target.value)} min={tournament.min_age} max={tournament.max_age} />
              <div className="form-text">Must be between {tournament.min_age} and {tournament.max_age} years</div>
            </div>
            <div className="d-grid">
              <button className="btn btn-primary" onClick={handleRegister}>📝 Register & Play</button>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card p-3 text-center">
            <h5>Play as Guest</h5>
            <p className="text-muted">Skip registration and join the tournament as a guest. You can add your name after the game.</p>
            <div className="d-grid">
              <button className="btn btn-success" onClick={playAsGuest}>👤 Play as Guest</button>
            </div>
            <hr />
            <div className="text-start small mt-3">
              <strong>Prizes:</strong>
              <ul>
                <li>🥇 {tournament.first_prize}</li>
                <li>🥈 {tournament.second_prize}</li>
                <li>🥉 {tournament.third_prize}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <button className="btn btn-outline-secondary me-2" onClick={() => navigate(-1)}>← Back</button>
        <button className="btn btn-outline-info" onClick={() => navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/leaderboard`)}>🏆 View Leaderboard</button>
      </div>
    </div>
  );
}
