import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useCan } from "@/rbac";

const GuestEdit = () => {
  const { hotelIdentifier, guestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Backend-driven RBAC. Guests has no nav slug \u2014 visibility comes from
  // `user.rbac.guests.visible`, detail read from `user.rbac.guests.read`,
  // and edit from `user.rbac.guests.actions.update`. Fail-closed.
  const { can } = useCan();
  const canGuestsVisible = user?.rbac?.guests?.visible === true;
  const canGuestsRead = user?.rbac?.guests?.read === true;
  const canGuestsUpdate = can("guests", "update");

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
    if (!canGuestsRead) {
      setLoading(false);
      return;
    }
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
  }, [guestId, hotelIdentifier, canGuestsRead]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canGuestsUpdate) return;
    try {
      await api.put(`/guests/${hotelIdentifier}/guests/${guestId}/`, formData);
      navigate(`/${hotelIdentifier}/guests`);
    } catch {
      setError("Failed to update guest.");
    }
  };

  if (!canGuestsVisible) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning text-center" role="alert">
          You do not have permission to view guests.
        </div>
      </div>
    );
  }

  if (!canGuestsRead) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning text-center" role="alert">
          You do not have permission to read guest details.
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="loading">
        <div className="text-center">
          <div className="spinner-border text-dark mb-3" role="status" />
          <p>Loading Hotel info</p>
        </div>
      </div>
    );
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
              disabled={!canGuestsUpdate}
            />
          </div>
        ))}
        <div className="buttons-container">
          <button type="submit" className="btn custom-button" disabled={!canGuestsUpdate}>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuestEdit;
