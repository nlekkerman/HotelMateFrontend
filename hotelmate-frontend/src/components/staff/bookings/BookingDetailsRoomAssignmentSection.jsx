import React from 'react';
import { Card, Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { format } from 'date-fns';

const BookingDetailsRoomAssignmentSection = ({ 
  booking, 
  roomAssignment,
  availableRooms,
  isLoadingRooms,
  onAssignRoom,
  onUnassignRoom,
  onShowAssignment,
  onHideAssignment,
  mutations
}) => {
  const {
    selectedRoomId,
    setSelectedRoomId,
    assignmentNotes,
    setAssignmentNotes,
    showRoomAssignment,
    reason,
    setReason,
    reasonError,
    setReasonError
  } = roomAssignment;
  
  const { safeAssignMutation, unassignMutation } = mutations;
  const flags = booking?.flags || {};
  
  // Debug: Check what room assignment fields are available
  console.log('🏨 Room assignment debug:', {
    booking,
    assigned_room: booking?.assigned_room,
    room: booking?.room,
    room_number: booking?.room_number,
    room_assigned_at: booking?.room_assigned_at,
    allBookingKeys: booking ? Object.keys(booking) : null
  });
  
  if (booking?.assigned_room || booking?.room) {
    // Room is assigned
    const assignedRoom = booking?.assigned_room || booking?.room;
    console.log('🔧 Rendering assigned room section:', {
      showRoomAssignment,
      assignedRoomNumber: assignedRoom?.room_number,
      booking: booking?.booking_id
    });
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Room Assignment</h6>
        </Card.Header>
        <Card.Body>
          {!showRoomAssignment ? (
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Room {assignedRoom?.room_number}</strong>
                <br />
                {booking?.room_assigned_at && (
                  <small className="text-muted">
                    Assigned on {format(new Date(booking.room_assigned_at), 'MMM dd, yyyy HH:mm')}
                  </small>
                )}
              </div>
              <div className="d-flex gap-2">
                {flags.can_unassign_room && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={onUnassignRoom}
                    disabled={unassignMutation.isPending}
                  >
                    {unassignMutation.isPending ? 'Unassigning...' : 'Unassign'}
                  </Button>
                )}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    console.log('🔧 Change Room button clicked!');
                    console.log('🔧 Current showRoomAssignment:', showRoomAssignment);
                    console.log('🔧 Booking status:', {
                      checked_in_at: booking?.checked_in_at,
                      checked_out_at: booking?.checked_out_at,
                      isInHouse: !!booking.checked_in_at && !booking.checked_out_at
                    });
                    
                    setReason('');
                    setReasonError('');
                    onShowAssignment();
                    
                    console.log('🔧 Set showRoomAssignment to true');
                  }}
                  disabled={!!booking?.checked_out_at}
                >
                  {(() => {
                    if (booking?.checked_out_at) return 'Cannot Change (Checked Out)';
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse ? 'Move Room' : 'Reassign Room';
                  })()}
                </Button>
              </div>
            </div>
          ) : (
            /* Room assignment form - shown when showRoomAssignment is true */
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Room</Form.Label>
                <Form.Select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  disabled={isLoadingRooms}
                >
                  <option value="">
                    {isLoadingRooms ? 'Loading rooms...' : 'Choose a room...'}
                  </option>
                  {(() => {
                    // Handle API response structure: { available_rooms: [...] }
                    let roomsArray = [];
                    
                    if (Array.isArray(availableRooms)) {
                      // Direct array format
                      roomsArray = availableRooms;
                    } else if (availableRooms?.available_rooms && Array.isArray(availableRooms.available_rooms)) {
                      // API format: { available_rooms: [...] }
                      roomsArray = availableRooms.available_rooms;
                    }
                    
                    return roomsArray.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type}
                      </option>
                    ));
                  })()}
                </Form.Select>
              </Form.Group>
              
              {/* Reason field - only show for in-house guests (Move Room mode) */}
              {(() => {
                const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                if (!isInHouse) return null;
                
                return (
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for Move <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (e.target.value.trim()) setReasonError('');
                      }}
                      placeholder="Why is this guest being moved? (e.g., guest complaint, maintenance issue, upgrade)"
                      isInvalid={!!reasonError}
                    />
                    {reasonError && (
                      <Form.Control.Feedback type="invalid">
                        {reasonError}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                );
              })()}
              
              <Form.Group className="mb-3">
                <Form.Label>
                  {(() => {
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse ? 'Additional Notes (Optional)' : 'Assignment Notes (Optional)';
                  })()}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder={(() => {
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse 
                      ? "Any additional notes, compensation offered, etc..." 
                      : "Add any notes about this room assignment...";
                  })()}
                />
              </Form.Group>
              
              <div className="d-flex gap-2">
                {(() => {
                  const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                  const partyMissingCount = booking?.party_missing_count; // NO fallback
                  const isPartyIncomplete = !partyComplete;
                  const isDisabled = !selectedRoomId || safeAssignMutation.isPending || isPartyIncomplete;
                  
                  const button = (
                    <Button
                      variant="success"
                      onClick={onAssignRoom}
                      disabled={isDisabled}
                      className={isPartyIncomplete ? 'party-gated-button' : ''}
                    >
                      {(() => {
                        if (safeAssignMutation.isPending) {
                          const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                          return isInHouse ? 'Moving...' : 'Assigning...';
                        }
                        
                        const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                        return isInHouse ? 'Confirm & Move' : 'Confirm & Reassign';
                      })()}
                    </Button>
                  );
                  
                  if (isPartyIncomplete) {
                    return (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                          </Tooltip>
                        }
                      >
                        <span className="d-inline-block">{button}</span>
                      </OverlayTrigger>
                    );
                  }
                  
                  return button;
                })()}
                <Button
                  variant="secondary"
                  onClick={onHideAssignment}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  } else {
    // No room assigned - always show if showRoomAssignment is true (triggered from check-in)
    if (!flags.can_assign_room && !showRoomAssignment) return null;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Room Assignment</h6>
        </Card.Header>
        <Card.Body>
          {!showRoomAssignment ? (
            (() => {
              const partyComplete = booking?.party_complete ?? true; // Default to true if not present
              const partyMissingCount = booking?.party_missing_count; // NO fallback
              const isDisabled = !partyComplete;
              
              const button = (
                <Button
                  variant="primary"
                  onClick={() => {
                    setReason('');
                    setReasonError('');
                    onShowAssignment();
                  }}
                  disabled={isDisabled || !!booking?.checked_out_at}
                  className={isDisabled ? 'party-gated-button' : ''}
                >
                  {(() => {
                    if (booking?.checked_out_at) return 'Cannot Assign (Checked Out)';
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse ? 'Move Room' : 'Assign Room';
                  })()}
                </Button>
              );
              
              if (isDisabled) {
                return (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                      </Tooltip>
                    }
                  >
                    <span className="d-inline-block">{button}</span>
                  </OverlayTrigger>
                );
              }
              
              return button;
            })()
          ) : (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Room</Form.Label>
                <Form.Select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  disabled={isLoadingRooms}
                >
                  <option value="">
                    {isLoadingRooms ? 'Loading rooms...' : 'Choose a room...'}
                  </option>
                  {(() => {
                    // Handle API response structure: { available_rooms: [...] }
                    let roomsArray = [];
                    
                    if (Array.isArray(availableRooms)) {
                      // Direct array format
                      roomsArray = availableRooms;
                    } else if (availableRooms?.available_rooms && Array.isArray(availableRooms.available_rooms)) {
                      // API format: { available_rooms: [...] }
                      roomsArray = availableRooms.available_rooms;
                    }
                    
                    return roomsArray.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type}
                      </option>
                    ));
                  })()}
                </Form.Select>
              </Form.Group>
              
              {/* Reason field - only show for in-house guests (Move Room mode) */}
              {(() => {
                const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                if (!isInHouse) return null;
                
                return (
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for Move <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (e.target.value.trim()) setReasonError('');
                      }}
                      placeholder="Why is this guest being moved? (e.g., guest complaint, maintenance issue, upgrade)"
                      isInvalid={!!reasonError}
                    />
                    {reasonError && (
                      <Form.Control.Feedback type="invalid">
                        {reasonError}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                );
              })()}
              
              <Form.Group className="mb-3">
                <Form.Label>
                  {(() => {
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse ? 'Additional Notes (Optional)' : 'Assignment Notes (Optional)';
                  })()}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder={(() => {
                    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                    return isInHouse 
                      ? "Any additional notes, compensation offered, etc..." 
                      : "Add any notes about this room assignment...";
                  })()}
                />
              </Form.Group>
              
              <div className="d-flex gap-2">
                {(() => {
                  const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                  const partyMissingCount = booking?.party_missing_count; // NO fallback
                  const isPartyIncomplete = !partyComplete;
                  const isDisabled = !selectedRoomId || safeAssignMutation.isPending || isPartyIncomplete;
                  
                  const button = (
                    <Button
                      variant="success"
                      onClick={onAssignRoom}
                      disabled={isDisabled}
                      className={isPartyIncomplete ? 'party-gated-button' : ''}
                    >
                      {(() => {
                        if (safeAssignMutation.isPending) {
                          const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                          return isInHouse ? 'Moving...' : 'Assigning...';
                        }
                        
                        const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                        return isInHouse ? 'Confirm & Move' : 'Confirm & Assign';
                      })()}
                    </Button>
                  );
                  
                  if (isPartyIncomplete) {
                    return (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                          </Tooltip>
                        }
                      >
                        <span className="d-inline-block">{button}</span>
                      </OverlayTrigger>
                    );
                  }
                  
                  return button;
                })()}
                <Button
                  variant="secondary"
                  onClick={onHideAssignment}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }
};

export default BookingDetailsRoomAssignmentSection;