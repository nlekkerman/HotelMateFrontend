import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GuestChatSession } from "@/utils/guestChatSession";
import useHotelLogo from "@/hooks/useHotelLogo";

export default function ChatPinAuth() {
  const { hotelSlug, room_number } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guestSession, setGuestSession] = useState(null);
  const isNavigatingRef = useRef(false);
  const hasCheckedSessionRef = useRef(false);

  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (isNavigatingRef.current || hasCheckedSessionRef.current) {
        console.log('⏭️ Skipping session check - already done');
        return;
      }
      
      hasCheckedSessionRef.current = true;
      console.log('🔍 Checking existing session...');
      
      const session = new GuestChatSession(hotelSlug, room_number);
      setGuestSession(session);
      
      // Try to validate existing session
      const isValid = await session.validate();
      
      if (isValid) {
        console.log('✅ Existing guest session validated');
        isNavigatingRef.current = true;
        // Redirect to chat with conversation ID
        const conversationId = session.getConversationId();
        navigate(
          `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`,
          { state: { room_number, isGuest: true }, replace: true }
        );
      } else {
        console.log('❌ No valid session, showing PIN entry');
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pin || submitting || isNavigatingRef.current) {
      return;
    }
    
    setError("");
    setSubmitting(true);

    try {
      // Initialize new session with PIN using the backend API
      const sessionData = await guestSession.initialize(pin);
      
      console.log('✅ Guest session initialized:', sessionData);
      
      isNavigatingRef.current = true;
      
      // Navigate to chat with conversation ID
      const conversationId = sessionData.conversation_id;
      navigate(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`,
        { state: { room_number, isGuest: true }, replace: true }
      );
    } catch (err) {
      console.error("Error during guest session initialization:", err);
      setError(err.message || "Invalid PIN. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading || isNavigatingRef.current) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 main-bg">
        <div className="spinner-border text-white" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 main-bg">
      <form
        onSubmit={handleSubmit}
        className="p-4 border text-white rounded d-flex flex-column align-items-center"
        style={{ 
          maxWidth: "400px", 
          width: "90%",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)"
        }}
      >
        {!logoLoading && !logoError && hotelLogo && (
          <img
            src={hotelLogo}
            alt="Hotel Logo"
            className="hotel-logo mb-3"
            style={{ maxHeight: 80, objectFit: "contain" }}
          />
        )}

        <h4 className="mb-4 text-center">Enter Chat PIN for Room {room_number}</h4>

        <div className="mb-3 w-100">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className={`form-control ${error ? "is-invalid" : ""}`}
            style={{ fontSize: '1.2rem', padding: '0.75rem' }}
            required
            disabled={submitting}
          />
          {error && <div className="invalid-feedback d-block text-center">{error}</div>}
        </div>

        <button 
          type="submit" 
          className="btn custom-button w-100"
          disabled={submitting || !pin}
          style={{ minHeight: '48px' }}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Verifying...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>
    </div>
  );
}
