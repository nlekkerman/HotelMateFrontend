import React, { useState } from 'react';

export default function TournamentSaveModal({ show, score, onSave, onSkip }) {
  const [roomNumber, setRoomNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (roomNumber.trim()) {
      setSaving(true);
      await onSave(roomNumber.trim());
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">
              <i className="bi bi-trophy-fill text-warning me-2"></i>
              Save to Tournament Leaderboard?
            </h5>
          </div>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="text-center mb-4">
                <div className="display-4 text-primary mb-2">{score}</div>
                <p className="text-muted mb-0">Great score!</p>
              </div>
              
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Enter your <strong>room number</strong> to save your score to the tournament leaderboard and compete for prizes!
              </div>

              <div className="form-floating">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  id="roomNumber"
                  placeholder="Room number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  autoFocus
                  maxLength={50}
                />
                <label htmlFor="roomNumber">Room Number</label>
              </div>
              
              <div className="text-muted small mt-2">
                <i className="bi bi-lock-fill me-1"></i>
                Your room number is used to verify your tournament entry
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={onSkip}
                disabled={saving}
              >
                Skip (Practice Mode)
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={!roomNumber.trim() || saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trophy me-2"></i>
                    Save to Tournament
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
