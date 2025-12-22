import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { buildStaffURL, getHotelSlug } from "@/services/api";
import { useRoomsState } from "@/realtime/stores/roomsStore.jsx";
import { toast } from "react-toastify";
import {
  updateHousekeepingRoomStatus,
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

  // Inspection modal
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Active tab for notes/history section
  const [activeTab, setActiveTab] = useState('notes');
  
  const userData = JSON.parse(localStorage.getItem("user"));
  const canManageRooms = ['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase()) || userData?.is_superuser;

  // Realtime store integration
  const roomsState = useRoomsState();
  const realtimeRoom = roomsState.byRoomNumber[roomNumber];
  
  // Use realtime data if available, fallback to static room data
  const currentRoom = realtimeRoom || room;

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
  const handleCheckout = async () => {
    if (!import.meta.env.PROD) {
      console.log(`[RoomDetails] Checkout attempt - Room ${roomNumber}:`, {
        roomId: room?.id,
        roomStatus: room?.room_status,
        isOccupied: room?.is_occupied
      });
    }
    
    if (actionStates.checkout || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, checkout: true }));
    try {
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: 'CHECKOUT_DIRTY',
        note: 'Guest checked out'
      });
      toast.success(`Room ${roomNumber} check-out completed. Waiting for realtime update.`);
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'checkout', roomNumber);
      toast.error(errorMessage);
    } finally {
      setActionStates(prev => ({ ...prev, checkout: false }));
    }
  };
  
  const handleStartCleaning = async () => {
    if (actionStates.startCleaning || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, startCleaning: true }));
    try {
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: 'CLEANING_IN_PROGRESS',
        note: 'Cleaning started'
      });
      toast.success(`Cleaning started for Room ${roomNumber}. Waiting for realtime update.`);
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'start cleaning', roomNumber);
      toast.error(errorMessage);
    } finally {
      setActionStates(prev => ({ ...prev, startCleaning: false }));
    }
  };
  
  const handleMarkCleaned = async () => {
    if (actionStates.markCleaned || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, markCleaned: true }));
    try {
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: 'CLEANED_UNINSPECTED',
        note: 'Room cleaned and ready for inspection'
      });
      toast.success(`Room ${roomNumber} marked as cleaned. Waiting for realtime update.`);
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'mark cleaned', roomNumber);
      toast.error(errorMessage);
    } finally {
      setActionStates(prev => ({ ...prev, markCleaned: false }));
    }
  };
  const handleInspect = () => setShowInspectionModal(true);
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

  // Inspection result handlers
  const handleInspectionPass = async () => {
    if (actionStates.inspect || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, inspect: true }));
    setShowInspectionModal(false);
    
    try {
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: 'READY_FOR_GUEST',
        note: inspectionNotes || 'Inspection passed'
      });
      toast.success(`Room ${roomNumber} inspection passed - Ready for guest!`);
      setInspectionNotes('');
    } catch (error) {
      handleRoomOperationError(error, 'inspect room');
    } finally {
      setActionStates(prev => ({ ...prev, inspect: false }));
    }
  };

  const handleInspectionFail = async (failAction) => {
    if (actionStates.inspect || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, inspect: true }));
    setShowInspectionModal(false);
    
    try {
      let newStatus, message;
      
      switch(failAction) {
        case 'reclean':
          newStatus = 'CLEANING_IN_PROGRESS';
          message = `Room ${roomNumber} failed inspection - Sent back for cleaning`;
          break;
        case 'maintenance':
          newStatus = 'MAINTENANCE_REQUIRED';
          message = `Room ${roomNumber} failed inspection - Maintenance required`;
          break;
        case 'dirty':
        default:
          newStatus = 'CHECKOUT_DIRTY';
          message = `Room ${roomNumber} failed inspection - Marked as dirty`;
          break;
      }
      
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: newStatus,
        note: inspectionNotes || 'Inspection failed'
      });
      toast.warning(message);
      setInspectionNotes('');
    } catch (error) {
      handleRoomOperationError(error, 'inspect room');
    } finally {
      setActionStates(prev => ({ ...prev, inspect: false }));
    }
  };

  // Contextual action logic based on room_status
  const getPrimaryActions = () => {
    if (!canManageRooms) return [];
    
    const status = room?.room_status;
    const actions = [];

    // Check-in is handled from booking management, not room management
    // Only show checkout if room is actually occupied AND status indicates occupancy
    if (room?.is_occupied && currentRoom?.room_status === 'OCCUPIED') {
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
  if (!room && !currentRoom) return null;

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
              <span className={`badge badge-lg fs-5 px-3 py-2 bg-${getStatusColor(currentRoom.room_status)}`}>
                {formatStatus(currentRoom.room_status)}
              </span>
              
              {/* Micro-badges */}
              <div className="d-flex gap-2 flex-wrap">
                {(currentRoom.is_occupied && currentRoom.room_status === 'OCCUPIED') && <span className="badge bg-danger">Occupied</span>}
                {currentRoom.maintenance_required && <span className="badge bg-warning text-dark">Maintenance</span>}
                {currentRoom.is_out_of_order && <span className="badge bg-danger">Out of Order</span>}
                <span className={`badge ${currentRoom.is_bookable ? 'bg-success' : 'bg-secondary'}`}>
                  {currentRoom.is_bookable ? 'Bookable' : 'Not Bookable'}
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
      
      {/* Inspection Modal */}
      {renderInspectionModal()}
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
            {(currentRoom.is_occupied && currentRoom.room_status === 'OCCUPIED') ? (
              <div>
                <h6 className="text-success">
                  <i className="bi bi-person-fill me-2"></i>
                  Currently In-House
                </h6>
                {currentRoom.guests_in_room && currentRoom.guests_in_room.length > 0 ? (
                  <div className="mt-2">
                    {currentRoom.guests_in_room.map((guest) => (
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
                      Check-in: {currentRoom.check_in_time ? new Date(currentRoom.check_in_time).toLocaleString() : 'Unknown'}
                    </small>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Room is occupied but no guest details available.</p>
                )}
              </div>
            ) : (
              <div>
                {currentRoom.room_status === 'READY_FOR_GUEST' ? (
                  <>
                    <h6 className="text-success">
                      <i className="bi bi-check-circle me-2"></i>
                      Room Ready
                    </h6>
                    <p className="text-muted mb-0">No current guests. Ready for next booking.</p>
                    {/* Could add next booking info here if available in room data */}
                  </>
                ) : (
                  <>
                    <h6 className="text-warning">
                      <i className="bi bi-clock-history me-2"></i>
                      Room Preparing
                    </h6>
                    <p className="text-muted mb-0">
                      Room is being prepared for next guest. 
                      <br />
                      <small>Status: {currentRoom.room_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</small>
                    </p>
                  </>
                )}
              </div>
            )}
            
            {/* Room Type Info */}
            {currentRoom.room_type_info && (
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted fw-semibold">Room Details</small>
                <div className="mt-1">
                  <div><strong>Type:</strong> {currentRoom.room_type_info.name}</div>
                  {currentRoom.room_type_info.capacity && <div><strong>Capacity:</strong> {currentRoom.room_type_info.capacity} guests</div>}
                  {currentRoom.room_type_info.base_rate && <div><strong>Base Rate:</strong> ${currentRoom.room_type_info.base_rate}</div>}
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

  // Inspection Modal
  function renderInspectionModal() {
    if (!showInspectionModal) return null;

    return (
      <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-search me-2"></i>
                Room {room?.room_number} Inspection
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => {
                  setShowInspectionModal(false);
                  setInspectionNotes('');
                }}
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-4">
                <h6 className="mb-3">Did the room pass inspection?</h6>
                
                <div className="mb-3">
                  <label className="form-label">Inspection Notes (optional):</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add notes about the inspection..."
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex flex-column gap-3">
              {/* Pass Button */}
              <button
                className="btn btn-success w-100 py-2"
                onClick={handleInspectionPass}
                disabled={actionStates.inspect}
              >
                {actionStates.inspect ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing...
                  </span>
                ) : (
                  <span>
                    <i className="bi bi-check-circle me-2"></i>
                    ✅ PASSED - Set Ready for Guest
                  </span>
                )}
              </button>
              
              <div className="text-center">
                <small className="text-muted">If inspection failed, choose action:</small>
              </div>
              
              {/* Fail Actions */}
              <div className="d-grid gap-2">
                <button
                  className="btn btn-warning"
                  onClick={() => handleInspectionFail('reclean')}
                  disabled={actionStates.inspect}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  ❌ FAILED - Send Back for Cleaning
                </button>
                
                <button
                  className="btn btn-danger"
                  onClick={() => handleInspectionFail('maintenance')}
                  disabled={actionStates.inspect}
                >
                  <i className="bi bi-tools me-2"></i>
                  🔧 FAILED - Maintenance Required
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => handleInspectionFail('dirty')}
                  disabled={actionStates.inspect}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  🧹 FAILED - Mark as Dirty
                </button>
              </div>
              
              <button
                className="btn btn-outline-secondary mt-2"
                onClick={() => {
                  setShowInspectionModal(false);
                  setInspectionNotes('');
                }}
                disabled={actionStates.inspect}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default RoomDetails;
