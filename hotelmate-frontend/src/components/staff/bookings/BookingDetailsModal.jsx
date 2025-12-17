import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card, Badge, Form, Row, Col } from 'react-bootstrap';
import { 
  useRoomBookingDetail, 
  useAvailableRooms, 
  useSafeAssignRoom, 
  useUnassignRoom, 
  useCheckInBooking 
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
      // Error handled by mutation
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
  
  const renderBookingParty = (party) => {
    // Handle case where party might not be an array or might be null/undefined
    if (!party) return null;
    
    // If party is not an array, try to convert it or create a single guest entry
    let partyArray = [];
    if (Array.isArray(party)) {
      partyArray = party;
    } else if (typeof party === 'object') {
      // If party is an object, treat it as a single guest
      partyArray = [party];
    } else {
      return null;
    }
    
    if (partyArray.length === 0) return null;
    
    const primaryGuest = partyArray.find(p => p.role === 'PRIMARY') || partyArray[0];
    const companions = partyArray.filter(p => p.role === 'COMPANION');
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Booking Party ({partyArray.length} guests)</h6>
        </Card.Header>
        <Card.Body>
          <div className="mb-2">
            <strong>Primary Guest:</strong><br />
            {primaryGuest.first_name} {primaryGuest.last_name}
            {primaryGuest.email && <><br /><small>{primaryGuest.email}</small></>}
            {primaryGuest.phone && <><br /><small>{primaryGuest.phone}</small></>}
          </div>
          
          {companions.length > 0 && (
            <div>
              <strong>Companions:</strong>
              {companions.map((companion, index) => (
                <div key={index} className="ms-2">
                  • {companion.first_name} {companion.last_name}
                </div>
              ))}
            </div>
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
              <Button
                variant="primary"
                onClick={() => setShowRoomAssignment(true)}
              >
                Assign Room
              </Button>
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
                  <Button
                    variant="success"
                    onClick={handleAssignRoom}
                    disabled={!selectedRoomId || safeAssignMutation.isPending}
                  >
                    {safeAssignMutation.isPending ? 'Assigning...' : 'Assign Room'}
                  </Button>
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
        
        {/* Guest Information */}
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Guest Information</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <div>
                  <strong>Primary Guest:</strong><br />
                  {booking.primary_first_name} {booking.primary_last_name}
                  {booking.primary_email && <><br />Email: {booking.primary_email}</>}
                  {booking.primary_phone && <><br />Phone: {booking.primary_phone}</>}
                </div>
              </Col>
              {booking.booker_type !== 'SELF' && (
                <Col md={6}>
                  <div>
                    <strong>Booker:</strong><br />
                    {booking.booker_first_name} {booking.booker_last_name}
                    {booking.booker_email && <><br />Email: {booking.booker_email}</>}
                    {booking.booker_company && <><br />Company: {booking.booker_company}</>}
                  </div>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
        
        {/* Booking Party */}
        {renderBookingParty(booking.party)}
        
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