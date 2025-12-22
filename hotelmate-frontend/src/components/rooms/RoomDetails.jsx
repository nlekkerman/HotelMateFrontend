import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { buildStaffURL, getHotelSlug } from "@/services/api";
import { useRoomsState } from "@/realtime/stores/roomsStore.jsx";
import { toast } from "react-toastify";
import { 
  updateHousekeepingRoomStatus,
  checkinRoom,
  checkoutRoom,
  startCleaning,
  markCleaned,
  inspectRoom,
  markMaintenance,
  completeMaintenance
} from "@/services/roomOperations";
import { handleRoomOperationError } from "@/utils/errorHandling";

function RoomDetails() {
  const { hotelIdentifier, roomNumber, id } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Operation loading states - each button gets its own spinner
  const [actionStates, setActionStates] = useState({
    checkin: false,
    checkout: false,
    startCleaning: false,
    markCleaned: false,
    inspect: false,
    markMaintenance: false,
    completeMaintenance: false,
    statusOverride: false
  });

  // Advanced status override modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Active tab for notes/history section
  const [activeTab, setActiveTab] = useState('notes');
  
  const userData = JSON.parse(localStorage.getItem("user"));
  const canManageRooms = ['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase()) || userData?.is_superuser;

  // Realtime store integration
  const roomsState = useRoomsState();
  const realtimeRoom = roomsState.byRoomNumber[roomNumber];

  const getStatusColor = (status) => {
    const colors = {
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

  // Generic action handler that manages loading state and shows toast
  const handleAction = async (actionName, actionFunction, successMessage, actionOptions = {}) => {
    if (actionStates[actionName]) return;
    
    setActionStates(prev => ({ ...prev, [actionName]: true }));
    try {
      const hotelSlug = getHotelSlug();
      await actionFunction(hotelSlug, roomNumber, actionOptions);
      toast.success(`${successMessage}. Waiting for realtime update.`);
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, actionName, roomNumber);
      toast.error(errorMessage);
    } finally {
      setActionStates(prev => ({ ...prev, [actionName]: false }));
    }
  };

  // Specific action handlers
  const handleCheckin = () => {
    if (!import.meta.env.PROD) {
      console.log(`[RoomDetails] Checkin attempt - Room ${roomNumber}:`, {
        roomId: room?.id,
        roomStatus: room?.room_status,
        isOccupied: room?.is_occupied
      });
    }
    handleAction('checkin', checkinRoom, `Room ${roomNumber} check-in initiated`, { roomId: room?.id });
  };
  
  const handleCheckout = () => {
    if (!import.meta.env.PROD) {
      console.log(`[RoomDetails] Checkout attempt - Room ${roomNumber}:`, {
        roomId: room?.id,
        roomStatus: room?.room_status,
        isOccupied: room?.is_occupied
      });
    }
    handleAction('checkout', checkoutRoom, `Room ${roomNumber} check-out initiated`, { roomId: room?.id });
  };
  
  const handleStartCleaning = () => handleAction('startCleaning', startCleaning, `Cleaning started for Room ${roomNumber}`);
  const handleMarkCleaned = () => handleAction('markCleaned', markCleaned, `Room ${roomNumber} marked as cleaned`);
  const handleInspect = () => handleAction('inspect', inspectRoom, `Room ${roomNumber} inspection completed`);
  const handleMarkMaintenance = () => handleAction('markMaintenance', markMaintenance, `Room ${roomNumber} marked for maintenance`);
  const handleCompleteMaintenance = () => handleAction('completeMaintenance', completeMaintenance, `Maintenance completed for Room ${roomNumber}`);

  // Advanced status override handler
  const handleStatusOverride = async () => {
    if (!selectedStatus || actionStates.statusOverride || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, statusOverride: true }));
    try {
      const hotelSlug = getHotelSlug();
      await updateHousekeepingRoomStatus(hotelSlug, room.id, {
        status: selectedStatus,
        note: statusNote || `Status overridden to ${selectedStatus}`
      });
      
      toast.success(`Room ${roomNumber} status override requested. Waiting for realtime update.`);
      setShowStatusModal(false);
      setSelectedStatus('');
      setStatusNote('');
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'status_override', roomNumber);
      toast.error(errorMessage);
    } finally {
      setActionStates(prev => ({ ...prev, statusOverride: false }));
    }
  };

  // Contextual action logic based on room_status
  const getPrimaryActions = () => {
    if (!canManageRooms) return [];
    
    const status = room?.room_status;
    const actions = [];

    if (status === 'READY_FOR_GUEST' && !room?.is_occupied) {
      actions.push({
        key: 'checkin',
        label: 'Check In',
        icon: 'bi-box-arrow-in-right',
        variant: 'success',
        loading: actionStates.checkin,
        handler: handleCheckin
      });
    } else if (room?.is_occupied) {
      actions.push({
        key: 'checkout',
        label: 'Check Out',
        icon: 'bi-box-arrow-right',
        variant: 'warning',
        loading: actionStates.checkout,
        handler: handleCheckout
      });
    } else if (status === 'CHECKOUT_DIRTY') {
      actions.push({
        key: 'startCleaning',
        label: 'Start Cleaning',
        icon: 'bi-droplet',
        variant: 'info',
        loading: actionStates.startCleaning,
        handler: handleStartCleaning
      });
    } else if (status === 'CLEANING_IN_PROGRESS') {
      actions.push({
        key: 'markCleaned',
        label: 'Mark Cleaned',
        icon: 'bi-check-circle',
        variant: 'success',
        loading: actionStates.markCleaned,
        handler: handleMarkCleaned
      });
    } else if (status === 'CLEANED_UNINSPECTED') {
      actions.push({
        key: 'inspect',
        label: 'Inspect',
        icon: 'bi-search',
        variant: 'primary',
        loading: actionStates.inspect,
        handler: handleInspect
      });
    } else if (status === 'MAINTENANCE_REQUIRED') {
      actions.push({
        key: 'completeMaintenance',
        label: 'Complete Maintenance',
        icon: 'bi-tools',
        variant: 'success',
        loading: actionStates.completeMaintenance,
        handler: handleCompleteMaintenance
      });
    }

    return actions.slice(0, 2); // Max 2 primary actions
  };

  const getSecondaryActions = () => {
    const actions = [];
    
    if (canManageRooms && !room?.maintenance_required) {
      actions.push({
        key: 'markMaintenance',
        label: 'Mark for Maintenance',
        handler: handleMarkMaintenance,
        loading: actionStates.markMaintenance
      });
    }
    
    return actions;
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

        const url = buildStaffURL(hotelSlug, '', `room-management/${roomNumber}/`);
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

  if (loading) return <p className="text-center mt-4">Loading room details...</p>;
  if (error) return <p className="text-center text-danger mt-4">{error}</p>;
  if (!room) return null;

  const primaryActions = getPrimaryActions();
  const secondaryActions = getSecondaryActions();

  return (
    <div className="container-fluid">
      {/* Sticky Header */}
      <div className="sticky-top bg-white border-bottom shadow-sm px-4 py-3 mb-4">
        <div className="row align-items-center">
          <div className="col-md-4">
            <h1 className="display-5 mb-0 fw-bold">Room {room.room_number}</h1>
          </div>
          
          <div className="col-md-4 text-center">
            <div className="d-inline-flex align-items-center gap-3">
              {/* Main Status Pill */}
              <span className={`badge badge-lg fs-5 px-3 py-2 bg-${getStatusColor(room.room_status)}`}>
                {formatStatus(room.room_status)}
              </span>
              
              {/* Micro-badges */}
              <div className="d-flex gap-2 flex-wrap">
                {room.is_occupied && <span className="badge bg-danger">Occupied</span>}
                {room.maintenance_required && <span className="badge bg-warning text-dark">Maintenance</span>}
                {room.is_out_of_order && <span className="badge bg-danger">Out of Order</span>}
                <span className={`badge ${room.is_bookable ? 'bg-success' : 'bg-secondary'}`}>
                  {room.is_bookable ? 'Bookable' : 'Not Bookable'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="col-md-4 text-end">
            <div className="d-flex justify-content-end align-items-center gap-2">
              {/* Primary Actions (max 2) */}
              {primaryActions.map(action => (
                <button
                  key={action.key}
                  className={`btn btn-${action.variant}`}
                  onClick={action.handler}
                  disabled={action.loading || Object.values(actionStates).some(state => state)}
                >
                  {action.loading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className={`${action.icon} me-2`} />
                  )}
                  {action.loading ? 'Processing...' : action.label}
                </button>
              ))}
              
              {/* Secondary Actions */}
              <div className="d-flex gap-2">
                {secondaryActions.map(action => (
                  <button
                    key={action.key}
                    className="btn btn-sm btn-outline-secondary"
                    onClick={action.handler}
                    disabled={action.loading}
                    title={action.label}
                  >
                    {action.loading && <span className="spinner-border spinner-border-sm me-1" />}
                    <i className="bi bi-tools" />
                  </button>
                ))}
                <button 
                  className="btn btn-sm btn-outline-warning" 
                  onClick={() => setShowStatusModal(true)}
                  disabled={actionStates.statusOverride}
                  title="Advanced Status Override"
                >
                  <i className="bi bi-gear" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body: Two-Column Layout */}
      <div className="row px-4">
        {/* Left Column: Operations */}
        <div className="col-lg-7 pe-4">{renderOperationsColumn()}</div>
        
        {/* Right Column: Guest & Booking Context */}
        <div className="col-lg-5 ps-4">{renderGuestContextColumn()}</div>
      </div>
      
      {/* Back Button */}
      <div className="text-center my-5">
        <button
          className="btn btn-outline-secondary btn-lg px-4"
          onClick={() => navigate("/rooms")}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Rooms List
        </button>
      </div>

      {/* Advanced Status Override Modal */}
      {renderStatusModal()}
    </div>
  );

  // Left Column: Operations  
  function renderOperationsColumn() {
    return (
      <>
        {/* Operational Status Panel */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-speedometer2 me-2"></i>
              Operational Status
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded">
                  <h6 className="text-muted mb-1">Current Status</h6>
                  <span className={`badge bg-${getStatusColor(room.room_status)} fs-6`}>
                    {formatStatus(room.room_status)}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded">
                  <h6 className="text-muted mb-1">Last Updated</h6>
                  <small className="text-muted">
                    {room.updated_at ? new Date(room.updated_at).toLocaleString() : 'Unknown'}
                  </small>
                </div>
              </div>
            </div>
            
            {/* Workflow Strip */}
            <div className="mt-3 p-2 bg-light rounded">
              <small className="text-muted fw-semibold d-block mb-2">Workflow Progress</small>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {['CHECKOUT_DIRTY', 'CLEANING_IN_PROGRESS', 'CLEANED_UNINSPECTED', 'READY_FOR_GUEST', 'OCCUPIED'].map((status, index, array) => (
                  <React.Fragment key={status}>
                    <small className={`badge ${room.room_status === status ? `bg-${getStatusColor(status)}` : 'bg-light text-muted'} text-uppercase`}>
                      {status.replace(/_/g, ' ')}
                    </small>
                    {index < array.length - 1 && <i className="bi bi-arrow-right text-muted"></i>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Turnover Actions Panel */}
        {canManageRooms && (
          <div className="card mb-4">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-arrow-repeat me-2"></i>
                Turnover Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {renderTurnoverActions()}
              </div>
            </div>
          </div>
        )}

        {/* Quick Status Override */}
        {canManageRooms && (
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Quick Status Override
              </h6>
            </div>
            <div className="card-body">
              <div className="alert alert-warning py-2 mb-3">
                <small><i className="bi bi-exclamation-triangle me-1"></i>
                Use only if workflow buttons are not applicable.</small>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Override to Status:</label>
                <select 
                  className="form-select form-select-sm" 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={actionStates.statusOverride}
                >
                  <option value="">Select new status...</option>
                  <option value="CHECKOUT_DIRTY">Checkout Dirty</option>
                  <option value="CLEANING_IN_PROGRESS">Cleaning In Progress</option>
                  <option value="CLEANED_UNINSPECTED">Cleaned Uninspected</option>
                  <option value="READY_FOR_GUEST">Ready For Guest</option>
                  <option value="MAINTENANCE_REQUIRED">Maintenance Required</option>
                  <option value="OUT_OF_ORDER">Out of Order</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Note:</label>
                <textarea 
                  className="form-control form-control-sm" 
                  rows="2" 
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Why is this override needed?"
                  disabled={actionStates.statusOverride}
                ></textarea>
              </div>
              
              <button 
                className="btn btn-warning w-100"
                onClick={handleStatusOverride}
                disabled={!selectedStatus || actionStates.statusOverride}
              >
                {actionStates.statusOverride ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Processing Override...
                  </>
                ) : (
                  <>
                    <i className="bi bi-gear me-2"></i>
                    Override Status Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Right Column: Guest & Booking Context
  function renderGuestContextColumn() {
    return (
      <>
        {/* In-House / Next Booking Panel */}
        <div className="card mb-4">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">
              <i className="bi bi-person-badge me-2"></i>
              Guest & Booking Context
            </h5>
          </div>
          <div className="card-body">
            {room.is_occupied ? (
              <div>
                <h6 className="text-success">
                  <i className="bi bi-person-fill me-2"></i>
                  Currently In-House
                </h6>
                {room.guests_in_room && room.guests_in_room.length > 0 ? (
                  <div className="mt-2">
                    {room.guests_in_room.map((guest) => (
                      <div key={guest.id} className="d-flex align-items-center p-2 bg-light rounded mb-2">
                        <div className="me-3">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '35px', height: '35px'}}>
                            <i className="bi bi-person-fill"></i>
                          </div>
                        </div>
                        <div>
                          <h6 className="mb-0">{guest.first_name} {guest.last_name}</h6>
                          <small className="text-muted">Primary Guest</small>
                        </div>
                      </div>
                    ))}
                    <small className="text-muted">
                      Check-in: {room.check_in_time ? new Date(room.check_in_time).toLocaleString() : 'Unknown'}
                    </small>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Room is occupied but no guest details available.</p>
                )}
              </div>
            ) : (
              <div>
                <h6 className="text-secondary">
                  <i className="bi bi-house me-2"></i>
                  Room Ready
                </h6>
                <p className="text-muted mb-0">No current guests. Ready for next booking.</p>
                {/* Could add next booking info here if available in room data */}
              </div>
            )}
            
            {/* Room Type Info */}
            {room.room_type_info && (
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted fw-semibold">Room Details</small>
                <div className="mt-1">
                  <div><strong>Type:</strong> {room.room_type_info.name}</div>
                  {room.room_type_info.capacity && <div><strong>Capacity:</strong> {room.room_type_info.capacity} guests</div>}
                  {room.room_type_info.base_rate && <div><strong>Base Rate:</strong> ${room.room_type_info.base_rate}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes + History (Tabbed Panel) */}
        <div className="card">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs" role="tablist">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'notes' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('notes')}
                  type="button"
                >
                  Notes
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('history')}
                  type="button"
                >
                  Status History
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'turnover' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('turnover')}
                  type="button"
                >
                  Turnover Log
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'maintenance' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('maintenance')}
                  type="button"
                >
                  Maintenance
                </button>
              </li>
            </ul>
          </div>
          <div className="card-body">
            {activeTab === 'notes' && renderNotesTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'turnover' && renderTurnoverTab()}
            {activeTab === 'maintenance' && renderMaintenanceTab()}
          </div>
        </div>
      </>
    );
  }

  function renderTurnoverActions() {
    const status = room?.room_status;
    let availableActions = [];

    // Define which actions are available for each status
    if (status === 'CHECKOUT_DIRTY') {
      availableActions.push({
        key: 'startCleaning',
        label: 'Start Cleaning',
        icon: 'bi-droplet',
        variant: 'info',
        handler: handleStartCleaning
      });
    }
    
    if (status === 'CLEANING_IN_PROGRESS') {
      availableActions.push({
        key: 'markCleaned',
        label: 'Mark Cleaned',
        icon: 'bi-check-circle',
        variant: 'success', 
        handler: handleMarkCleaned
      });
    }
    
    if (status === 'CLEANED_UNINSPECTED') {
      availableActions.push({
        key: 'inspect',
        label: 'Inspect Room',
        icon: 'bi-search',
        variant: 'primary',
        handler: handleInspect
      });
    }

    if (availableActions.length === 0) {
      return (
        <div className="col-12">
          <div className="text-center text-muted p-3">
            <i className="bi bi-info-circle me-2"></i>
            No turnover actions available for current status.
          </div>
        </div>
      );
    }

    return availableActions.map(action => (
      <div key={action.key} className="col-md-6">
        <button
          className={`btn btn-${action.variant} w-100`}
          onClick={action.handler}
          disabled={actionStates[action.key] || Object.values(actionStates).some(state => state)}
        >
          {actionStates[action.key] ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Processing...
            </>
          ) : (
            <>
              <i className={`${action.icon} me-2`} />
              {action.label}
            </>
          )}
        </button>
      </div>
    ));
  }

  function renderNotesTab() {
    return (
      <div>
        <div className="mb-3">
          <label className="form-label">Add Note</label>
          <textarea className="form-control" rows="3" placeholder="Add a note about this room..."></textarea>
        </div>
        <button className="btn btn-primary btn-sm">Add Note</button>
        
        <hr />
        
        <div className="text-muted text-center">
          <i className="bi bi-journal-text me-2"></i>
          Notes functionality will be implemented here
        </div>
      </div>
    );
  }

  function renderHistoryTab() {
    return (
      <div className="text-muted text-center">
        <i className="bi bi-clock-history me-2"></i>
        Status history will be displayed here
      </div>
    );
  }

  function renderTurnoverTab() {
    return (
      <div className="text-muted text-center">
        <i className="bi bi-arrow-repeat me-2"></i>
        Turnover log will be displayed here
      </div>
    );
  }

  function renderMaintenanceTab() {
    return (
      <div>
        {room.maintenance_required ? (
          <div className="alert alert-warning">
            <h6 className="alert-heading">
              <i className="bi bi-tools me-2"></i>
              Active Maintenance Request
            </h6>
            <div><strong>Priority:</strong> <span className="text-capitalize">{room.maintenance_priority || 'Normal'}</span></div>
            {room.maintenance_notes && (
              <div className="mt-2"><strong>Notes:</strong> {room.maintenance_notes}</div>
            )}
          </div>
        ) : (
          <div className="text-success text-center">
            <i className="bi bi-check-circle me-2"></i>
            No maintenance issues reported
          </div>
        )}
      </div>
    );
  }

  function renderStatusModal() {
    if (!showStatusModal) return null;

    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Status Override Options</h5>
              <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Quick Override:</strong> Use the left panel for immediate status changes.
              </div>
              
              <h6 className="fw-semibold mb-3">Available Status Options:</h6>
              <div className="row g-2">
                {[
                  { value: 'CHECKOUT_DIRTY', label: 'Checkout Dirty', color: 'warning' },
                  { value: 'CLEANING_IN_PROGRESS', label: 'Cleaning In Progress', color: 'info' },
                  { value: 'CLEANED_UNINSPECTED', label: 'Cleaned Uninspected', color: 'secondary' },
                  { value: 'READY_FOR_GUEST', label: 'Ready For Guest', color: 'success' },
                  { value: 'MAINTENANCE_REQUIRED', label: 'Maintenance Required', color: 'danger' },
                  { value: 'OUT_OF_ORDER', label: 'Out of Order', color: 'danger' },

                ].map(status => (
                  <div key={status.value} className="col-md-6 mb-2">
                    <span className={`badge bg-${status.color} w-100 p-2`}>
                      {status.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowStatusModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default RoomDetails;
