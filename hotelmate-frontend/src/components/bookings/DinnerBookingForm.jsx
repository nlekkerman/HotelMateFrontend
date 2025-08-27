import React, { useState } from "react";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "@/services/api";
import HotelLogo from "@/components/layout/HotelLogo";
import SuccessModal from "@/components/modals/SuccessModal";

export default function DinnerBookingForm() {
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();

  const [formData, setFormData] = useState({
    date: null,
    start_time: "",
    end_time: "",
    note: "",
    adults: 1,
    children: 0,
    infants: 0,
    voucher_code: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Generate time slots from 17:30 to 21:15 every 15 mins
  const generateTimeSlots = () => {
    const slots = [];
    let hour = 17;
    let minute = 30;

    while (hour < 21 || (hour === 21 && minute <= 15)) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      minute += 15;
      if (minute >= 60) {
        minute = 0;
        hour += 1;
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "start_time") {
      setFormData((prev) => ({
        ...prev,
        start_time: value,
        end_time: addMinutes(value, 90), // auto-set 1.5h later
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, date }));
  };

  const addMinutes = (timeStr, minutesToAdd) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes + minutesToAdd);
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { date, start_time, adults, children, infants, note, voucher_code } =
      formData;

    if (!date) {
      setError("Please select a date.");
      return;
    }
    if (!start_time) {
      setError("Please select a start time.");
      return;
    }

    const formatDateLocal = (date) => {
      const adjustedDate = new Date(date);
      const year = adjustedDate.getFullYear();
      const month = String(adjustedDate.getMonth() + 1).padStart(2, "0");
      const day = String(adjustedDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const payload = {
      date: formatDateLocal(formData.date),
      start_time: formData.start_time,
      end_time: formData.end_time || null,
      note: note || "",
      voucher_code: voucher_code || "",
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
      assigned_tables: [], // always empty, no table selection
    };

    try {
      await api.post(
        `/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/`,
        payload
      );
      setSubmitted(true);
    } catch (err) {
      console.error("Booking submission failed:", err.response?.data || err);
      setError(err.response?.data?.detail || "Error submitting booking");
    }
  };

  const resetForm = () => {
    setFormData({
      date: null,
      start_time: "",
      end_time: "",
      note: "",
      adults: 1,
      children: 0,
      infants: 0,
      voucher_code: "",
    });
  };

  return (
    <div className="container mt-5">
      <div className="text-center mb-4">
        <HotelLogo style={{ maxHeight: 80 }} />
      </div>
      <div className="title-container">
        <h2>Dinner Booking</h2>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Date */}
        <div className="mb-3">
          <label>Date</label>
          <DatePicker
            selected={formData.date}
            onChange={handleDateChange}
            className="form-control"
            dateFormat="yyyy-MM-dd"
          />
        </div>

        {/* Start Time */}
        <div className="mb-3">
          <label>Start Time</label>
          <select
            name="start_time"
            value={formData.start_time}
            onChange={handleChange}
            className="form-control"
          >
            <option value="">Select a time</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        {/* End Time (auto) */}
        <div className="mb-3">
          <label>End Time</label>
          <input
            type="text"
            name="end_time"
            value={formData.end_time || ""}
            readOnly
            className="form-control"
          />
          <small className="form-text text-muted">
            Auto-calculated as 90 minutes after start time
          </small>
        </div>

        {/* Guests */}
        <div className="mb-3">
          <label>Adults</label>
          <input
            type="number"
            name="adults"
            min={1}
            value={formData.adults}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="mb-3">
          <label>Children</label>
          <input
            type="number"
            name="children"
            min={0}
            value={formData.children}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="mb-3">
          <label>Infants</label>
          <input
            type="number"
            name="infants"
            min={0}
            value={formData.infants}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        {/* Note */}
        <div className="mb-3">
          <label>Note</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        {/* Voucher */}
        <div className="mb-3">
          <label>Voucher Code</label>
          <input
            type="text"
            name="voucher_code"
            value={formData.voucher_code}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        {/* Success modal */}
        <SuccessModal
          show={submitted}
          message="Booking submitted successfully!"
          onClose={() => {
            setSubmitted(false);
            resetForm();
          }}
        />

        {/* Submit */}
        <button type="submit" className="btn btn-primary mt-3">
          Submit Booking
        </button>
      </form>
    </div>
  );
}
