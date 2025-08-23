import { Navigate, useLocation, useParams } from "react-router-dom";

export default function RequireChatPin({ children }) {
  const { hotelSlug, room_number: paramRoom } = useParams();
  const location = useLocation();
  const room_number = paramRoom || location.state?.room_number;

  if (!room_number) {
    // Prevent undefined
    return <Navigate to="/" replace />;
  }

  const pinOk = sessionStorage.getItem(`chat_pin_ok_${room_number}`);

  if (pinOk !== "true") {
    return (
      <Navigate
        to={`/chat/${hotelSlug}/messages/room/${room_number}/validate-chat-pin`}
        replace
      />
    );
  }

  return children;
}
