import { Navigate, useLocation, useParams } from "react-router-dom";
import { cloneElement } from "react";

export default function RequireChatPin({ children }) {
  const { hotelSlug, room_number: paramRoom, conversationId } = useParams();
  const location = useLocation();
  let room_number = paramRoom || location.state?.room_number;

  // For guest chat, we might not have room_number in URL but in state
  // If we have a conversationId, we're in a valid chat session
  if (!room_number && !conversationId) {
    console.warn('⚠️ RequireChatPin: No room_number or conversationId found');
    // Don't redirect to "/" which triggers login redirect for guests
    // Instead redirect to chat PIN validation if we have hotelSlug
    if (hotelSlug) {
      return <Navigate to={`/chat/${hotelSlug}/messages/room/unknown/validate-chat-pin`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // If we have conversationId, check if we have a valid session
  // The session should have been set during PIN validation
  if (conversationId && !room_number) {
    // Try to get room_number from localStorage session
    const guestSession = localStorage.getItem('hotelmate_guest_chat_session');
    if (guestSession) {
      try {
        const session = JSON.parse(guestSession);
        const sessionRoomNumber = session.room_number;
        
        if (sessionRoomNumber) {
          const pinOk = sessionStorage.getItem(`chat_pin_ok_${sessionRoomNumber}`);
          
          if (pinOk === "true") {
            console.log('✅ RequireChatPin: Valid session found for room', sessionRoomNumber);
            room_number = sessionRoomNumber; // Set room_number so we can pass it down
          }
        }
      } catch (e) {
        console.error('Error parsing guest session:', e);
      }
    }
    
    if (!room_number) {
      // No valid session found, redirect back to validate
      console.warn('⚠️ RequireChatPin: No valid PIN session found');
      return <Navigate to={`/chat/${hotelSlug}/messages/room/unknown/validate-chat-pin`} replace />;
    }
  }

  // We should have room_number by now, check the PIN
  const pinOk = sessionStorage.getItem(`chat_pin_ok_${room_number}`);

  if (pinOk !== "true") {
    console.log('❌ RequireChatPin: PIN not validated for room', room_number);
    return (
      <Navigate
        to={`/chat/${hotelSlug}/messages/room/${room_number}/validate-chat-pin`}
        replace
      />
    );
  }

  console.log('✅ RequireChatPin: Access granted for room', room_number);
  
  // Pass room_number as prop to children so ChatWindow can access it
  if (children && children.type) {
    return cloneElement(children, { roomNumber: room_number });
  }
  
  return children;
}

