import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/tournament.css';
// NextTournament countdown is displayed in a separate panel on the dashboard to avoid duplication

export default function TournamentDashboardHeader({ summary = null, loading = false, allTournaments = [], hotelSlug: propHotelSlug = null }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  // Removed inline "View Results" fetch UI — backend endpoints are used elsewhere.

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

  const safeSummary = summary || {};
  const minutesUntil = safeSummary.next ? Math.floor((new Date(safeSummary.next.start_date).getTime() - now.getTime()) / (1000 * 60)) : null;
  const secondsUntil = safeSummary.next ? Math.floor((new Date(safeSummary.next.start_date).getTime() - now.getTime()) / 1000) : null;
  const isInLastHour = minutesUntil !== null && minutesUntil <= 60 && minutesUntil > 15;
  const isInLast15 = minutesUntil !== null && minutesUntil <= 15 && secondsUntil > 0;

  function renderMainLine() {
    if (safeSummary.active) {
      const a = safeSummary.active;
      return `LIVE NOW — ${a.name} — Started: ${formatDate(a.start_date)} — Ends: ${formatDate(a.end_date)}`;
    }
    if (safeSummary.next) {
      const n = safeSummary.next;
      return `Next — ${n.name} — Starts: ${formatDate(n.start_date)}`;
    }
    return 'No upcoming tournaments';
  }


  const finishedFromList = (allTournaments || []).filter(t => t.end_date && new Date(t.end_date) < new Date()).sort((a,b)=> new Date(b.end_date)-new Date(a.end_date))[0];
  const lastFinished = safeSummary.previous || finishedFromList || null;

  // Header intentionally does not render the full countdown; the dashboard page shows
  // a separate NextTournamentPanel with the full countdown. Keep `safeSummary` and
  // `allTournaments` available for compact info below.

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

  let headerBgClass = '';
  let headerStyle = {};
  if (safeSummary.active) {
    headerBgClass = 'bg-success text-white';
  } else if (isInLast15) {
    headerBgClass = 'bg-danger text-white';
    headerStyle.animation = 'pulse-crit 0.8s infinite';
  } else if (isInLastHour) {
    headerBgClass = 'bg-warning text-dark';
  } else {
    headerBgClass = '';
  }

  // The inline results fetch UI has been removed to simplify the header.

  return (
    <div className="card tournament-card mb-3">
      <div className={`card-body ${headerBgClass} d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3`} style={headerStyle}>
        <div className="flex-grow-1">
          {loading ? (
            <div className="p-2 rounded mb-1 text-muted" style={{ fontWeight: 700 }}>Loading tournaments...</div>
          ) : safeSummary.active ? (
            <div>
              <div className="mb-2" style={{ fontWeight: 700, fontSize: '1rem' }}>LIVE NOW — {safeSummary.active.name}</div>
              <div className="d-flex align-items-baseline gap-3">
                <div className="small" style={{ fontWeight: 700 }}>Ends in</div>
                <div className="fs-1 fw-bold" style={{ fontFamily: 'Courier New, monospace' }}>{formatCountdown(safeSummary.active.end_date)}</div>
              </div>
              {/* Next tournament countdown is shown in the separate panel below the header */}
            </div>
          ) : safeSummary.next ? (
            <div>
              <div className="mb-2" style={{ fontWeight: 700, fontSize: '1rem' }}>{`Next — ${safeSummary.next.name}`}</div>
              <div className="small text-muted">Starts: {formatDate(safeSummary.next.start_date)}</div>
            </div>
          ) : (
            <div className="p-2 rounded mb-1 text-muted" style={{ fontWeight: 700 }}>No upcoming tournaments</div>
          )}

         

          {/* Inline results display removed; use the dedicated tournament pages for full results. */}
        </div>

        <div className="d-flex align-items-center gap-2">
          {!loading && safeSummary.active && (
            <button className="btn btn-sm btn-warning" onClick={() => navigate(`/games/memory-match/tournament/${safeSummary.active.id}`)}>
              Play Live
            </button>
          )}

          {/* Winners button moved to PreviousTournamentPanel (separate panel) */}
        </div>
      </div>
    </div>
  );
}
