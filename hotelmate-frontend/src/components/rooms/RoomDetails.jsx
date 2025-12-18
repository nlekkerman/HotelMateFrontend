import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { buildStaffURL, getHotelSlug } from "@/services/api";

function RoomDetails() {
  const { hotelIdentifier, roomNumber, id } = useParams();

  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStatusColor = (status) => {
    const colors = {
      'AVAILABLE': 'success',
      'OCCUPIED': 'primary',
      'CHECKOUT_DIRTY': 'warning',
      'CLEANING_IN_PROGRESS': 'info',
      'CLEANED_UNINSPECTED': 'secondary',
      'MAINTENANCE_REQUIRED': 'danger',
      'OUT_OF_ORDER': 'danger',
      'READY_FOR_GUEST': 'success'
    };
    return colors[status] || 'secondary';
  };

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  };

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const hotelSlug = getHotelSlug();
        
        if (!hotelSlug) {
          setError("Hotel information not found");
          setLoading(false);
          return;
        }

        const url = buildStaffURL(hotelSlug, '', `rooms/${roomNumber}/`);
        const response = await api.get(url);

        setRoom(response.data);
      } catch (err) {
        setError("Failed to fetch room details");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomNumber]);

  if (loading)
    return <p className="text-center mt-4">Loading room details...</p>;
  if (error) return <p className="text-center text-danger mt-4">{error}</p>;
  if (!room) return null;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="display-6 mb-0 text-dark fw-bold">
                <i className="bi bi-door-open me-3 text-primary"></i>
                Room {room.room_number}
              </h1>
              <p className="text-muted mb-0">Detailed room information and services</p>
            </div>
            <div className={`badge fs-6 px-3 py-2 ${room.is_occupied ? 'bg-danger' : 'bg-success'}`}>
              <i className={`bi ${room.is_occupied ? 'bi-person-fill' : 'bi-house'} me-2`}></i>
              {room.is_occupied ? 'Occupied' : 'Available'}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Room Information Card */}
        <div className="col-12 mb-4">
          <div className="card border-0 shadow-lg">
            <div className="card-header main-bg text-white py-3">
              <h4 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Room Information
              </h4>
            </div>
            <div className="card-body p-4">
              {/* Room Number & Type */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold mb-2">Room Information</label>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border-start border-primary border-4">
                      <h6 className="text-muted mb-1">Room Number</h6>
                      <h5 className="mb-0 text-primary fw-bold">#{room.room_number}</h5>
                    </div>
                  </div>
                  {room.room_type_info && (
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded-3 border-start border-info border-4">
                        <h6 className="text-muted mb-1">Room Type</h6>
                        <h6 className="mb-0 text-info fw-bold">{room.room_type_info.name}</h6>
                        <small className="text-muted">
                          ID: {room.room_type_info.id}
                          {room.room_type_info.capacity && ` • Max ${room.room_type_info.capacity} guests`}
                          {room.room_type_info.base_rate && (
                            <span className="text-success ms-1">
                              • Base Rate: ${room.room_type_info.base_rate}
                            </span>
                          )}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Status & Availability */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold mb-2">Room Status & Availability</label>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border-start border-info border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Status:</span>
                        <span className={`badge bg-${getStatusColor(room.room_status)} fs-6`}>
                          {room.room_status_display || formatStatus(room.room_status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border-start border-success border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Bookable:</span>
                        <span className={`badge ${room.is_bookable ? 'bg-success' : 'bg-secondary'} fs-6`}>
                          {room.is_bookable ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {(room.maintenance_required || room.is_out_of_order) && (
                  <div className="mt-3">
                    {room.maintenance_required && (
                      <div className="alert alert-warning p-2 mb-2">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        <strong>Maintenance Required</strong>
                        {room.maintenance_priority && (
                          <span className="badge bg-warning text-dark ms-2">
                            {room.maintenance_priority} Priority
                          </span>
                        )}
                        {room.maintenance_notes && (
                          <div className="mt-1"><small>{room.maintenance_notes}</small></div>
                        )}
                      </div>
                    )}
                    {room.is_out_of_order && (
                      <div className="alert alert-danger p-2">
                        <i className="bi bi-x-circle-fill me-2" />
                        <strong>Room Out of Order</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Guests */}
              <div>
                <label className="form-label text-muted fw-semibold mb-2">
                  <i className="bi bi-people me-2"></i>
                  Current Guests
                </label>
                <div className="p-3 bg-light rounded-3 border-start border-info border-4">
                  {room.guests_in_room && room.guests_in_room.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {room.guests_in_room.map((guest) => (
                        <div key={guest.id} className="d-flex align-items-center p-2 bg-white rounded-2 border">
                          <div className="me-3">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                              <i className="bi bi-person-fill"></i>
                            </div>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-semibold">{guest.first_name} {guest.last_name}</h6>
                            <small className="text-muted">Guest</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary fst-italic">No guests assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-lg">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                <button
                  className="btn btn-outline-secondary btn-lg px-4"
                  onClick={() => navigate("/rooms")}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Rooms List
                </button>
                
                {room.is_occupied && (
                  <button
                    className="btn btn-warning btn-lg px-4"
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Check Out Guest
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomDetails;
