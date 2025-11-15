import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import quizGameAPI from '@/services/quizGameAPI';

export default function QuizStartScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const [playerName, setPlayerName] = useState('');
  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedMode, setSelectedMode] = useState('casual');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
    const savedName = quizGameAPI.getPlayerName();
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [categoriesData, tournamentsData] = await Promise.all([
        quizGameAPI.getCategories(),
        quizGameAPI.getTournaments('active', hotelParam)
      ]);
      
      // Ensure we always set arrays, even if API returns something else
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load quiz data. Please try again.');
      // Set empty arrays on error to prevent crashes
      setCategories([]);
      setTournaments([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedMode === 'tournament' && !selectedTournament) {
      setError('Please select a tournament');
      return;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      setError('No quiz categories available. Please try again later.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      quizGameAPI.savePlayerName(playerName);

      const quizData = await quizGameAPI.startQuiz(
        playerName,
        hotelParam,
        selectedMode === 'tournament' ? selectedTournament : null,
        questionsPerQuiz
      );

      const path = `/games/quiz/play?hotel=${hotelParam || ''}`;
      navigate(path, { state: { quizData } });
    } catch (err) {
      console.error('Failed to start quiz:', err);
      setError(err.response?.data?.error || 'Failed to start quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeaderboard = () => {
    const path = `/games/quiz/leaderboard${hotelParam ? `?hotel=${hotelParam}` : ''}`;
    navigate(path);
  };

  if (loadingData) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: mainColor }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading quiz data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-lg">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <h1 className="display-4 mb-2">
                  <i className="bi bi-patch-question-fill me-2" style={{ color: mainColor }}></i>
                  Guessticulator Quiz
                </h1>
                <p className="lead text-muted">Test your knowledge across multiple categories!</p>
              </div>

              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setError(null)}
                  ></button>
                </div>
              )}

              {/* Player Name Input */}
              <div className="mb-4">
                <label htmlFor="playerName" className="form-label fw-bold">
                  <i className="bi bi-person-fill me-2"></i>
                  Your Name
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Game Mode Selection */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <i className="bi bi-joystick me-2"></i>
                  Game Mode
                </label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn btn-lg ${selectedMode === 'casual' ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={selectedMode === 'casual' ? { backgroundColor: mainColor, borderColor: mainColor } : {}}
                    onClick={() => setSelectedMode('casual')}
                  >
                    <i className="bi bi-play-circle me-2"></i>
                    Casual Play
                  </button>
                  <button
                    type="button"
                    className={`btn btn-lg ${selectedMode === 'tournament' ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={selectedMode === 'tournament' ? { backgroundColor: mainColor, borderColor: mainColor } : {}}
                    onClick={() => setSelectedMode('tournament')}
                    disabled={tournaments.length === 0}
                  >
                    <i className="bi bi-trophy me-2"></i>
                    Tournament
                    {tournaments.length === 0 && <span className="badge bg-secondary ms-2">Coming Soon</span>}
                  </button>
                </div>
              </div>

              {/* Tournament Selection */}
              {selectedMode === 'tournament' && tournaments.length > 0 && (
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="bi bi-award me-2"></i>
                    Select Tournament
                  </label>
                  <select
                    className="form-select form-select-lg"
                    value={selectedTournament || ''}
                    onChange={(e) => setSelectedTournament(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Choose a tournament...</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.name} - {tournament.participant_count}/{tournament.max_participants} players
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Questions Per Quiz */}
              <div className="mb-4">
                <label htmlFor="questionsCount" className="form-label fw-bold">
                  <i className="bi bi-list-ol me-2"></i>
                  Number of Questions: <span style={{ color: mainColor }}>{questionsPerQuiz}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  id="questionsCount"
                  min="10"
                  max="50"
                  step="5"
                  value={questionsPerQuiz}
                  onChange={(e) => setQuestionsPerQuiz(parseInt(e.target.value))}
                />
                <div className="d-flex justify-content-between text-muted small">
                  <span>10</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>

              {/* Available Categories */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <i className="bi bi-grid-3x3 me-2"></i>
                  Available Categories ({Array.isArray(categories) ? categories.length : 0})
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {Array.isArray(categories) && categories.length > 0 ? (
                    categories.map((category) => (
                      <span
                        key={category.id}
                        className="badge rounded-pill p-2 px-3"
                        style={{
                          backgroundColor: category.color || '#6c757d',
                          fontSize: '0.9rem'
                        }}
                      >
                        <span className="me-1">{category.icon}</span>
                        {category.name}
                        <span className="ms-1 opacity-75">({category.question_count})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">Loading categories...</span>
                  )}
                </div>
                {Array.isArray(categories) && categories.length < 5 && categories.length > 0 && (
                  <div className="alert alert-info mt-3 mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    More categories coming soon! Currently featuring: {categories.map(c => c.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button
                  className="btn btn-lg btn-primary"
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={handleStartQuiz}
                  disabled={loading || !playerName.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Starting Quiz...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-play-fill me-2"></i>
                      Start Quiz
                    </>
                  )}
                </button>

                <button
                  className="btn btn-lg btn-outline-secondary"
                  onClick={handleViewLeaderboard}
                >
                  <i className="bi bi-trophy-fill me-2"></i>
                  View Leaderboard
                </button>

                <button
                  className="btn btn-lg btn-outline-secondary"
                  onClick={() => navigate(`/games${hotelParam ? `?hotel=${hotelParam}` : ''}`)}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Games
                </button>
              </div>

              {/* Scoring Info */}
              <div className="mt-4">
                <div className="card bg-light">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-info-circle me-2"></i>
                      How Scoring Works
                    </h6>
                    <ul className="mb-0 small">
                      <li><strong>Difficulty Multipliers:</strong> Easy (1.0x), Medium (1.5x), Hard (2.0x)</li>
                      <li><strong>Time Bonuses:</strong> &lt;10s (1.2x), &lt;20s (1.1x), ≥20s (1.0x)</li>
                      <li><strong>Example:</strong> Medium question (10 pts) answered in 8 seconds = 10 × 1.5 × 1.2 = 18 points</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
