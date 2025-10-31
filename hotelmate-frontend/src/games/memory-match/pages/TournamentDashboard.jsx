import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import memoryGameAPI from "@/services/memoryGameAPI";
import "../styles/tournament.css";
import TournamentRules from "../components/TournamentRules";
import tournamentHeaderImg from "../assets/images/tournament-header.png";
import prizesImg from "../assets/images/prizes-image.png";
import TournamentDashboardHeader from "../components/TournamentDashboardHeader";
import NextTournamentPanel from "../components/NextTournamentPanel";
import PreviousTournamentPanel from "../components/PreviousTournamentPanel";
import { PlayerTokenManager } from "@/utils/playerToken";

// How many top players to show in quick leaderboard / winners (module-scoped so
// nested components can access it without depending on TournamentDashboard scope)
const TOP_LEADERBOARD_COUNT = 50;

export default function TournamentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const flashIntervalRef = useRef(null);
  const [flashState, setFlashState] = useState(false);
  const [allTournaments, setAllTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [nextTournament, setNextTournament] = useState(null);
  const [tournamentsSummary, setTournamentsSummary] = useState(null);
  const [showRules, setShowRules] = useState(false);

  // Hardcoded hotel slug per request
  const hotelSlug = "hotel-killarney";

  useEffect(() => {
    // Start a visibility-aware polling loop for tournaments.
    // Poll faster when the page is visible, slower when hidden to save requests
    let mounted = true;
    let timeoutId = null;
    const visibleInterval = 30000; // 30s when visible
    const hiddenInterval = 120000; // 2m when hidden

    async function poll() {
      if (!mounted) return;
      try {
        await fetchAllTournaments();
      } catch (e) {
        // swallow - fetchAllTournaments handles its own errors
      }
      const delay = document.hidden ? hiddenInterval : visibleInterval;
      timeoutId = setTimeout(poll, delay);
    }

    poll();

    function handleVisibility() {
      // When becoming visible, trigger an immediate refresh (will no-op if data unchanged)
      if (!document.hidden) {
        fetchAllTournaments();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hotelSlug]); // Re-fetch when hotel changes

  // Fetch leaderboard when tournament changes
  useEffect(() => {
    // Visibility-aware polling for leaderboard. Update state only when data changes
    let mounted = true;
    let timeoutId = null;
    const visibleInterval = 15000; // 15s when visible
    const hiddenInterval = 60000; // 60s when hidden

    async function pollLeaderboard() {
      if (!mounted) return;
      try {
        await fetchLeaderboardData();
      } catch (e) {
        // ignore
      }
      const delay = document.hidden ? hiddenInterval : visibleInterval;
      timeoutId = setTimeout(pollLeaderboard, delay);
    }

    pollLeaderboard();

    function handleVisibility() {
      if (!document.hidden) {
        fetchLeaderboardData();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [nextTournament]); // Re-fetch when tournament changes

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);

      // If we have an active tournament, show its leaderboard
      if (nextTournament && nextTournament.id) {
        const response = await memoryGameAPI.getTournamentLeaderboard(
          nextTournament.id,
          TOP_LEADERBOARD_COUNT
        );

        let leaderboardArray = [];

        // Handle different response formats from backend
        if (Array.isArray(response)) {
          // Direct array of session objects
          leaderboardArray = response;
        } else if (
          response &&
          response.sessions &&
          Array.isArray(response.sessions)
        ) {
          // Wrapped in sessions key
          leaderboardArray = response.sessions;
        } else if (
          response &&
          response.results &&
          Array.isArray(response.results)
        ) {
          // Paginated response
          leaderboardArray = response.results;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Wrapped in data key
          leaderboardArray = response.data;
        } else {
          leaderboardArray = [];
        }

        // Only update state if data changed to avoid UI blinking
        setLeaderboardData((prev) => {
          try {
            const prevStr = JSON.stringify(prev || []);
            const newStr = JSON.stringify(leaderboardArray || []);
            if (prevStr === newStr) return prev;
          } catch (e) {}
          return leaderboardArray;
        });
      } else {
        // No active tournament - show general leaderboard as fallback
        const response = await memoryGameAPI.getGeneralLeaderboard();

        if (response && response.leaderboard) {
          setLeaderboardData(response.leaderboard);
        } else {
          setLeaderboardData([]);
        }
      }
    } catch (error) {
      console.warn("Leaderboard API not available:", error.message);
      setLeaderboardError("Unable to load rankings. Please try again later.");
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchAllTournaments = async () => {
    try {
      setTournamentLoading(true);

      // Get tournaments for this specific hotel
      const tournaments = await memoryGameAPI.getTournaments(hotelSlug);

      if (tournaments && tournaments.length > 0) {
        tournaments.forEach((tournament, index) => {
          const now = new Date();
          const startTime = new Date(tournament.start_date);
          const endTime = new Date(tournament.end_date);
        });
      }

      // Only update tournaments state when it actually changes (prevents UI jitter)
      setAllTournaments((prev) => {
        try {
          const prevStr = JSON.stringify(prev || []);
          const newStr = JSON.stringify(tournaments || []);
          if (prevStr === newStr) return prev;
        } catch (e) {}
        return tournaments || [];
      });

      // Get the next relevant tournament (active or upcoming) for this hotel
      const result = await memoryGameAPI.getNextTournament(hotelSlug);
      const fetchedNext = result.tournament || null;
      setNextTournament((prev) => {
        try {
          const prevStr = JSON.stringify(prev || {});
          const newStr = JSON.stringify(fetchedNext || {});
          if (prevStr === newStr) return prev;
        } catch (e) {}
        return fetchedNext;
      });

      // fetch the single-call tournaments summary from backend (parent centralised)
      try {
        const summary = await memoryGameAPI.getTournamentsSummary(hotelSlug);
        setTournamentsSummary((prev) => {
          try {
            const prevStr = JSON.stringify(prev || {});
            const newStr = JSON.stringify(summary || {});
            if (prevStr === newStr) return prev;
          } catch (e) {}
          return summary || null;
        });
      } catch (err) {
        // keep previous summary instead of overwriting with null to avoid UI flicker
      }
    } catch (error) {
      console.error(`❌ Failed to fetch tournaments for ${hotelSlug}:`, error);
      console.error(`❌ Error details:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setAllTournaments([]);
      setNextTournament(null);
    } finally {
      setTournamentLoading(false);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle countdown flashing and colors for REAL tournaments only
  useEffect(() => {
    if (!nextTournament) {
      // No tournament - no flashing
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      setFlashState(false);
      return;
    }

    const tournamentStartTime = new Date(nextTournament.start_date);
    const timeUntilTournament =
      tournamentStartTime.getTime() - currentTime.getTime();
    const minutesUntil = Math.floor(timeUntilTournament / (1000 * 60));

    // Clear existing flash interval
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }

    // Set up flashing based on time remaining until REAL tournament
    if (minutesUntil <= 5 && minutesUntil > 1 && timeUntilTournament > 0) {
      // Orange flashing (every second)
      flashIntervalRef.current = setInterval(() => {
        setFlashState((prev) => !prev);
      }, 1000);
    } else if (minutesUntil <= 1 && timeUntilTournament > 0) {
      // Red flashing (twice per second)
      flashIntervalRef.current = setInterval(() => {
        setFlashState((prev) => !prev);
      }, 500);
    } else {
      // No flashing
      setFlashState(false);
    }

    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, [currentTime, nextTournament]);

  const getTournamentState = () => {
    if (!nextTournament) {
      // NO TOURNAMENTS AT ALL - show message
      return {
        state: "no-tournaments",
        timeRemaining: 0,
        tournament: null,
        canPlay: false,
        message: "No tournaments available",
      };
    }

    const now = currentTime;
    const startTime = new Date(nextTournament.start_date);
    const endTime = new Date(nextTournament.end_date);
    const timeUntilStart = startTime.getTime() - now.getTime();

    if (now >= startTime && now <= endTime) {
      // Tournament is ACTIVE right now
      return {
        state: "active",
        timeRemaining: 0,
        tournamentTime: startTime,
        canPlay: true,
        endTime: endTime,
        tournament: nextTournament,
        tournamentId: nextTournament.id,
      };
    } else if (timeUntilStart > 0) {
      // Tournament is UPCOMING - show countdown
      return {
        state: "countdown",
        timeRemaining: timeUntilStart,
        tournamentTime: startTime,
        canPlay: false,
        endTime: endTime,
        tournament: nextTournament,
        tournamentId: nextTournament.id,
      };
    } else {
      // Tournament ENDED
      return {
        state: "ended",
        timeRemaining: 0,
        tournamentTime: startTime,
        canPlay: false,
        endTime: endTime,
        tournament: nextTournament,
      };
    }
  };
  const formatCountdown = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCountdownStyle = () => {
    const { timeRemaining } = getTournamentState();
    const minutesUntil = Math.floor(timeRemaining / (1000 * 60));

    let baseStyle = {
      transition: "all 0.3s ease",
      borderRadius: "15px",
      padding: "20px",
      margin: "10px 0",
    };

    if (minutesUntil <= 5 && minutesUntil > 1) {
      // Orange warning phase
      return {
        ...baseStyle,
        backgroundColor: flashState ? "#ff8c00" : "#ffa500",
        color: "white",
        boxShadow: flashState
          ? "0 0 20px rgba(255, 140, 0, 0.7)"
          : "0 4px 8px rgba(0,0,0,0.1)",
      };
    } else if (minutesUntil <= 1 && timeRemaining > 0) {
      // Red critical phase
      return {
        ...baseStyle,
        backgroundColor: flashState ? "#dc3545" : "#ff0000",
        color: "white",
        boxShadow: flashState
          ? "0 0 25px rgba(220, 53, 69, 0.8)"
          : "0 4px 8px rgba(0,0,0,0.1)",
        animation: flashState ? "pulse 0.5s ease-in-out" : "none",
      };
    } else {
      // Normal phase
      return {
        ...baseStyle,
        backgroundColor: "#e9ecef",
        color: "#495057",
      };
    }
  };

  const handlePlayTournament = () => {
    const { canPlay, tournamentId } = getTournamentState();
    if (canPlay && tournamentId) {
      // Show rules screen first before starting tournament
      setShowRules(true);
    }
  };

  const handleStartTournamentGame = () => {
    const { canPlay, tournamentId } = getTournamentState();
    if (canPlay && tournamentId) {
      // Navigate to actual tournament game
      navigate(`/games/memory-match/tournament/${tournamentId}`);
    }
  };

  const handleGoBackToTournament = () => {
    setShowRules(false);
  };

  const handlePlayPractice = () => {
    navigate("/games/memory-match/practice");
  };

  const tournamentState = getTournamentState();

  // Tournament summary and finished list are now handled by TournamentDashboardHeader component

  // Compute an upcoming (next scheduled) tournament independent of the header's active/next logic.
  const upcomingTournament =
    tournamentsSummary && tournamentsSummary.next
      ? tournamentsSummary.next
      : (allTournaments || [])
          .filter((t) => t.start_date && new Date(t.start_date) > new Date())
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] ||
        null;

  const previousTournament =
    tournamentsSummary && tournamentsSummary.previous
      ? tournamentsSummary.previous
      : (allTournaments || [])
          .filter((t) => t.end_date && new Date(t.end_date) < new Date())
          .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0] ||
        null;

  // Show rules screen if requested
  if (showRules && nextTournament) {
    return (
      <TournamentRules
        tournament={nextTournament}
        onStartGame={handleStartTournamentGame}
        onGoBack={handleGoBackToTournament}
      />
    );
  }

  return (
    <div
      className="container-fluid min-vh-100 bg-gradient"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      {/* tournament.css imported at module top - contains keyframes and utility classes */}

      <div className="row justify-content-center py-4">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Header (banner image shown as an <img> to avoid background cropping/gray bands) */}
          <header
            className="text-center text-white mb-4 tournament-banner"
            role="img"
            aria-label="Tournament banner"
          >
            <img
              src={tournamentHeaderImg}
              alt="Tournament banner"
              className="tournament-banner-img"
            />
          </header>

          {/* Tournament header (summary / countdown / last finished / winners) */}
          <TournamentDashboardHeader
            summary={tournamentsSummary}
            loading={tournamentLoading}
            allTournaments={allTournaments}
            hotelSlug={hotelSlug}
          />

          {/* Prizes & Winners (placeholder) */}
          <PrizesAndWinners 
            tournament={previousTournament} 
            tournamentState={tournamentState}
          />

          {/* Standalone upcoming tournament panel (separate styling/color).
              Show the Next panel only when a tournament is currently ACTIVE so we
              don't duplicate the countdown — when there's no active tournament the
              header already displays the next countdown. */}
          {tournamentState.state === "active" && upcomingTournament && (
            <NextTournamentPanel tournament={upcomingTournament} />
          )}
          {/* Previous tournament panel with winners button (separate and outside header) */}
          {previousTournament && (
            <PreviousTournamentPanel tournament={previousTournament} />
          )}

          {/* Game Buttons */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6">
              <div className="card tournament-card h-100">
                <div className="card-body text-center p-4">
                  <div className="display-1 mb-3">🏃‍♀️</div>
                  <h3 className="text-primary mb-3">Practice Mode</h3>
                  <p className="text-muted mb-4">
                    Play anytime • Perfect your skills • No pressure!
                  </p>
                  <button
                    className="btn btn-primary btn-tournament w-100"
                    onClick={handlePlayPractice}
                    aria-label="Start practice game"
                  >
                    🎮 Practice Now
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card tournament-card h-100">
                <div className="card-body text-center p-4">
                  <div className="display-1 mb-3">🏆</div>
                  <h3 className="text-warning mb-3">Tournament Mode</h3>
                  <p className="text-muted mb-4">
                    Compete for the leaderboard • Win amazing prizes!
                  </p>
                  <button
                    className={`btn btn-tournament w-100 ${
                      tournamentState.canPlay ? "btn-warning" : "btn-secondary"
                    }`}
                    onClick={handlePlayTournament}
                    disabled={!tournamentState.canPlay}
                    aria-label={
                      tournamentState.canPlay
                        ? "Play tournament game"
                        : "Tournament not available"
                    }
                  >
                    {tournamentState.state === "no-tournaments" &&
                      "❌ No Tournaments Available"}
                    {tournamentState.state === "countdown" &&
                      "⏰ Tournament Starts Soon"}
                    {tournamentState.state === "active" &&
                      "🔥 Play Tournament!"}
                    {tournamentState.state === "ended" && "📊 Tournament Ended"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Leaderboard Preview */}
          <div className="card tournament-card mb-4">
            <div className="card-header bg-info text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🏆 Current Rankings</h5>
              </div>
            </div>
            <div className="card-body">
              <QuickLeaderboard
                leaderboardData={leaderboardData}
                leaderboardLoading={leaderboardLoading}
                leaderboardError={leaderboardError}
                nextTournament={nextTournament}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Leaderboard Component
const QuickLeaderboard = ({
  leaderboardData,
  leaderboardLoading,
  leaderboardError,
  nextTournament,
}) => {
  const playerToken = PlayerTokenManager.getPlayerToken();
  const playerName = PlayerTokenManager.getDisplayName();
  const playerRoom = PlayerTokenManager.getDisplayRoom();
  const leaderboardRef = useRef(null);
  const prevLeaderboardRef = useRef(null);

  // Check if an entry belongs to current player
  const isCurrentPlayerEntry = (session) => {
    // Match by name and room (primary method)
    const nameMatch = playerName && session.player_name === playerName;
    const roomMatch =
      !playerRoom ||
      !session.room_number ||
      session.room_number === playerRoom ||
      session.room_number === "Not specified";

    return nameMatch && roomMatch;
  };

  // Find current player's rank in full leaderboard
  const currentPlayerRank = leaderboardData
    ? leaderboardData.findIndex((session) => isCurrentPlayerEntry(session)) + 1
    : 0;
  const hasCurrentPlayer = currentPlayerRank > 0;

  // Show top 5 + current player if not in top 5
  let displayPlayers = [];
  if (leaderboardData && leaderboardData.length > 0) {
    displayPlayers = leaderboardData.slice(0, TOP_LEADERBOARD_COUNT);
    if (hasCurrentPlayer && currentPlayerRank > TOP_LEADERBOARD_COUNT) {
      const playerEntry = {
        ...leaderboardData[currentPlayerRank - 1],
        isCurrentPlayer: true,
      };
      displayPlayers.push(playerEntry);
    }
  }

  // Auto-scroll to current player's entry only when leaderboard data changed
  useEffect(() => {
    if (leaderboardLoading || leaderboardError) return;

    try {
      const prevStr = prevLeaderboardRef.current;
      const newStr = JSON.stringify(leaderboardData || []);

      // If data did not change, do nothing (prevents blinking)
      if (prevStr === newStr) return;

      // Data changed — decide whether to scroll to current player
      const prevArray = prevStr ? JSON.parse(prevStr) : [];
      const prevRank = prevArray.findIndex((session) =>
        isCurrentPlayerEntry(session)
      );
      const newRank = (leaderboardData || []).findIndex((session) =>
        isCurrentPlayerEntry(session)
      );

      // Save new snapshot
      prevLeaderboardRef.current = newStr;

      // Scroll if player is present and rank changed (or this is the first load)
      if (newRank >= 0 && (prevStr === null || prevRank !== newRank)) {
        const playerElement = leaderboardRef.current.querySelector(
          ".current-player-entry"
        );
        if (playerElement) {
          setTimeout(() => {
            playerElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }, 500);
        }
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }, [leaderboardData, leaderboardLoading, leaderboardError]);

  // Early returns after all hooks are called
  if (leaderboardLoading) {
    return (
      <div className="text-center py-3">
        <div
          className="spinner-border spinner-border-sm text-primary"
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-2 text-muted">Loading rankings...</div>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="alert alert-warning text-center mb-0">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Unable to load leaderboard data
      </div>
    );
  }

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="text-center py-3 text-muted">
        <i className="fas fa-trophy fa-2x mb-2 opacity-50"></i>
        <div>No rankings yet</div>
        <small>Play some games to see the leaderboard!</small>
      </div>
    );
  }

  return (
    <div ref={leaderboardRef}>
      <p className="text-muted mb-3 text-center">
        {nextTournament
          ? `${nextTournament.name} - Top Players`
          : "Top players today"}
        {leaderboardData.length > 0 && (
          <span className="badge bg-secondary ms-2">
            {leaderboardData.length} total
          </span>
        )}
        {hasCurrentPlayer && (
          <span className="badge bg-success ms-2">
            You: #{currentPlayerRank}
          </span>
        )}
      </p>
      <div className="d-grid gap-2">
        {displayPlayers.map((session, index) => {
          const isCurrentPlayer =
            session.isCurrentPlayer ||
            (index < 5 && isCurrentPlayerEntry(session));
          const actualRank = session.isCurrentPlayer
            ? currentPlayerRank
            : index + 1;

          return (
            <div
              key={session.id || index}
              className={`d-flex justify-content-between align-items-center p-3 rounded border ${
                isCurrentPlayer
                  ? "bg-success bg-opacity-10 border-success border-2 current-player-entry"
                  : "bg-light"
              }`}
              style={
                isCurrentPlayer
                  ? {
                      boxShadow: "0 0 10px rgba(25, 135, 84, 0.3)",
                      transform: "scale(1.02)",
                    }
                  : {}
              }
            >
              <div className="d-flex align-items-center flex-grow-1">
                <span className="me-3 fw-bold fs-4">
                  {actualRank === 1 ? '🥇'
                    : actualRank === 2 ? '🥈'
                    : actualRank === 3 ? '�'
                    : actualRank === 4 ? '🏅'
                    : actualRank === 5 ? '🏅'
                    : `#${actualRank}`}
                </span>
                <div className="d-flex flex-column flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center">
                    <span
                      className={`fw-bold fs-5 ${
                        isCurrentPlayer ? "text-success" : "text-dark"
                      }`}
                    >
                      {isCurrentPlayer
                        ? "👤 You"
                        : session.player_name ||
                          session.participant_name ||
                          session.name ||
                          session.playerName ||
                          session.user ||
                          `Anonymous Player ${actualRank}`}
                      {isCurrentPlayer && session.player_name && (
                        <span className="text-muted small ms-2">
                          ({session.player_name})
                        </span>
                      )}
                    </span>
                    <span className="badge bg-primary fs-6 ms-2">
                      {session.score || 0} pts
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <div className="d-flex gap-3">
                      {session.room_number &&
                        session.room_number !== "Not specified" && (
                          <small className="text-info fw-semibold">
                            🏠 Room {session.room_number}
                          </small>
                        )}
                      {session.time_seconds && session.moves_count && (
                        <small className="text-muted">
                          ⏱️ {Math.floor(session.time_seconds / 60)}:
                          {(session.time_seconds % 60)
                            .toString()
                            .padStart(2, "0")}{" "}
                          • 🎯 {session.moves_count} moves
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Prizes & Winners (shows prizes and top 5 winners from previous tournament when available)
const PrizesAndWinners = ({ tournament, tournamentState }) => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if there's an active tournament (hide winners during active tournaments)
  const hasActiveTournament = tournamentState && (
    tournamentState.state === "active" || 
    tournamentState.state === "countdown"
  );

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    const visibleInterval = 60000; // 1m
    const hiddenInterval = 300000; // 5m

    async function fetchWinners() {
      if (!mounted) return;
      if (!tournament || !tournament.id) return;
      
      // Clear winners if there's an active tournament
      if (hasActiveTournament) {
        setWinners([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const data = await memoryGameAPI.getTournamentLeaderboard(
          tournament.id
        );

        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.results)) list = data.results;
        else if (data && Array.isArray(data.sessions)) list = data.sessions;
        else if (data && Array.isArray(data.data)) list = data.data;

        const topFive = list.slice(0, TOP_LEADERBOARD_COUNT);

        setWinners((prev) => {
          try {
            const prevStr = JSON.stringify(prev || []);
            const newStr = JSON.stringify(topFive || []);
            if (prevStr === newStr) return prev;
          } catch (e) {}
          return topFive;
        });
      } catch (err) {
        // keep previous winners on error
      } finally {
        if (mounted) setLoading(false);
      }

      const delay = document.hidden ? hiddenInterval : visibleInterval;
      timeoutId = setTimeout(fetchWinners, delay);
    }

    function handleVisibility() {
      if (!document.hidden) fetchWinners();
    }

    if (tournament && tournament.id) {
      fetchWinners();
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tournament?.id, hasActiveTournament]);

  return (
    <div className="card tournament-card mb-4 border-0 shadow-sm">
      <div className="card-header bg-success text-white py-3" />

      <div className="card-body text-center py-4">
        <p className="mb-3 fw-semibold" style={{ fontSize: "1.05rem" }}>
          Prizes:
        </p>

        <ul className="list-unstyled mb-3">
          <li className="mx-auto" style={{ maxWidth: 720 }}>
            <div className="p-3 rounded border border-2 border-success bg-danger bg-opacity-80">
              <img
                src={prizesImg}
                alt="Prizes"
                className="img-fluid mx-auto mb-3"
                style={{ maxWidth: 220 }}
              />
              <div
                className="fw-semibold text-white"
                style={{ fontSize: "1.05rem" }}
              >
                The Memory Match magic is on! Only the top 5 brainy heroes
                will claim their reward — a chilling Zombie Eye or a
                spooky-sweet Bloody Pumpkin mocktail at the end! 🍬🧃{" "}
              </div>
            </div>
          </li>
        </ul>

        <hr />

        <h6 className="mb-2" style={{ fontWeight: 700 }}>
          Winners
        </h6>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          {hasActiveTournament ? (
            <div
              className="rounded p-3"
              style={{
                minHeight: 72,
                border: "2px dashed rgba(0,0,0,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(250,250,250,0.6))",
              }}
            >
              <div className="text-muted">
                🏆 Tournament in progress! Winners will be announced after the tournament ends.
              </div>
            </div>
          ) : loading && winners.length === 0 ? (
            <div className="text-muted small">Loading winners...</div>
          ) : winners && winners.length > 0 ? (
            <ol className="text-start mb-0" style={{ paddingLeft: "1.15rem" }}>
              {winners.map((w, i) => (
                <li key={w.id || i} className="mb-2">
                  <div className="fw-semibold">
                    {w.player_name ||
                      w.participant_name ||
                      w.name ||
                      "Anonymous"}
                  </div>
                  <div className="small text-muted">
                    {w.score ? `${w.score} pts` : ""}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div
              className="rounded p-3"
              style={{
                minHeight: 72,
                border: "2px dashed rgba(0,0,0,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(250,250,250,0.6))",
              }}
            >
              <div className="text-muted">
                Winners will be added here after the tournament concludes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
