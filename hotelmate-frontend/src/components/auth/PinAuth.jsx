import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";

export default function PinAuth() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { hotelIdentifier, roomNumber } = useParams();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(
        `/room_services/${hotelIdentifier}/room/${roomNumber}/validate-pin/`,
        { pin }
      );

      if (response.data.valid) {
        sessionStorage.setItem(`pin_ok_${roomNumber}`, "true");
        navigate(
          location.state?.next || `/${hotelIdentifier}/room/${roomNumber}/menu`
        );
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError("Invalid PIN. Please try again.");
      } else {
        setError(
          "There was an error validating the PIN. Please try again later."
        );
      }
    }
  };

  return (
    <div className="pin-auth-container">
      <form onSubmit={handleSubmit} className="pin-auth-form">
        <h2 className="pin-auth-title">Enter PIN for Room {roomNumber}</h2>

        <div className="pin-auth-input-group">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className={`pin-auth-input ${error ? "pin-auth-input-error" : ""}`}
            required
            autoFocus
          />
          {error && <div className="pin-auth-error-message">{error}</div>}
        </div>

        <button type="submit" className="pin-auth-submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
}
