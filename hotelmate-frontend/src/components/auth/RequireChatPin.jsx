import { Navigate, useParams } from "react-router-dom";

export default function RequireChatPin({ children }) {
  const { hotelSlug, conversationId } = useParams(); // <-- use conversationId
  const pinOk = sessionStorage.getItem(`chat_pin_ok_${conversationId}`);

  if (pinOk !== "true") {
    return (
      <Navigate
        to={`/chat/${hotelSlug}/conversations/${conversationId}/validate-chat-pin`}
        replace
      />
    );
  }

  return children;
}
