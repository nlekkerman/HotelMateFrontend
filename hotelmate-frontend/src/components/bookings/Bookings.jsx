// src/components/bookings/Bookings.jsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";

// ① Import the RestaurantBookings component
import RestaurantBookings from "./RestaurantBookings";

export default function Bookings() {
  const [restaurants, setRestaurants] = useState([]);       // [{id, name}, …]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);

  // Helper to read hotel_slug and hotel_name from localStorage
  const getHotelInfo = () => {
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

  useEffect(() => {
    const { slug: hotelSlug } = getHotelInfo();
    if (!hotelSlug) {
      setError("No hotel_slug found in localStorage.");
      setLoading(false);
      return;
    }

    // Fetch only this hotel’s restaurants
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
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch restaurants:", err);
        if (err.response) {
          setError(`Error ${err.response.status}: ${err.response.statusText}`);
        } else {
          setError("Network error while fetching restaurants.");
        }
        setLoading(false);
      });
  }, []);

  const handleClick = (restId) => {
    setSelectedRestaurantId(restId);
    // Now that selectedRestaurantId is set, <RestaurantBookings /> will appear
  };

  const { name: hotelName, slug: hotelSlug } = getHotelInfo();

  if (loading) return <p>Loading restaurants…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (restaurants.length === 0)
    return <p>No restaurants found for your hotel.</p>;

  return (
    <div style={{ padding: "16px" }}>
      <h2>Bookings {hotelName}</h2>

      <div style={{ marginBottom: "16px" }}>
        {/* One button per restaurant fetched */}
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

      {/* ② When a restaurant is selected, render RestaurantBookings below */}
      {selectedRestaurantId === null ? (
        <p>
          <em>Please select a restaurant to view its bookings.</em>
        </p>
      ) : (
        <RestaurantBookings
          hotelSlug={hotelSlug}
          restaurantId={selectedRestaurantId}
        />
      )}
    </div>
  );
}
