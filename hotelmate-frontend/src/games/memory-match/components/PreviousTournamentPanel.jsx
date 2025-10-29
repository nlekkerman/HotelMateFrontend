import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import memoryGameAPI from '@/services/memoryGameAPI';

export default function PreviousTournamentPanel({ tournament }) {
  const navigate = useNavigate();
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!tournament) return null;

  function formatDate(iso) {
    if (!iso) return iso;
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  }

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    const visibleInterval = 60000; // 1m
    const hiddenInterval = 300000; // 5m

    async function fetchWinners() {
      if (!mounted) return;
      // Defensive: don't attempt to fetch when we don't have a tournament id
      if (!tournament || !tournament.id) return;
      setLoading(true);
      try {
        const data = await memoryGameAPI.getTournamentLeaderboard(tournament.id);

        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.results)) list = data.results;
        else if (data && Array.isArray(data.sessions)) list = data.sessions;
        else if (data && Array.isArray(data.data)) list = data.data;

        const top = list.slice(0, 3);

        // Only update state when winners actually changed to avoid blinking
        setWinners(prev => {
          try {
            const prevStr = JSON.stringify(prev || []);
            const newStr = JSON.stringify(top || []);
            if (prevStr === newStr) return prev;
          } catch (e) {}
          return top;
        });
      } catch (err) {
        // keep previous winners if fetch fails
      } finally {
        if (mounted) setLoading(false);
      }

      const delay = document.hidden ? hiddenInterval : visibleInterval;
      timeoutId = setTimeout(fetchWinners, delay);
    }

    function handleVisibility() {
      if (!document.hidden) fetchWinners();
    }

    // Only start fetching if we have a tournament id
    if (tournament && tournament.id) {
      fetchWinners();
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tournament?.id]);

  return (
    <div className="card tournament-card mb-3">
      <div className="card-body bg-secondary text-white">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1 text-white">Previous Tournament</h5>
            <div className="fw-semibold">{tournament.name}</div>
            <div className="small">Ended: {tournament.end_date ? formatDate(tournament.end_date) : 'N/A'}</div>
          </div>

          <div className="text-end">
            <button
              className="btn btn-outline-light mb-2"
              onClick={() => {
                if (tournament.id) navigate(`/games/memory-match/tournament/${tournament.id}/winners`);
              }}
            >
              See winners
            </button>
            <div className="small text-white">Top winners</div>
          </div>
        </div>

        <div className="mt-3">
          {loading && winners.length === 0 ? (
            <div className="text-white small">Loading winners...</div>
          ) : winners && winners.length > 0 ? (
            <ol className="mb-0" style={{ paddingLeft: '1.15rem' }}>
              {winners.map((w, i) => (
                <li key={w.id || i} className="text-white small mb-1">
                  <strong>{w.player_name || w.participant_name || w.name || 'Anonymous'}</strong>
                  {w.score ? ` — ${w.score} pts` : ''}
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-white small">No winners data</div>
          )}
        </div>
      </div>
    </div>
  );
}
