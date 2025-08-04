import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import RestaurantBookings from "./RestaurantBookings";

export default function Bookings() {
  const { hotelSlug: qrHotelSlug, restaurantSlug: qrRestaurantSlug, roomNumber: qrRoomNumber } = useParams();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [roomNumber, setRoomNumber] = useState(qrRoomNumber || null);

  // Fallback to localStorage for manual use
  const getHotelInfo = () => {
    if (qrHotelSlug) return { slug: qrHotelSlug, name: null };

    const storedUser = localStorage.getItem("user");
    if (!storedUser) return { slug: null, name: null };
    try {
      const userData = JSON.parse(storedUser);
      return {
        slug: userData.hotel_slug || null,
        name: userData.hotel_name || "Unknown Hotel",
      };
    } catch {
      return { slug: null, name: null };
    }
  };

  const { slug: hotelSlug, name: hotelName } = getHotelInfo();

  useEffect(() => {
    if (!hotelSlug) {
      setError("No hotel_slug found.");
      setLoading(false);
      return;
    }

    api
      .get(`bookings/restaurants/?hotel_slug=${hotelSlug}`)
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) {
          data = data.results;
        } else if (!Array.isArray(data)) {
          console.warn("Unexpected restaurants response:", data);
          data = [];
        }

        setRestaurants(data);

        // Auto-select restaurant from QR route if available
        if (qrRestaurantSlug) {
          const found = data.find(r => r.slug === qrRestaurantSlug);
          if (found) setSelectedRestaurantId(found.id);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch restaurants:", err);
        setError("Failed to load restaurants.");
        setLoading(false);
      });
  }, [hotelSlug, qrRestaurantSlug]);

  const handleClick = (restId) => {
    setSelectedRestaurantId(prev => (prev === restId ? null : restId));
  };

  if (loading) {
  return (
    <div className="loading">
      <div className="text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading restaurants…</p>
      </div>
    </div>
  );
}
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (restaurants.length === 0)
    return <p>No restaurants found for your hotel.</p>;

  return (
    <div style={{ padding: "16px" }}>
      <h2>Bookings {hotelName ? `@ ${hotelName}` : ""}</h2>

      {/* Skip restaurant buttons if coming from QR */}
      {!qrRestaurantSlug && (
        <div style={{ marginBottom: "16px" }}>
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => handleClick(r.id)}
              style={{
                marginRight: "8px",
                marginBottom: "8px",
                padding: "8px 12px",
                backgroundColor:
                  selectedRestaurantId === r.id ? "#007bff" : "#f0f0f0",
                color: selectedRestaurantId === r.id ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {selectedRestaurantId === null ? (
        <p><em>Please select a restaurant to view or book.</em></p>
      ) : (
        <RestaurantBookings
          hotelSlug={hotelSlug}
          restaurantId={selectedRestaurantId}
          roomNumber={roomNumber}
        />
      )}
    </div>
  );
}
