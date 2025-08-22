import { useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";

const ChatHomePage = ({ hotelSlug, user }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Prevent crash if user or rooms is undefined
  const rooms = user?.rooms || [];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar with rooms */}
      <div style={{ width: "250px", borderRight: "1px solid #ccc", overflowY: "auto" }}>
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <div
              key={room.id}
              style={{
                padding: "10px",
                cursor: "pointer",
                backgroundColor: selectedRoom === room.id ? "#f0f0f0" : "white",
              }}
              onClick={() => setSelectedRoom(room.id)}
            >
              {room.name}
            </div>
          ))
        ) : (
          <div>No rooms available</div>
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, padding: "20px" }}>
        {selectedRoom ? (
          <ChatWindow
            hotelSlug={hotelSlug}
            roomId={selectedRoom}
            userId={user?.id}
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
