import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GuestChatSession } from "@/utils/guestChatSession";
import useHotelLogo from "@/hooks/useHotelLogo";

export default function ChatPinAuth() {
  const { hotelSlug, room_number } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [guestSession, setGuestSession] = useState(null);

  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const session = new GuestChatSession(hotelSlug, room_number);
      setGuestSession(session);
      
      // Try to validate existing session
      const isValid = await session.validate();
      
      if (isValid) {
        console.log('✅ Existing guest session validated');
        // Redirect to chat with conversation ID
        const conversationId = session.getConversationId();
        navigate(
          `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`,
          { state: { room_number, isGuest: true } }
        );
      } else {
        console.log('❌ No valid session, showing PIN entry');
      }
      
      setLoading(false);
    };

    checkExistingSession();
  }, [hotelSlug, room_number, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Initialize new session with PIN using the backend API
      const sessionData = await guestSession.initialize(pin);
      
      console.log('✅ Guest session initialized:', sessionData);
      
      // Navigate to chat with conversation ID
      const conversationId = sessionData.conversation_id;
      navigate(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`,
        { state: { room_number, isGuest: true } }
      );
    } catch (err) {
      console.error("Error during guest session initialization:", err);
      setError(err.message || "Invalid PIN. Please try again.");
      setLoading(false);
    }
  };

  if (loading && !guestSession) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className={`form-control ${error ? "is-invalid" : ""}`}
            required
            disabled={loading}
          />
          {error && <div className="invalid-feedback">{error}</div>}
        </div>

        <button type="submit" className="btn custom-button w-100" disabled={loading || !pin}>
          {loading ? 'Verifying...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
