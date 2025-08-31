import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useCocktailCalculator } from "@/components/stock_tracker/hooks/useCocktailCalculator";
import { CocktailModal } from "@/components/stock_tracker/modals/CocktailModal";
import { IngredientAnalytics } from "@/components/stock_tracker/IngredientAnalytics";
import api from "@/services/api";

export const CocktailCalculator = () => {
  const { hotelId } = useParams();
  const {
    cocktails,
    consumptions,
    loading,
    createCocktail,
    logConsumption,
    calculateTotals,
    setConsumptions,
  } = useCocktailCalculator();

  const [modalOpen, setModalOpen] = useState(false);
  const [quantities, setQuantities] = useState({});

  const handleCreateCocktail = async (cocktail) => {
    try {
      const res = await api.post("/stock_tracker/cocktails/", cocktail);
      alert(`Cocktail "${cocktail.name}" created successfully!`);
      fetchCocktails();
      return res.data;
    } catch (err) {
      console.error("Error creating cocktail:", err);
      alert("Failed to create cocktail. Check console.");
      throw err;
    }
  };

  const handleLogConsumption = async (cocktailId) => {
    const quantity = parseInt(quantities[cocktailId], 10);
    if (!quantity || quantity <= 0) return alert("Enter a valid quantity");

    try {
      const res = await api.post("/stock_tracker/consumptions/", {
        cocktail_id: cocktailId,
        quantity_made: quantity,
        hotel_id: hotelId, // pass hotel id here
      });

      setConsumptions((prev) => [...prev, res.data]);
      setQuantities({ ...quantities, [cocktailId]: "" });
    } catch (err) {
      console.error("Error logging consumption:", err);
      alert("Failed to log consumption.");
    }
  };

  const totals = calculateTotals();

  return (
    <div className="cocktail-calculator container mt-4 p-4 bg-light rounded shadow-sm">
      <h1 className="mb-4 text-center">Cocktail Calculator 🍹</h1>

      <div className="mb-3 text-center">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Create New Cocktail
        </button>
      </div>

      <CocktailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateCocktail}
      />

      <h2 className="mt-4">Available Cocktails</h2>
      {loading && <p>Loading cocktails...</p>}
      {!loading && (!Array.isArray(cocktails) || cocktails.length === 0) && (
        <p>No cocktails available.</p>
      )}
      <ul className="list-group">
        {Array.isArray(cocktails) &&
          cocktails.map((c) => (
            <li
              key={c.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>{c.name}</span>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="form-control form-control-sm"
                  style={{ width: "80px" }}
                  value={quantities[c.id] || ""}
                  onChange={(e) =>
                    setQuantities({ ...quantities, [c.id]: e.target.value })
                  }
                />
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleLogConsumption(c.id)}
                >
                  Log
                </button>
              </div>
            </li>
          ))}
      </ul>

      <h2 className="mt-4">Total Ingredients Used</h2>
      {Object.keys(totals).length === 0 && <p>No ingredients used yet.</p>}
      <ul className="list-group">
        {Object.entries(totals).map(([name, qty]) => (
          <li key={name} className="list-group-item">
            {name}: <strong>{qty}</strong>
          </li>
        ))}
      </ul>

      {/* Analytics component */}
      <div className="mt-5">
        <IngredientAnalytics hotelId={hotelId} />
      </div>
    </div>
  );
};
