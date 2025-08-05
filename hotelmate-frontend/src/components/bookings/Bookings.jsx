import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import RestaurantBookings from "./RestaurantBookings"; // Can still be used, just keep name for now

export default function Bookings() {
  const {
    hotelSlug: qrHotelSlug,
    restaurantSlug: qrCategorySlug, // keep param name to avoid breaking routes
    roomNumber: qrRoomNumber,
  } = useParams();

  const [categories, setCategories] = useState([]); // previously "restaurants"
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // previously "selectedRestaurantId"
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
      .get(`bookings/restaurants/?hotel_slug=${hotelSlug}`) // endpoint remains unchanged
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) {
          data = data.results;
        } else if (!Array.isArray(data)) {
          console.warn("Unexpected response for booking categories:", data);
          data = [];
        }

        setCategories(data);

        // Auto-select category from QR route if available
        if (qrCategorySlug) {
          const found = data.find((c) => c.slug === qrCategorySlug);
          if (found) setSelectedCategoryId(found.id);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch booking categories:", err);
        setError("Failed to load booking categories.");
        setLoading(false);
      });
  }, [hotelSlug, qrCategorySlug]);

  const handleClick = (categoryId) => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="text-center">
          <div className="spinner-border text-dark mb-3" role="status" />
          <p>Loading booking categories…</p>
        </div>
      </div>
    );
  }

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (categories.length === 0)
    return <p>No booking categories found for your hotel.</p>;

  return (
    <div style={{ padding: "16px" }}>
      <h2 className="title-container">
        Bookings {hotelName ? `@ ${hotelName}` : ""}
      </h2>

      {/* Skip buttons if coming from QR */}
      {!qrCategorySlug && (
        <div style={{ marginBottom: "16px" }}>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleClick(c.id)}
              style={{
                marginRight: "8px",
                marginBottom: "8px",
                padding: "8px 12px",
                backgroundColor:
                  selectedCategoryId === c.id ? "#007bff" : "#f0f0f0",
                color: selectedCategoryId === c.id ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCategoryId === null ? (
        <p>
          <em>Please select a booking category to view bookings.</em>
        </p>
      ) : (
        <RestaurantBookings
          hotelSlug={hotelSlug}
          restaurantId={selectedCategoryId} // Keep prop name for now if used internally
          roomNumber={roomNumber}
        />
      )}
    </div>
  );
}
