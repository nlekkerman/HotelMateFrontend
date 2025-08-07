import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

function Search({
  placeholder = "Search...",
  delay = 300,
  apiEndpoint = "/rooms/rooms/",
  hotelId,
}) {
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
            "x-hotel-id": hotelId,
          },
        })
        .then((res) => {
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
    <div className="container my-3">
      <input
        type="search"
        className="mb-3 bg-transparent text-white custom-search rounded-pill p-2"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search"
      />

      {loading && <p className="text-muted">Loading results...</p>}
      {error && <p className="text-danger">{error}</p>}
      {!loading && !error && results.length === 0 && query && (
        <p className="text-muted">No results found</p>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-2 g-4 justify-content-center">
        {results.map((room) => (
          <div key={room.id} className="col">
            <div className="card h-100 border-0 shadow-sm hover-shadow">
              <div className="card-body p-0">
                <h5 className="card-title text-primary main-bg m-1 rounded p-1 text-white text-center">
                  Room {room.room_number}
                </h5>
                <p className="card-text mb-3">
                  <span className="fw-semibold">Guest PIN:</span>{" "}
                  {room.guest_id_pin || "Not assigned"}
                  <br />
                  <span className="fw-semibold">Occupied:</span>{" "}
                  {room.is_occupied ? "Yes" : "No"}
                </p>

                <div className="d-flex justify-content-center">
                  <button
                    className="btn custom-button m-5 main-bg text-white"
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
