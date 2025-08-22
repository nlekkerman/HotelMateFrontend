import { useParams } from "react-router-dom";
import { useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/AuthContext"; // <--- import context

const ChatHomePage = () => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();      // <--- get logged-in user
  const userId = user?.id;         // undefined if guest

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleSelectRoom = (roomNumber, conversationId) => {
    setSelectedRoom(roomNumber);
    setSelectedConversation(conversationId);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ChatSidebar
        hotelSlug={hotelSlug}
        selectedRoom={selectedRoom}
        onSelectRoom={handleSelectRoom}
      />

      <div style={{ flex: 1, padding: "20px" }}>
        {selectedRoom && selectedConversation ? (
          <ChatWindow
            hotelSlug={hotelSlug}
            conversationId={selectedConversation}
            userId={userId} // <--- now userId is correct
          />
        ) : (
          <div>
            <h2>Chat Rooms</h2>
            <p>Please select a room from the sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHomePage;
