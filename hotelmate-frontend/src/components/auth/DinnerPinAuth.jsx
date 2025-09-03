import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";
import useHotelLogo from "@/hooks/useHotelLogo"; 

export default function DinnerPinAuth() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);
  const navigate = useNavigate();
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();
  const location = useLocation();
 const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);

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
    <div className="d-flex justify-content-center align-items-center vh-100">
  <form
    onSubmit={handleSubmit}
    className="p-4 border main-bg text-white rounded d-flex justify-content-center flex-column align-items-center"
    style={{ maxWidth: "400px" }}
  >
    {logoLoading && <span>Loading logo...</span>}
    {logoError && <span>Error loading logo</span>}
    {hotelLogo && (
      <img
        src={hotelLogo}
        alt="Hotel Logo"
        className="hotel-logo"
        style={{ maxHeight: 80, objectFit: "contain" }}
      />
    )}
    <div className="mb-4">
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
      <button type="submit" className="btn custom-button w-100">
        Submit
      </button>
    </div>
  </form>
</div>

  );
}
