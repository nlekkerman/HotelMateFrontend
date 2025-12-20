import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { buildStaffURL, getHotelSlug } from "@/services/api";
import { useRoomsState } from "@/realtime/stores/roomsStore.jsx";
import { toast } from "react-toastify";
import { 
  updateHousekeepingRoomStatus,
  checkinRoom,
  checkoutRoom 
} from "@/services/roomOperations";
import { handleRoomOperationError } from "@/utils/errorHandling";

function RoomDetails() {
  const { hotelIdentifier, roomNumber, id } = useParams();

  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Room operations state
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  
  const userData = JSON.parse(localStorage.getItem("user"));
  const canManageRooms = ['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase()) || userData?.is_superuser;

  // Realtime store integration
  const roomsState = useRoomsState();
  const realtimeRoom = roomsState.byRoomNumber[roomNumber];

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

  const handleStatusChange = async () => {
    if (!selectedStatus || isUpdatingStatus || !room?.id) return;
    
    setIsUpdatingStatus(true);
    try {
      const hotelSlug = getHotelSlug();
      await updateHousekeepingRoomStatus(hotelSlug, room.id, {
        status: selectedStatus,
        note: statusNote || `Status changed to ${selectedStatus}`
      });
      
      toast.success(`Room ${roomNumber} status update requested`);
      setShowStatusModal(false);
      setSelectedStatus('');
      setStatusNote('');
      // NO local state mutation - wait for realtime event
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'status_change', roomNumber);
      toast.error(errorMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    
    setIsCheckingOut(true);
    try {
      const hotelSlug = getHotelSlug();
      await checkoutRoom(hotelSlug, roomNumber);
      
      toast.success(`Room ${roomNumber} check-out initiated`);
      setShowCheckoutModal(false);
      // NO local state mutation - wait for realtime event
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'checkout', roomNumber);
      toast.error(errorMessage);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckin = async () => {
    if (isCheckingIn) return;
    
    setIsCheckingIn(true);
    try {
      const hotelSlug = getHotelSlug();
      await checkinRoom(hotelSlug, roomNumber);
      
      toast.success(`Room ${roomNumber} check-in initiated`);
      setShowCheckinModal(false);
      // NO local state mutation - wait for realtime event
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'checkin', roomNumber);
      toast.error(errorMessage);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const canCheckin = !room?.is_occupied && room?.room_status === 'READY_FOR_GUEST';
  const checkinBlockedReason = room?.is_occupied 
    ? "Room is currently occupied" 
    : room?.room_status !== 'READY_FOR_GUEST' 
      ? `Room status is ${formatStatus(room?.room_status)}, must be Ready For Guest`
      : null;

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

        // Merge API room data with realtime snapshot when available
        const apiRoom = response.data;
        const mergedRoom = realtimeRoom 
          ? { ...apiRoom, ...realtimeRoom }
          : apiRoom;
        
        setRoom(mergedRoom);
      } catch (err) {
        setError("Failed to fetch room details");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomNumber]); // Only fetch on roomNumber change

  // Update room state when realtime data changes (for instant updates)
  useEffect(() => {
    if (realtimeRoom && room) {
      setRoom(prevRoom => ({ ...prevRoom, ...realtimeRoom }));
    }
  }, [realtimeRoom]);

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

      {/* Room Operations Panel */}
      {canManageRooms && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-gear me-2"></i>
                  Room Operations
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  {/* Status Change */}
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-2">Status Management</h6>
                    <button
                      className="btn btn-outline-primary w-100"
                      onClick={() => setShowStatusModal(true)}
                      disabled={isUpdatingStatus || isCheckingIn || isCheckingOut || !room?.id}
                    >
                      <i className="bi bi-arrow-repeat me-2"></i>
                      {isUpdatingStatus ? 'Updating...' : 'Change Status'}
                    </button>
                    <small className="text-muted mt-1 d-block">
                      Current: <span className={`badge bg-${getStatusColor(room.room_status)}`}>{formatStatus(room.room_status)}</span>
                    </small>
                  </div>

                  {/* Checkout/Check-in */}
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-2">Guest Operations</h6>
                    <div className="d-flex gap-2">
                      {room.is_occupied && (
                        <button
                          className="btn btn-warning flex-fill"
                          onClick={() => setShowCheckoutModal(true)}
                          disabled={isCheckingOut || isUpdatingStatus || isCheckingIn}
                        >
                          <i className="bi bi-box-arrow-right me-2"></i>
                          {isCheckingOut ? 'Checking Out...' : 'Check Out'}
                        </button>
                      )}
                      {!room.is_occupied && (
                        <button
                          className={`btn flex-fill ${canCheckin ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => canCheckin ? setShowCheckinModal(true) : null}
                          disabled={isCheckingIn || isUpdatingStatus || isCheckingOut || !canCheckin}
                          title={checkinBlockedReason || 'Check in guest'}
                        >
                          <i className="bi bi-box-arrow-in-right me-2"></i>
                          {isCheckingIn ? 'Checking In...' : 'Check In'}
                        </button>
                      )}
                    </div>
                    {checkinBlockedReason && (
                      <small className="text-warning mt-1 d-block">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {checkinBlockedReason}
                      </small>
                    )}
                  </div>

                  {/* Maintenance Status */}
                  {room.maintenance_required && (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        <h6 className="alert-heading">
                          <i className="bi bi-tools me-2"></i>
                          Maintenance Required
                        </h6>
                        <p className="mb-1">
                          <strong>Priority:</strong> <span className="text-capitalize">{room.maintenance_priority || 'Normal'}</span>
                        </p>
                        {room.maintenance_notes && (
                          <p className="mb-0">
                            <strong>Notes:</strong> {room.maintenance_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Out of Order Status */}
                  {room.is_out_of_order && (
                    <div className="col-12">
                      <div className="alert alert-danger mb-0">
                        <h6 className="alert-heading">
                          <i className="bi bi-x-octagon me-2"></i>
                          Room Out of Order
                        </h6>
                        <p className="mb-0">This room is currently out of order and not available for bookings.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-lg">
            <div className="card-body p-4">
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-outline-secondary btn-lg px-4"
                  onClick={() => navigate("/rooms")}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Rooms List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Room Status</h5>
                <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">New Status</label>
                  <select 
                    className="form-select" 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">Select status...</option>
                    <option value="CHECKOUT_DIRTY">Checkout Dirty</option>
                    <option value="CLEANING_IN_PROGRESS">Cleaning In Progress</option>
                    <option value="CLEANED_UNINSPECTED">Cleaned Uninspected</option>
                    <option value="READY_FOR_GUEST">Ready For Guest</option>
                    <option value="MAINTENANCE_REQUIRED">Maintenance Required</option>
                    <option value="OUT_OF_ORDER">Out of Order</option>
                    <option value="AVAILABLE">Available</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Note (Optional)</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add a note about this status change..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || isUpdatingStatus}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {showCheckoutModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Guest Checkout</h5>
                <button type="button" className="btn-close" onClick={() => setShowCheckoutModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to check out the guest from Room {roomNumber}?</p>
                {room.primary_guest && (
                  <p><strong>Guest:</strong> {room.primary_guest.first_name} {room.primary_guest.last_name}</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckoutModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? 'Checking Out...' : 'Confirm Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Confirmation Modal */}
      {showCheckinModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Guest Check-in</h5>
                <button type="button" className="btn-close" onClick={() => setShowCheckinModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to check in a guest to Room {roomNumber}?</p>
                <small className="text-muted">This will mark the room as occupied and trigger guest session logic.</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckinModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleCheckin}
                  disabled={isCheckingIn}
                >
                  {isCheckingIn ? 'Checking In...' : 'Confirm Check-in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomDetails;
