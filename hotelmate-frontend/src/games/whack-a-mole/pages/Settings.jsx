// pages/Settings.jsx
import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import "../styles/InterfaceStyles.css";

export default function Settings({ onBack, audioSettings, setAudioSettings }) {
  const [bgMusic, setBgMusic] = useState(audioSettings.bgMusic);
  const [effects, setEffects] = useState(audioSettings.effects);

  const handleSave = () => {
    setAudioSettings({ bgMusic, effects });
    onBack(); // return to previous page
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Settings</h1>

      <div className="dashboard-buttons d-flex flex-column gap-3 mt-4">
        {/* Background Music Toggle */}
        <div className="form-check form-switch">
          <input
            className="form-check-input "
            type="checkbox"
            id="bgMusicSwitch"
            checked={bgMusic}
            onChange={(e) => setBgMusic(e.target.checked)}
          />
          <label className="form-check-label text-white" htmlFor="bgMusicSwitch">
            Background Music
          </label>
        </div>

        {/* Sound Effects Toggle */}
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="effectsSwitch"
            checked={effects}
            onChange={(e) => setEffects(e.target.checked)}
          />
          <label className="form-check-label text-white" htmlFor="effectsSwitch">
            Sound Effects
          </label>
        </div>

        {/* Back / Save */}
        <button className="btn btn-primary btn-lg mt-3" onClick={handleSave}>
          Save & Back
        </button>
      </div>
    </div>
  );
}
