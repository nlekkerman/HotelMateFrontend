// src/components/bookings/RestaurantBookings.jsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";

export default function RestaurantBookings({ hotelSlug, restaurantId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug || !restaurantId) return;

    setLoading(true);
    setError(null);

    api
      .get(
        `bookings/bookings/?hotel_slug=${hotelSlug}&restaurant=${restaurantId}`
      )
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) {
          data = data.results;
         
        } else if (!Array.isArray(data)) {
          console.warn("Unexpected bookings response:", data);
          data = [];
        }
        setBookings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch bookings for restaurant:", err);
        if (err.response) {
          
          setError(`Error ${err.response.status}: ${err.response.statusText}`);
        } else {
          setError("Network error while fetching bookings.");
        }
        setLoading(false);
      });
  }, [hotelSlug, restaurantId]);

  const now = new Date();
  const todayMid = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const displayDate = new Date(
    todayMid.getFullYear(),
    todayMid.getMonth(),
    todayMid.getDate()
  )
    .toISOString()
    .slice(0, 10);
  // Partition bookings using Date objects
  const todaysBookings = bookings.filter((b) => {
    const bd = new Date(b.date); // parse API date (ISO or "June 8, 2025")
    bd.setHours(0, 0, 0, 0); // normalize to midnight
    return bd.getTime() === todayMid.getTime();
  });

  const upcomingBookings = bookings.filter((b) => {
    const bd = new Date(b.date);
    bd.setHours(0, 0, 0, 0);
    return bd.getTime() > todayMid.getTime();
  });
  if (loading) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4" role="alert">
        {error}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="alert alert-info my-4 text-center" role="alert">
        No bookings found for this restaurant.
      </div>
    );
  }

  // Reusable table-rendering function
  const renderTable = (rows) => (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-dark mb-0">
        <thead>
          <tr>
            <th scope="col" className="border-secondary py-2">
              ID
            </th>
            <th scope="col" className="border-secondary py-2">
              Date
            </th>
            <th scope="col" className="border-secondary py-2">
              Time
            </th>
            <th scope="col" className="border-secondary py-2">
              Note
            </th>
            <th scope="col" className="border-secondary py-2">
              Total Seats
            </th>
            <th scope="col" className="border-secondary py-2">
              Adults
            </th>
            <th scope="col" className="border-secondary py-2">
              Children
            </th>
            <th scope="col" className="border-secondary py-2">
              Infants
            </th>
            <th scope="col" className="border-secondary py-2">
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => {
            const totalSeats = booking.seats?.total ?? "—";
            const adults = booking.seats?.adults ?? 0;
            const children = booking.seats?.children ?? 0;
            const infants = booking.seats?.infants ?? 0;

            return (
              <tr key={booking.id}>
                <td className="border-secondary py-2">{booking.id}</td>
                <td className="border-secondary py-2">{booking.date}</td>
                <td className="border-secondary py-2">{booking.time}</td>
                <td className="border-secondary py-2">{booking.note || "—"}</td>
                <td className="border-secondary py-2">{totalSeats}</td>
                <td className="border-secondary py-2">{adults}</td>
                <td className="border-secondary py-2">{children}</td>
                <td className="border-secondary py-2">{infants}</td>
                <td className="border-secondary py-2">
                  {new Date(booking.created_at).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="my-4">
      {/* Card for Today’s Bookings (if any) */}
      <div className="card bg-dark text-light mb-4 shadow">
        <div className="card-header bg-secondary">
          <h5 className="mb-0">Today’s Bookings ({displayDate})</h5>
        </div>
        <div className="card-body p-0">
          {todaysBookings.length > 0 ? (
            renderTable(todaysBookings)
          ) : (
            <div className="alert alert-info m-3 text-center" role="alert">
              No bookings for today.
            </div>
          )}
        </div>
      </div>

      {/* Card for Upcoming Bookings (future dates) */}
      <div className="card bg-dark text-light shadow">
        <div className="card-header bg-secondary">
          <h5 className="mb-0">Upcoming Bookings</h5>
        </div>
        <div className="card-body p-0">
          {upcomingBookings.length > 0 ? (
            renderTable(upcomingBookings)
          ) : (
            <div className="alert alert-info m-3 text-center" role="alert">
              No upcoming bookings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
