import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Button, Badge } from 'react-bootstrap';

/**
 * MyBookingsPage - Display user's bookings stored in localStorage
 */
const MyBookingsPage = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Load bookings from localStorage
    const storedBookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
    
    // Filter by hotel slug if provided, otherwise show all
    const filteredBookings = hotelSlug 
      ? storedBookings.filter(b => b.hotel_slug === hotelSlug)
      : storedBookings;
    
    // Sort by created date (newest first)
    const sortedBookings = filteredBookings.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    setBookings(sortedBookings);
  }, [hotelSlug]);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING_PAYMENT':
      case 'PAYMENT_COMPLETE':
        return 'info';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (booking) => {
    if (booking.payment_completed && booking.status === 'PENDING_PAYMENT') {
      return 'AWAITING APPROVAL';
    }
    return booking.status.replace('_', ' ');
  };

  const handleClearBookings = () => {
    if (window.confirm('Are you sure you want to clear all your saved bookings?')) {
      localStorage.removeItem('myBookings');
      setBookings([]);
    }
  };

  return (
    <Container className="py-5">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3 mb-3">
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => navigate(hotelSlug ? `/${hotelSlug}` : '/')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back
            </Button>
          </div>
          <h2 className="mb-2">
            <i className="bi bi-clipboard-check me-2"></i>
            My Bookings
          </h2>
          <p className="text-muted">
            View your recent bookings {hotelSlug && 'at this hotel'}
          </p>
        </Col>
      </Row>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <i className="bi bi-inbox text-muted" style={{ fontSize: '4rem' }}></i>
            <h4 className="mt-4 mb-3">No Bookings Found</h4>
            <p className="text-muted mb-4">
              You haven't made any bookings yet, or your bookings have been cleared.
            </p>
            <Button 
              variant="primary"
              onClick={() => navigate(hotelSlug ? `/${hotelSlug}/book` : '/')}
            >
              <i className="bi bi-calendar-check me-2"></i>
              Make a Booking
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Row className="g-4">
            {bookings.map((booking, index) => (
              <Col key={booking.booking_id || index} lg={6}>
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1">{booking.hotel_name}</h5>
                        <small className="text-muted">
                          Booking ID: <strong>{booking.booking_id}</strong>
                        </small>
                      </div>
                      {booking.status && (
                        <Badge bg={getStatusVariant(booking.status)}>
                          {getStatusLabel(booking)}
                        </Badge>
                      )}
                    </div>

                    {booking.confirmation_number && (
                      <Alert variant="info" className="py-2 mb-3">
                        <small>
                          <i className="bi bi-ticket-detailed me-2"></i>
                          <strong>Confirmation:</strong> {booking.confirmation_number}
                        </small>
                      </Alert>
                    )}

                    {booking.room_type && (
                      <p className="mb-2">
                        <i className="bi bi-door-closed me-2 text-muted"></i>
                        <strong>Room:</strong> {booking.room_type}
                      </p>
                    )}

                    {booking.check_in && booking.check_out && (
                      <p className="mb-2">
                        <i className="bi bi-calendar-event me-2 text-muted"></i>
                        <strong>Dates:</strong> {booking.check_in} to {booking.check_out}
                      </p>
                    )}

                    {booking.total && (
                      <p className="mb-3">
                        <i className="bi bi-currency-euro me-2 text-muted"></i>
                        <strong>Total:</strong> €{parseFloat(booking.total).toFixed(2)}
                      </p>
                    )}

                    <div className="d-grid gap-2">
                      <Button 
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/${booking.hotel_slug}`)}
                      >
                        <i className="bi bi-building me-2"></i>
                        View Hotel
                      </Button>
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-light">
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      Booked: {new Date(booking.created_at).toLocaleDateString()}
                    </small>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Clear Bookings Button */}
          <Row className="mt-4">
            <Col className="text-center">
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={handleClearBookings}
              >
                <i className="bi bi-trash me-2"></i>
                Clear All Saved Bookings
              </Button>
            </Col>
          </Row>
        </>
      )}

      {/* Info Alert */}
      <Alert variant="info" className="mt-4">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Note:</strong> These bookings are stored locally on your device. 
        For official booking records, please check your confirmation email or contact the hotel directly.
      </Alert>
    </Container>
  );
};

export default MyBookingsPage;
