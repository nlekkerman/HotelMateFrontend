import { useState, useRef } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import QRCode from 'qrcode';

export default function TournamentQRGenerator({ tournament, onClose }) {
  const [qrCodeDataURL, setQRCodeDataURL] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef();

  // Generate QR code client-side using the qrcode library
  const generateQRCode = async (url, title) => {
    setLoading(true);
    try {
      console.log('🎯 Generating QR code for URL:', url);
      
      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQRCodeDataURL(qrDataURL);
      console.log('✅ QR code generated successfully');
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refactored URLs - QR codes point to dashboard
  const tournamentUrls = {
    dashboard: `${window.location.origin}/games/memory-match?hotel=${tournament.hotel?.slug || 'hotel-killarney'}`,
    direct: `${window.location.origin}/games/memory-match/tournament/${tournament.id}`,
    leaderboard: `${window.location.origin}/tournaments/${tournament.hotel?.slug || 'hotel-killarney'}/${tournament.slug || tournament.id}/leaderboard`
  };

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return;
    
    const link = document.createElement('a');
    link.download = `tournament-${tournament.id}-qr-code.png`;
    link.href = qrCodeDataURL;
    link.click();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('URL copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy URL');
    });
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">📱 Kids Tournament QR Codes - {tournament.name}</h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          
          <div className="modal-body">
            <div className="row">
              <div className="col-12 col-md-6">
                <h6 className="mb-3">Generate QR Codes</h6>
                
                <div className="alert alert-info mb-4">
                  <h6>📱 For Kids - Mobile Friendly!</h6>
                  <p className="mb-2 small">
                    These QR codes are designed for kids to scan with phones and tablets. 
                    The game will take the full screen for the best playing experience!
                  </p>
                  <p className="mb-0 small text-muted">
                    <em>High-quality QR codes generated locally</em>
                  </p>
                </div>

                <div className="d-grid gap-3 mb-4">
                  <button
                    className="btn btn-success btn-lg"
                    onClick={() => generateQRCode(tournamentUrls.dashboard, 'Memory Match Dashboard')}
                    disabled={loading}
                  >
                    🎮 GAME DASHBOARD (Recommended)
                    <div className="small mt-1">Shows tournaments + practice mode for this hotel</div>
                  </button>
                  
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => generateQRCode(tournamentUrls.direct, 'Direct Tournament')}
                    disabled={loading}
                  >
                    � DIRECT TOURNAMENT
                    <div className="small mt-1">Goes straight to tournament game</div>
                  </button>
                  
                  <button
                    className="btn btn-warning btn-lg"
                    onClick={() => generateQRCode(tournamentUrls.leaderboard, 'Tournament Champions')}
                    disabled={loading}
                  >
                    🏅 VIEW CHAMPIONS
                    <div className="small mt-1">See who got the best scores!</div>
                  </button>
                </div>

                <h6 className="mb-3">📋 Share These Links</h6>
                <div className="mb-3">
                  <label className="form-label small text-success">🎮 Game Dashboard (Recommended)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control small"
                      value={tournamentUrls.dashboard}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-success btn-sm"
                      type="button"
                      onClick={() => copyToClipboard(tournamentUrls.dashboard)}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="small text-muted mt-1">Shows practice + tournaments for this hotel</div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-primary">🏆 Direct Tournament</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control small"
                      value={tournamentUrls.direct}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={() => copyToClipboard(tournamentUrls.direct)}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-warning">� View Champions</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control small"
                      value={tournamentUrls.leaderboard}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-warning btn-sm"
                      type="button"
                      onClick={() => copyToClipboard(tournamentUrls.leaderboard)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <h6 className="mb-3">QR Code Preview</h6>
                
                {loading && (
                  <div className="text-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Generating QR code...</span>
                    </div>
                    <p className="mt-2">Generating QR code...</p>
                  </div>
                )}

                {qrCodeDataURL && !loading && (
                  <div className="text-center">
                    <img
                      src={qrCodeDataURL}
                      alt="Tournament QR Code"
                      className="img-fluid border rounded shadow-sm"
                      style={{maxWidth: '300px'}}
                    />
                    
                    <div className="mt-3 d-grid gap-2">
                      <button
                        className="btn btn-success"
                        onClick={downloadQRCode}
                      >
                        <i className="bi bi-download me-2"></i>
                        Download QR Code
                      </button>
                    </div>
                  </div>
                )}

                {!qrCodeDataURL && !loading && (
                  <div className="text-center text-muted p-4">
                    <i className="bi bi-qr-code" style={{fontSize: '3rem'}}></i>
                    <p className="mt-2 mb-3">Select a QR code type above to get the code</p>
                    
                    <div className="alert alert-info small">
                      <strong>💡 Alternative Options:</strong>
                      <ul className="mb-0 mt-2 text-start">
                        <li>Copy the URL and use any QR code generator</li>
                        <li>Share the direct link via WhatsApp/SMS</li>
                        <li>Print the URL for manual entry</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-12">
                <div className="alert alert-success">
                  <h6>🎯 Perfect for Kids!</h6>
                  <ul className="mb-0 small">
                    <li><strong>📱 Mobile Optimized:</strong> Game takes full screen on phones and tablets</li>
                    <li><strong>🎮 Easy to Play:</strong> No registration needed - just scan and play!</li>
                    <li><strong>🏆 Fun Competition:</strong> See your score on the champions board</li>
                    <li><strong>🎁 Safe & Free:</strong> No personal info required, just for fun!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}