// File: C:\Users\nlekk\HotelMateFrontend\hotelmate-frontend\src\games\GamesDashboard.jsx

import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import smiley from "@/games/whack-a-mole/assets/images/smiley.png";

export default function GamesDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mainColor } = useTheme();
  const hotelParam = searchParams.get('hotel');

  const handleNavigate = (path) => {
    // Add hotel parameter to the path if it exists
    if (hotelParam) {
      const separator = path.includes('?') ? '&' : '?';
      navigate(`${path}${separator}hotel=${hotelParam}`);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Games Dashboard</h2>

      {/* Mobile Quick Actions - Same style as desktop */}
      <div 
        className="d-lg-none position-fixed start-0 end-0"
        style={{
          top: "60px",
          zIndex: 1045,
          background: "transparent",
        }}
      >
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
            <button className="contextual-action-btn" onClick={() => handleNavigate('/games')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-controller" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Dashboard</span>
            </button>
            <button className="contextual-action-btn" onClick={() => handleNavigate('/games/memory-match')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-grid-3x3-gap" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Memory Match</span>
            </button>
            <button className="contextual-action-btn" onClick={() => handleNavigate('/games/whack-a-mole')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-joystick" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Whack-a-Mole</span>
            </button>
            <button className="contextual-action-btn" onClick={() => handleNavigate('/games/memory-match/leaderboard')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-trophy-fill" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Leaderboard</span>
            </button>
            <button className="contextual-action-btn" onClick={() => handleNavigate('/games/memory-match/tournaments')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-award" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Tournaments</span>
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4 justify-content-center">
        {/* Settings Card */}
        <div className="col-md-3">
          <div
            className="card h-100 text-center"
            onClick={() => handleNavigate("/games/settings")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <i className="bi bi-gear-fill" style={{ fontSize: "3rem" }}></i>
              <h5 className="card-title mt-3">Settings</h5>
              <p className="card-text">
                Configure sounds and difficulty for all games
              </p>
            </div>
          </div>
        </div>

        {/* Whack-a-Mole Card */}
        <div className="col-md-3">
          <div
            className="card h-100 text-center"
            onClick={() => handleNavigate("/games/whack-a-mole")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <img src={smiley} alt="Whack-a-Mole" style={{ width: "80px" }} />{" "}
              <h5 className="card-title mt-3">Emoji SmackDown</h5>
              <p className="card-text">Test your speed and reflexes!</p>
            </div>
          </div>
        </div>

        {/* Memory Match Card */}
        <div className="col-md-3">
          <div
            className="card h-100 text-center"
            onClick={() => handleNavigate("/games/memory-match")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <i
                className="bi bi-grid-3x2-gap-fill"
                style={{ fontSize: "3rem" }}
              ></i>
              <h5 className="card-title mt-3">Memory Match</h5>
              <p className="card-text">Test your memory with matching pairs!</p>
            </div>
          </div>
        </div>

        {/* Tournament Management Card */}
        <div className="col-md-3">
          <div
            className="card h-100 text-center border-warning"
            onClick={() => handleNavigate("/games/memory-match/tournaments")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <i
                className="bi bi-trophy-fill text-warning"
                style={{ fontSize: "3rem" }}
              ></i>
              <h5 className="card-title mt-3">Kids Tournaments</h5>
              <p className="card-text">Create and manage fun tournaments with QR codes!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
