import React, { useEffect, useState } from "react";
import api from "@/services/api";

const ChatSidebar = ({ hotelSlug, onSelectRoom, selectedRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelSlug) return;

    const fetchRooms = async () => {
      console.log("Fetching active rooms for hotel:", hotelSlug);
      try {
        const res = await api.get(`/chat/${hotelSlug}/active-rooms/`);
        console.log("Fetched rooms data:", res.data);
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [hotelSlug]);

  if (loading) return <div className="p-3">Loading rooms...</div>;
  if (rooms.length === 0)
    return <div className="p-3">No active chats available.</div>;

  return (
    <div className="d-flex flex-column border-end bg-dark" style={{ width: "250px" }}>
      <h5 className="p-3 border-bottom text-white">Active Rooms</h5>
      <div className="flex-grow-1 overflow-auto">
        {rooms.map((room) => {
          const isSelected = selectedRoom === room.room_number;
          return (
            <div
              key={room.room_number}
              className={`p-3 border-bottom d-flex flex-column ${
                isSelected ? "bg-primary text-white" : "bg-light"
              }`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                console.log("Selected room:", room.room_number, "conversationId:", room.conversation_id);
                onSelectRoom(room.room_number, room.conversation_id);
              }}
            >
              <strong>Room {room.room_number}</strong>
              <small className="text-truncate">
                {room.last_message || "No messages yet"}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatSidebar;
