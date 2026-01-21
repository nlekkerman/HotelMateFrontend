import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, { buildStaffURL } from "@/services/api";
import RoomCard from "@/components/rooms/RoomCard";
import { useRoomsState, useRoomsDispatch, roomsActions } from "@/realtime/stores/roomsStore.jsx";

const fetchRooms = async () => {
  const userData = JSON.parse(localStorage.getItem("user"));
  const hotelSlug = userData?.hotel_slug;

  if (!hotelSlug) {
    throw new Error('Hotel slug not found in user data');
  }

  // Use the correct turnover rooms endpoint - gets all rooms categorized by status
  const url = buildStaffURL(hotelSlug, '', 'turnover/rooms/');
  const response = await api.get(url); // No params - fetch all data, search locally
  
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
    queryKey: ["rooms"], // No search param - fetch once, search locally
    queryFn: fetchRooms,
    keepPreviousData: true,
    onSuccess: (data) => {
      // Dispatch bulk replace to roomsStore on successful API fetch
      // Flatten categorical response to get all rooms
      const allRooms = Object.values(data || {}).flatMap(category => category.rooms || []);
      if (allRooms.length > 0) {
        roomsDispatch({ type: "ROOM_BULK_REPLACE", payload: allRooms });
      }
    },
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const userData = JSON.parse(localStorage.getItem("user"));

  // Handle categorical response format - flatten all rooms
  const allRooms = React.useMemo(() => {
    if (!data) return [];
    return Object.values(data).flatMap(category => category.rooms || []);
  }, [data]);

  const apiRooms = allRooms;
  const totalPages = Math.ceil(allRooms.length / 10); // Remove pagination since we have all data

  // Prefer rooms from store when available, fallback to API
  const rooms = React.useMemo(() => {
    return roomsState.list.length > 0 
      ? roomsState.list.map(n => roomsState.byRoomNumber[String(n)]).filter(Boolean) // Convert to string for consistent lookup
      : apiRooms;
  }, [roomsState.list, roomsState.byRoomNumber, apiRooms]);

  // Keep local reactive state for UI interactions
  useEffect(() => {
    if (rooms.length > 0) {
      setLocalRooms(rooms);
    }
  }, [rooms]);

  // Reset to page 1 when search changes
  useEffect(() => setPage(1), [searchQuery]);

  // Apply filtering and pagination client-side
  const filteredRooms = React.useMemo(() => {
    return localRooms.filter(room => {
      // Search filter
      const matchesSearch = !searchQuery || 
        room.room_number.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.room_type_info?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.room_status_display?.toLowerCase().includes(searchQuery.toLowerCase());
        
      // Status filter
      const matchesStatus = !statusFilter || room.room_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [localRooms, searchQuery, statusFilter]);

  // Sort rooms by room number (default hotel staff mental model)
  const sortedRooms = React.useMemo(() => {
    const copy = [...filteredRooms];
    copy.sort((a, b) => (Number(a.room_number) || 0) - (Number(b.room_number) || 0));
    return copy;
  }, [filteredRooms]);

  // Calculate pagination for filtered results
  const itemsPerPage = 10;
  const totalFilteredPages = Math.ceil(sortedRooms.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedRooms = sortedRooms.slice(startIndex, startIndex + itemsPerPage);

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
        Rooms ({sortedRooms.length} found, Page {page} of {totalFilteredPages || 1}){" "}
        {isFetching && <small className="text-muted">(Updating...)</small>}
      </h2>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-5 justify-content-center g-2">
        {paginatedRooms.map((room, index) => (
          <RoomCard
            key={room.id || room.room_number || `room-${index}`}
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
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
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
          {page < totalFilteredPages && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(page + 1)}>
                {page + 1}
              </button>
            </li>
          )}
          <li className={`page-item ${page >= totalFilteredPages ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalFilteredPages}
            >
              ⏭️
            </button>
          </li>
          {page < totalFilteredPages - 1 && (
            <li className="page-item">
              <button className="page-link" onClick={() => setPage(totalFilteredPages)}>
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
