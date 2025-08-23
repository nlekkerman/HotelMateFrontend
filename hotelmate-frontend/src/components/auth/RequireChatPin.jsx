import { Navigate, useLocation, useParams } from "react-router-dom";

export default function RequireChatPin({ children }) {
  const location = useLocation();
  const { hotelSlug } = useParams();
  const room_number = location.state?.room_number; // get from navigate state
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
