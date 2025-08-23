import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { FaTimes } from "react-icons/fa";

const ChatSidebar = ({ hotelSlug, onSelectRoom, selectedRoom, isMobile, toggleSidebar }) => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get(`/chat/${hotelSlug}/active-rooms/`);
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
    fetchRooms();
  }, [hotelSlug]);

  return (
    <aside className={`chat-sidebar ${isMobile ? "mobile" : "desktop"}`}>
      {isMobile && (
        <button className="close-btn" onClick={toggleSidebar}>
          <FaTimes />
        </button>
      )}

      {rooms.map((room) => (
        <div
          key={room.room_number}
          className={`chat-room ${selectedRoom === room.room_number ? "selected" : ""}`}
          onClick={() => onSelectRoom(room.room_number, room.conversation_id)}
        >
          Room {room.room_number}
        </div>
      ))}
    </aside>
  );
};

export default ChatSidebar;
