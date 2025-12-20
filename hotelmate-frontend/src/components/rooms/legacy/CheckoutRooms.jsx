import { useEffect, useState } from "react";
import api from "@/services/api";

const CheckoutRooms = ({ hotelSlug, token, onCheckoutComplete }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkedOutCount, setCheckedOutCount] = useState(0);

  // Fetch rooms needing checkout
  const fetchRoomsDueForCheckout = async () => {
    try {
      const response = await api.get(`/rooms/${hotelSlug}/checkout-needed/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
    }
  };

  useEffect(() => {
    fetchRoomsDueForCheckout();
  }, [hotelSlug]);

  const toggleRoomSelection = (roomId) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

 const handleCheckout = async () => {
  if (selectedRooms.length === 0) return;

  setLoading(true);
  try {
    await api.post(
      `/rooms/${hotelSlug}/checkout/`,
      { room_ids: selectedRooms },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (onCheckoutComplete) onCheckoutComplete(selectedRooms); // send checked room IDs

    setCheckedOutCount(selectedRooms.length);
    setSelectedRooms([]);
    fetchRoomsDueForCheckout();
  } catch (error) {
    console.error("Checkout failed:", error);
  } finally {
    setLoading(false);
  }
};



  return (
    <div className="container my-3">
      {rooms.length === 0 ? (
        <p className="text-muted">No rooms need to be checked out today.</p>
      ) : (
        <>
          <ul className="list-group mb-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={selectedRooms.includes(room.id)}
                    onChange={() => toggleRoomSelection(room.id)}
                  />
                  Room {room.room_number}
                </div>
                <small className="text-muted">Guests: {room.guests.length}</small>
              </li>
            ))}
          </ul>

          <button
            className="btn btn-danger"
            disabled={loading || selectedRooms.length === 0}
            onClick={handleCheckout}
          >
            {loading
              ? "Checking out..."
              : `Checkout ${selectedRooms.length} room(s)`}
          </button>
        </>
      )}

      {checkedOutCount > 0 && (
        <div className="alert alert-success mt-3">
          ✅ Successfully checked out {checkedOutCount} room(s)
        </div>
      )}
    </div>
  );
};

export default CheckoutRooms;
