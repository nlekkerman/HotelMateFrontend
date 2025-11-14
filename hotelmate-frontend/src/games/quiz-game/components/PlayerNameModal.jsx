import React, { useState } from 'react';

export default function PlayerNameModal({ show, onSubmit, onSkip }) {
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      onSubmit(playerName.trim());
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-circle me-2"></i>
              Enter Your Name
            </h5>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p className="text-muted mb-3">
                Enter your name to start playing! You can save your score to the tournament leaderboard after the game.
              </p>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                maxLength={100}
              />
            </div>
            <div className="modal-footer">
              {onSkip && (
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={onSkip}
                >
                  Skip
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!playerName.trim()}
              >
                Start Quiz <i className="bi bi-play-fill ms-2"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
