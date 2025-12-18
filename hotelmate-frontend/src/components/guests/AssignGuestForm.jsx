import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "@/services/api";
import { addDays } from "date-fns";

function AssignGuestForm() {
  const { roomNumber } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [hotelSlug, setHotelSlug] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    id_pin: "",
    check_in_date: null,
    check_out_date: null,
    days_booked: 1,
    hotel_name: "",
    room_number: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        const hotelSlug = userData?.hotel_slug;
        const res = await api.get(`/staff/hotel/${hotelSlug}/rooms/${roomNumber}/`);
        const roomData = res.data;

        setRoom(roomData);
        setHotelSlug(roomData.hotel_slug);

        setFormData((prev) => ({
          ...prev,
          id_pin: "",
          hotel_name: roomData.hotel_name || roomData.hotel_slug,
          room_number: roomData.room_number,
        }));
      } catch (err) {
        console.error("Failed to fetch room details:", err);
        setErrors({ fetch: "Failed to load room data." });
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomNumber]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (field, date) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: date };

      // auto-update check_out_date if check_in_date changes
      if (field === "check_in_date" && date) {
        updated.check_out_date = addDays(date, updated.days_booked || 1);
      }

      // update days_booked if check_out_date changes
      if (field === "check_out_date" && updated.check_in_date && date) {
        const diffTime = date.getTime() - updated.check_in_date.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        updated.days_booked = diffDays > 0 ? diffDays : 1;
      }

      return updated;
    });
  };

  const formatDate = (date) => {
    if (!date) return null;
    return date.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const names = formData.full_name.trim().split(" ");
    const first_name = names.shift() || "";
    const last_name = names.join(" ") || "";

    if (!first_name || !last_name) {
      setErrors({ full_name: "Please enter both first and last name" });
      return;
    }

    if (!formData.check_in_date || !formData.check_out_date) {
      setErrors({ date: "Please select both check-in and check-out dates" });
      return;
    }

    const payload = {
      first_name,
      last_name,
      id_pin: formData.id_pin,
      check_in_date: formatDate(formData.check_in_date),
      check_out_date: formatDate(formData.check_out_date),
      days_booked: formData.days_booked,
      room_number: formData.room_number,
      hotel_slug: hotelSlug,
    };

    try {
      await api.post(
        `/rooms/${hotelSlug}/rooms/${roomNumber}/add-guest/`,
        payload
      );
      navigate("/rooms/");
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        console.error("Submission error:", error);
        setErrors({ submit: "Failed to assign guest." });
      }
    }
  };

  if (loading) return <p>Loading room data...</p>;
  if (!room) return <p>{errors.fetch || "Room not found."}</p>;

  return (
    <div className="container py-5">
      <h2>Assign Guest</h2>
      <form onSubmit={handleSubmit} noValidate>
        {/* Hotel Name */}
        <div className="mb-3">
          <label className="form-label">Hotel</label>
          <input
            type="text"
            className="form-control"
            value={formData.hotel_name}
            disabled
          />
        </div>

        {/* Room Number */}
        <div className="mb-3">
          <label className="form-label">Room Number</label>
          <input
            type="text"
            className="form-control"
            value={formData.room_number}
            disabled
          />
        </div>

        {/* Full Name */}
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="full_name"
            className={`form-control ${errors.full_name ? "is-invalid" : ""}`}
            value={formData.full_name}
            onChange={handleChange}
          />

          {errors.full_name && (
            <div className="invalid-feedback">{errors.full_name}</div>
          )}
        </div>

        {/* Check-in / Check-out Dates */}
        <div className="mb-3">
          <label className="form-label">Check-in Date</label>
          <DatePicker
            selected={formData.check_in_date}
            onChange={(date) => handleDateChange("check_in_date", date)}
            className="form-control"
            dateFormat="yyyy-MM-dd"
            minDate={new Date()}
            placeholderText="Select check-in date"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Check-out Date</label>
          <DatePicker
            selected={formData.check_out_date}
            onChange={(date) => handleDateChange("check_out_date", date)}
            className="form-control"
            dateFormat="yyyy-MM-dd"
            minDate={
              formData.check_in_date
                ? addDays(formData.check_in_date, 1)
                : new Date()
            }
            placeholderText="Select check-out date"
          />
        </div>

        {errors.date && <div className="text-danger mb-3">{errors.date}</div>}

        {/* Days Booked */}
        <div className="mb-3">
          <label className="form-label">Days Booked</label>
          <input
            type="number"
            className="form-control"
            value={formData.days_booked}
            readOnly
          />
        </div>

        {/* Guest ID PIN */}
        <div className="mb-3">
          <label className="form-label">Guest ID PIN</label>
          <input
            type="text"
            className="form-control"
            value={formData.id_pin}
            disabled
          />
        </div>

        {errors.submit && (
          <div className="text-danger mb-3">{errors.submit}</div>
        )}

        <div className="d-flex justify-content-center">
          <button type="submit" className="btn custom-button">
            Assign Guest
          </button>
          <button
            type="button"
            className="btn btn-danger ms-2"
            onClick={() => navigate("/rooms/rooms")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AssignGuestForm;
