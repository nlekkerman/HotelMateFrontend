import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { roomNumber } = useParams();

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const response = await api.get(`/rooms/${roomNumber}/`);
        console.log("Room details response:", response.data);
        setRoom(response.data);
      } catch (err) {
        setError("Failed to fetch room details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [id]);

  if (loading)
    return <p className="text-center mt-4">Loading room details...</p>;
  if (error) return <p className="text-center text-danger mt-4">{error}</p>;
  if (!room) return null;

  return (
    <div className="container my-4">
      <h2 className="mb-4">Room Details - Room {room.room_number}</h2>

      <p>
        <strong>Room Number:</strong> {room.room_number}
      </p>
      <p>
        <strong>Guest PIN:</strong> {room.guest_id_pin || "Not assigned"}
      </p>
      <p>
        <strong>Occupied:</strong> {room.is_occupied ? "Yes" : "No"}
      </p>

     <p>
  <strong>Guests:</strong>{" "}
  {room.guests_in_room && room.guests_in_room.length > 0 ? (
    room.guests_in_room.map((guest) => (
      <span key={guest.id}>
        {guest.first_name} {guest.last_name}
      </span>
    ))
  ) : (
    <span className="text-muted">None</span>
  )}
</p>

      <div className="mb-4">
        {room.room_service_qr_code && (
          <div className="mb-3 text-center">
            <h5>Room Service QR Code</h5>
            <img
              src={room.room_service_qr_code}
              alt="Room Service QR Code"
              style={{ width: 150, height: 150, objectFit: "contain" }}
            />
          </div>
        )}
        {room.in_room_breakfast_qr_code && (
          <div className="mb-3 text-center">
            <h5>In-Room Breakfast QR Code</h5>
            <img
              src={room.in_room_breakfast_qr_code}
              alt="In-Room Breakfast QR Code"
              style={{ width: 150, height: 150, objectFit: "contain" }}
            />
          </div>
        )}
      </div>

      <button className="btn btn-secondary" onClick={() => navigate("/rooms")}>
        Back to Rooms List
      </button>
    </div>
  );
}

export default RoomDetails;
