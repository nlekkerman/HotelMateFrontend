import React from 'react';

export default function GameRules({ isVisible, onClose, isQRTournament = false }) {
  if (!isVisible) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{
      backgroundColor: 'rgba(0,0,0,0.8)', 
      zIndex: 2000
    }}>
      <div className={`card shadow-lg ${isQRTournament ? 'mx-3' : ''}`} style={{
        maxWidth: isQRTournament ? '90vw' : '600px', 
        width: '100%',
        maxHeight: isQRTournament ? '90vh' : '80vh',
        overflowY: 'auto'
      }}>
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">🧠 Memory Match Rules</h4>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
        </div>
        
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h5 className="text-success">🎯 How to Play</h5>
          </div>
          
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="card bg-light border-0">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="bi bi-1-circle-fill text-primary" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6>👆 Click Cards</h6>
                  <p className="small mb-0">Tap any card to flip it over and see the picture underneath</p>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6">
              <div className="card bg-light border-0">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="bi bi-2-circle-fill text-primary" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6>🔍 Find Pairs</h6>
                  <p className="small mb-0">Click a second card to see if it matches the first one</p>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6">
              <div className="card bg-light border-0">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="bi bi-3-circle-fill text-success" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6>✅ Match Found!</h6>
                  <p className="small mb-0">When cards match, they stay face up. Great job!</p>
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6">
              <div className="card bg-light border-0">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <i className="bi bi-4-circle-fill text-warning" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6>🔄 Keep Going</h6>
                  <p className="small mb-0">Find all 12 pairs as fast as you can!</p>
                </div>
              </div>
            </div>
          </div>
          
          {isQRTournament && (
            <div className="alert alert-success mt-4">
              <h6>🏆 Tournament Mode</h6>
              <ul className="mb-0 small">
                <li>🎯 <strong>Goal:</strong> Find all 12 matching pairs</li>
                <li>⏱️ <strong>Speed:</strong> Faster times = higher scores</li>
                <li>🎯 <strong>Accuracy:</strong> Fewer moves = better score</li>
                <li>🎁 <strong>Rewards:</strong> Symbolic prizes for playing!</li>
              </ul>
            </div>
          )}
          
          <div className="alert alert-info mt-4">
            <h6>💡 Pro Tips</h6>
            <ul className="mb-0 small">
              <li>📱 <strong>Mobile:</strong> Turn your device sideways for better view</li>
              <li>🧠 <strong>Memory:</strong> Try to remember where cards are located</li>
              <li>🎯 <strong>Strategy:</strong> Start from corners and work your way in</li>
              <li>😊 <strong>Fun:</strong> Don't worry about mistakes - it's all about having fun!</li>
            </ul>
          </div>
          
          <div className="d-grid gap-2 mt-4">
            <button 
              className="btn btn-success btn-lg"
              onClick={onClose}
            >
              🚀 Got it! Let's Play!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}