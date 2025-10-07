import React, { useState, useEffect } from "react";
import background from "../assets/dashboard-bg.svg";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/InterfaceStyles.css";
import GamePage from "./GamePage";
import Settings from "./Settings";
import Difficulty from "../components/Difficulty";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [audioSettings, setAudioSettings] = useState({
    bgMusic: true,
    effects: true,
  });

  // Default difficulty = Intermediate (800ms)
  const [difficulty, setDifficulty] = useState(800);

  // 👇 Show toast once when Dashboard loads
  useEffect(() => {
    toast.info("Difficulty set to Intermediate ⚔️", {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
    });
  }, []);

  const handlePlay = () => setCurrentPage("game");
  const handleSettings = () => setCurrentPage("settings");
  const handleDifficulty = () => setCurrentPage("difficulty");
  const handleBack = () => setCurrentPage("dashboard");

  if (currentPage === "game") {
    return (
      <GamePage
        onBack={handleBack}
        audioSettings={audioSettings}
        duration={difficulty}
      />
    );
  }

  if (currentPage === "settings") {
    return (
      <Settings
        onBack={handleBack}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
      />
    );
  }

  if (currentPage === "difficulty") {
    return (
      <Difficulty
        onSelectDifficulty={(duration) => {
          setDifficulty(duration);
          setCurrentPage("dashboard");
          toast.success("Difficulty updated 🎯", {
            position: "top-center",
            autoClose: 1500,
          });
        }}
        onBack={handleBack}
      />
    );
  }

  return (
    <div
      className="dashboard"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="dashboard-title">Whack Me You Baby!</h1>

      <div className="dashboard-buttons d-flex flex-column gap-3 mt-4">
        <button className="btn btn-success btn-lg" onClick={handlePlay}>
          Play
        </button>
        <button className="btn btn-warning btn-lg" onClick={handleSettings}>
          Sounds
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleDifficulty}>
          Difficulty
        </button>

        <div className="mt-3 text-light fw-bold">
          Current Difficulty:{" "}
          {difficulty === 1200
            ? "Beginner 🐣"
            : difficulty === 800
            ? "Intermediate ⚔️"
            : "Hard 🔥"}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
