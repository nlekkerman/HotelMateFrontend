import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";

export default function PinAuth() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { roomNumber } = useParams();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(`/room_services/${roomNumber}/validate-pin/`, {
        pin,
      });

      if (response.data.valid) {
        sessionStorage.setItem(`pin_ok_${roomNumber}`, "true");
        navigate(location.state?.next || `/room/${roomNumber}/menu`);
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError("Invalid PIN. Please try again.");
      } else {
        setError("There was an error validating the PIN. Please try again later.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto p-4 border rounded vh-100 m-3 d-flex justify-content-center flex-column" style={{ maxWidth: '400px' }}>
      <h2 className="mb-4">Enter PIN for Room {roomNumber}</h2>

      <div className="mb-3">
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          required
          autoFocus
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>

      <button type="submit" className="btn btn-primary w-100">
        Submit
      </button>
    </form>
  );
}
