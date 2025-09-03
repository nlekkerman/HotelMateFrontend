import React from "react";

export default function SettingsActionsAdministrator({ activePanel, setActivePanel }) {
  const handleToggle = (panel) => {
    setActivePanel(activePanel === panel ? null : panel); 
    // toggle on/off
  };

  return (
    <div className="mb-3 d-flex gap-2 flex-column flex-lg-row justify-content-center">
      <button
        className={`custom-button${activePanel === "settings" ? " bg-danger text-white" : ""}`}
        onClick={() => handleToggle("settings")}
      >
        {activePanel === "settings" ? "Hide Stock Settings" : "Stock Settings"}
      </button>

      <button
        className={`custom-button${activePanel === "movements" ? " bg-danger text-white" : ""}`}
        onClick={() => handleToggle("movements")}
      >
        {activePanel === "movements" ? "Hide Stock Movements" : "Stock Movements"}
      </button>

      <button
        className={`custom-button${activePanel === "cocktail" ? " bg-danger text-white" : ""}`}
        onClick={() => handleToggle("cocktail")}
      >
        {activePanel === "cocktail" ? "Hide Cocktail Calculator" : "Cocktail Calculator"}
      </button>

      <button
        className={`custom-button${activePanel === "analytics" ? " bg-danger text-white" : ""}`}
        onClick={() => handleToggle("analytics")}
      >
        {activePanel === "analytics" ? "Hide Stock Analytics" : "Stock Analytics"}
      </button>
    </div>
  );
}
