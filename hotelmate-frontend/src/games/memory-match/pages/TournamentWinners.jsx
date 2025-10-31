import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import memoryGameAPI from '@/services/memoryGameAPI';

export default function TournamentWinners() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const t = await memoryGameAPI.getTournament(tournamentId);
        if (!mounted) return;
        setTournament(t || null);

        const lb = await memoryGameAPI.getTournamentLeaderboard(tournamentId);
        let arr = [];
        if (Array.isArray(lb)) arr = lb;
        else if (lb && Array.isArray(lb.results)) arr = lb.results;
        else if (lb && Array.isArray(lb.data)) arr = lb.data;
        else if (lb && Array.isArray(lb.sessions)) arr = lb.sessions;

        if (!mounted) return;
        setLeaderboard(arr || []);
      } catch (err) {
        console.error('Failed to load tournament winners page:', err);
        if (!mounted) return;
        setError('Unable to load results');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [tournamentId]);

  if (loading) return <div className="p-4">Loading winners...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <div className="container py-4">
      <button className="btn btn-sm btn-link mb-3" onClick={() => navigate(-1)}>← Back</button>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Tournament Results</h5>
        </div>
        <div className="card-body">
          {tournament ? (
            <div className="mb-3">
              <h6 className="mb-0">Results — {tournament.name}</h6>
              <small className="text-muted">Ended: {new Date(tournament.end_date).toLocaleString()}</small>
            </div>
          ) : null}

          {leaderboard.length === 0 ? (
            <div>No results available for this tournament.</div>
          ) : (
            <div className="list-group">
              {leaderboard.map((r, idx) => (
                <div key={r.id || idx} className={`list-group-item ${idx === 0 ? 'list-group-item-primary' : ''}`}>
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{idx+1}. {r.player_name}</strong>
                      <div className="small text-muted">{r.room_number ? `Room ${r.room_number}` : ''}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{r.score || 0} pts</div>
                      <div className="small text-muted">{r.time_seconds}s — {r.moves_count} moves</div>
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
