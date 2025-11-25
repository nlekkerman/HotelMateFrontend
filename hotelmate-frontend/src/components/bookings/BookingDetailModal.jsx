import React, { useState } from 'react';
import { Modal, Button, Badge, Row, Col, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api, { buildStaffURL } from '@/services/api';

/**
 * BookingDetailModal - Display booking details and allow confirmation
 */
const BookingDetailModal = ({ show, onHide, booking, hotelSlug, onBookingUpdated }) => {
  const [isConfirming, setIsConfirming] = useState(false);

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
