import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";

export default function DinnerPinAuth() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);
  const navigate = useNavigate();
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(
        `/room_services/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/validate-dinner-pin/`,
        { pin }
      );

      if (response.data.valid) {
        sessionStorage.setItem(`pin_ok_${roomNumber}`, "true");
        setValidated(true); // ✅ Update state to hide form

        const target =
          location.state?.next ||
          `/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/`;

        navigate("/", { replace: true }); // Temporary route
        setTimeout(() => navigate(target), 0); // Navigate to final target
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Error validating PIN. Please try again later.");
    }
  };

  // ✅ Don't render form if validated
  if (validated) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto p-4 border rounded vh-100 m-3 d-flex justify-content-center flex-column"
      style={{ maxWidth: "400px" }}
    >
      <h2 className="mb-4">Enter PIN for Room {roomNumber}</h2>
      <div className="mb-3">
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className={`form-control ${error ? "is-invalid" : ""}`}
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
