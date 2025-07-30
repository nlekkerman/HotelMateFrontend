import { useEffect, useState } from "react";
import api from "@/services/api";
import CheckoutRooms from "@/components/rooms/CheckoutRooms"; // adjust path if needed

const CheckoutRoomsPanel = ({ hotelSlug, token }) => {
  const [dueCount, setDueCount] = useState(0);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    fetchCheckoutCount();
  }, [hotelSlug, token]); // re-fetch if hotelSlug or token changes

  const fetchCheckoutCount = async () => {
    try {
      console.log("Token used for request:", token);

      // Use the URL with hotelSlug in the path (no query param)
      const response = await api.get(`/rooms/${hotelSlug}/checkout-needed/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Response is a list of rooms needing checkout
      const roomsNeedingCheckout = response.data || [];

      setDueCount(roomsNeedingCheckout.length);
    } catch (error) {
      console.error("Failed to check checkout count:", error);
      setDueCount(0);
    }
  };

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-start align-items-center mb-3">
        <button
          className={`btn ${dueCount > 0 ? "btn-danger" : "btn-outline-secondary"}`}
          onClick={() => setShowList(!showList)}
          disabled={dueCount === 0}
        >
          {dueCount > 0
            ? `⚠️ ${dueCount} Room${dueCount > 1 ? "s" : ""} Need Checkout`
            : "No Rooms to Checkout"}
        </button>
      </div>

      {showList && <CheckoutRooms hotelSlug={hotelSlug} token={token} />}
    </div>
  );
};

export default CheckoutRoomsPanel;
