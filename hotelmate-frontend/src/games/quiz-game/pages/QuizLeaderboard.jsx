import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import quizGameAPI from '@/services/quizGameAPI';

export default function QuizLeaderboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      const [leaderboardData, rankData] = await Promise.all([
        quizGameAPI.getLeaderboard(),
        quizGameAPI.getMyRank().catch(() => null) // Don't fail if player not on leaderboard
      ]);
      setLeaderboard(leaderboardData);
      setMyRank(rankData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: 'trophy-fill', color: '#FFD700' };
    if (rank === 2) return { icon: 'trophy-fill', color: '#C0C0C0' };
    if (rank === 3) return { icon: 'trophy-fill', color: '#CD7F32' };
    return { icon: 'award-fill', color: mainColor };
  };

  const isMyEntry = (entry) => {
    const myToken = quizGameAPI.getPlayerToken();
    return entry.player_token === myToken;
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: mainColor }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-lg">
            <div className="card-header text-center py-4" style={{ backgroundColor: mainColor, color: 'white' }}>
              <h1 className="display-5 mb-0">
                <i className="bi bi-trophy-fill me-2"></i>
                Quiz Leaderboard
              </h1>
              <p className="mb-0 mt-2 opacity-75">Top Players Worldwide</p>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* My Rank Card */}
              {myRank && (
                <div className="card mb-4" style={{ backgroundColor: `${mainColor}15`, borderColor: mainColor }}>
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-2 text-center">
                        <div className="display-4 fw-bold" style={{ color: mainColor }}>
                          #{myRank.rank}
                        </div>
                      </div>
                      <div className="col-md-10">
                        <h5 className="mb-2">
                          <i className="bi bi-person-circle me-2"></i>
                          Your Ranking
                        </h5>
                        <div className="d-flex flex-wrap gap-3">
                          <div>
                            <strong>Best Score:</strong> {myRank.best_score}
                          </div>
                          <div>
                            <strong>Games Played:</strong> {myRank.total_games_played}
                          </div>
                          <div>
                            <strong>First Played:</strong> {quizGameAPI.formatDate(myRank.first_played_at)}
                          </div>
                          <div>
                            <strong>Last Played:</strong> {quizGameAPI.formatDate(myRank.last_played_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              {leaderboard.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                  <p className="text-muted mt-3">No players on the leaderboard yet. Be the first!</p>
                  <button
                    className="btn btn-primary mt-3"
                    style={{ backgroundColor: mainColor, borderColor: mainColor }}
                    onClick={() => navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`)}
                  >
                    Play Now
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Player</th>
                        <th className="text-end">Best Score</th>
                        <th className="text-center">Games Played</th>
                        <th className="text-end">Last Played</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => {
                        const badge = getRankBadge(entry.rank);
                        const isMe = isMyEntry(entry);
                        
                        return (
                          <tr 
                            key={entry.id}
                            className={isMe ? 'table-active' : ''}
                            style={isMe ? { backgroundColor: `${mainColor}10` } : {}}
                          >
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                <i 
                                  className={`bi bi-${badge.icon} me-2`}
                                  style={{ color: badge.color, fontSize: '1.5rem' }}
                                ></i>
                                <span className="fw-bold">{entry.rank}</span>
                              </div>
                            </td>
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                <span className="fw-bold">{entry.player_display_name}</span>
                                {isMe && (
                                  <span className="badge bg-primary ms-2">You</span>
                                )}
                              </div>
                            </td>
                            <td className="align-middle text-end">
                              <span 
                                className="badge p-2"
                                style={{ 
                                  backgroundColor: mainColor,
                                  fontSize: '0.9rem'
                                }}
                              >
                                {entry.best_score}
                              </span>
                            </td>
                            <td className="align-middle text-center">
                              <span className="badge bg-secondary">
                                {entry.total_games_played}
                              </span>
                            </td>
                            <td className="align-middle text-end text-muted small">
                              {quizGameAPI.formatDate(entry.last_played_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-grid gap-2 mt-4">
                <button
                  className="btn btn-lg btn-primary"
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={() => navigate(`/games/quiz${hotelParam ? `?hotel=${hotelParam}` : ''}`)}
                >
                  <i className="bi bi-play-fill me-2"></i>
                  Start New Quiz
                </button>

                <button
                  className="btn btn-lg btn-outline-secondary"
                  onClick={() => navigate(`/games${hotelParam ? `?hotel=${hotelParam}` : ''}`)}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Games
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
