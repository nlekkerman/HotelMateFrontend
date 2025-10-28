import React, { useState } from 'react';

const PlayerInfoForm = ({ tournament, onStartGame, onCancel }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }

    setIsLoading(true);

    // Prepare player data
    const playerData = {
      name: playerName.trim(),
      room: roomNumber.trim() || 'Not specified'
    };

    // Start the game with player data
    onStartGame(playerData);
  };

  const generateRandomName = () => {
    const adjectives = ['Super', 'Amazing', 'Cool', 'Fast', 'Smart', 'Brave', 'Lucky', 'Happy', 'Clever'];
    const nouns = ['Player', 'Gamer', 'Star', 'Hero', 'Champion', 'Winner', 'Master', 'Ninja', 'Wizard'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    
    setPlayerName(`${randomAdj} ${randomNoun} ${randomNum}`);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="card shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="card-body p-4">
          {/* Tournament Header */}
          <div className="text-center mb-4">
            <h2 className="text-primary mb-3">🏆 {tournament?.name || 'Tournament'}</h2>
            {tournament?.description && (
              <p className="text-muted mb-3">{tournament.description}</p>
            )}
            
            {tournament && (
              <div className="row text-center mb-3">
                <div className="col-4">
                  <small className="text-muted d-block">⏰ Ends</small>
                  <small className="fw-semibold">
                    {new Date(tournament.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
                <div className="col-4">
                  <small className="text-muted d-block">🎮 Game</small>
                  <small className="fw-semibold">3×4 Grid</small>
                </div>
                <div className="col-4">
                  <small className="text-muted d-block">🎯 Goal</small>
                  <small className="fw-semibold">Best Score</small>
                </div>
              </div>
            )}
          </div>

          {/* Player Info Form */}
          <form onSubmit={handleSubmit}>
            <h4 className="text-center mb-4">👤 Enter Your Information</h4>
            
            <div className="mb-3">
              <label htmlFor="playerName" className="form-label">
                <span className="text-danger">*</span> Your Name:
              </label>
              <div className="input-group">
                <input
                  type="text"
                  id="playerName"
                  className="form-control"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={50}
                  required
                />
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={generateRandomName}
                  title="Generate random name"
                >
                  🎲
                </button>
              </div>
              <small className="form-text text-muted">This name will appear on the leaderboard</small>
            </div>

            <div className="mb-4">
              <label htmlFor="roomNumber" className="form-label">
                Room Number <small className="text-muted">(optional)</small>:
              </label>
              <input
                type="text"
                id="roomNumber"
                className="form-control"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., 205, or leave empty"
                maxLength={20}
              />
              <small className="form-text text-muted">Help others identify you on the leaderboard</small>
            </div>

            {/* Game Rules */}
            <div className="alert alert-info mb-4">
              <h5 className="alert-heading">🎮 Game Rules:</h5>
              <ul className="mb-0 ps-3">
                <li>Match all 6 pairs of cards (3×4 grid)</li>
                <li>Complete as fast as possible</li>
                <li>Fewer moves = higher score</li>
                <li>Best score wins prizes!</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="d-grid gap-2">
              <button 
                type="submit" 
                className="btn btn-success btn-lg"
                disabled={isLoading || !playerName.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Starting Game...
                  </>
                ) : (
                  <>🚀 Start Tournament Game!</>
                )}
              </button>
              
              <button 
                type="button" 
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={isLoading}
              >
                ← Back to Tournament Dashboard
              </button>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="text-center mt-3">
            <small className="text-muted">
              ℹ️ Your information is only used for this tournament and leaderboard display.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfoForm;