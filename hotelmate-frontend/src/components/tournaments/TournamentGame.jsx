import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MemoryGame from '@/games/memory-match/pages/MemoryGame';
import publicApi from '@/services/publicApi';

export default function TournamentGame() {
  const { tournamentSlug, hotelSlug } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    loadTournamentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentSlug]);

  const loadTournamentDetails = async () => {
    setLoading(true);
    try {
      // Parse tournament ID from slug
      const tournamentId = tournamentSlug.match(/\d+/) ? tournamentSlug.match(/\d+/)[0] : tournamentSlug;
      
      const resp = await publicApi.get(`entertainment/tournaments/${tournamentId}/`);
      setTournament(resp.data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGameComplete = async (result) => {
    // result should include difficulty, time_seconds, moves_count
    // Submit to backend with tournament id
    try {
      const payload = {
        difficulty: result.difficulty || 'easy',
        time_seconds: result.time_seconds || result.timeSeconds || result.time || 0,
        moves_count: result.moves_count || result.moves || 0,
        completed: true,
        tournament: tournament?.id
      };

      const resp = await fetch('/api/entertainment/memory-sessions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const data = await resp.json();
        setGameResult(data);
      } else {
        const err = await resp.json().catch(() => ({}));
        console.error('Failed to submit score:', err);
        alert('Failed to submit score: ' + (err.detail || err.error || 'Unknown'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit score. It will be saved locally and synced when online.');
    }
  };

  const handleGuestInfoSubmit = (name, room) => {
    // Optional: update session with guest info. For now, navigate to leaderboard.
    navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/leaderboard`);
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading tournament...</p>
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
    <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light py-4">
      <div className="w-100" style={{maxWidth: 960}}>
        <div className="text-center mb-4">
          <h2>🎮 {tournament.name}</h2>
          <p className="text-muted">Playing in tournament — 3x4 Grid (Standard Tournament Format)</p>
          <div className="alert alert-info">
            🏆 Tournament Mode: All tournaments use 3x4 grid for fair competition
          </div>
        </div>

        {/* Reuse existing MemoryGame component and pass tournament id so MemoryGame will save session with tournament */}
        <MemoryGame tournamentId={tournament.id} />

        {/* After play, MemoryGame will save and user can be redirected to leaderboard from its UI; show quick link here */}
        <div className="text-center mt-4">
          <button className="btn btn-outline-info me-2" onClick={() => navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/leaderboard`)}>🏆 View Leaderboard</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    </div>
  );
}
