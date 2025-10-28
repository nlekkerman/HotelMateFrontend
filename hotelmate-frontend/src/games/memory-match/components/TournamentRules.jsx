import React from 'react';
import { useNavigate } from 'react-router-dom';

const TournamentRules = ({ tournament, onStartGame, onGoBack }) => {
  const navigate = useNavigate();

  return (
    <div className="container-fluid min-vh-100 bg-gradient d-flex align-items-center justify-content-center" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="row justify-content-center w-100">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <div className="card tournament-card shadow-lg">
            <div className="card-header bg-warning text-dark text-center py-4">
              <div className="display-1 mb-3">🏆</div>
              <h2 className="mb-0">{tournament?.name || 'Tournament'}</h2>
              <p className="mb-0 fs-5">Rules & Instructions</p>
            </div>
            
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <div className="alert alert-info mb-4">
                  <h4 className="alert-heading">🎯 Tournament Objective</h4>
                  <p className="mb-0">Match all pairs of cards in the shortest time possible with the fewest moves!</p>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="card h-100 border-primary">
                    <div className="card-body text-center">
                      <div className="display-4 text-primary mb-3">⚡</div>
                      <h5 className="card-title">Scoring System</h5>
                      <ul className="list-unstyled text-start">
                        <li>• Base points for completion</li>
                        <li>• Time bonus (faster = more points)</li>
                        <li>• Move efficiency bonus</li>
                        <li>• Perfect match streaks</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="card h-100 border-success">
                    <div className="card-body text-center">
                      <div className="display-4 text-success mb-3">🎮</div>
                      <h5 className="card-title">How to Play</h5>
                      <ul className="list-unstyled text-start">
                        <li>• Click cards to flip them</li>
                        <li>• Match identical pairs</li>
                        <li>• Complete all matches to win</li>
                        <li>• Minimize time and moves</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning mb-4">
                <h5 className="alert-heading">📋 Important Notes</h5>
                <ul className="mb-0">
                  <li>• <strong>Unlimited attempts:</strong> Play as many times as you want!</li>
                  <li>• <strong>Best score only:</strong> Only your highest score appears on the leaderboard</li>
                  <li>• <strong>High score collection:</strong> Name and room number collected only for qualifying scores</li>
                  <li>• <strong>Fair play:</strong> No refreshing or closing the game during play</li>
                  <li>• <strong>Tournament period:</strong> Must complete before tournament ends</li>
                </ul>
              </div>

              {tournament && (
                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <h6 className="card-title">🕒 Tournament Details</h6>
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">Started:</small><br />
                        <span className="fw-bold">
                          {new Date(tournament.start_date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Ends:</small><br />
                        <span className="fw-bold">
                          {new Date(tournament.end_date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex gap-3 justify-content-center">
                <button
                  className="btn btn-secondary btn-lg px-4"
                  onClick={onGoBack}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Go Back
                </button>
                <button
                  className="btn btn-warning btn-lg px-5"
                  onClick={onStartGame}
                >
                  <i className="fas fa-play me-2"></i>
                  Start Tournament!
                </button>
              </div>

              <div className="text-center mt-4">
                <small className="text-muted">
                  Good luck and may the best player win! 🍀
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tournament-card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.98);
          border: none;
          border-radius: 20px;
        }
        
        .card {
          border-radius: 15px;
        }
        
        .btn {
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default TournamentRules;