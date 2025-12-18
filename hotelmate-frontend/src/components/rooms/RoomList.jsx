import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useQrPdfPrinter } from "@/components/rooms/hooks/useQrPdfPrinter";
import CheckoutRoomsPanel from "@/components/rooms/CheckoutRoomsPanel";
import RoomCard from "@/components/rooms/RoomCard";

const fetchRooms = async ({ queryKey }) => {
  const [_key, page, search] = queryKey;
  const userData = JSON.parse(localStorage.getItem("user"));
  const hotelSlug = userData?.hotel_slug;

  if (!hotelSlug) {
    throw new Error('Hotel slug not found in user data');
  }

  const response = await api.get(`/staff/hotel/${hotelSlug}/rooms/`, {
    params: { page, search },
  });
  
  return response.data;
};

function RoomList() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [localRooms, setLocalRooms] = useState([]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["rooms", page, searchQuery],
    queryFn: fetchRooms,
    keepPreviousData: true,
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { generateQrPdf } = useQrPdfPrinter();
  const userData = JSON.parse(localStorage.getItem("user"));

  const rooms = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 10);

  // Keep local reactive state
  useEffect(() => {
    if (rooms.length) {
      setLocalRooms(rooms);
    }
  }, [rooms]);

  const handleCheckboxChange = (roomId) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleCheckout = async () => {
    if (selectedRooms.length === 0) return;

    try {
      await api.post(`rooms/${userData.hotel_slug}/checkout/`, {
        room_ids: selectedRooms,
      });

      // Update localRooms for checked-out rooms
      setLocalRooms((prev) =>
        prev.map((room) =>
          selectedRooms.includes(room.id) ? { ...room, is_occupied: false } : room
        )
      );

      setSelectedRooms([]);
      qc.invalidateQueries(["rooms", page, searchQuery]);
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Failed to checkout selected rooms.");
    }
  };

  useEffect(() => setPage(1), [searchQuery]);

  if (isLoading)
    return (
      <div className="loading">
        <div className="text-center">
          <div className="spinner-border text-dark mb-3" role="status" />
          <p>Loading Rooms...</p>
        </div>
      </div>
    );

  if (isError) return <p className="text-center text-danger">Error: {error.message}</p>;

  return (
    <div className="container d-flex flex-column my-4 p-0 vw-100">
      {userData?.is_superuser && (
        <>
          <button className="custom-button mb-3" onClick={() => generateQrPdf(localRooms)}>
            Print QR PDFs
          </button>
          <CheckoutRoomsPanel
            hotelSlug={userData.hotel_slug}
            token={userData.token}
            onRoomsCheckout={(checkedOutRoomIds) => {
              // Update localRooms when rooms are checked out via panel
              setLocalRooms((prev) =>
                prev.map((room) =>
                  checkedOutRoomIds.includes(room.id)
                    ? { ...room, is_occupied: false }
                    : room
                )
              );
            }}
          />
        </>
      )}

      <h2 className="mb-4 text-center">
        Rooms (Page {page} of {totalPages}){" "}
        {isFetching && <small className="text-muted">(Updating...)</small>}
      </h2>

      {selectedRooms.length > 0 && (
        <button className="btn btn-danger ms-auto mb-2" onClick={handleCheckout}>
          Checkout selected ({selectedRooms.length})
        </button>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-5 justify-content-center g-2">
        {localRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={{ ...room }} // spread to force re-render
            selectedRooms={selectedRooms}
            onSelect={handleCheckboxChange}
          />
        ))}
      </div>

      {/* Pagination */}
      <nav className="mt-4 d-flex justify-content-center" aria-label="Pagination">
        <ul className="pagination">
          {page > 2 && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(1)}>
                Start
              </button>
            </li>
          )}
          <li className={`page-item ${!data?.previous ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage(page - 1)}
              disabled={!data?.previous}
            >
              ⏮️
            </button>
          </li>
          {page > 1 && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(page - 1)}>
                {page - 1}
              </button>
            </li>
          )}
          <li className="page-item active" aria-current="page">
            <span className="page-link">{page}</span>
          </li>
          {page < totalPages && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(page + 1)}>
                {page + 1}
              </button>
            </li>
          )}
          <li className={`page-item ${!data?.next ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage(page + 1)}
              disabled={!data?.next}
            >
              ⏭️
            </button>
          </li>
          {page < totalPages - 1 && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(totalPages)}>
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
