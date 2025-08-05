import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

const GuestEdit = () => {
  const { hotelIdentifier, guestId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    room: "",
    days_booked: "",
    check_in_date: "",
    check_out_date: "",
    id_pin: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchGuest() {
      try {
        const res = await api.get(
          `/guests/${hotelIdentifier}/guests/${guestId}/`
        );
        setFormData(res.data);
      } catch {
        setError("Failed to load guest data.");
      } finally {
        setLoading(false);
      }
    }
    fetchGuest();
  }, [guestId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/guests/${hotelIdentifier}/guests/${guestId}/`, formData);
      navigate(`/${hotelIdentifier}/guests`);
    } catch {
      setError("Failed to update guest.");
    }
  };

  if (loading) return <div className="loading">
      <div className="text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading Hotel info</p>
      </div>
    </div>;;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="container py-4">
      <h3>Edit Guest</h3>
      <form onSubmit={handleSubmit}>
        {[
          ["First Name", "first_name"],
          ["Last Name", "last_name"],
    
          ["Days Booked", "days_booked"],
          ["Check-In Date", "check_in_date"],
          ["Check-Out Date", "check_out_date"],
          ["ID PIN", "id_pin"],
        ].map(([label, name]) => (
          <div className="mb-3" key={name}>
            <label className="form-label">{label}</label>
            <input
              type={
                name.includes("date")
                  ? "date"
                  : name === "days_booked"
                  ? "number"
                  : "text"
              }
              className="form-control"
              name={name}
              value={formData[name] || ""}
              onChange={handleChange}
            />
          </div>
        ))}

        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default GuestEdit;
