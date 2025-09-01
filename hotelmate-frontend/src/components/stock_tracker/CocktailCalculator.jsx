import { useState } from "react";
import { useCocktailCalculator } from "@/components/stock_tracker/hooks/useCocktailCalculator";
import { CocktailModal } from "@/components/stock_tracker/modals/CocktailModal";
import { IngredientModal } from "@/components/stock_tracker/modals/IngredientModal";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export const CocktailCalculator = () => {
  const { user } = useAuth();
  const { cocktails, consumptions, loading, setConsumptions } = useCocktailCalculator();

  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [quantities, setQuantities] = useState({});

  // Create cocktail API call
  const handleCreateCocktail = async (payload) => {
    try {
      console.log("Creating cocktail with payload:", payload);
      const res = await api.post("/stock_tracker/cocktails/", payload);
      console.log("Cocktail created successfully:", res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to create cocktail:", err);
      throw err;
    }
  };

  // Log all cocktails consumption at once
  const handleLogAllConsumption = async () => {
    if (!user?.hotel_id) return alert("Hotel ID not found in user context");

    const payloads = Object.entries(quantities)
      .filter(([cocktailId, qty]) => parseInt(qty, 10) > 0)
      .map(([cocktailId, qty]) => ({
        cocktail_id: parseInt(cocktailId, 10),
        quantity_made: parseInt(qty, 10),
        hotel_id: user.hotel_id,
      }));

    if (payloads.length === 0) return alert("Enter quantities for at least one cocktail");

    try {
      const responses = await Promise.all(
        payloads.map((payload) => api.post("/stock_tracker/consumptions/", payload))
      );
      const newConsumptions = responses.map((res) => res.data);
      setConsumptions(newConsumptions);
      setQuantities({});
    } catch (err) {
      console.error("Error logging all consumptions:", err);
      alert("Failed to log some consumptions.");
    }
  };

  // Calculate total ingredients used
  const calculateTotals = () => {
    const totals = {};
    consumptions.forEach((c) => {
      if (!c.total_ingredient_usage) return;
      Object.entries(c.total_ingredient_usage).forEach(([name, qty]) => {
        const [numStr, unit] = qty.split(" ");
        const num = parseFloat(numStr);
        if (!totals[name]) totals[name] = { value: 0, unit };
        totals[name].value += num;
      });
    });

    const formatted = {};
    Object.entries(totals).forEach(([name, { value, unit }]) => {
      formatted[name] = `${value} ${unit}`;
    });

    return formatted;
  };

  const totals = calculateTotals();

  return (
    <div className="cocktail-calculator container mt-4 p-4 bg-light rounded shadow-sm">
      <h1 className="mb-4 text-center">Cocktail Calculator 🍹</h1>

      {/* Buttons */}
      <div className="mb-3 text-center d-flex justify-content-center gap-2">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Create New Cocktail
        </button>
        <button className="btn btn-secondary" onClick={() => setIngredientModalOpen(true)}>
          + Create Ingredient
        </button>
      </div>

      {/* Modals */}
      <CocktailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateCocktail}
      />
      <IngredientModal
        isOpen={ingredientModalOpen}
        onClose={() => setIngredientModalOpen(false)}
        onSubmit={(ingredient) => console.log("New ingredient created:", ingredient)}
      />

      {/* Cocktails List */}
      <h2 className="mt-4">Available Cocktails</h2>
      {loading && <p>Loading cocktails...</p>}
      {!loading && (!Array.isArray(cocktails) || cocktails.length === 0) && <p>No cocktails available.</p>}
      <ul className="list-group">
        {cocktails.map((c) => (
          <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{c.name}</span>
            <input
              type="number"
              min="1"
              placeholder="Qty"
              className="form-control form-control-sm"
              style={{ width: "80px" }}
              value={quantities[c.id] || ""}
              onChange={(e) => setQuantities({ ...quantities, [c.id]: e.target.value })}
            />
          </li>
        ))}
      </ul>

      {/* Log All Button */}
      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-success" onClick={handleLogAllConsumption}>
          Log All
        </button>
      </div>

      {/* Totals */}
      <h2 className="mt-4">Total Ingredients Used</h2>
      {Object.keys(totals).length === 0 && <p>No ingredients used yet.</p>}
      <ul className="list-group">
        {Object.entries(totals).map(([name, qty]) => (
          <li key={name} className="list-group-item">
            {name}: <strong>{qty}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};
