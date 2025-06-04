import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import api from "@/services/api";
// Extend dayjs with the plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
const GuestList = () => {
  const { hotelIdentifier } = useParams();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const hotelName =
    JSON.parse(localStorage.getItem("user"))?.hotel_name || "Your Hotel";
  const navigate = useNavigate();

  useEffect(() => {
    if (!hotelIdentifier) {
      setError("Missing hotel identifier in URL.");
      setLoading(false);
      return;
    }
    async function fetchGuests() {
      try {
        const res = await api.get(`/guests/${hotelIdentifier}/guests/`);
        console.log("Fetched guests:", res.data.results);
        setGuests(res.data.results);
      } catch {
        setError("Failed to load guests.");
      } finally {
        setLoading(false);
      }
    }
    fetchGuests();
  }, [hotelIdentifier]);

  if (loading) return <p>Loading guests...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  // Filter by name or room #
  const filteredGuests = guests
    .filter((g) => g.in_house) // 🔥 Only guests currently in-house
    .filter(
      (g) =>
        `${g.first_name} ${g.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(g.room_number).includes(searchTerm)
    );

  return (
    <div className="container py-4">
      <h3>Guests at {hotelName}</h3>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or room #"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredGuests.length === 0 ? (
        <p>No guests match your search.</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hotel</th>
              <th>Room #</th>
              <th>Status</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Days</th>
              <th>ID PIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map((g) => (
              <tr key={g.id}>
                <td>
                  {g.first_name} {g.last_name}
                </td>
                <td>{g.hotel_name}</td>
                <td>{g.room_number}</td>
                <td>
                  {g.in_house ? (
                    <span className="badge bg-success">In House</span>
                  ) : (
                    <span className="badge bg-secondary">Checked Out</span>
                  )}
                </td>
                <td>{g.email || "—"}</td>
                <td>{g.phone_number || "—"}</td>
                <td>
                  {g.check_in_date
                    ? dayjs(g.check_in_date).format("DD/MM/YYYY")
                    : "—"}
                </td>
                <td>
                  {g.check_out_date
                    ? dayjs(g.check_out_date).format("DD/MM/YYYY")
                    : "—"}
                </td>
                <td>{g.days_booked}</td>
                <td>{g.id_pin || "—"}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() =>
                      navigate(`/${hotelIdentifier}/guests/${g.id}/edit`)
                    }
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GuestList;
