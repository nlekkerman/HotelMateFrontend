import { Navigate, useParams } from "react-router-dom";

export default function RequireChatPin({ children }) {
  const { hotelSlug, room_number } = useParams();
  const pinOk = sessionStorage.getItem(`chat_pin_ok_${room_number}`);

  if (pinOk !== "true") {
    // Redirect to the PIN page
    return <Navigate to={`/chat/${hotelSlug}/messages/room/${room_number}/validate-chat-pin`} replace />;
  }

  return children;
}
