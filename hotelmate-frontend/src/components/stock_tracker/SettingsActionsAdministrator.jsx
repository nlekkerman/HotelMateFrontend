import React from "react";

export default function SettingsActionsAdministrator({
  showSettings,
  setShowSettings,
  showMovements,
  setShowMovements,
  setShowCocktailCalculator, // 🔹 must be passed from parent
}) {
  return (
    <div className="mb-3 d-flex gap-2 flex-column flex-lg-row justify-content-center">
      <button
        className="custom-button"
        onClick={() => {
          setShowSettings(!showSettings);
          setShowMovements(false);
        }}
      >
        {showSettings ? "Hide" : ""} Stock Settings
      </button>

      <button
        className="custom-button"
        onClick={() => {
          setShowMovements(!showMovements);
          setShowSettings(false);
        }}
      >
        {showMovements ? "Hide" : ""} Stock Movements
      </button>

      <button
        className="custom-button"
        onClick={() => {
          console.log("Cocktail Calculator button clicked");
          setShowCocktailCalculator(true); // 🔹 open cocktail calculator modal
          setShowSettings(false);
          setShowMovements(false);
        }}
      >
        Cocktail Calculator
      </button>
    </div>
  );
}
