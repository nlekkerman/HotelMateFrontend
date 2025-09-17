import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";

export default function BookingsGrid({ hotelSlug, restaurantSlug, date }) {
  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [filter, setFilter] = useState("today");
  const timelineRef = useRef(null);

  const timelineStart = { hour: 17, minute: 30 };
  const timelineEnd = { hour: 22, minute: 30 };
  const timelineTotalMinutes =
    timelineEnd.hour * 60 + timelineEnd.minute - (timelineStart.hour * 60 + timelineStart.minute);

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
              : `/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/`
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
    const clampedEnd = Math.min(bookingEndMins, startMins + timelineTotalMinutes);

    const left = ((clampedStart - startMins) / timelineTotalMinutes) * 100;
    const width = ((clampedEnd - clampedStart) / timelineTotalMinutes) * 100;

    return { left, width };
  };

  // Drag & drop handler
  const handleDrop = async (e, tableId) => {
  const bookingId = e.dataTransfer.getData("bookingId");
  if (!bookingId) return;

  // Update state immediately
  setBookings(prev => prev.map(b => 
    b.id.toString() === bookingId ? { ...b, assigned: true, tableId } : b
  ));

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


  return (
    <div className="p-2">
      {/* Filters */}
      <div className="mb-3 d-flex gap-2">
        <button className={`btn ${filter === "today" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilter("today")}>Today</button>
        <button className={`btn ${filter === "upcoming" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilter("upcoming")}>Upcoming</button>
      </div>

      {/* Guest list */}
      <div className="guest-list mb-3 d-flex flex-wrap gap-2 text-dark">
        {bookings.filter((b) => !b.assigned).map((b) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("bookingId", b.id);
              console.log("Drag start from guest list:", b.id);
            }}
            className="p-2 border rounded"
            style={{ minWidth: "150px", fontSize: "0.9rem", cursor: "grab" }}
          >
            {b.guest?.full_name} – Room {b.room?.room_number} <br />
            {b.date} ({b.start_time} - {b.end_time})
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="table-responsive" ref={timelineRef} style={{ position: "relative", height: tables.length * 50 + "px", border: "1px solid #ddd" }}>

        {/* Timeline hours */}
        <div style={{ display: "flex", marginBottom: "5px" }}>
          <div style={{ width: "80px" }}></div>
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            {Array.from({ length: timelineTotalMinutes / 15 + 1 }).map((_, idx) => {
              const mins = timelineStart.minute + idx * 15;
              const hour = timelineStart.hour + Math.floor(mins / 60);
              const minute = mins % 60;
              const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
              return (
                <div key={idx} style={{ color: "black", flex: 1, textAlign: "center", fontSize: "0.75rem", borderLeft: "1px solid #ccc" }}>{label}</div>
              );
            })}
          </div>
        </div>

        {/* Tables */}
        {tables.map((table) => (
          <div
            key={table.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, table.id)}
            style={{ position: "relative", height: "40px", borderBottom: "1px solid #ccc", display: "flex", alignItems: "center" }}
          >
            <div style={{ width: "80px", textAlign: "center", fontWeight: "bold", color: "black" }}>
              Table {table.code.replace(/^T/, "")}
            </div>

            <div style={{ position: "relative", flex: 1, height: "100%" }}>
              {bookings.filter((b) => b.assigned && b.tableId === table.id).map((b) => {
                const { left, width } = getBookingPosition(b.startDate, b.endDate);
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
                      textAlign: "center",
                      fontSize: "0.75rem",
                      cursor: "grab",
                      color: "black",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      lineHeight: "15px",
                    }}
                  >
                    {b.guest?.full_name}
                    <div style={{ fontSize: "0.65rem" }}>
          Room: {b.room?.room_number || "-"} | Seats: {b.seats?.total || 1} | {b.start_time} - {b.end_time}
          
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