import React, { useEffect, useState } from 'react';
import NextTournament from './NextTournament';

export default function NextTournamentPanel({ tournament }) {
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

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopTick();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (!tournament) return null;

  const start = tournament.start_date ? new Date(tournament.start_date) : null;
  const end = tournament.end_date ? new Date(tournament.end_date) : null;
  const msUntil = start ? start.getTime() - now.getTime() : null;
  const minutesUntil = msUntil !== null ? Math.floor(msUntil / 1000 / 60) : null;

  // Color rules independent of header
  let panelClass = 'bg-light text-dark';
  let panelStyle = {};
  if (start && end && now >= start && now <= end) {
    panelClass = 'bg-success text-white';
  } else if (minutesUntil !== null && minutesUntil <= 15 && minutesUntil >= 0) {
    panelClass = 'bg-danger text-white';
    panelStyle.animation = 'pulse-crit 0.8s infinite';
  } else if (minutesUntil !== null && minutesUntil <= 60 && minutesUntil > 15) {
    panelClass = 'bg-warning text-dark';
  }

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

  function formatTimeRemaining(msRemaining) {
    if (msRemaining === null) return '';
    if (msRemaining <= 0) return '0s';
    const total = Math.floor(msRemaining / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const isActive = start && end && now >= start && now <= end;
  const timeToStart = start ? start.getTime() - now.getTime() : null;
  const timeToEnd = end ? end.getTime() - now.getTime() : null;

  return (
    <div className="card tournament-card mb-3">
      <div className={`card-body ${panelClass}`} style={panelStyle}>
        <h5 className={`mb-2 d-flex justify-content-center  ${panelClass.includes('text-white') ? 'text-white' : ''}`}>Upcoming Tournament</h5>
        <div className="mb-2 fw-semibold">{tournament.name}</div>

        {isActive ? (
          <div>
            <div className="mb-1">Active now — Ends: {end ? formatDate(end.toISOString()) : 'N/A'}</div>
            <div className="display-6 fw-bold">{formatTimeRemaining(timeToEnd)}</div>
          </div>
        ) : (
          <div>
            <NextTournament tournament={tournament} />
          </div>
        )}
      </div>
    </div>
  );
}
