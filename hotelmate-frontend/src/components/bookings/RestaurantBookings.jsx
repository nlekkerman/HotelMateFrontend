import React, { useEffect, useState } from "react";
import api from "@/services/api";
import RestaurantReservationDetails from "@/components/bookings/RestaurantReservationDetails";
import BookingsGrid from "@/components/bookings/BookingsGrid";
import BookingsHistory from "@/components/bookings/BookingsHistory";
import { useServiceBookingState, serviceBookingActions } from "@/realtime/stores/serviceBookingStore";
import { Modal } from "react-bootstrap";

export default function RestaurantBookings({ hotelSlug, restaurantId }) {
  const bookingState = useServiceBookingState();
  const [bookings, setBookings] = useState([]);
  const [restaurantSlug, setRestaurantSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const displayDate = new Date().toISOString().slice(0, 10);
  
  // Get bookings from store filtered by restaurant
  const storeBookings = Object.values(bookingState.bookingsById)
    .filter(booking => booking.restaurant_id === Number(restaurantId));

  // Fetch restaurant slug
  useEffect(() => {
    if (!hotelSlug || !restaurantId) return;

    async function fetchRestaurantSlug() {
      try {
        const res = await api.get(
          `/bookings/restaurants/?hotel_slug=${hotelSlug}`
        );
        const restaurant = res.data.results.find(
          (r) => r.id === Number(restaurantId)
        );
        if (!restaurant) throw new Error("Restaurant not found");
        setRestaurantSlug(restaurant.slug);
      } catch (err) {
        console.error("Failed to fetch restaurant slug:", err);
        setError("Failed to fetch restaurant slug.");
      }
    }

    fetchRestaurantSlug();
  }, [hotelSlug, restaurantId]);

  // Fetch bookings
  useEffect(() => {
    if (!hotelSlug || !restaurantSlug) return;

    const allResults = [];

    const fetchAllPages = async (params) => {
      try {
        const res = await api.get(`/bookings/bookings/`, { params });
        const data = res.data;

        if (Array.isArray(data.results)) allResults.push(...data.results);

        if (data.next) {
          const nextUrl = new URL(data.next);
          const nextParams = Object.fromEntries(nextUrl.searchParams.entries());
          await fetchAllPages(nextParams);
        }
      } catch (err) {
        console.error("Error fetching bookings:", err);
        throw err;
      }
    };

    setLoading(true);
    setError(null);

    fetchAllPages({ hotel_slug: hotelSlug, restaurant: restaurantSlug })
      .then(() => {
        setBookings(allResults);
        // Initialize store with fetched data
        serviceBookingActions.initFromAPI(allResults);
      })
      .catch(() => setError("Failed to fetch bookings."))
      .finally(() => setLoading(false));
  }, [hotelSlug, restaurantSlug]);

  const sortBookings = (a, b) => {
    const dateA = new Date(`${a.date}T${a.start_time || "00:00"}`);
    const dateB = new Date(`${b.date}T${b.start_time || "00:00"}`);
    return dateA - dateB;
  };

  // Combine local bookings with store bookings for comprehensive display
  const allBookingsList = [...bookings, ...storeBookings];
  // Remove duplicates based on booking ID
  const uniqueBookings = allBookingsList.reduce((acc, booking) => {
    if (!acc.find(b => b.id === booking.id)) {
      acc.push(booking);
    }
    return acc;
  }, []);

  const todaysBookings = uniqueBookings
    .filter((b) => b.date === displayDate)
    .sort(sortBookings);
  const upcomingBookings = uniqueBookings
    .filter((b) => b.date > displayDate)
    .sort(sortBookings);

  const renderRow = (booking) => {
    const { adults = 0, children = 0, infants = 0 } = booking.seats || {};
    const name =
      booking.guest?.full_name ||
      booking.room?.guests_in_room?.[0]?.full_name ||
      booking.restaurant?.name ||
      "—";
    const room = booking.room?.room_number || "—";
    const voucher = booking.voucher_code || "—";

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
          {/* ✅ Toggle buttons */}
          <div className="d-flex justify-content-end gap-2 m-2 px-2">
            {!showHistory && (
              <button
                className="btn btn-sm custom-button"
                onClick={() => setShowGrid(!showGrid)}
              >
                {showGrid ? "Hide Grid View" : "Show Grid View"}
              </button>
            )}
            <button
              className={`btn btn-sm ${
                showHistory ? "btn-primary" : "custom-button"
              }`}
              onClick={() => {
                setShowHistory(!showHistory);
                setShowGrid(false); // hide grid when showing history
              }}
            >
              {showHistory ? "Back to Current" : "Show History"}
            </button>
          </div>

          {/* ✅ Render history OR normal views */}
          {showHistory ? (
            <BookingsHistory
              hotelSlug={hotelSlug}
              restaurantSlug={restaurantSlug}
            />
          ) : (
            <>
              {showGrid && restaurantSlug && (
                <BookingsGrid
                  hotelSlug={hotelSlug}
                  restaurantSlug={restaurantSlug}
                  date={displayDate}
                />
              )}
              {!showGrid && (
                <>
                  <div className="card-header main-bg">
                    Today’s Bookings ({displayDate})
                  </div>
                  <div className="card-body text-dark p-0">
                    {todaysBookings.length ? (
                      renderTable(todaysBookings)
                    ) : (
                      <div className="text-center p-3">
                        No bookings for today.
                      </div>
                    )}
                  </div>

                  <div className="card mt-3 text-light shadow">
                    <div className="card-header main-bg">Upcoming Bookings</div>
                    <div className="card-body text-dark p-0">
                      {upcomingBookings.length ? (
                        renderTable(upcomingBookings)
                      ) : (
                        <div className="text-center p-3">
                          No upcoming bookings.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

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
