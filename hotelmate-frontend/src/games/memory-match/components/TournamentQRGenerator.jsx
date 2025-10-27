import { useState, useRef } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';

export default function TournamentQRGenerator({ tournament, onClose }) {
  const [qrCodeDataURL, setQRCodeDataURL] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef();

  // Get QR code from tournament data or generate via API
  const generateQRCode = async (url, title) => {
    setLoading(true);
    try {
      // Check if tournament already has QR codes (from backend pre-generation)
      if (tournament.qr_code_play && url.includes('/play/')) {
        setQRCodeDataURL(tournament.qr_code_play);
        setLoading(false);
        return;
      }
      
      if (tournament.qr_code_leaderboard && url.includes('/leaderboard/')) {
        setQRCodeDataURL(tournament.qr_code_leaderboard);
        setLoading(false);
        return;
      }

      // If no pre-generated QR codes, try to fetch from tournament detail
      try {
        const tournamentDetail = await memoryGameAPI.getTournament(tournament.id);
        if (tournamentDetail.qr_code_play && url.includes('/play/')) {
          setQRCodeDataURL(tournamentDetail.qr_code_play);
          return;
        }
        if (tournamentDetail.qr_code_leaderboard && url.includes('/leaderboard/')) {
          setQRCodeDataURL(tournamentDetail.qr_code_leaderboard);
          return;
        }
      } catch (detailError) {
        console.warn('Could not fetch tournament detail:', detailError);
      }

      // Try to fetch existing QR codes first
      try {
        const qrCodes = await memoryGameAPI.getQRCodes({
          tournament_id: tournament.id,
          type: url.includes('/leaderboard') ? 'leaderboard' : 'play'
        });
        
        if (qrCodes.length > 0) {
          const qrCode = qrCodes[0];
          if (qrCode.qr_code_url) {
            setQRCodeDataURL(qrCode.qr_code_url);
            return;
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch existing QR codes:', fetchError);
      }

      // Fallback: Try to generate via API (if backend supports it)
      try {
        const response = await memoryGameAPI.generateTournamentQR({
          tournament_id: tournament.id,
          url: url,
          title: title,
          type: url.includes('/leaderboard') ? 'leaderboard' : 'play'
        });
        
        if (response.qr_code_url) {
          setQRCodeDataURL(response.qr_code_url);
        } else if (response.qr_code_data) {
          setQRCodeDataURL(response.qr_code_data);
        } else {
          throw new Error('No QR code data received from server');
        }
      } catch (apiError) {
        console.error('QR generation API error:', apiError);
        // If API fails, show a message that QR codes are not available yet
        throw new Error(`QR codes not available. API Error: ${apiError.response?.status || 'Unknown'}`);
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      alert('QR Code not available: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tournamentUrls = {
    play: `https://hotelsmates.com/tournaments/${tournament.hotel_slug || 'hotel-killarney'}/${tournament.slug || tournament.id}/play/`,
    leaderboard: `https://hotelsmates.com/tournaments/${tournament.hotel_slug || 'hotel-killarney'}/${tournament.slug || tournament.id}/leaderboard/`
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
                    onClick={() => generateQRCode(tournamentUrls.play, 'Kids Tournament Game')}
                    disabled={loading}
                  >
                    🎮 PLAY TOURNAMENT
                    <div className="small mt-1">Kids scan this to play the memory game</div>
                  </button>
                  
                  <button
                    className="btn btn-warning btn-lg"
                    onClick={() => generateQRCode(tournamentUrls.leaderboard, 'Tournament Champions')}
                    disabled={loading}
                  >
                    � VIEW CHAMPIONS
                    <div className="small mt-1">See who got the best scores!</div>
                  </button>
                </div>

                <h6 className="mb-3">📋 Share These Links</h6>
                <div className="mb-3">
                  <label className="form-label small text-success">🎮 Play Tournament Game</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control small"
                      value={tournamentUrls.play}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-success btn-sm"
                      type="button"
                      onClick={() => copyToClipboard(tournamentUrls.play)}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-warning">🏆 View Champions</label>
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