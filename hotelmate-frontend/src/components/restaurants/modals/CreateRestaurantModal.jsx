import React, { useState } from "react";

const CreateRestaurantModal = ({ show, toggle, onCreated, api }) => {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [description, setDescription] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [maxBookingsPerHour, setMaxBookingsPerHour] = useState(8);
  const [maxGroupSize, setMaxGroupSize] = useState(12);
  const [takingBookings, setTakingBookings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const hotelSlug = user?.hotel_slug;
      if (!hotelSlug) throw new Error("Hotel slug not found");

      // Build request body - only include fields that are provided
      const requestData = {
        name,
        capacity,
        description: description || undefined,
        max_bookings_per_hour: maxBookingsPerHour,
        max_group_size: maxGroupSize,
        taking_bookings: takingBookings,
      };

      // Add time fields only if provided, ensuring HH:MM:SS format
      if (openingTime) {
        requestData.opening_time = openingTime.includes(":") && openingTime.split(":").length === 3 
          ? openingTime 
          : `${openingTime}:00`;
      }
      if (closingTime) {
        requestData.closing_time = closingTime.includes(":") && closingTime.split(":").length === 3
          ? closingTime
          : `${closingTime}:00`;
      }

      const res = await api.post(`/bookings/${hotelSlug}/restaurants/`, requestData);

      onCreated(res.data);
      toggle();
      // Reset form
      setName("");
      setCapacity(30);
      setDescription("");
      setOpeningTime("");
      setClosingTime("");
      setMaxBookingsPerHour(8);
      setMaxGroupSize(12);
      setTakingBookings(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Error creating restaurant";
      setError(errorMessage);
      console.error("Restaurant creation error:", err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-50" onClick={toggle}></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-lg w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="modal-header p-4 border-b flex justify-between items-center sticky top-0 bg-white">
            <h5 className="modal-title">Create Restaurant</h5>
            <button type="button" className="btn-close" onClick={toggle}></button>
          </div>
          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger mb-3">
                {error}
              </div>
            )}
            
            {/* Basic Information */}
            <h6 className="mb-3 fw-bold">Basic Information</h6>
            <div className="row">
              <div className="col-md-8 mb-3">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., The Garden Restaurant"
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  className="form-control"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                placeholder="Brief description of the restaurant"
              />
            </div>

            {/* Operating Hours */}
            <h6 className="mb-3 mt-4 fw-bold">Operating Hours</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Opening Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  placeholder="HH:MM"
                />
                <small className="text-muted">Format: HH:MM (24-hour)</small>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Closing Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  placeholder="HH:MM"
                />
                <small className="text-muted">Format: HH:MM (24-hour)</small>
              </div>
            </div>

            {/* Booking Configuration */}
            <h6 className="mb-3 mt-4 fw-bold">Booking Configuration</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Max Bookings Per Hour</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxBookingsPerHour}
                  onChange={(e) => setMaxBookingsPerHour(Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Max Group Size</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="takingBookings"
                  checked={takingBookings}
                  onChange={(e) => setTakingBookings(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="takingBookings">
                  Currently accepting bookings
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
            <button type="button" className="btn btn-secondary" onClick={toggle}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Restaurant"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateRestaurantModal;
