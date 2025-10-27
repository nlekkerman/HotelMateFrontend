// File: C:\Users\nlekk\HotelMateFrontend\hotelmate-frontend\src\games\GamesDashboard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import smiley from "@/games/whack-a-mole/assets/images/smiley.png";
export default function GamesDashboard() {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Games Dashboard</h2>

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
