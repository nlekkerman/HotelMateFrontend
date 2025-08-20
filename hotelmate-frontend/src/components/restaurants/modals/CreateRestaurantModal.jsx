import React, { useState } from "react";
import slugify from "slugify";

const CreateRestaurantModal = ({ show, toggle, onCreated, api }) => {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const hotelId = user?.hotel?.id || user?.hotel_id;
      if (!hotelId) throw new Error("Hotel ID not found");

      const res = await api.post(`/bookings/restaurants/`, {
        name,
        slug: slugify(name, { lower: true }),
        hotel: hotelId,
        capacity,
        description,
      });

      onCreated(res.data);
      toggle();
      setName("");
      setCapacity(30);
      setDescription("");
    } catch (err) {
      alert("Error creating restaurant");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-50" onClick={toggle}></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-lg w-full max-w-md z-50">
        <form onSubmit={handleSubmit}>
          <div className="modal-header p-4 border-b flex justify-between items-center">
            <h5 className="modal-title">Create Restaurant</h5>
            <button type="button" className="btn-close" onClick={toggle}></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Capacity</label>
              <input
                type="number"
                className="form-control"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer p-4 border-t flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={toggle}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateRestaurantModal;
