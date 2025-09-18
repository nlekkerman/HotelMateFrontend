import React, { useEffect, useState } from "react";
import api from "@/services/api";

export default function BookingsHistory({ hotelSlug, restaurantSlug }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelSlug || !restaurantSlug) return;

    async function fetchHistory() {
      try {
        setLoading(true);
        const res = await api.get(
          `/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/?history=true`
        );

        const data = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];

        setHistory(data);
      } catch (err) {
        console.error("Error fetching booking history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [hotelSlug, restaurantSlug]);

  return (
    <div className="p-3">
      <h4 className="mb-3 text-dark">Booking History</h4>

      {loading ? (
        <div className="text-center my-5">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p className="text-muted">Loading booking and history...</p>
      </div>
      ) : history.length === 0 ? (
        <div>No past bookings found.</div>
      ) : (
        <table className="table table-bordered table-striped">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Table</th>
              <th>Time</th>
              <th>Seats</th>
            </tr>
          </thead>
          <tbody>
            {history.map((b) => (
              <tr key={b.id}>
                <td>{b.date}</td>
               <td>
  {b.booking_tables?.length
    ? [b.booking_tables[b.booking_tables.length - 1].table.code].join(", ")
    : "-"}
</td>

                <td>
                  {b.start_time} – {b.end_time}
                </td>
                <td>{b.seats?.total || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
