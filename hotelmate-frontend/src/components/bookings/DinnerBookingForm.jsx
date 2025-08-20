import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDiningTable } from "@/components/restaurants/hooks/useDiningTable";
import { useBlueprintObjects } from "@/components/restaurants/hooks/useBlueprintObjects";
import BlueprintTableSelector from "./BlueprintTableSelector";
import api from "@/services/api";

export default function DinnerBookingForm() {
  const { hotelSlug, restaurantSlug } = useParams();

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

useEffect(() => {
  api.get(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/`)
    .then(res => {
      setBlueprint(res.data.results[0]); // assuming 1 blueprint per restaurant
    })
    .catch(err => console.error(err));
}, [hotelSlug, restaurantSlug]);

  const { objects, error: objectError } = useBlueprintObjects(
    hotelSlug,
    restaurantSlug,
    blueprint?.id
  );

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Debug logs
  useEffect(() => {
    console.log("Tables loaded:", tables);
  }, [tables]);

  useEffect(() => {
    console.log("Objects loaded:", objects);
  }, [objects]);

  useEffect(() => {
    console.log("Selected table changed:", selectedTable);
  }, [selectedTable]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTable) {
      setError("Please select a table");
      return;
    }

    const payload = {
      ...formData,
      table_id: selectedTable.id,
    };

    console.log("Submitting booking payload:", payload);

    try {
      await api.post("/dinner-bookings", payload);
      setSubmitted(true);
    } catch (err) {
      console.error("Booking submission failed:", err);
      setError(err.response?.data?.message || "Error submitting booking");
    }
  };

  if (submitted)
    return <div className="alert alert-success">Booking submitted!</div>;

  return (
    <div className="container mt-5">
      <h2>Dinner Booking</h2>
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

        {/* Time */}
        <div className="mb-3">
          <label>Time</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="form-control"
          />
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

          <BlueprintTableSelector
            tables={tables}
            objects={
              Array.isArray(objects?.results) ? objects.results : objects
            } // unwrap safely
            selectedTableId={selectedTable?.id}
            onSelectTable={setSelectedTable}
          />

          {/* Debug info */}
          <div style={{ marginTop: 10 }}>
            <pre style={{ background: "#f8f9fa", padding: "10px" }}>
              {JSON.stringify(
                {
                  selectedTable,
                  objectsCount: objects?.length,
                  tablesCount: tables?.length,
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Show selection */}
          {selectedTable && (
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
