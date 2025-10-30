import React, { useEffect, useState } from 'react';

export default function NextTournament({ tournament }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let t = null;

    function startTick() {
      if (t) return;
      t = setInterval(() => setNow(new Date()), 1000);
    }

    function stopTick() {
      if (t) {
        clearInterval(t);
        t = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) stopTick();
      else startTick();
    }

    // Start only when visible
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopTick();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

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

  function formatCountdown(startIso) {
    if (!startIso) return '';
    const start = new Date(startIso).getTime();
    const diff = start - now.getTime();
    if (diff <= 0) return '0s';
    const total = Math.floor(diff / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div>

      <div className="d-flex align-items-center flex-column gap-3">
        <div className="display-4 fw-bold" style={{ fontFamily: 'Courier New, monospace', fontSize: '2.25rem' }}>
          {formatCountdown(tournament.start_date)}
        </div>
        <div className="text-muted small">Starts: {formatDate(tournament.start_date)}</div>
      </div>

      <div className="mt-2 small text-muted">Get ready for tournament and play game.</div>
    </div>
  );
}
