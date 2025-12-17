import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import api from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

// Extend dayjs with the plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
const GuestList = () => {
  const { hotelIdentifier } = useParams();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { mainColor } = useTheme();

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

   if (loading) {
  return (
    <div className="loading">
      <div className="text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading guests...</p>
      </div>
    </div>
  );
}
  if (error) return <p className="text-danger">{error}</p>;

  // Filter by name or room # - only show guests who are actually checked in
  const filteredGuests = guests
    .filter((g) => g.checked_in_at && g.in_house) // Only guests currently in-house with valid check-in
    .filter(
      (g) =>
        `${g.first_name} ${g.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(g.room_number).includes(searchTerm)
    );

  return (
    <div className="container-fluid py-4">
      <h3
        className={`text-center text-white main-bg ${
          mainColor ? "" : "bg-dark"
        }`}
      >
        Guests at {hotelName}
      </h3>

      {/* Mobile Quick Actions - Same style as desktop */}
      <div 
        className="d-lg-none position-fixed start-0 end-0"
        style={{
          top: "60px",
          zIndex: 1045,
          background: "transparent",
        }}
      >
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
            <button className="contextual-action-btn" onClick={() => navigate(`/${hotelIdentifier}/guests`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-people-fill" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>All Guests</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate('/rooms')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-door-open" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Rooms</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate('/bookings')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-calendar-event" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Bookings</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelIdentifier}/orders`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-receipt" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Room Service</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control  mx-2"
          placeholder="Search by name or room #"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredGuests.length === 0 ? (
        <p>No guests match your search.</p>
      ) : (
        <div className="rounded m-1 shadow-sm overflow-hidden ">
          {/* Header row visible only on large screens */}

          {[...filteredGuests]
            .sort((a, b) => (a.room_number || 0) - (b.room_number || 0))
            .map((g, index) => (
              <div
                key={g.id}
                className={`d-flex flex-column justify-content-center flex-lg-row px-3 py-3 border-bottom vw-100 ${
                  index % 2 === 0 ? "bg-light" : "bg-light"
                }`}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  navigate(`/${hotelIdentifier}/guests/${g.id}/edit`)
                }
              >
                <div className="d-flex flex-column flex-lg-row w-100 px-3 py-3 border-bottom">
                  <div className="col-lg-2 mb-2 mb-lg-0 flex-grow-1">
  <div className="d-block d-lg-none mb-1">
    <strong>Name:</strong> <span className="fw-semibold fs-6 text-primary">{g.first_name} {g.last_name}</span>
  </div>
  <div className="d-none d-lg-block">
    <div className="fw-bold">Name:</div>
    <div className="fw-semibold fs-6 text-primary">
      {g.first_name} {g.last_name}
    </div>
  </div>
</div>


                  <div className="col-lg-1 mb-2 mb-lg-0 flex-grow-1">
                    <div className="d-block d-lg-none">
                      <strong>Room:</strong> {g.room_number}
                    </div>
                    <div className="d-none d-lg-block">
                      <div className="fw-bold">Room:</div>
                      {g.room_number}
                    </div>
                  </div>

                  <div className="col-lg-1 mb-2 mb-lg-0 flex-grow-1">
                    <div className="d-block d-lg-none">
                      <strong>Status:</strong>{" "}
                      <span
                        className={`badge ${
                          (g.checked_in_at && g.in_house) ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {(g.checked_in_at && g.in_house) ? "In House" : "Checked Out"}
                      </span>
                    </div>
                    <div className="d-none d-lg-block">
                      <div className="fw-bold">Status:</div>
                      <span
                        className={`badge ${
                          (g.checked_in_at && g.in_house) ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {(g.checked_in_at && g.in_house) ? "In House" : "Checked Out"}
                      </span>
                    </div>
                  </div>

              
                  <div className="col-lg-1 mb-2 mb-lg-0 flex-grow-1">
                    <div className="d-block d-lg-none">
                      <strong>Check-Out:</strong>{" "}
                      {g.check_out_date
                        ? dayjs(g.check_out_date).format("DD/MM/YYYY")
                        : "—"}
                    </div>
                    <div className="d-none d-lg-block">
                      <div className="fw-bold">Check-In:</div>
                      {g.check_in_date
                        ? dayjs(g.check_in_date).format("DD/MM/YYYY")
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default GuestList;
