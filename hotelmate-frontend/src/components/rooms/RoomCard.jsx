import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RoomCard = ({ room, selectedRooms, onSelect }) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  const calculateStayDuration = (checkInDate) => {
    if (!checkInDate) return 'Unknown';
    const checkIn = new Date(checkInDate);
    const now = new Date();
    const diffTime = Math.abs(now - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

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
    if (!status) return null;
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="col">
      <div 
        className="card h-100 shadow-sm position-relative"
        style={{ cursor: "pointer" }}
        onClick={() => navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`)}
      >
        {/* Hover Overlay for Occupied Rooms */}
        {room.is_occupied && isHovering && (
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center main-bg"
            style={{
              zIndex: 10,
              borderRadius: 'inherit',
              pointerEvents: 'none'
            }}
          >
            <div className="text-center text-white p-3">
              <h4 className="mb-3">
                <i className="bi bi-person-fill me-2" />
                Guest Information
              </h4>
              {room.guests_in_room && room.guests_in_room.map((guest, index) => (
                <div key={guest.id || index} className="mb-3">
                  <h5 className="text-light">
                    {guest.first_name} {guest.last_name}
                  </h5>
                  <p className="mb-1">
                    <i className="bi bi-calendar-check me-2" />
                    Staying: {calculateStayDuration(guest.check_in_date || guest.created_at)}
                  </p>
                  {guest.check_in_date && (
                    <small className="text-light opacity-75">
                      Since: {new Date(guest.check_in_date).toLocaleDateString()}
                    </small>
                  )}
                </div>
              ))}
              <div className="mt-3">
                <small className="text-light opacity-75">
                  <i className="bi bi-cursor-pointer me-1" />
                  Click to view room details
                </small>
              </div>
            </div>
          </div>
        )}

        <div className="card-body d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0 text-center text-white fw-bold py-2 px-3 main-bg rounded">
              Room {room.room_number}
            </h5>
            <span className={`badge bg-${getStatusColor(room.room_status)} fs-6`}>
              {room.room_status_display || formatStatus(room.room_status) || (room.is_occupied ? 'Occupied' : 'Available')}
            </span>
          </div>

          {/* Room Type Information */}
          {room.room_type_info && (
            <div className="mb-2">
              <small className="text-muted">
                <strong>{room.room_type_info.name}</strong>
                {room.room_type_info.capacity && (
                  <span className="ms-2">
                    <i className="bi bi-people-fill me-1" />
                    Max {room.room_type_info.capacity} guests
                  </span>
                )}
                {room.room_type_info.base_rate && (
                  <span className="ms-2 text-success">
                    <i className="bi bi-currency-dollar me-1" />
                    ${room.room_type_info.base_rate}
                  </span>
                )}
              </small>
            </div>
          )}

          <div className="card-text mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted">
                <i className="bi bi-person-circle me-1" />
                <strong>Occupancy:</strong>
              </small>
              <span className={`badge ${room.is_occupied ? 'bg-danger' : 'bg-success'}`}>
                {room.is_occupied ? 'Occupied' : 'Available'}
              </span>
            </div>
            
            {room.maintenance_required && (
              <div className="alert alert-warning p-2 mb-2" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-1" />
                <small><strong>Maintenance Required</strong></small>
                {room.maintenance_priority && (
                  <span className="badge bg-warning text-dark ms-1">
                    {room.maintenance_priority}
                  </span>
                )}
              </div>
            )}
            
            {room.is_out_of_order && (
              <div className="alert alert-danger p-2 mb-2" role="alert">
                <i className="bi bi-x-circle-fill me-1" />
                <small><strong>Out of Order</strong></small>
              </div>
            )}
            
            {room.is_bookable !== undefined && (
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Bookable:</small>
                <span className={`badge ${room.is_bookable ? 'bg-success' : 'bg-secondary'}`}>
                  {room.is_bookable ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>

          {/* Housekeeping Info */}
          {(room.last_cleaned_at || room.last_inspected_at) && (
            <div className="mb-3">
              <small className="text-muted">
                {room.last_cleaned_at && (
                  <>
                    <i className="bi bi-brush me-1" />
                    Cleaned: {new Date(room.last_cleaned_at).toLocaleDateString()}
                    {room.cleaned_by_staff && ` by ${room.cleaned_by_staff}`}
                    <br />
                  </>
                )}
                {room.last_inspected_at && (
                  <>
                    <i className="bi bi-check2-circle me-1" />
                    Inspected: {new Date(room.last_inspected_at).toLocaleDateString()}
                    {room.inspected_by_staff && ` by ${room.inspected_by_staff}`}
                  </>
                )}
              </small>
            </div>
          )}

          {/* Turnover Notes */}
          {room.turnover_notes && (
            <div className="mb-3">
              <small className="text-info">
                <i className="bi bi-sticky-fill me-1" />
                <strong>Notes:</strong> {room.turnover_notes}
              </small>
            </div>
          )}



          <div className="form-check m-2 text-black bg-light p-1 rounded" onClick={(e) => e.stopPropagation()}>
            <input
              id={`select-room-${room.id}`}
              className="form-check-input"
              type="checkbox"
              checked={selectedRooms.includes(room.id)}
              onChange={() => onSelect(room.id)}
            />
            <label htmlFor={`select-room-${room.id}`} className="form-check-label small">
              Select room for checkout.
            </label>
          </div>

          {/* Status-based Action Buttons */}
          <div className="mt-auto">
            {room.room_status === 'CHECKOUT_DIRTY' && (
              <button 
                className="btn btn-sm btn-warning w-100 mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement mark as cleaning action
                }}
              >
                <i className="bi bi-brush me-1" />
                Mark as Cleaning
              </button>
            )}
            
            {room.room_status === 'CLEANED_UNINSPECTED' && (
              <button 
                className="btn btn-sm btn-info w-100 mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement inspect room action
                }}
              >
                <i className="bi bi-check2-circle me-1" />
                Inspect Room
              </button>
            )}
            
            {room.maintenance_required && (
              <button 
                className="btn btn-sm btn-danger w-100 mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement view maintenance action
                }}
              >
                <i className="bi bi-tools me-1" />
                View Maintenance
              </button>
            )}

            <div className="button-wraper w-100 d-flex justify-content-center">
              {!room.is_occupied && room.room_status === 'AVAILABLE' && (
                <button
                  className="btn main-text second-text custom-button me-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/rooms/${room.room_number}/add-guest`);
                  }}
                >
                  <i className="bi bi-person-plus me-1" />
                  Assign Guest
                </button>
              )}
            </div>
          </div>

          {/* Guest Summary */}
          {room.primary_guest && (
            <div className="mb-2">
              <div className="d-flex align-items-center">
                <i className="bi bi-person-fill text-primary me-2" />
                <strong>{room.primary_guest.first_name} {room.primary_guest.last_name}</strong>
              </div>
              {room.companions && room.companions.length > 0 && (
                <small className="text-muted">
                  <i className="bi bi-people me-1" />
                  +{room.companions.length} companion{room.companions.length > 1 ? 's' : ''}
                </small>
              )}
              {room.walkins && room.walkins.length > 0 && (
                <small className="text-info">
                  <i className="bi bi-door-open me-1" />
                  +{room.walkins.length} walk-in{room.walkins.length > 1 ? 's' : ''}
                </small>
              )}
            </div>
          )}

          {room.is_occupied && !room.primary_guest && room.guests_in_room && (
            room.guests_in_room.map((guest) => (
                    <span 
                      key={guest.id} 
                      className="bg-danger text-white border text-center p-1 rounded-pill"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`);
                      }}
                    >
                     OCCUPIED
                    </span>
                  ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
