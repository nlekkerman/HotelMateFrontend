// src/components/bookings/RestaurantBookings.jsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import RestaurantReservationDetails from "@/components/bookings/RestaurantReservationDetails";

export default function RestaurantBookings({ hotelSlug, restaurantId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  useEffect(() => {
    if (!hotelSlug || !restaurantId) return;

    const allResults = [];

    const fetchAllPages = async (url) => {
      try {
        const res = await api.get(url);
        const data = res.data;
        if (Array.isArray(data.results)) {
          allResults.push(...data.results);
          if (data.next) {
            await fetchAllPages(data.next.replace(api.defaults.baseURL + "/", ""));
          }
        }
      } catch (err) {
        throw err;
      }
    };

    const initialUrl = `bookings/bookings/?hotel_slug=${hotelSlug}&restaurant=${restaurantId}`;
    setLoading(true);
    setError(null);
    fetchAllPages(initialUrl)
      .then(() => setBookings(allResults))
      .catch((err) => {
        console.error("Error fetching bookings:", err);
        setError("Failed to fetch bookings.");
      })
      .finally(() => setLoading(false));
  }, [hotelSlug, restaurantId]);

  const displayDate = new Date().toISOString().slice(0, 10);
  const todaysBookings = bookings.filter((b) => b.date === displayDate);
  const upcomingBookings = bookings.filter((b) => b.date > displayDate);

const renderRow = (booking) => {
  console.log("Booking data:", booking); // 👈 Debug output

  const { adults = 0, children = 0, infants = 0 } = booking.seats || {};
  const name =
  booking.guest?.full_name || 
  booking.room?.guests_in_room?.[0]?.full_name ||
  booking.restaurant?.name ||
  "—";

  const room = booking.room?.room_number || "—";

  return (
    <React.Fragment key={booking.id}>
      <tr
        onClick={() =>
          setExpandedBookingId(
            booking.id === expandedBookingId ? null : booking.id
          )
        }
        style={{ cursor: "pointer" }}
      >
        <td>{name}</td>
        <td>{room}</td>
        <td>{adults}</td>
        <td>{children}</td>
        <td>{infants}</td>
      </tr>
      {expandedBookingId === booking.id && (
        <tr>
          <td colSpan="5">
            <RestaurantReservationDetails
              booking={booking}
              onClose={() => setExpandedBookingId(null)}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};


  const renderTable = (rows) => (
    <table className="table table-dark table-hover mb-0">
      <thead>
        <tr>
          <th>Name</th>
          <th>Room</th>
          <th>a</th>
          <th>k</th>
          <th>i</th>
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  );

if (loading) {
  return (
    <div className="text-center my-4">
      <div className="spinner-border text-dark mb-2" role="status" />
      <div className="text-dark">Loading bookings…</div>
    </div>
  );
}
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="my-4">
      <div className="card  text-light mb-4 shadow">
        <div className="card-header main-bg">Today’s Bookings ({displayDate})</div>
        <div className="card-body text-dark p-0">
          {todaysBookings.length > 0 ? renderTable(todaysBookings) : <div className="text-center p-3">No bookings for today.</div>}
        </div>
      </div>
      <div className="card  text-light shadow">
        <div className="card-header  main-bg">Upcoming Bookings</div>
        <div className="card-body text-dark p-0">
          {upcomingBookings.length > 0 ? renderTable(upcomingBookings) : <div className="text-center p-3">No upcoming bookings.</div>}
        </div>
      </div>
    </div>
  );
}
