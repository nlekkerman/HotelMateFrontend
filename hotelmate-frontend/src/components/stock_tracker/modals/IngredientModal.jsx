import { useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export const IngredientModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth(); // get hotel_id
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) return alert("Enter name and unit");
    if (!user?.hotel_id) return alert("Hotel ID not found in user context");

    setLoading(true);
    try {
      const res = await api.post(`/stock_tracker/${user.hotel_slug}/ingredients/`, {
        name: name.trim(),
        unit: unit.trim(),
        hotel_id: user.hotel_id, // <<< crucial
      });
      onSubmit(res.data); // callback to parent
      setName("");
      setUnit("");
      onClose();
    } catch (err) {
      console.error("Error creating ingredient:", err);
      alert("Failed to create ingredient.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show fade d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Ingredient</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Ingredient Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Unit (e.g., L, ml, g)</label>
                <input
                  type="text"
                  className="form-control"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Saving..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
