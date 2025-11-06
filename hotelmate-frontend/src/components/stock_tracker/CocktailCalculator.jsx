import { useState, useEffect } from "react";
import { useCocktailCalculator } from "@/components/stock_tracker/hooks/useCocktailCalculator";
import { CocktailModal } from "@/components/stock_tracker/modals/CocktailModal";
import { IngredientModal } from "@/components/stock_tracker/modals/IngredientModal";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export const CocktailCalculator = () => {
  const { user } = useAuth();
  const { cocktails, consumptions, loading, setConsumptions, fetchCocktails } = useCocktailCalculator();

  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [quantities, setQuantities] = useState({});

  // Fetch cocktails when component mounts or hotel_slug changes
  useEffect(() => {
    if (user?.hotel_slug) {
      fetchCocktails(user.hotel_slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hotel_slug]);

  // Create cocktail API call
  const handleCreateCocktail = async (payload) => {
    try {
      console.log("Creating cocktail with payload:", payload);
      const res = await api.post(`/stock_tracker/${user.hotel_slug}/cocktails/`, payload);
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
        payloads.map((payload) => api.post(`/stock_tracker/${user.hotel_slug}/consumptions/`, payload))
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
    <div className="cocktail-calculator container mt-4 p-4 main-bg text-white rounded shadow-sm">
      <h1 className="mb-4 text-center">Cocktail Calculator 🍹</h1>

      {/* Buttons */}
      <div className="mb-3 text-center d-flex justify-content-center gap-2">
        <button className="btn custom-button" onClick={() => setModalOpen(true)}>
          + Create New Cocktail
        </button>
        <button className="btn custom-button" onClick={() => setIngredientModalOpen(true)}>
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
      <h2 className="mt-5 mb-3 text-center">
        <i className="bi bi-cup-straw me-2"></i>Available Cocktails
      </h2>
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      {!loading && (!Array.isArray(cocktails) || cocktails.length === 0) && (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>No cocktails available. Create your first cocktail!
        </div>
      )}
      <div className="row g-3">
        {Array.isArray(cocktails) && cocktails.map((c) => (
          <div key={c.id} className="col-12 col-md-6 col-lg-4">
            <div className="card bg-dark text-white h-100 shadow-sm border-secondary">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-cup-straw text-primary me-2"></i>
                    {c.name}
                  </h5>
                </div>
                
                {c.ingredients && c.ingredients.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-white-50 small mb-2">
                      <i className="bi bi-list-ul me-1"></i>Ingredients:
                    </h6>
                    <ul className="list-unstyled mb-0">
                      {c.ingredients.map((ing, idx) => (
                        <li key={idx} className="small mb-1 d-flex justify-content-between">
                          <span className="text-white">
                            <i className="bi bi-dot"></i>
                            {ing.ingredient?.name || 'Unknown'}
                          </span>
                          <span className="badge bg-info text-dark fw-bold">
                            {ing.quantity_per_cocktail} {ing.ingredient?.unit || ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-primary text-white border-primary fw-bold">
                    Sold
                  </span>
                  <input
                    type="text"
                    placeholder="0 qty"
                    className="form-control bg-light text-dark border-primary fw-bold"
                    value={quantities[c.id] || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === "" || /^\d+$/.test(value)) {
                        setQuantities({ ...quantities, [c.id]: value });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Log All Button */}
      <div className="d-flex justify-content-center mt-4 mb-4">
        <button className="btn btn-primary btn-lg px-5 shadow" onClick={handleLogAllConsumption}>
          <i className="bi bi-calculator me-2"></i>Calculate Total Usage
        </button>
      </div>

      {/* Totals */}
      {Object.keys(totals).length > 0 && (
        <div className="card bg-dark text-white border-primary shadow-lg mt-4">
          <div className="card-header bg-primary">
            <h3 className="mb-0">
              <i className="bi bi-clipboard-data me-2"></i>Total Ingredients Used
            </h3>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {Object.entries(totals).map(([name, qty]) => (
                <div key={name} className="col-12 col-md-6 col-lg-4">
                  <div className="d-flex justify-content-between align-items-center p-3 bg-secondary rounded">
                    <span className="text-light">
                      <i className="bi bi-droplet me-2"></i>{name}
                    </span>
                    <span className="badge bg-primary fs-6">{qty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
