import React, { useEffect, useState, useRef } from "react";
import api from "@/services/api";

export default function WhackAMoleLeaderboard({ gameSlug, currentScore, refresh }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const highlightRef = useRef(null);

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`entertainment/games/highscores/?game=${gameSlug}`);

      if (res?.data) {
        // Backend already limits to top 100
        setLeaders(res.data);
      } else {
        setLeaders([]);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [gameSlug, refresh]);

  // Smooth scroll to newly submitted score
  useEffect(() => {
    if (highlightRef.current) {
      setTimeout(() => {
        highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [leaders, currentScore]);

  if (loading) return <p>Loading leaderboard...</p>;
  if (!leaders.length) return <p>No scores yet!</p>;

  // Sort leaders by score descending, then by created_at ascending
  const sortedLeaders = [...leaders].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return aTime - bTime;
  });

  // Assign dense ranks
  let lastScore = null;
  let lastRank = 0;
  let sameScoreCount = 0;
  const rankedLeaders = sortedLeaders.map((entry, idx) => {
    if (entry.score === lastScore) {
      sameScoreCount++;
    } else {
      lastRank = lastRank + 1 + sameScoreCount;
      sameScoreCount = 0;
    }
    lastScore = entry.score;
    return { ...entry, rank: lastRank };
  });

  return (
    <div className="leaderboard-container p-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
      <h4 className="mb-3 text-center">Top 100 Scores</h4>
      <ul className="list-group">
        {rankedLeaders.map((entry, idx) => {
          const entryName = entry.player_name ?? entry.player ?? "Anonymous";
          const currentId = currentScore?.id ?? null;

          const isCurrent =
            currentScore &&
            entry.score === currentScore.score &&
            (entry.player_name ?? entry.player) ===
              (currentScore.player_name ?? currentScore.player);

          return (
            <li
              key={`${entry.id}-${idx}`}
              ref={isCurrent ? highlightRef : null}
              className={`list-group-item d-flex justify-content-between align-items-center ${
                isCurrent ? "bg-success text-white" : ""
              }`}
            >
              <span>
                {entry.rank}. {entryName}
              </span>
              <span>{entry.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
