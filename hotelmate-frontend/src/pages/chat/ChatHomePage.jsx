import React, { useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

const ChatHomePage = ({ hotelSlug, user }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    // If user is a guest, go straight to their room
    if (!user.isAuthenticated && user.roomId) {
      setSelectedRoom(user.roomId);
    }
  }, [user]);

  // Staff sees sidebar, guest goes directly to chat
  if (!user.isAuthenticated && selectedRoom) {
    return <ChatWindow hotelSlug={hotelSlug} roomId={selectedRoom} userId={user.id} />;
  }

  return (
    <div className="d-flex h-100">
      <ChatSidebar hotelSlug={hotelSlug} onSelectRoom={setSelectedRoom} />
      {selectedRoom ? (
        <ChatWindow hotelSlug={hotelSlug} roomId={selectedRoom} userId={user.id} />
      ) : (
        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
          Select a room to view messages
        </div>
      )}
    </div>
  );
};

export default ChatHomePage;
