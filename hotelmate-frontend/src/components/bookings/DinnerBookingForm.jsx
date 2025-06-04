import React, { useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DinnerBookingForm = () => {
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();

  const [formData, setFormData] = useState({
    date: null,
    time: "",
    note: "",
    adults: 1,
    children: 0,
    infants: 0,
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const timeSlots = [
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post(
        `bookings/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/`,
        {
          date: formData.date?.toISOString().split("T")[0],
          time: formData.time,
          note: formData.note,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
        }
      );

      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit booking. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="container mt-5">
        <div className="alert alert-success text-center">
          🎉 Booking submitted successfully!
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="card shadow p-4">
        <h2 className="h4 mb-4 text-center">
          Dinner Booking – Room {roomNumber}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="date" className="form-label">
              Date
            </label>
            <DatePicker
              selected={formData.date}
              onChange={(date) => setFormData((prev) => ({ ...prev, date }))}
              dateFormat="yyyy-MM-dd"
              minDate={new Date()}
              className="form-control"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="time" className="form-label">
              Time
            </label>
            <select
              name="time"
              id="time"
              value={formData.time}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select time</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="note" className="form-label">
              Note
            </label>
            <textarea
              name="note"
              id="note"
              placeholder="Any special requests?"
              value={formData.note}
              onChange={handleChange}
              className="form-control"
              rows={2}
            />
          </div>

          <div className="row mb-3">
            <div className="col">
              <label htmlFor="adults" className="form-label">
                Adults
              </label>
              <input
                type="number"
                id="adults"
                name="adults"
                min={0}
                value={formData.adults}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col">
              <label htmlFor="children" className="form-label">
                Children
              </label>
              <input
                type="number"
                id="children"
                name="children"
                min={0}
                value={formData.children}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col">
              <label htmlFor="infants" className="form-label">
                Infants
              </label>
              <input
                type="number"
                id="infants"
                name="infants"
                min={0}
                value={formData.infants}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="text-center">
            <button type="submit" className="btn btn-dark w-100">
              Book Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DinnerBookingForm;
