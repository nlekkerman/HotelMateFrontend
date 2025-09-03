import React from "react";

export default function SettingsActionsAdministrator({
  showSettings,
  setShowSettings,
  showMovements,
  setShowMovements,
  showCocktailCalculator,
  setShowCocktailCalculator,
  showStockAnalytics,
  setShowStockAnalytics, // 🔹 new
}) {
  const handleToggle = (panel) => {
    switch (panel) {
      case "settings":
        setShowSettings(!showSettings);
        setShowMovements(false);
        setShowCocktailCalculator(false);
        setShowStockAnalytics(false);
        break;
      case "movements":
        setShowMovements(!showMovements);
        setShowSettings(false);
        setShowCocktailCalculator(false);
        setShowStockAnalytics(false);
        break;
      case "cocktail":
        setShowCocktailCalculator(!showCocktailCalculator);
        setShowSettings(false);
        setShowMovements(false);
        setShowStockAnalytics(false);
        break;
      case "analytics":
        setShowStockAnalytics(!showStockAnalytics);
        setShowSettings(false);
        setShowMovements(false);
        setShowCocktailCalculator(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="mb-3 d-flex gap-2 flex-column flex-lg-row justify-content-center">
      <button
  className={`custom-button${showSettings ? " bg-danger text-white" : ""}`}
  onClick={() => handleToggle("settings")}
>
  {showSettings ? "Hide Stock Settings" : "Stock Settings"}
</button>

<button
  className={`custom-button${showMovements ? " bg-danger text-white" : ""}`}
  onClick={() => handleToggle("movements")}
>
  {showMovements ? "Hide Stock Movements" : "Stock Movements"}
</button>

<button
  className={`custom-button${showCocktailCalculator ? " bg-danger text-white" : ""}`}
  onClick={() => handleToggle("cocktail")}
>
  {showCocktailCalculator
    ? "Hide Cocktail Calculator"
    : "Cocktail Calculator"}
</button>

<button
  className={`custom-button${showStockAnalytics ? " bg-danger text-white" : ""}`}
  onClick={() => handleToggle("analytics")}
>
  {showStockAnalytics ? "Hide Stock Analytics" : "Stock Analytics"}
</button>
    </div>
  );
}
