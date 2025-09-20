import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
export default function BookingsGrid({ hotelSlug, restaurantSlug, date }) {
  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [filter, setFilter] = useState("today");
  const timelineRef = useRef(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const timelineStart = { hour: 17, minute: 30 };
  const timelineEnd = { hour: 22, minute: 30 };
  const timelineTotalMinutes =
    timelineEnd.hour * 60 +
    timelineEnd.minute -
    (timelineStart.hour * 60 + timelineStart.minute);

  // Fetch tables & bookings
  useEffect(() => {
    async function fetchData() {
      if (!hotelSlug || !restaurantSlug) return;
      try {
        const [tablesRes, bookingsRes] = await Promise.all([
          api.get(`/bookings/${hotelSlug}/${restaurantSlug}/tables/`),
          api.get(
            filter === "today"
              ? `/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/?date=${date}`
              : `/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/?upcoming=true`
          ),
        ]);

        // Sort tables numerically (subtables after main number)
        const sortedTables = [...tablesRes.data].sort((a, b) => {
          const regex = /^T(\d+)([A-Z]*)$/i;
          const [, numA, suffixA] = a.code.match(regex) || [0, 0, ""];
          const [, numB, suffixB] = b.code.match(regex) || [0, 0, ""];
          const diff = parseInt(numA) - parseInt(numB);
          if (diff !== 0) return diff;
          return suffixA.localeCompare(suffixB);
        });
        setTables(sortedTables);

        const bookingsData = Array.isArray(bookingsRes.data)
          ? bookingsRes.data
          : bookingsRes.data.results || [];

        // Convert start/end to Date objects & mark assigned
        const validBookings = bookingsData.map((b) => {
          const [y, m, d] = b.date.split("-").map(Number);
          const [sh, sm] = b.start_time.split(":").map(Number);
          const [eh, em] = b.end_time.split(":").map(Number);
          return {
            ...b,
            startDate: new Date(y, m - 1, d, sh, sm),
            endDate: new Date(y, m - 1, d, eh, em),
            assigned: b.booking_tables?.length > 0,
            tableId: b.booking_tables?.[0]?.table.id || null,
          };
        });
        setBookings(validBookings);
      } catch (err) {
        console.error("Error fetching bookings/tables:", err);
      } finally {
        setLoading(false); // ✅ Stop spinner
      }
    }
    fetchData();
  }, [hotelSlug, restaurantSlug, date, filter]);

  // Compute left % and width % for a booking
  const getBookingPosition = (startDate, endDate) => {
    const startMins = timelineStart.hour * 60 + timelineStart.minute;
    const bookingStartMins = startDate.getHours() * 60 + startDate.getMinutes();
    const bookingEndMins = endDate.getHours() * 60 + endDate.getMinutes();

    const clampedStart = Math.max(bookingStartMins, startMins);
    const clampedEnd = Math.min(
      bookingEndMins,
      startMins + timelineTotalMinutes
    );

    const left = ((clampedStart - startMins) / timelineTotalMinutes) * 100;
    const width = ((clampedEnd - clampedStart) / timelineTotalMinutes) * 100;

    return { left, width };
  };
  const normalizeBooking = (b) => {
    if (!b) return null;
    const [y, m, d] = b.date.split("-").map(Number);
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return {
      ...b,
      startDate: new Date(y, m - 1, d, sh, sm),
      endDate: new Date(y, m - 1, d, eh, em),
      assigned: b.booking_tables?.length > 0,
      tableId: b.booking_tables?.[0]?.table.id || null,
    };
  };

  // Drag & drop handler
  const handleDrop = async (e, tableId) => {
    const bookingId = e.dataTransfer.getData("bookingId");
    if (!bookingId) return;

    // Update state immediately
    setBookings((prev) =>
      prev.map((b) =>
        b.id.toString() === bookingId ? { ...b, assigned: true, tableId } : b
      )
    );

    console.log("Booking assigned locally:", bookingId, "to table", tableId);

    // Then sync with backend
    try {
      await api.post(`/bookings/assign/${hotelSlug}/${restaurantSlug}/`, {
        booking_id: bookingId,
        table_id: tableId,
      });
      console.log("Booking synced to backend:", bookingId);
    } catch (err) {
      console.error("Failed to assign booking to backend:", err);
    }
  };

  // Delete booking completely
  const handleDelete = async (bookingId) => {
    try {
      const res = await api.delete(
        `/bookings/delete/${hotelSlug}/${restaurantSlug}/${bookingId}/`
      );

      if (res.data.success) {
        setBookings((prev) => prev.filter((b) => b.id !== res.data.booking_id));
        console.log("Booking deleted:", res.data.booking_id);
      }
    } catch (err) {
      console.error("Failed to delete booking:", err);
    } finally {
      setBookingToDelete(null); // close modal
    }
  };

  // Unseat booking (remove from table -> guest list)
  const handleUnseat = async (bookingId) => {
    try {
      const res = await api.post(
        `/bookings/unseat/${hotelSlug}/${restaurantSlug}/`,
        {
          booking_id: bookingId,
        }
      );

      if (res.data.success) {
        const updatedBooking = normalizeBooking(res.data.booking);
        setBookings((prev) =>
          prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
        );
      }
    } catch (err) {
      console.error("Failed to unseat booking:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading booking and tables...</p>
      </div>
    );
  }
  return (
    <div className="p-2">
      {/* Confirmation Modal */}
      {bookingToDelete && (
        <ConfirmationModal
          title="Confirm Deletion"
          message={`Are you sure you want to delete booking for ${bookingToDelete.guest?.full_name}?`}
          onConfirm={() => handleDelete(bookingToDelete.id)}
          onCancel={() => setBookingToDelete(null)}
        />
      )}
      <div className="mb-3 d-flex gap-2">
        <button
          className={`btn ${
            filter === "today" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setFilter("today")}
        >
          Today
        </button>
        <button
          className={`btn ${
            filter === "upcoming" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
        </button>
      </div>

      {/* Guest list */}
      <div className="guest-list mb-3 d-flex flex-wrap gap-2 text-dark">
        {bookings
          .filter((b) => !b.assigned)
          .map((b) => (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("bookingId", b.id);
                console.log("Drag start from guest list:", b.id);
              }}
              className="p-2 border rounded d-flex justify-content-between align-items-center"
              style={{ minWidth: "200px", fontSize: "0.9rem", cursor: "grab" }}
            >
              <div>
                {b.guest?.full_name} – Room {b.room?.room_number} <br />
                {b.date} ({b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}){" "}
                <br />
                Adults:{" "}
                <span className="text-primary fw-bold">
                  {b.seats?.adults || 0}
                </span>
                , Children:{" "}
                <span className="text-success fw-bold">
                  {b.seats?.children || 0}
                </span>
                , Infants:{" "}
                <span className="text-danger fw-bold">
                  {b.seats?.infants || 0}
                </span>
              </div>

              <button
                className="btn btn-sm btn-danger ms-2 on-hoover-button"
                title="Delete this booking"
                onClick={() => setBookingToDelete(b)}
              >
                🗑
              </button>
            </div>
          ))}
      </div>

      {/* Timeline grid */}
      <div
        className="table-responsive"
        ref={timelineRef}
        style={{
          position: "relative",
          height: tables.length * 50 + "px",
          border: "1px solid #ddd",
        }}
      >
        {/* Timeline hours */}
        <div style={{ display: "flex", marginBottom: "5px" }}>
          <div style={{ width: "80px" }}></div>
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            {Array.from({ length: timelineTotalMinutes / 15 + 1 }).map(
              (_, idx) => {
                const mins = timelineStart.minute + idx * 15;
                const hour = timelineStart.hour + Math.floor(mins / 60);
                const minute = mins % 60;
                const label = `${String(hour).padStart(2, "0")}:${String(
                  minute
                ).padStart(2, "0")}`;
                return (
                  <div
                    key={idx}
                    style={{
                      color: "black",
                      flex: 1,
                      textAlign: "center",
                      fontSize: "0.75rem",
                      borderLeft: "1px solid #ccc",
                    }}
                  >
                    {label}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Tables */}
        {tables.map((table) => (
          <div
            key={table.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, table.id)}
            style={{
              position: "relative",
              height: "40px",
              borderBottom: "1px solid #ccc",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                textAlign: "center",
                fontWeight: "bold",
                color: "black",
              }}
            >
              Table {table.code.replace(/^T/, "")}
            </div>

            <div style={{ position: "relative", flex: 1, height: "100%" }}>
              {bookings
                .filter((b) => b.assigned && b.tableId === table.id)
                .map((b) => {
                  const { left, width } = getBookingPosition(
                    b.startDate,
                    b.endDate
                  );
                  return (
                    <div
                      key={b.id}
                      draggable
                      className="main-bg text-white"
                      onDragStart={(e) => {
                        e.dataTransfer.setData("bookingId", b.id);
                        console.log("Drag start from timeline:", b.id);
                      }}
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        width: `${width}%`,
                        height: "90%",
                        border: "1px solid #999",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        cursor: "grab",
                        color: "black",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        padding: "2px",
                      }}
                    >
                      {/* Top-right overlay buttons */}
                      <div
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "2px",
                          display: "flex",
                          gap: "4px",
                        }}
                      >
                        <button
                          className="btn btn-sm btn-warning p-1 on-hoover-button"
                          style={{ lineHeight: 1, fontSize: "0.65rem" }}
                          title="Unseat this booking"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnseat(b.id);
                          }}
                        >
                          ⤴
                        </button>
                        <button
                          className="btn btn-sm btn-danger p-1 on-hoover-button"
                          style={{ lineHeight: 1, fontSize: "0.65rem" }}
                          title="Delete this booking"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingToDelete(b);
                          }}
                        >
                          🗑
                        </button>
                      </div>

                      {/* Booking content (unaffected by buttons) */}
                      <div>{b.guest?.full_name}</div>
                      <div style={{ fontSize: "0.65rem" }}>
                        Room: {b.room?.room_number || "-"} | Seats:{" "}
                        {b.seats?.total || 1} | {b.start_time.slice(0, 5)} -{" "}
                        {b.end_time.slice(0, 5)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
