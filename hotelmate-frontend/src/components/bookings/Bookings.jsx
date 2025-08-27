import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import RestaurantBookings from "./RestaurantBookings";
import { useBookingNotifications } from "@/context/BookingNotificationContext";
export default function Bookings() {
  const {
    hotelSlug: qrHotelSlug,
    restaurantSlug: qrCategorySlug,
    roomNumber: qrRoomNumber,
  } = useParams();
 const { markAllBookingRead } = useBookingNotifications();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [roomNumber, setRoomNumber] = useState(qrRoomNumber || null);

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
          console.warn("Unexpected response for booking categories:", data);
          data = [];
        }

        setCategories(data);

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
    markAllBookingRead();
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading booking categories…</p>
      </div>
    );
  }

  if (error) return <p className="text-danger text-center">{error}</p>;
  if (categories.length === 0)
    return <p className="text-center">No booking categories found for your hotel.</p>;

  return (
    <div className="container py-4">
      <h2 className="text-center mb-4">
        Bookings {hotelName ? `@ ${hotelName}` : ""}
      </h2>

      {!qrCategorySlug && (
        <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleClick(c.id)}
              className={`btn btn-sm ${
                selectedCategoryId === c.id ? "btn-primary" : "btn-outline-secondary"
              } rounded-1 px-3`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCategoryId === null ? (
        <p className="text-center text-muted">
          <em>Please select a booking category to view bookings.</em>
        </p>
      ) : (
        <RestaurantBookings
          hotelSlug={hotelSlug}
          restaurantId={selectedCategoryId}
          roomNumber={roomNumber}
        />
      )}
    </div>
  );
}
