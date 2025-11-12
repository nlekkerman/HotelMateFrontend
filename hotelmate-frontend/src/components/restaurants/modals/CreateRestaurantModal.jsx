import React, { useState } from "react";

const CreateRestaurantModal = ({ show, toggle, onCreated, api, hotelSlug: propHotelSlug }) => {
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
      // Use prop hotelSlug first, fallback to localStorage
      let hotelSlug = propHotelSlug;
      if (!hotelSlug) {
        const user = JSON.parse(localStorage.getItem("user"));
        hotelSlug = user?.hotel_slug;
      }
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
      {/* Backdrop - full screen overlay */}
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
        style={{ 
          opacity: 0.7, 
          zIndex: 1055,
          backdropFilter: 'blur(3px)'
        }} 
        onClick={toggle}
      ></div>
      
      {/* Modal centered on screen */}
      <div 
        className="position-fixed top-50 start-50 translate-middle bg-white rounded shadow-lg"
        style={{ 
          zIndex: 1056,
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-header p-4 border-bottom d-flex justify-content-between align-items-center sticky-top bg-white" style={{ zIndex: 1 }}>
            <h5 className="modal-title fw-bold mb-0">
              <i className="bi bi-shop me-2 text-primary"></i>
              Create New Restaurant
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={toggle}
              aria-label="Close"
            ></button>
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
          <div className="modal-footer p-4 border-top d-flex justify-content-end gap-2 sticky-bottom bg-white" style={{ zIndex: 1 }}>
            <button 
              type="button" 
              className="btn btn-secondary px-4" 
              onClick={toggle}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary px-4" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Create Restaurant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateRestaurantModal;
