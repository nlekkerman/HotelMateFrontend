import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import api from "@/services/api";
import Search from "@/components/utils/Search"; // Adjust alias if needed

const fetchRooms = async ({ queryKey }) => {
  const [_key, page, search] = queryKey;
  const userData = JSON.parse(localStorage.getItem("user"));
  const hotelId = userData?.hotel_id;
  console.log("[fetchRooms] Page:", page);
  console.log("[AAAAAAAAAAAAAa] Search Query:", userData?.searchQuery);
  console.log("[fetchRooms] Hotel ID from localStorage:", hotelId);

  try {
    const response = await api.get("/rooms/rooms/", {
      params: {
        page,
        search,
        hotel_id: hotelId,
      },
    });

    console.log("[fetchRooms] API Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("[fetchRooms] API Error:", err);
    throw err;
  }
};

function RoomList() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { hotelIdentifier, roomNumber } = useParams();
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["rooms", page, searchQuery],
    queryFn: fetchRooms,
    keepPreviousData: true,
  });
  const rooms = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const next = data?.next;
  const previous = data?.previous;

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setPage(pageNum);
  };

  // Reset page to 1 on new search
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  if (isLoading) return <p className="text-center">Loading rooms...</p>;
  if (isError)
    return <p className="text-center text-danger">Error: {error.message}</p>;

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-center">
        Rooms (Page {page} of {totalPages}){" "}
        {isFetching && <small className="text-muted">(Updating...)</small>}
      </h2>

      {/* Search input */}

      {/* Rooms list */}
      {rooms.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="col"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`)}
            >
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title mb-3">Room {room.room_number}</h5>
                  <p className="card-text mb-3">
                    <strong>Guest PIN:</strong>{" "}
                    {room.guest_id_pin || "Not assigned"}
                    <br />
                    <strong>Occupied:</strong> {room.is_occupied ? "Yes" : "No"}
                  </p>

                  {/* QR codes with titles */}
                  <div className="mb-3">
                    {room.room_service_qr_code && (
                      <div className="mb-2 text-center">
                        <h6 className="mb-1">Room Service QR Code</h6>
                        <img
                          src={room.room_service_qr_code}
                          alt="Room Service QR"
                          style={{
                            width: 120,
                            height: 120,
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
                            width: 120,
                            height: 120,
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="button-wraper w-100 d-flex justify-content-center mt-2">
  {!room.is_occupied && (
    <button
      className="btn btn-outline-primary"
      onClick={(e) => {
        e.stopPropagation(); // Prevent parent click
        navigate(`/rooms/${room.room_number}/add-guest`);
      }}
    >
      Assign Guest
    </button>
  )}
</div>
                    {room.is_occupied && (
                      <div className="text-danger text-center mt-1">
                        Room is already occupied
                      </div>
                    )}
                  </div>

                  {/* Optional: add a spacer to push pagination to bottom if needed */}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted">No rooms found</p>
      )}

      {/* Pagination */}
      <nav
        aria-label="Room list pagination"
        className="mt-4 d-flex justify-content-center"
      >
        <ul className="pagination">
          {/* Start (First page) */}
          {page > 2 && ( // Show only if current page is beyond 2 to avoid clutter
            <li className="page-item">
              <button className="page-link" onClick={() => goToPage(1)}>
                Start
              </button>
            </li>
          )}
          {/* Previous */}
          <li className={`page-item ${!previous ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => goToPage(page - 1)}
              disabled={!previous}
            >
              ⏮️
            </button>
          </li>

          {/* One before current page */}
          {page > 1 && (
            <li className="page-item">
              <button className="page-link" onClick={() => goToPage(page - 1)}>
                {page - 1}
              </button>
            </li>
          )}

          {/* Current page */}
          <li className="page-item active" aria-current="page">
            <span className="page-link">{page}</span>
          </li>

          {/* One after current page */}
          {page < totalPages && (
            <li className="page-item">
              <button className="page-link" onClick={() => goToPage(page + 1)}>
                {page + 1}
              </button>
            </li>
          )}

          {/* Last page */}

          {/* Next */}
          <li className={`page-item ${!next ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => goToPage(page + 1)}
              disabled={!next}
            >
              ⏭️
            </button>
          </li>
          {page < totalPages - 1 && (
            <li className="page-item">
              <button
                className="page-link"
                onClick={() => goToPage(totalPages)}
              >
                End
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}

export default RoomList;
