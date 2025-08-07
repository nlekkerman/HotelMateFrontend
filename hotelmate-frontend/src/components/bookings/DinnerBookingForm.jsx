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
    voucher_code: "",
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

    setFormData((prev) => ({
      ...prev,
      [name]: ["adults", "children", "infants"].includes(name)
        ? value === ""
          ? ""
          : Math.max(0, parseInt(value, 10) || 0)
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const d = formData.date;
      const formattedDate = d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(d.getDate()).padStart(2, "0")}`
        : "";

      const totalSeats =
        Number(formData.adults) +
        Number(formData.children) +
        Number(formData.infants);

      const payload = {
        date: formattedDate,
        time: formData.time,
        note: formData.note,
        voucher_code: formData.voucher_code || null,
        seats: {
          adults: Number(formData.adults),
          children: Number(formData.children),
          infants: Number(formData.infants),
          total: totalSeats,
        },
      };

      await api.post(
        `bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/`,
        payload
      );

      setSubmitted(true);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to submit booking. Please try again.";
      setError(msg);
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

  const totalSeats =
    Number(formData.adults) +
    Number(formData.children) +
    Number(formData.infants);

  return (
    <div className="container mt-5">
      <div className="card shadow p-4">
        <h2 className="h4 mb-4 text-center">
          Dinner Booking – Room {roomNumber}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Date</label>
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
            <label className="form-label">Time</label>
            <select
              name="time"
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
            <label className="form-label">Note</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="form-control"
              rows={2}
              placeholder="Any special requests?"
            />
          </div>
<div className="mb-3">
  <label className="form-label">Voucher Code</label>
  <input
    type="text"
    name="voucher_code"
    value={formData.voucher_code}
    onChange={handleChange}
    className="form-control"
    placeholder="Enter voucher code (if any)"
  />
</div>

          <div className="row mb-3">
            {["adults", "children", "infants"].map((field) => (
              <div className="col" key={field}>
                <label className="form-label">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="number"
                  name={field}
                  value={formData[field]}
                  onChange={handleChange}
                  className="form-control"
                  min={0}
                />
              </div>
            ))}
            <div className="col">
              <label className="form-label">Total Seats</label>
              <input
                type="number"
                value={totalSeats}
                className="form-control"
                readOnly
                disabled
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
