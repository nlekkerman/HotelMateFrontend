import { useEffect, useState } from "react";
import api from "@/services/api";
import CheckoutRooms from "@/components/rooms/CheckoutRooms";

const CheckoutRoomsPanel = ({ hotelSlug, token, onRoomsCheckout }) => {
  const [dueCount, setDueCount] = useState(0);
  const [showList, setShowList] = useState(false);

  const fetchCheckoutCount = async () => {
    try {
      const response = await api.get(`/rooms/${hotelSlug}/checkout-needed/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const roomsNeedingCheckout = response.data || [];
      setDueCount(roomsNeedingCheckout.length);
    } catch (error) {
      console.error("Failed to fetch checkout count:", error);
      setDueCount(0);
    }
  };

  useEffect(() => {
    fetchCheckoutCount();
  }, [hotelSlug, token]);

  useEffect(() => {
    if (dueCount === 0) setShowList(false);
  }, [dueCount]);

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-start align-items-center mb-3">
        <button
          className={`btn ${dueCount > 0 ? "btn-danger" : "btn-secondary"}`}
          onClick={() => setShowList(!showList)}
          disabled={dueCount === 0}
        >
          {dueCount > 0
            ? `⚠️ ${dueCount} Room${dueCount > 1 ? "s" : ""} Need Checkout`
            : "No Rooms to Checkout"}
        </button>
      </div>

      {showList && (
        <CheckoutRooms
          hotelSlug={hotelSlug}
          token={token}
          onCheckoutComplete={(checkedOutIds) => {
            fetchCheckoutCount(); // refresh count
            if (onRoomsCheckout) onRoomsCheckout(checkedOutIds); // notify RoomList
          }}
        />
      )}
    </div>
  );
};


export default CheckoutRoomsPanel;
