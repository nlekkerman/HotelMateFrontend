import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";
import useHotelLogo from "@/hooks/useHotelLogo";
import { requestFCMPermission } from "@/utils/fcm";

export default function PinAuth() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { hotelIdentifier, roomNumber } = useParams();
  const location = useLocation();

  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelIdentifier);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(
        `/room_services/${hotelIdentifier}/room/${roomNumber}/validate-pin/`,
        { pin }
      );

      if (response.data.valid) {
        sessionStorage.setItem(`pin_ok_${roomNumber}`, "true");
        
        // Request FCM permission and save token
        try {
          const fcmToken = await requestFCMPermission();
          
          if (fcmToken) {
            // Save FCM token to backend
            await api.post(
              `/api/room_services/${hotelIdentifier}/room/${roomNumber}/save-fcm-token/`,
              { fcm_token: fcmToken }
            );
            console.log('✅ FCM token saved successfully');
          }
        } catch (fcmError) {
          // FCM is optional - don't block navigation if it fails
          console.warn('⚠️ FCM permission denied or failed:', fcmError);
        }
        
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
    <div className="d-flex justify-content-center align-items-center vh-100">
      <form
        onSubmit={handleSubmit}
        className="p-4 border main-bg text-white rounded d-flex flex-column align-items-center"
        style={{ maxWidth: "400px", width: "100%" }}
      >
        {logoLoading && <span>Loading logo...</span>}
        {logoError && <span>Error loading logo</span>}
        {hotelLogo && (
          <img
            src={hotelLogo}
            alt="Hotel Logo"
            className="hotel-logo mb-3"
            style={{ maxHeight: 80, objectFit: "contain" }}
          />
        )}

        <h2 className="mb-4">Enter PIN for Room {roomNumber}</h2>

        {/* Notification Information */}
        <div className="alert alert-info mb-3 w-100" role="alert">
          <div className="d-flex align-items-start">
            <span className="me-2" style={{ fontSize: '1.5rem' }}>🔔</span>
            <div>
              <strong>Stay Updated!</strong>
              <p className="mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
                After verifying your PIN, please <strong>allow notifications</strong> to receive 
                real-time updates about your order status.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 w-100">
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
      </form>
    </div>
  );
}
