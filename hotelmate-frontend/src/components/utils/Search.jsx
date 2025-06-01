import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useNavigate } from 'react-router-dom';

function Search({ placeholder = "Search...", delay = 300, apiEndpoint = "/rooms/rooms/", hotelId }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    const handler = setTimeout(() => {
      setLoading(true);
      setError(null);

      api
        .get(apiEndpoint, {
          params: { search: query },
          headers: {
            'x-hotel-id': hotelId // Add this header here!
          }
        })
        .then((res) => {
          console.log("RESPONSE response data:", res.data);
          setResults(res.data.results || []);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to fetch results");
          setLoading(false);
        });
    }, delay);

    return () => clearTimeout(handler);
  }, [query, apiEndpoint, delay, hotelId]);

  return (
    <div>
      <input
        type="search"
        className="form-control mb-3"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search"
      />

      {loading && <p>Loading results...</p>}
      {error && <p className="text-danger">{error}</p>}
      {!loading && !error && results.length === 0 && query && (
        <p className="text-muted">No results found</p>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {results.map((room) => (
          <div key={room.id} className="col">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-3">Room {room.room_number}</h5>
                <p className="card-text mb-3">
                  <strong>Guest PIN:</strong>{" "}
                  {room.guest_id_pin || "Not assigned"}
                  <br />
                  <strong>Occupied:</strong> {room.is_occupied ? "Yes" : "No"}
                </p>

                <div className="mb-3 d-flex gap-3">
                  {room.room_service_qr_code && (
                    <div className="text-center">
                      <h6 className="mb-1">Room Service QR Code</h6>
                      <img
                        src={room.room_service_qr_code}
                        alt="Room Service QR"
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                  {room.in_room_breakfast_qr_code && (
                    <div className="text-center">
                      <h6 className="mb-1">In-Room Breakfast QR Code</h6>
                      <img
                        src={room.in_room_breakfast_qr_code}
                        alt="Breakfast QR"
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="button-wraper w-100 d-flex justify-content-center mt-2">
                  <button
                    className="btn btn-outline-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rooms/${room.room_number}/add-guest`);
                    }}
                  >
                    Assign Guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Search;
