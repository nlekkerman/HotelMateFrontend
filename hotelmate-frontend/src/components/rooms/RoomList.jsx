import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import RoomCard from "@/components/rooms/RoomCard";
import { useRoomsState, useRoomsDispatch, roomsActions } from "@/realtime/stores/roomsStore.jsx";

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
  const [statusFilter, setStatusFilter] = useState("");
  const [localRooms, setLocalRooms] = useState([]);

  // Realtime store integration
  const roomsState = useRoomsState();
  const roomsDispatch = useRoomsDispatch();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["rooms", page, searchQuery],
    queryFn: fetchRooms,
    keepPreviousData: true,
    onSuccess: (data) => {
      // Dispatch bulk replace to roomsStore on successful API fetch
      if (data?.results) {
        roomsDispatch({ type: "ROOM_BULK_REPLACE", payload: data.results });
      }
    },
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const userData = JSON.parse(localStorage.getItem("user"));

  const apiRooms = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 10);

  // Prefer rooms from store when available, fallback to API
  const rooms = roomsState.list.length > 0 
    ? roomsState.list.map(n => roomsState.byRoomNumber[n]).filter(Boolean)
    : apiRooms;

  // Keep local reactive state for UI interactions
  useEffect(() => {
    if (rooms.length) {
      setLocalRooms(rooms);
    }
  }, [rooms]);

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
      {/* Operations Header */}
      <div className="row mb-4 align-items-center">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4">
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="CHECKOUT_DIRTY">Checkout Dirty</option>
            <option value="CLEANING_IN_PROGRESS">Cleaning</option>
            <option value="CLEANED_UNINSPECTED">Cleaned</option>
            <option value="READY_FOR_GUEST">Ready</option>
            <option value="MAINTENANCE_REQUIRED">Maintenance</option>
            <option value="OUT_OF_ORDER">Out of Order</option>
          </select>
        </div>
        <div className="col-md-4 text-end">
          {roomsState.lastUpdatedAt && (
            <span className="badge bg-success">
              <i className="bi bi-broadcast-pin me-1" />
              Live
            </span>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-center">
        Rooms (Page {page} of {totalPages}){" "}
        {isFetching && <small className="text-muted">(Updating...)</small>}
      </h2>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-5 justify-content-center g-2">
        {localRooms
          .filter(room => !statusFilter || room.room_status === statusFilter)
          .map((room) => (
          <RoomCard
            key={room.id}
            room={{ ...room }} // spread to force re-render
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
