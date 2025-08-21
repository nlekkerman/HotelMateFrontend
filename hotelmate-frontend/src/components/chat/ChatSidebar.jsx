import React, { useEffect, useState } from "react";
import axios from "axios";

const ChatSidebar = ({ hotelSlug, onSelectRoom }) => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    // Fetch rooms for the hotel
    axios.get(`/api/${hotelSlug}/rooms/`)  // your backend endpoint
      .then((res) => setRooms(res.data))
      .catch((err) => console.error(err));
  }, [hotelSlug]);

  return (
    <div className="list-group list-group-flush overflow-auto vh-100">
      {rooms.length === 0 && (
        <div className="text-center text-muted mt-3">No rooms available</div>
      )}
      {rooms.map((room) => (
        <button
          key={room.id}
          className="list-group-item list-group-item-action d-flex flex-column align-items-start"
          onClick={() => onSelectRoom(room.id)}
        >
          <div className="fw-bold">Room {room.number}</div>
          <small className="text-muted text-truncate">{room.last_message || "No messages yet"}</small>
        </button>
      ))}
    </div>
  );
};

export default ChatSidebar;
