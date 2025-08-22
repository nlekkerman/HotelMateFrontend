import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "@/services/api";

export default function ChatPinAuth() {
  const { hotelSlug, room_number } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

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

      // 2️⃣ PIN is valid, now get or create conversation for this room
      const convRes = await api.post(
        `/chat/${hotelSlug}/conversations/from-room/${room_number}/`
      );

      const conversationId = convRes.data.conversation_id;

      // 3️⃣ Store session flag for PIN validation
      sessionStorage.setItem(`chat_pin_ok_${conversationId}`, "true");

      // 4️⃣ Navigate to conversation messages/send page
      navigate(
        location.state?.next ||
          `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`
      );
    } catch (err) {
      console.error("Error during PIN validation or conversation creation:", err);
      setError("Error validating PIN or creating conversation. Try again later.");
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
