// src/components/DinnerBookingList.jsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useServiceBookingState } from "@/realtime/stores/serviceBookingStore";
import { bookingActions } from "@/realtime/stores/bookingStore";

export default function DinnerBookingList() {
  const bookingState = useServiceBookingState();
  const [restaurants, setRestaurants] = useState([]);   // list of { id, name, slug }
  const [selectedSlug, setSelectedSlug] = useState(""); // slug of the restaurant to fetch
  const [bookings, setBookings] = useState([]);  // Keep local state for filtered bookings by restaurant
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState(null);
  
  // Get all bookings from store for any realtime updates
  const storeBookings = Object.values(bookingState.bookingsById);

  // 1) Read hotel_slug from localStorage
  const getHotelSlug = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser).hotel_slug;
    } catch {
      return null;
    }
  };

  // 2) On mount, fetch the list of restaurants for this hotel
  useEffect(() => {
    const hotelSlug = getHotelSlug();
    if (!hotelSlug) {
      setError("No hotel slug found. Cannot fetch restaurants.");
      setLoadingRestaurants(false);
      return;
    }

    api
      .get(`bookings/restaurants/?hotel_slug=${hotelSlug}`)
      .then((res) => {
        let data = res.data;
        // If paginated response
        if (data && Array.isArray(data.results)) {
          data = data.results;
        } else if (!Array.isArray(data)) {
          console.warn("Unexpected restaurants response:", data);
          data = [];
        }
        setRestaurants(data);
        setLoadingRestaurants(false);

        // If you want to default to the first restaurant:
        if (data.length > 0) {
          setSelectedSlug(data[0].slug);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch restaurants:", err);
        setError("Error fetching restaurants.");
        setLoadingRestaurants(false);
      });
  }, []);

  // 3) Whenever selectedSlug changes, fetch bookings for that restaurant
  useEffect(() => {
    if (!selectedSlug) {
      setBookings([]);
      return;
    }

    const hotelSlug = getHotelSlug();
    if (!hotelSlug) {
      setError("No hotel slug found. Cannot fetch dinner bookings.");
      return;
    }

    setLoadingBookings(true);
    setError(null);

    api
      .get(`guest-booking/${hotelSlug}/restaurant/${selectedSlug}/`)
      .then((res) => {
        setBookings(res.data);
        setLoadingBookings(false);
        console.log("Fetched dinner bookings:", res.data);
        
        // Initialize store with fetched bookings for realtime updates
        if (res.data && res.data.length > 0) {
          bookingActions.initFromAPI(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch dinner bookings:", err);
        if (err.response) {
          setError(`Error ${err.response.status}: ${err.response.data.detail || err.response.statusText}`);
        } else {
          setError("Network error while fetching dinner bookings.");
        }
        setLoadingBookings(false);
      });
  }, [selectedSlug]);

  if (loadingRestaurants) {
    return <p>Loading restaurants…</p>;
  }
  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }
  if (restaurants.length === 0) {
    return <p>No restaurants found for your hotel.</p>;
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2>Dinner Bookings</h2>

      {/* Dropdown to select restaurant */}
      <div className="mb-3">
        <label htmlFor="restaurantSelect" className="form-label text-light">
          Choose Restaurant:
        </label>
        <select
          id="restaurantSelect"
          className="form-select"
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {loadingBookings ? (
        <p>Loading dinner bookings…</p>
      ) : bookings.length === 0 ? (
        <p>No dinner bookings found for "{restaurants.find(r => r.slug === selectedSlug)?.name}".</p>
      ) : (
        <table
          className="table table-striped table-hover table-dark"
          style={{ borderCollapse: "collapse", marginTop: "12px" }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>ID</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Date</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Time</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Restaurant</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Total Seats</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Adults</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Children</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Infants</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Note</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const total = booking.seats?.total ?? "—";
              const adults = booking.seats?.adults ?? 0;
              const children = booking.seats?.children ?? 0;
              const infants = booking.seats?.infants ?? 0;
              const restaurantName = booking.restaurant?.name || "—";

              return (
                <tr key={booking.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {booking.id}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {booking.date}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {booking.time}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {restaurantName}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {total}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {adults}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {children}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {infants}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {booking.note || "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "8px" }}>
                    {new Date(booking.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
