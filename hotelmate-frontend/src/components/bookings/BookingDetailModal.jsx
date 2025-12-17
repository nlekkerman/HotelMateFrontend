import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Row, Col, Spinner, Alert, ListGroup, Form } from 'react-bootstrap';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api, { buildStaffURL } from '@/services/api';
import { useStaffBookings } from '@/hooks/useStaffBookings';

/**
 * BookingDetailModal - Display booking details and allow confirmation
 */
const BookingDetailModal = ({ show, onHide, booking, hotelSlug, onBookingUpdated }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [flagsWarningShown, setFlagsWarningShown] = useState(false);

  const staffBookings = useStaffBookings(hotelSlug);

  // Defensive rendering - check for missing flags
  const hasValidFlags = booking?.flags && typeof booking.flags === 'object';
  const isDataIncomplete = !hasValidFlags;

  // Log warning once for missing flags
  useEffect(() => {
    if (!hasValidFlags && !flagsWarningShown && booking) {
      console.warn('[BookingDetailModal] Missing booking.flags - booking data incomplete:', booking);
      setFlagsWarningShown(true);
    }
  }, [hasValidFlags, flagsWarningShown, booking]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (show) {
      setSelectedRoomId('');
      setAssignmentNotes('');
      setAvailableRooms([]);
      setInlineError('');
      setFlagsWarningShown(false);
    }
  }, [show]);

  // Confirm booking mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const url = buildStaffURL(hotelSlug, 'bookings', `/${booking.id}/confirm/`);
      const response = await api.post(url);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Booking confirmed! Confirmation email has been sent to ${booking.guest_email}`,
        { autoClose: 5000 }
      );
      setIsConfirming(false);
      if (onBookingUpdated) {
        onBookingUpdated(data);
      }
      // Close modal after short delay
      setTimeout(() => {
        onHide();
      }, 1500);
    },
    onError: (error) => {
      console.error('Failed to confirm booking:', error);
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error || 
                       'Failed to confirm booking';
      toast.error(errorMsg);
      setIsConfirming(false);
    },
  });

  const handleConfirmBooking = () => {
    setIsConfirming(true);
    confirmMutation.mutate();
  };

  // Room assignment handlers
  const handleLoadRooms = async () => {
    if (!booking?.id) return;
    
    setLoadingRooms(true);
    setInlineError('');
    
    try {
      const rooms = await staffBookings.fetchAvailableRooms(booking.id);
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to load available rooms:', error);
      setInlineError(error.response?.data?.message || 'Failed to load available rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleAssignRoom = () => {
    if (!selectedRoomId || !booking?.id) return;
    
    setInlineError('');
    staffBookings.safeAssignRoom.mutate(
      { bookingId: booking.id, roomId: parseInt(selectedRoomId), notes: assignmentNotes },
      {
        onSuccess: () => {
          toast.success('Room assigned successfully');
          setSelectedRoomId('');
          setAssignmentNotes('');
          setAvailableRooms([]);
          if (onBookingUpdated) onBookingUpdated();
        },
        onError: (error) => {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to assign room';
          toast.error(errorMessage);
          setInlineError(errorMessage);
        }
      }
    );
  };

  const handleUnassignRoom = () => {
    if (!booking?.id) return;
    
    setInlineError('');
    staffBookings.unassignRoom.mutate(booking.id, {
      onSuccess: () => {
        toast.success('Room unassigned successfully');
        if (onBookingUpdated) onBookingUpdated();
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to unassign room';
        toast.error(errorMessage);
        setInlineError(errorMessage);
      }
    });
  };

  const handleCheckIn = () => {
    if (!booking?.id) return;
    
    staffBookings.checkInBooking.mutate(booking.id, {
      onSuccess: () => {
        toast.success('Checked in successfully');
        if (onBookingUpdated) onBookingUpdated();
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to check in booking';
        toast.error(errorMessage);
      }
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: 'warning', text: 'Pending', icon: 'clock-fill' },
      confirmed: { bg: 'success', text: 'Confirmed', icon: 'check-circle-fill' },
      cancelled: { bg: 'danger', text: 'Cancelled', icon: 'x-circle-fill' },
      completed: { bg: 'secondary', text: 'Completed', icon: 'check-all' },
      checked_in: { bg: 'info', text: 'Checked In', icon: 'door-open-fill' },
      checked_out: { bg: 'dark', text: 'Checked Out', icon: 'door-closed-fill' },
    };
    const config = statusMap[status?.toLowerCase()] || { bg: 'secondary', text: status, icon: 'info-circle' };
    return (
      <Badge bg={config.bg} className="px-3 py-2">
        <i className={`bi bi-${config.icon} me-2`}></i>
        {config.text}
      </Badge>
    );
  };

  const canConfirm = booking.status?.toLowerCase() === 'pending';
  const isConfirmed = booking.status?.toLowerCase() === 'confirmed';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-calendar-check me-2"></i>
          Booking Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Status Header */}
        <div className="text-center mb-4 pb-3 border-bottom">
          <h4 className="mb-2">{booking.booking_reference || `Booking #${booking.id}`}</h4>
          {getStatusBadge(booking.status)}
          {isConfirmed && (
            <div className="mt-2">
              <Badge bg="success" className="px-3 py-2">
                <i className="bi bi-envelope-check-fill me-2"></i>
                Confirmation email sent to {booking.guest_email}
              </Badge>
            </div>
          )}
        </div>

        {/* Guest Information */}
        <h6 className="fw-bold mb-3">
          <i className="bi bi-person-fill me-2"></i>
          Guest Information
        </h6>
        <Row className="mb-4">
          <Col md={6}>
            <ListGroup variant="flush">
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Name:</span>
                <strong>{booking.guest_name}</strong>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Email:</span>
                <a href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a>
              </ListGroup.Item>
            </ListGroup>
          </Col>
          <Col md={6}>
            <ListGroup variant="flush">
              {booking.guest_phone && (
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="text-muted">Phone:</span>
                  <a href={`tel:${booking.guest_phone}`}>{booking.guest_phone}</a>
                </ListGroup.Item>
              )}
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Guests:</span>
                <strong>{booking.number_of_guests || booking.guests || 1}</strong>
              </ListGroup.Item>
            </ListGroup>
          </Col>
        </Row>

        {/* Booking Information */}
        <h6 className="fw-bold mb-3">
          <i className="bi bi-calendar-event me-2"></i>
          Booking Information
        </h6>
        <Row className="mb-4">
          <Col md={6}>
            <ListGroup variant="flush">
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Check In:</span>
                <strong>
                  {booking.check_in_date ? format(new Date(booking.check_in_date), 'MMMM dd, yyyy') : 'N/A'}
                </strong>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Check Out:</span>
                <strong>
                  {booking.check_out_date ? format(new Date(booking.check_out_date), 'MMMM dd, yyyy') : 'N/A'}
                </strong>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Nights:</span>
                <strong>
                  {booking.number_of_nights || 
                   (booking.check_in_date && booking.check_out_date ? 
                    Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24)) : 
                    'N/A')}
                </strong>
              </ListGroup.Item>
            </ListGroup>
          </Col>
          <Col md={6}>
            <ListGroup variant="flush">
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Room Type:</span>
                <strong>{booking.room_type?.name || booking.room?.name || 'N/A'}</strong>
              </ListGroup.Item>
              {booking.room_number && (
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="text-muted">Room Number:</span>
                  <strong>Room {booking.room_number}</strong>
                </ListGroup.Item>
              )}
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Booking Date:</span>
                <span>
                  {booking.created_at ? format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </span>
              </ListGroup.Item>
            </ListGroup>
          </Col>
        </Row>

        {/* Payment Information */}
        <h6 className="fw-bold mb-3">
          <i className="bi bi-credit-card me-2"></i>
          Payment Information
        </h6>
        <Row className="mb-4">
          <Col>
            <ListGroup variant="flush">
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Payment Status:</span>
                <Badge bg={booking.payment_status?.toLowerCase() === 'paid' ? 'success' : 'warning'}>
                  {booking.payment_status || 'Pending'}
                </Badge>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span className="text-muted">Total Amount:</span>
                <h5 className="mb-0 text-success">
                  ${booking.total_amount || booking.total_price || 0}
                </h5>
              </ListGroup.Item>
              {booking.payment_method && (
                <ListGroup.Item className="d-flex justify-content-between">
                  <span className="text-muted">Payment Method:</span>
                  <span>{booking.payment_method}</span>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Col>
        </Row>

        {/* Special Requests / Notes */}
        {booking.special_requests && (
          <>
            <h6 className="fw-bold mb-3">
              <i className="bi bi-chat-left-text me-2"></i>
              Special Requests
            </h6>
            <Alert variant="info">
              {booking.special_requests}
            </Alert>
          </>
        )}

        {/* Ops Panel - Room Assignment & Check-In */}
        <div className="border-top pt-4 mt-4">
          <h6 className="fw-bold mb-4">
            <i className="bi bi-gear-fill me-2"></i>
            Operations Panel
          </h6>

          {/* Defensive Rendering Warning */}
          {isDataIncomplete && (
            <Alert variant="warning" className="mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Booking data incomplete — refresh / contact dev
            </Alert>
          )}

          <Row>
            <Col md={6}>
              {/* Section A: Guests (Party) */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-people-fill me-2"></i>
                  Party
                </h6>
                {booking?.party ? (
                  <div>
                    {/* Primary Guest */}
                    {booking.party.primary && (
                      <div className="mb-2">
                        <strong>Primary:</strong> {booking.party.primary.name || booking.party.primary.guest_name || 'N/A'}
                      </div>
                    )}
                    
                    {/* Companions */}
                    {booking.party.companions && booking.party.companions.length > 0 ? (
                      <div>
                        <strong>Companions:</strong>
                        <ul className="mb-0 mt-1">
                          {booking.party.companions.map((companion, index) => (
                            <li key={index}>{companion.name || companion.guest_name || `Companion ${index + 1}`}</li>
                          ))}
                        </ul>
                        {hasValidFlags && booking.flags.can_edit_party ? (
                          <small className="text-muted mt-1 d-block">
                            <i className="bi bi-info-circle me-1"></i>
                            Companion editing available
                          </small>
                        ) : (
                          <small className="text-muted mt-1 d-block">
                            Editing companions coming next phase
                          </small>
                        )}
                      </div>
                    ) : (
                      <div>
                        <strong>Companions:</strong> None
                        {hasValidFlags && booking.flags.can_edit_party && (
                          <small className="text-muted d-block mt-1">
                            <i className="bi bi-info-circle me-1"></i>
                            Can add companions
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Party information not available
                  </div>
                )}
              </div>

              {/* Section C: Check-In */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-door-open-fill me-2"></i>
                  Check-In
                </h6>
                {hasValidFlags && booking.flags.can_check_in ? (
                  <Button 
                    variant="primary" 
                    onClick={handleCheckIn}
                    disabled={isDataIncomplete || staffBookings.isCheckingIn}
                    className="w-100"
                  >
                    {staffBookings.isCheckingIn ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-door-open me-2"></i>
                        Check-In Booking
                      </>
                    )}
                  </Button>
                ) : hasValidFlags ? (
                  <div className="text-muted">
                    <i className="bi bi-x-circle me-1"></i>
                    Check-in not available
                  </div>
                ) : (
                  <Button variant="secondary" disabled className="w-100">
                    <i className="bi bi-door-open me-2"></i>
                    Check-In Booking
                  </Button>
                )}
              </div>
            </Col>

            <Col md={6}>
              {/* Section B: Room Assignment */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-house-door-fill me-2"></i>
                  Room Assignment
                </h6>
                
                {booking?.room ? (
                  <div>
                    {/* Assigned Room Summary */}
                    <div className="mb-3 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong>Room {booking.room.room_number}</strong>
                        <div>
                          {booking.room.is_occupied && (
                            <Badge bg="warning" className="me-1">Occupied</Badge>
                          )}
                          {booking.room.is_active === false && (
                            <Badge bg="secondary" className="me-1">Inactive</Badge>
                          )}
                          {booking.room.is_out_of_order && (
                            <Badge bg="danger">Out of Order</Badge>
                          )}
                          {booking.room.is_active && !booking.room.is_occupied && !booking.room.is_out_of_order && (
                            <Badge bg="success">Active</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Room Assignment Actions */}
                    <div className="d-grid gap-2">
                      {hasValidFlags && !booking.flags.is_checked_in ? (
                        <>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={handleLoadRooms}
                            disabled={isDataIncomplete || loadingRooms}
                          >
                            {loadingRooms ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-arrow-repeat me-2"></i>
                                Reassign Room
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={handleUnassignRoom}
                            disabled={isDataIncomplete || staffBookings.isUnassigning}
                          >
                            {staffBookings.isUnassigning ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Unassigning...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-x-circle me-2"></i>
                                Unassign Room
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <small className="text-muted">
                          <i className="bi bi-lock me-1"></i>
                          {hasValidFlags && booking.flags.is_checked_in 
                            ? 'Room assignment locked (checked in)' 
                            : 'Room assignment unavailable'}
                        </small>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* No Room Assigned */}
                    <div className="mb-3 p-3 bg-light rounded text-center text-muted">
                      <i className="bi bi-house-door-fill fs-4 d-block mb-2"></i>
                      No room assigned
                    </div>

                    {/* Load Available Rooms */}
                    {availableRooms.length === 0 ? (
                      <Button 
                        variant="primary" 
                        className="w-100"
                        onClick={handleLoadRooms}
                        disabled={isDataIncomplete || loadingRooms}
                      >
                        {loadingRooms ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Loading rooms...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-search me-2"></i>
                            Load Available Rooms
                          </>
                        )}
                      </Button>
                    ) : (
                      <div>
                        {/* Room Selection Dropdown */}
                        <Form.Select 
                          value={selectedRoomId} 
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          className="mb-2"
                          disabled={isDataIncomplete}
                        >
                          <option value="">Select a room...</option>
                          {availableRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              Room {room.room_number}
                            </option>
                          ))}
                        </Form.Select>

                        {/* Assignment Notes */}
                        <Form.Control
                          type="text"
                          placeholder="Assignment notes (optional)"
                          value={assignmentNotes}
                          onChange={(e) => setAssignmentNotes(e.target.value)}
                          className="mb-2"
                          disabled={isDataIncomplete}
                        />

                        {/* Assign Button */}
                        <div className="d-grid gap-2">
                          <Button 
                            variant="success"
                            onClick={handleAssignRoom}
                            disabled={isDataIncomplete || !selectedRoomId || staffBookings.isAssigning}
                          >
                            {staffBookings.isAssigning ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Assigning...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-2"></i>
                                Assign Room
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => {
                              setAvailableRooms([]);
                              setSelectedRoomId('');
                              setAssignmentNotes('');
                            }}
                            disabled={isDataIncomplete}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Error Messages */}
                {inlineError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {inlineError}
                  </Alert>
                )}
              </div>
            </Col>
          </Row>
        </div>

        {/* Error Display */}
        {confirmMutation.isError && (
          <Alert variant="danger" className="mt-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {confirmMutation.error.response?.data?.message || 'Failed to confirm booking'}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
        <div>
          {canConfirm && (
            <Button 
              variant="success" 
              onClick={handleConfirmBooking}
              disabled={isConfirming || confirmMutation.isPending}
            >
              {isConfirming || confirmMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Confirming...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Confirm Booking
                </>
              )}
            </Button>
          )}
          {isConfirmed && (
            <Badge bg="success" className="px-3 py-2">
              <i className="bi bi-check-circle-fill me-2"></i>
              Booking Confirmed
            </Badge>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default BookingDetailModal;
