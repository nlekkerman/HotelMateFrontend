import React, { useState, useEffect } from "react";
import api from "@/services/api"; // Axios instance
import { useAuth } from "@/context/AuthContext";
export const CocktailModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [cocktailName, setCocktailName] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState({
    ingredientId: "",
    quantity: "",
    unit: "",
  });
  const [availableIngredients, setAvailableIngredients] = useState([]);

 useEffect(() => {
  const fetchIngredients = async () => {
    try {
      const res = await api.get("/stock_tracker/ingredients/");
      setAvailableIngredients(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    }
  };
  fetchIngredients();
}, []);


  if (!isOpen) return null;

  const addIngredient = () => {
    const { ingredientId, quantity, unit } = currentIngredient;
    if (!ingredientId || !quantity || !unit) return;
    const ingredient = availableIngredients.find((i) => i.id === parseInt(ingredientId));
    setIngredients([...ingredients, { ...ingredient, quantity, unit }]);
    setCurrentIngredient({ ingredientId: "", quantity: "", unit: "" });
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

const handleSubmit = async () => {
  if (!cocktailName || ingredients.length === 0) {
    alert("Please enter a name and at least one ingredient.");
    return;
  }
  const payload = {
    name: cocktailName,
    hotel_id: user.hotel_id,
    ingredients: ingredients.map((ing) => ({
      ingredient_id: ing.id,
      quantity_per_cocktail: ing.quantity,
    })),
  };

  try {
    console.log("Submitting cocktail:", payload);
    const result = await onSubmit(payload);
    console.log("API returned:", result);
    setCocktailName("");
    setIngredients([]);
    onClose();
  } catch (err) {
    console.error("Error in handleSubmit:", err);
    alert("Failed to create cocktail. Check console logs.");
  }
};



  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">Create Cocktail 🍹</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Cocktail Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter cocktail name"
                value={cocktailName}
                onChange={(e) => setCocktailName(e.target.value)}
              />
            </div>

            <h6>Ingredients</h6>
            {ingredients.length > 0 && (
              <ul className="list-group mb-3">
                {ingredients.map((ing, idx) => (
                  <li
                    key={idx}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    {ing.name} - {ing.quantity} {ing.unit}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => removeIngredient(idx)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="row g-2 align-items-end mb-3">
              <div className="col">
                <label className="form-label">Ingredient</label>
                <select
                  className="form-select"
                  value={currentIngredient.ingredientId}
                  onChange={(e) =>
                    setCurrentIngredient({ ...currentIngredient, ingredientId: e.target.value })
                  }
                >
                  <option value="">Select ingredient</option>
                  {availableIngredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={currentIngredient.quantity}
                  onChange={(e) =>
                    setCurrentIngredient({ ...currentIngredient, quantity: e.target.value })
                  }
                  placeholder="Qty"
                />
              </div>
              <div className="col">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-control"
                  value={currentIngredient.unit}
                  onChange={(e) =>
                    setCurrentIngredient({ ...currentIngredient, unit: e.target.value })
                  }
                  placeholder="Unit"
                />
              </div>
              <div className="col-auto">
                <button className="btn btn-success w-100" type="button" onClick={addIngredient}>
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Save Cocktail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CocktailModal;
