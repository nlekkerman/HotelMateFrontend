import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card, Badge, Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  useRoomBookingDetail, 
  useAvailableRooms, 
  useSafeAssignRoom, 
  useUnassignRoom, 
  useCheckInBooking,
  useSendPrecheckinLink 
} from '@/hooks/useStaffRoomBookingDetail';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

/**
 * Canonical Booking Details Modal Component
 * Features room assignment, check-in, and flags-driven actions
 */
const BookingDetailsModal = ({ show, onClose, bookingId, hotelSlug }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showRoomAssignment, setShowRoomAssignment] = useState(false);
  
  // Fetch booking detail
  const { 
    data: booking, 
    isLoading: isLoadingBooking, 
    error: bookingError 
  } = useRoomBookingDetail(hotelSlug, bookingId);
  
  // Fetch available rooms (only when needed)
  const { 
    data: availableRooms, 
    isLoading: isLoadingRooms 
  } = useAvailableRooms(hotelSlug, bookingId);
  
  // Mutations
  const safeAssignMutation = useSafeAssignRoom(hotelSlug);
  const unassignMutation = useUnassignRoom(hotelSlug);
  const checkInMutation = useCheckInBooking(hotelSlug);
  const sendPrecheckinLinkMutation = useSendPrecheckinLink(hotelSlug);
  
  
  const handleAssignRoom = async () => {
    if (!selectedRoomId) {
      toast.error('Please select a room');
      return;
    }
    
    try {
      await safeAssignMutation.mutateAsync({
        bookingId,
        roomId: selectedRoomId,
        assignmentNotes,
      });
      setSelectedRoomId('');
      setAssignmentNotes('');
      setShowRoomAssignment(false);
    } catch (error) {
      // Check for PARTY_INCOMPLETE specific error
      if (error.response?.data?.code === 'PARTY_INCOMPLETE') {
        toast.error('Cannot assign room. Missing guest information. Send pre-check-in link first.');
        // Keep modal open for user to fix the issue
        return;
      }
      // Other errors handled by mutation
    }
  };
  
  const handleUnassignRoom = async () => {
    try {
      await unassignMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleSendPrecheckinLink = async () => {
    try {
      await sendPrecheckinLinkMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'PENDING_PAYMENT': { variant: 'warning', text: 'Pending Payment' },
      'CONFIRMED': { variant: 'success', text: 'Confirmed' },
      'CANCELLED': { variant: 'danger', text: 'Cancelled' },
      'COMPLETED': { variant: 'info', text: 'Completed' },
      'NO_SHOW': { variant: 'secondary', text: 'No Show' },
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };
  
  const renderPartyStatusBanner = () => {
    const partyComplete = booking?.party_complete ?? false;
    const partyMissingCount = booking?.party_missing_count ?? 0;
    
    if (partyComplete) {
      return null; // No banner needed when party is complete
    }
    
    return (
      <Alert variant="warning" className="mt-3 party-status-banner">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Missing {partyMissingCount} guest name(s). Request guest details.
          </div>
          <Button 
            variant="outline-warning" 
            size="sm"
            onClick={handleSendPrecheckinLink}
            disabled={sendPrecheckinLinkMutation.isPending}
          >
            {sendPrecheckinLinkMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Sending...
              </>
            ) : (
              'Request guest details'
            )}
          </Button>
        </div>
      </Alert>
    );
  };
  
  const renderPrimaryGuest = () => {
    const party = booking?.party;
    let primaryGuest = null;
    
    // Use party.primary if available, fallback to primary_* fields
    if (party?.primary) {
      primaryGuest = party.primary;
    } else if (booking?.primary_first_name || booking?.primary_last_name) {
      primaryGuest = {
        first_name: booking.primary_first_name,
        last_name: booking.primary_last_name,
        full_name: `${booking.primary_first_name || ''} ${booking.primary_last_name || ''}`.trim(),
        email: booking.primary_email,
        phone: booking.primary_phone
      };
    }
    
    if (!primaryGuest) {
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Primary Guest</h6>
          </Card.Header>
          <Card.Body>
            <div className="text-muted">Not provided yet</div>
          </Card.Body>
        </Card>
      );
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Primary Guest</h6>
        </Card.Header>
        <Card.Body>
          <div>
            <strong>{primaryGuest.full_name || `${primaryGuest.first_name || ''} ${primaryGuest.last_name || ''}`.trim()}</strong>
            {primaryGuest.email && (
              <div className="text-muted">Email: {primaryGuest.email}</div>
            )}
            {primaryGuest.phone && (
              <div className="text-muted">Phone: {primaryGuest.phone}</div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  const renderBooker = () => {
    const hasBooker = booking?.booker_first_name || booking?.booker_last_name || booking?.booker_email;
    
    if (!hasBooker || booking?.booker_type === 'SELF') {
      return null; // Don't show booker section if it's self-booking or no booker data
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Booker</h6>
        </Card.Header>
        <Card.Body>
          <div>
            <strong>{booking.booker_first_name} {booking.booker_last_name}</strong>
            {booking.booker_email && (
              <div className="text-muted">Email: {booking.booker_email}</div>
            )}
            {booking.booker_company && (
              <div className="text-muted">Company: {booking.booker_company}</div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  const renderCompanions = () => {
    const companions = booking?.party?.companions || [];
    const totalPartySize = booking?.party?.total_party_size;
    
    if (companions.length === 0 && !totalPartySize) {
      return null;
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">
            Booking Party
            {totalPartySize && (
              <span className="text-muted ms-2">({totalPartySize} guests total)</span>
            )}
          </h6>
        </Card.Header>
        <Card.Body>
          {companions.length > 0 ? (
            <div>
              <strong>Companions:</strong>
              {companions.map((companion, index) => (
                <div key={index} className="ms-2 mt-1">
                  • {companion.full_name || `${companion.first_name || ''} ${companion.last_name || ''}`.trim()}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No companions added yet</div>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  const renderRoomAssignmentSection = () => {
    const flags = booking?.flags || {};
    
    if (booking?.assigned_room) {
      // Room is assigned
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Room {booking.assigned_room.room_number}</strong>
                <br />
                <small className="text-muted">
                  Assigned on {format(new Date(booking.room_assigned_at), 'MMM dd, yyyy HH:mm')}
                </small>
              </div>
              {flags.can_unassign_room && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleUnassignRoom}
                  disabled={unassignMutation.isPending}
                >
                  {unassignMutation.isPending ? 'Unassigning...' : 'Unassign'}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      );
    } else {
      // No room assigned
      if (!flags.can_assign_room) return null;
      
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            {!showRoomAssignment ? (
              (() => {
                const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                const partyMissingCount = booking?.party_missing_count ?? 0;
                const isDisabled = !partyComplete;
                
                const button = (
                  <Button
                    variant="primary"
                    onClick={() => setShowRoomAssignment(true)}
                    disabled={isDisabled}
                    className={isDisabled ? 'party-gated-button' : ''}
                  >
                    Assign Room
                  </Button>
                );
                
                if (isDisabled) {
                  return (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Missing {partyMissingCount} guest name(s). Send pre-check-in link first.
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
                    {availableRooms?.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Assignment Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Add any notes about this room assignment..."
                  />
                </Form.Group>
                
                <div className="d-flex gap-2">
                  {(() => {
                    const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                    const partyMissingCount = booking?.party_missing_count ?? 0;
                    const isPartyIncomplete = !partyComplete;
                    const isDisabled = !selectedRoomId || safeAssignMutation.isPending || isPartyIncomplete;
                    
                    const button = (
                      <Button
                        variant="success"
                        onClick={handleAssignRoom}
                        disabled={isDisabled}
                        className={isPartyIncomplete ? 'party-gated-button' : ''}
                      >
                        {safeAssignMutation.isPending ? 'Assigning...' : 'Confirm & Assign'}
                      </Button>
                    );
                    
                    if (isPartyIncomplete) {
                      return (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip>
                              Missing {partyMissingCount} guest name(s). Send pre-check-in link first.
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
                    onClick={() => setShowRoomAssignment(false)}
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
  
  const renderCheckInSection = () => {
    const flags = booking?.flags || {};
    
    if (!flags.can_check_in || booking?.checked_in_at) return null;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Check-In</h6>
        </Card.Header>
        <Card.Body>
          <Button
            variant="info"
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? 'Checking In...' : 'Check In Guest'}
          </Button>
        </Card.Body>
      </Card>
    );
  };
  
  if (isLoadingBooking) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading booking details...</div>
        </Modal.Body>
      </Modal>
    );
  }
  
  if (bookingError) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            Failed to load booking details: {bookingError.message}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
  
  if (!booking) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Booking Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Booking details could not be found.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
  
  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Booking Details - {booking.booking_id}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Booking Status and IDs */}
        <Card>
          <Card.Body>
            <Row>
              <Col md={8}>
                <h5>
                  {booking.primary_first_name} {booking.primary_last_name}
                  <span className="ms-2">{renderStatusBadge(booking.status)}</span>
                </h5>
                <div className="text-muted">
                  Booking ID: {booking.booking_id}<br />
                  Confirmation: {booking.confirmation_number}
                </div>
              </Col>
              <Col md={4} className="text-end">
                <div>
                  <strong>{booking.room_type_name}</strong><br />
                  <small className="text-muted">
                    {format(new Date(booking.check_in), 'MMM dd')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                    <br />
                    {booking.nights} nights, {booking.adults} adults
                    {booking.children > 0 && `, ${booking.children} children`}
                  </small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Party Status Banner */}
        {renderPartyStatusBanner()}
        
        {/* Primary Guest */}
        {renderPrimaryGuest()}
        
        {/* Booker */}
        {renderBooker()}
        
        {/* Companions */}
        {renderCompanions()}
        
        {/* Room Assignment Section */}
        {renderRoomAssignmentSection()}
        
        {/* Check-In Section */}
        {renderCheckInSection()}
        
        {/* Pricing */}
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Pricing</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between">
              <span>Total Amount:</span>
              <strong>{booking.total_amount} {booking.currency}</strong>
            </div>
          </Card.Body>
        </Card>
        
        {/* Special Requests */}
        {booking.special_requests && (
          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0">Special Requests</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-muted">{booking.special_requests}</div>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BookingDetailsModal;