import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GuestChatSession } from "@/utils/guestChatSession";
import useHotelLogo from "@/hooks/useHotelLogo";
import { requestFCMPermission } from "@/utils/fcm";
import api from "@/services/api";

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
      // Use window global to absolutely prevent multiple executions
      if (window.__guestSessionCheckInProgress) {
        console.log('⏭️ Session check already in progress globally');
        return;
      }
      
      if (isNavigatingRef.current || hasCheckedSessionRef.current) {
        console.log('⏭️ Skipping session check - already done');
        return;
      }
      
      window.__guestSessionCheckInProgress = true;
      hasCheckedSessionRef.current = true;
      console.log('🔍 Checking existing session...');
      
      const session = new GuestChatSession(hotelSlug, room_number);
      setGuestSession(session);
      
      // Try to validate existing session
      const isValid = await session.validate();
      
      if (isValid) {
        console.log('✅ Existing guest session validated - NAVIGATING NOW');
        isNavigatingRef.current = true;
        
        // Set the flag that RequireChatPin checks
        sessionStorage.setItem(`chat_pin_ok_${room_number}`, 'true');
        
        // Redirect to chat with conversation ID
        const conversationId = session.getConversationId();
        
        // Use window.location for hard navigation to stop all re-renders
        const targetUrl = `/chat/${hotelSlug}/conversations/${conversationId}/messages/send`;
        console.log('🚀 Hard navigating to:', targetUrl);
        window.location.href = targetUrl;
      } else {
        console.log('❌ No valid session, showing PIN entry');
        window.__guestSessionCheckInProgress = false;
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
      
      // Set the flag that RequireChatPin checks
      sessionStorage.setItem(`chat_pin_ok_${room_number}`, 'true');
      
      // Request FCM permission and save token for chat notifications
      try {
        const fcmToken = await requestFCMPermission();
        
        if (fcmToken) {
          // Save FCM token to backend for guest chat notifications
          await api.post(
            `/chat/${hotelSlug}/room/${room_number}/save-fcm-token/`,
            { fcm_token: fcmToken }
          );
          console.log('✅ FCM token saved successfully for guest chat');
        }
      } catch (fcmError) {
        // FCM is optional - don't block navigation if it fails
        console.warn('⚠️ FCM permission denied or failed:', fcmError);
      }
      
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

        {/* Notification Information */}
        <div className="alert alert-info mb-3 w-100" role="alert">
          <div className="d-flex align-items-start">
            <span className="me-2" style={{ fontSize: '1.5rem' }}>🔔</span>
            <div>
              <strong>Stay Updated!</strong>
              <p className="mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
                After verifying your PIN, please <strong>allow notifications</strong> to receive 
                real-time updates when staff responds to your messages.
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
