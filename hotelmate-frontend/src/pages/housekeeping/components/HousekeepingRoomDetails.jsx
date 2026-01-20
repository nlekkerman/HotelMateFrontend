// src/pages/housekeeping/components/HousekeepingRoomDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getHotelSlug } from "@/services/api";
import { useRoomsState } from "@/realtime/stores/roomsStore.jsx";
import { toast } from "react-toastify";
import {
  updateHousekeepingRoomStatus,
  checkoutRoom,
  startCleaning,
  markCleaned,
  inspectRoom,
  markMaintenance,
  completeMaintenance,
  managerOverrideRoomStatus
} from "@/services/roomOperations";
import { handleRoomOperationError } from "@/utils/errorHandling";

function HousekeepingRoomDetails() {
  const { hotelSlug, roomNumber } = useParams();
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

  // Status override modal
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Inspection modal
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Room notes
  const [roomNotes, setRoomNotes] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  const userData = JSON.parse(localStorage.getItem("user"));
  const canManageRooms = ['housekeeping', 'admin', 'manager'].includes(userData?.role?.toLowerCase()) || userData?.is_superuser;
  const canUseManagerOverride = userData?.is_manager || userData?.is_superuser || userData?.role?.toLowerCase() === 'manager';

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

  // Load room data
  useEffect(() => {
    const fetchRoom = async () => {
      if (!hotelSlug || !roomNumber) return;
      
      try {
        setLoading(true);
        const hotelSlugToUse = getHotelSlug();
        // Use the housekeeping dashboard endpoint to get room data
        const response = await api.get(`/staff/hotel/${hotelSlugToUse}/housekeeping/dashboard/`);
        
        console.log('[HousekeepingRoomDetails] Dashboard response:', response.data);
        
        // Find the specific room from the dashboard data
        const { rooms_by_status = {} } = response.data;
        let foundRoom = null;
        
        console.log('[HousekeepingRoomDetails] Looking for room:', roomNumber);
        console.log('[HousekeepingRoomDetails] Available room statuses:', Object.keys(rooms_by_status));
        
        // Search through all status categories to find the room
        Object.entries(rooms_by_status).forEach(([status, statusRooms]) => {
          console.log(`[HousekeepingRoomDetails] Checking ${status} rooms:`, statusRooms);
          if (Array.isArray(statusRooms)) {
            const room = statusRooms.find(r => {
              // Try different room number formats
              const roomNum = String(roomNumber);
              const rRoomNumber = String(r.room_number || r.number || '');
              const rId = String(r.id || '');
              
              return rRoomNumber === roomNum || 
                     rRoomNumber === `Room ${roomNum}` ||
                     roomNum === rRoomNumber ||
                     rId === roomNum;
            });
            if (room && !foundRoom) {
              console.log('[HousekeepingRoomDetails] Found room:', room);
              foundRoom = room;
            }
          }
        });
        
        if (foundRoom) {
          // Ensure room has proper status display
          if (!foundRoom.room_status_display) {
            foundRoom.room_status_display = foundRoom.room_status?.replace(/_/g, ' ') || 'Unknown';
          }
          setRoom(foundRoom);
          setError(null);
        } else {
          console.error('[HousekeepingRoomDetails] Room not found. Available rooms:', 
            Object.values(rooms_by_status).flat().map(r => ({
              id: r.id,
              room_number: r.room_number || r.number,
              status: r.room_status
            }))
          );
          setError(`Room ${roomNumber} not found`);
        }
      } catch (err) {
        console.error('Failed to fetch room:', err);
        setError('Failed to load room details');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [hotelSlug, roomNumber]);

  // Generic action handler that manages loading state and shows toast
  const handleAction = async (actionName, actionFunction, successMessage, actionOptions = {}) => {
    if (actionStates[actionName]) return;
    
    setActionStates(prev => ({ ...prev, [actionName]: true }));
    try {
      const hotelSlugToUse = getHotelSlug();
      await actionFunction(hotelSlugToUse, roomNumber, actionOptions);
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
    if (actionStates.checkout || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, checkout: true }));
    try {
      await checkoutRoom(getHotelSlug(), room.room_number, { roomId: room.id });
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

  // Status override handler with manager override support
  const handleStatusOverride = async () => {
    if (!selectedStatus || actionStates.statusOverride || !room?.id) return;
    
    // Check if this requires manager override (bypassing workflow rules)
    const requiresManagerOverride = canUseManagerOverride && (
      statusNote.toLowerCase().includes('override') ||
      statusNote.toLowerCase().includes('bypass') ||
      statusNote.toLowerCase().includes('force') ||
      statusNote.toLowerCase().includes('emergency')
    );
    
    setActionStates(prev => ({ ...prev, statusOverride: true }));
    try {
      const hotelSlugToUse = getHotelSlug();
      
      if (requiresManagerOverride) {
        // Use manager override endpoint
        await managerOverrideRoomStatus(hotelSlugToUse, room.id, {
          to_status: selectedStatus,
          note: statusNote || `Manager override to ${selectedStatus}`
        });
        toast.success(`🔑 Manager Override: Room ${roomNumber} status changed. Waiting for realtime update.`);
      } else {
        // Use regular housekeeping endpoint
        await updateHousekeepingRoomStatus(hotelSlugToUse, room.id, {
          status: selectedStatus,
          note: statusNote || `Status changed to ${selectedStatus}`
        });
        toast.success(`Room ${roomNumber} status updated. Waiting for realtime update.`);
      }
      
      setSelectedStatus('');
      setStatusNote('');
    } catch (error) {
      const errorMessage = handleRoomOperationError(error, 'status_override', roomNumber);
      // Check for manager privilege error
      if (error.response?.data?.error?.includes('Manager privileges')) {
        toast.error('Manager privileges required for this override operation.');
      } else {
        toast.error(errorMessage);
      }
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

  const handleInspectionFail = async () => {
    if (actionStates.inspect || !room?.id) return;
    
    setActionStates(prev => ({ ...prev, inspect: true }));
    setShowInspectionModal(false);
    
    try {
      await updateHousekeepingRoomStatus(getHotelSlug(), room.id, {
        status: 'MAINTENANCE_REQUIRED',
        note: inspectionNotes || 'Inspection failed - maintenance required'
      });
      toast.success(`Room ${roomNumber} requires maintenance.`);
      setInspectionNotes('');
    } catch (error) {
      handleRoomOperationError(error, 'inspect room');
    } finally {
      setActionStates(prev => ({ ...prev, inspect: false }));
    }
  };

  // Add note handler
  const handleAddNote = async () => {
    if (!newNote.trim() || addingNote) return;
    
    setAddingNote(true);
    try {
      // TODO: Implement actual note API call
      toast.success('Note added successfully');
      setNewNote('');
      // Refresh room data to get updated notes
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Render turnover actions based on current status
  const renderTurnoverActions = () => {
    if (!canManageRooms || !currentRoom) return null;

    const status = currentRoom.room_status;
    const actions = [];

    switch (status) {
      case 'OCCUPIED':
        actions.push(
          <button
            key="checkout"
            className="btn btn-warning"
            onClick={handleCheckout}
            disabled={actionStates.checkout}
          >
            {actionStates.checkout ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-right me-2"></i>
                Check Out
              </>
            )}
          </button>
        );
        break;

      case 'CHECKOUT_DIRTY':
        actions.push(
          <button
            key="start-cleaning"
            className="btn btn-info"
            onClick={handleStartCleaning}
            disabled={actionStates.startCleaning}
          >
            {actionStates.startCleaning ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-play-fill me-2"></i>
                Start Cleaning
              </>
            )}
          </button>
        );
        break;

      case 'CLEANING_IN_PROGRESS':
        actions.push(
          <button
            key="mark-cleaned"
            className="btn btn-success"
            onClick={handleMarkCleaned}
            disabled={actionStates.markCleaned}
          >
            {actionStates.markCleaned ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Mark Cleaned
              </>
            )}
          </button>
        );
        break;

      case 'CLEANED_UNINSPECTED':
        actions.push(
          <button
            key="inspect"
            className="btn btn-primary me-2"
            onClick={handleInspect}
            disabled={actionStates.inspect}
          >
            <i className="bi bi-eye me-2"></i>
            Inspect Room
          </button>,
          <button
            key="mark-maintenance"
            className="btn btn-secondary"
            onClick={handleMarkMaintenance}
            disabled={actionStates.markMaintenance}
          >
            {actionStates.markMaintenance ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-tools me-2"></i>
                Needs Maintenance
              </>
            )}
          </button>
        );
        break;

      case 'MAINTENANCE_REQUIRED':
        actions.push(
          <button
            key="complete-maintenance"
            className="btn btn-success"
            onClick={handleCompleteMaintenance}
            disabled={actionStates.completeMaintenance}
          >
            {actionStates.completeMaintenance ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check2-all me-2"></i>
                Complete Maintenance
              </>
            )}
          </button>
        );
        break;

      default:
        return (
          <div className="text-muted">
            <small>No turnover actions available for current status.</small>
          </div>
        );
    }

    return (
      <div className="d-flex gap-2 flex-wrap">
        {actions}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (error || !currentRoom) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Room Details</h4>
          <p>{error || 'Room not found'}</p>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          {/* Back Button */}
          <button 
            className="btn btn-outline-secondary mb-3"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Housekeeping
          </button>

          {/* Room Header */}
          <div className="card mb-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Room {currentRoom.room_number}</h4>
                <span className={`badge bg-${getStatusColor(currentRoom.room_status)} fs-6`}>
                  {formatStatus(currentRoom.room_status)}
                </span>
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  {currentRoom.room_type_name || 'Standard Room'}
                  {currentRoom.last_updated && (
                    <span className="ms-3">
                      Last Updated: {new Date(currentRoom.last_updated).toLocaleString()}
                    </span>
                  )}
                </small>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Left Column: Turnover Actions & Override */}
            <div className="col-md-8">
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
                    {renderTurnoverActions()}
                  </div>
                </div>
              )}

              {/* Quick Status Override */}
              {canManageRooms && (
                <div className="card mb-4">
                  <div className={`card-header ${canUseManagerOverride ? 'bg-danger text-white' : 'bg-warning text-dark'}`}>
                    <h6 className="mb-0">
                      <i className={`bi ${canUseManagerOverride ? 'bi-key' : 'bi-exclamation-triangle'} me-2`}></i>
                      Quick Status Override
                      {canUseManagerOverride && <small className="ms-2 opacity-75">Manager Privileges</small>}
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className={`alert ${canUseManagerOverride ? 'alert-danger' : 'alert-warning'} py-2 mb-3`}>
                      <small>
                        <i className={`bi ${canUseManagerOverride ? 'bi-key' : 'bi-exclamation-triangle'} me-1`}></i>
                        {canUseManagerOverride 
                          ? 'Manager override can bypass workflow restrictions and will be logged in audit trail.' 
                          : 'Use only if workflow buttons are not applicable.'}
                      </small>
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
                        <option value="OCCUPIED">Occupied</option>
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Note:</label>
                      <textarea 
                        className="form-control form-control-sm" 
                        rows="2" 
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder={canUseManagerOverride 
                          ? 'Why is this manager override needed? (Use keywords: override, bypass, force, emergency for manager override)' 
                          : 'Why is this override needed?'}
                        disabled={actionStates.statusOverride}
                      ></textarea>
                      {canUseManagerOverride && statusNote && (
                        statusNote.toLowerCase().includes('override') ||
                        statusNote.toLowerCase().includes('bypass') ||
                        statusNote.toLowerCase().includes('force') ||
                        statusNote.toLowerCase().includes('emergency')
                      ) && (
                        <small className="text-danger mt-1 d-block">
                          <i className="bi bi-key me-1"></i>
                          This will use Manager Override (bypasses workflow rules)
                        </small>
                      )}
                    </div>
                    
                    {canUseManagerOverride && (
                      <div className="mb-3">
                        <div className="d-flex gap-2">
                          <button 
                            type="button"
                            className="btn btn-sm btn-outline-danger flex-fill"
                            onClick={() => setStatusNote('Emergency override - room ready for guest')}
                            disabled={actionStates.statusOverride}
                          >
                            🔓 Force Ready
                          </button>
                          <button 
                            type="button"
                            className="btn btn-sm btn-outline-secondary flex-fill"
                            onClick={() => setStatusNote('Manager override - maintenance required')}
                            disabled={actionStates.statusOverride}
                          >
                            🔧 Force Maintenance
                          </button>
                          <button 
                            type="button"
                            className="btn btn-sm btn-outline-warning flex-fill"
                            onClick={() => setStatusNote('Manager override - room out of service')}
                            disabled={actionStates.statusOverride}
                          >
                            🚫 Force OOO
                          </button>
                        </div>
                        <small className="text-muted d-block mt-1 text-center">
                          Quick override templates (click to use)
                        </small>
                      </div>
                    )}
                    
                    <button 
                      className={`btn w-100 ${canUseManagerOverride ? 'btn-danger' : 'btn-warning'}`}
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
                          <i className={`bi ${canUseManagerOverride ? 'bi-key' : 'bi-gear'} me-2`}></i>
                          {canUseManagerOverride ? 'Manager Override Status' : 'Override Status Now'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Room Info & Notes */}
            <div className="col-md-4">
              {/* Room Details */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 className="mb-0">Room Details</h6>
                </div>
                <div className="card-body">
                  <div className="mb-2">
                    <strong>Type:</strong> {currentRoom.room_type_name || 'Standard Room'}
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> {formatStatus(currentRoom.room_status)}
                  </div>
                  {currentRoom.last_cleaned_at && (
                    <div className="mb-2">
                      <strong>Last Cleaned:</strong> {new Date(currentRoom.last_cleaned_at).toLocaleString()}
                      {currentRoom.cleaned_by_staff_name && (
                        <span className="text-primary"> by {currentRoom.cleaned_by_staff_name}</span>
                      )}
                    </div>
                  )}
                  {currentRoom.last_inspected_at && (
                    <div className="mb-2">
                      <strong>Last Inspected:</strong> {new Date(currentRoom.last_inspected_at).toLocaleString()}
                      {currentRoom.inspected_by_staff_name && (
                        <span className="text-success"> by {currentRoom.inspected_by_staff_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Note */}
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Add Note</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this room..."
                      disabled={addingNote}
                    ></textarea>
                  </div>
                  <button 
                    className="btn btn-primary w-100"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                  >
                    {addingNote ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Adding Note...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2"></i>
                        Add Note
                      </>
                    )}
                  </button>
                  <div className="mt-3">
                    <small className="text-muted">Notes functionality will be implemented here</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Modal */}
      {showInspectionModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Room Inspection</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowInspectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>How did the room inspection go?</p>
                <div className="mb-3">
                  <label className="form-label">Inspection Notes (optional):</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Any additional notes about the inspection..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleInspectionPass}
                  disabled={actionStates.inspect}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Pass - Ready for Guest
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleInspectionFail}
                  disabled={actionStates.inspect}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Fail - Needs Maintenance
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowInspectionModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HousekeepingRoomDetails;