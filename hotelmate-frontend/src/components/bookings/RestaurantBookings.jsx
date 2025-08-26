import React, { useEffect, useState } from "react";
import api from "@/services/api";
import RestaurantReservationDetails from "@/components/bookings/RestaurantReservationDetails";
import { Modal } from "react-bootstrap";

export default function RestaurantBookings({ hotelSlug, restaurantId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (!hotelSlug || !restaurantId) return;

    const allResults = [];

    const fetchAllPages = async (url) => {
  try {
    const res = await api.get(url.startsWith("http") ? url.replace(api.defaults.baseURL, "") : url);
    const data = res.data;

    if (Array.isArray(data.results)) {
      allResults.push(...data.results);

      if (data.next) {
        await fetchAllPages(
          data.next.startsWith("http") ? data.next.replace(api.defaults.baseURL, "") : data.next
        );
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
    const { adults = 0, children = 0, infants = 0 } = booking.seats || {};
    const name =
      booking.guest?.full_name ||
      booking.room?.guests_in_room?.[0]?.full_name ||
      booking.restaurant?.name ||
      "—";
    const room = booking.room?.room_number || "—";
    const voucher = booking.voucher_code || "—";
    const tables =
      booking.assigned_tables
        ?.map((t) => t.table.code) // ← use `table.code` instead of `name`
        .join(", ") || "—";

    return (
      <tr
        key={booking.id}
        onClick={() => setSelectedBooking(booking)}
        style={{ cursor: "pointer" }}
      >
        <td>{name}</td>
        <td>{room}</td>
        <td>{booking.start_time || "—"}</td>
        <td>{booking.end_time || "—"}</td>
        <td>{tables}</td>
        <td>{adults + children + infants}</td>
        <td>
          {voucher !== "—" ? (
            <span className="badge bg-primary">{voucher}</span>
          ) : (
            "—"
          )}
        </td>
      </tr>
    );
  };

  const renderTable = (rows) => (
    <table className="table table-light table-hover mb-0">
      <thead>
        <tr>
          <th>Name</th>
          <th>Room</th>
          <th>Start</th>
          <th>End</th>
          <th>Tables</th>
          <th>Seats</th>
          <th>Voucher</th>
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
    <>
      <div className="my-4">
        <div className="card text-light mb-4 shadow">
          <div className="card-header main-bg">
            Today’s Bookings ({displayDate})
          </div>
          <div className="card-body text-dark p-0">
            {todaysBookings.length > 0 ? (
              renderTable(todaysBookings)
            ) : (
              <div className="text-center p-3">No bookings for today.</div>
            )}
          </div>
        </div>
        <div className="card text-light shadow">
          <div className="card-header main-bg">Upcoming Bookings</div>
          <div className="card-body text-dark p-0">
            {upcomingBookings.length > 0 ? (
              renderTable(upcomingBookings)
            ) : (
              <div className="text-center p-3">No upcoming bookings.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Booking Details */}
      <Modal
        show={!!selectedBooking}
        onHide={() => setSelectedBooking(null)}
        centered
        size="lg"
      >
        <Modal.Body>
          {selectedBooking && (
            <RestaurantReservationDetails
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
