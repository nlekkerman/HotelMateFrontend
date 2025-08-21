import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";

export default function ChatPinAuth() {
  const { hotelSlug, room_number } = useParams(); // ✅ use room_number
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();


    try {
      const response = await api.post(
        `/chat/${hotelSlug}/messages/room/${room_number}/validate-chat-pin/`,
        { pin }
      );

      console.log("API response:", response);

      if (response.data.valid) {
        sessionStorage.setItem(`chat_pin_ok_${room_number}`, "true");
        navigate(
          location.state?.next || `/chat/${hotelSlug}/messages/room/${room_number}/send`
        );
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error("Error during PIN validation:", err);
      setError("Error validating PIN. Try again later.");
    }
  };

  return (
    <div className="pin-auth-container">
      <form onSubmit={handleSubmit}>
        <h2>Enter Chat PIN for Room {room_number}</h2>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          required
          autoFocus
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
