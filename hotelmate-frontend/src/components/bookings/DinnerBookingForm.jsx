import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDiningTable } from "@/components/restaurants/hooks/useDiningTable";
import { useBlueprintObjects } from "@/components/restaurants/hooks/useBlueprintObjects";
import BlueprintTableSelector from "./BlueprintTableSelector";
import api from "@/services/api";
import HotelLogo from "@/components/layout/HotelLogo";
import SuccessModal from "@/components/modals/SuccessModal";

export default function DinnerBookingForm() {
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();
  const [availableTables, setAvailableTables] = useState([]);

  const [formData, setFormData] = useState({
    date: null,
    time: "",
    note: "",
    adults: 1,
    children: 0,
    infants: 0,
    voucher_code: "",
  });

  // --- Dining Tables ---
  const {
    tables,
    loading,
    error: tableError,
  } = useDiningTable(hotelSlug, restaurantSlug);
  const [selectedTable, setSelectedTable] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [availableTableIds, setAvailableTableIds] = useState([]);
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
const totalGuests = Number(formData.adults) + Number(formData.children) + Number(formData.infants);

  const timeSlots = generateTimeSlots();

  // Fetch availability when date/time changes
  useEffect(() => {
    if (formData.date && formData.start_time) {
      const dateStr = formData.date.toISOString().split("T")[0];
      const startStr = formData.start_time;

      api
        .get(`/bookings/available-tables/${hotelSlug}/${restaurantSlug}/`, {
          params: { date: dateStr, start_time: startStr, duration_hours: 2 },
        })
        .then((res) => {
          setAvailableTableIds(res.data.map((t) => t.id));
        })
        .catch(console.error);
    }
  }, [formData.date, formData.start_time, hotelSlug, restaurantSlug]);

  useEffect(() => {
    api
      .get(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/`)
      .then((res) => {
        setBlueprint(res.data.results[0]); // assuming 1 blueprint per restaurant
      })
      .catch((err) => console.error(err));
  }, [hotelSlug, restaurantSlug]);
// After fetching tables
useEffect(() => {
  if (tables) {
    setAvailableTables(tables); // load all tables initially
  }
}, [tables]);

  const { objects, error: objectError } = useBlueprintObjects(
    hotelSlug,
    restaurantSlug,
    blueprint?.id
  );

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
  // timeStr in format "HH:mm"
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
  setError(""); // reset error
const { date, start_time, adults, children, infants, note, voucher_code } = formData;

  // Check required fields
  if (!date) {
    setError("Please select a date.");
    return;
  }

  if (!start_time) {
    setError("Please select a start time.");
    return;
  }
  const totalGuests =
    Number(adults) +
    Number(children) +
    Number(infants);

  // Only require table selection if totalGuests <= 6
  if (totalGuests <= 6 && (!selectedTable || !selectedTable.id)) {
    setError("Please select a table");
    return;
  }
  

// Utility function to get YYYY-MM-DD in local time
const formatDateLocal = (date) => {
  const adjustedDate = new Date(date);
  adjustedDate.setDate(adjustedDate.getDate());
  const year = adjustedDate.getFullYear();
  const month = String(adjustedDate.getMonth() + 1).padStart(2, "0");
  const day = String(adjustedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

  if (!formData.date || !formData.start_time) {
    setError("Please select both date and time");
    return;
  }

  // Build payload for serializer
  const payload = {
    date: formatDateLocal(formData.date),
    start_time: formData.start_time,
    end_time: formData.end_time || null,
    note: formData.note || "",
    voucher_code: formData.voucher_code || "",
    adults: Number(formData.adults) || 1,
    children: Number(formData.children) || 0,
    infants: Number(formData.infants) || 0,
    assigned_tables: totalGuests <= 6 ? [selectedTable.id] : [], // empty array if >6
  };

  console.log("Submitting booking payload:", payload);

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
  setSelectedTable(null);          // reset table selection
  setAvailableTableIds([]);        // optionally reset available table IDs
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

        {/* End Time (optional) */}
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

        {/* Blueprint */}
        <div>
          {loading && <div>Loading tables...</div>}
          {tableError && (
            <div className="alert alert-danger">{tableError.message}</div>
          )}
          {objectError && (
            <div className="alert alert-warning">{objectError.message}</div>
          )}

{totalGuests <= 6 ? (
  <BlueprintTableSelector
    tables={availableTables} 
    availableTableIds={availableTableIds} 
    objects={Array.isArray(objects?.results) ? objects.results : objects}
    selectedTableId={selectedTable?.id}
    onSelectTable={setSelectedTable}
    totalGuests={totalGuests}
  />
) : (
  <div className="alert alert-info">
    Total guests exceed 6. Management will combine tables and allocate seating.
  </div>

  
)}

<SuccessModal
  show={submitted}
  message="Booking submitted successfully!"
  onClose={() => {
    setSubmitted(false);
    resetForm();
  }}
/>


{totalGuests <= 6 && selectedTable && (
  <div style={{ marginTop: 10 }}>
    Selected Table: <strong>{selectedTable.code}</strong>
  </div>
)}

       
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary mt-3">
          Submit Booking
        </button>
      </form>
    </div>
  );
}
