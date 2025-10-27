import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicApi from '@/services/publicApi';

export default function TournamentLeaderboard() {
  const { tournamentSlug, hotelSlug } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournamentData();
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentSlug]);

  const loadTournamentData = async () => {
    setLoading(true);
    try {
      // Parse tournament ID from slug
      const tournamentId = tournamentSlug.match(/\d+/) ? tournamentSlug.match(/\d+/)[0] : tournamentSlug;
      
      const resp = await publicApi.get(`entertainment/tournaments/${tournamentId}/`);
      setTournament(resp.data);
      await loadLeaderboard(resp.data.id);
    } catch (err) {
      console.error('Failed to load tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (tId) => {
    const id = tId || (tournament && tournament.id);
    if (!id) return;
    try {
      const resp = await publicApi.get(`entertainment/tournaments/${id}/leaderboard/`);
      const data = resp.data;
      setLeaderboard(data.results || data || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const getRankEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{maxWidth: 1000}}>
      <div className="text-center mb-4">
        <h1>🏆 Tournament Leaderboard</h1>
        <h3>{tournament?.name}</h3>
        <p className="text-muted">{tournament?.description}</p>
      </div>

      <div className="mb-4 text-center">
        <button className="btn btn-primary me-2" onClick={() => navigate(`/tournaments/${hotelSlug}/${tournamentSlug}/play`)}>🎮 Play</button>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center p-5">
          <p>🎮 No games played yet — be the first!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
                <th>Time</th>
                <th>Moves</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr key={entry.id || idx} className={idx < 3 ? `rank-${idx+1}` : ''}>
                  <td>{getRankEmoji(idx + 1)}</td>
                  <td>{entry.participant_name || entry.user || 'Anonymous'}</td>
                  <td>{entry.score}</td>
                  <td>{entry.time_seconds}s</td>
                  <td>{entry.moves_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-center small text-muted">Auto-refreshes every 30s</div>
    </div>
  );
}
