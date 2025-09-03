import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";
import useHotelLogo from "@/hooks/useHotelLogo";

export default function ChatPinAuth() {
  const { hotelSlug, room_number } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1️⃣ Validate the room PIN
      const pinRes = await api.post(
        `/chat/${hotelSlug}/messages/room/${room_number}/validate-chat-pin/`,
        { pin }
      );

      if (!pinRes.data.valid) {
        setError("Invalid PIN. Please try again.");
        return;
      }

      // 2️⃣ PIN is valid, create/get conversation
      const convRes = await api.post(
        `/chat/${hotelSlug}/conversations/from-room/${room_number}/`
      );

      const conversationId = convRes.data.conversation_id;

      // 3️⃣ Store session flag
      sessionStorage.setItem(`chat_pin_ok_${room_number}`, "true");

      // 4️⃣ Navigate to conversation messages/send page
      navigate(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`,
        { state: { room_number } }
      );
    } catch (err) {
      console.error("Error during PIN validation or conversation creation:", err);
      setError("Error validating PIN or creating conversation. Try again later.");
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

        <h4 className="mb-4 text-small">Enter Chat PIN for Room {room_number}</h4>

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
