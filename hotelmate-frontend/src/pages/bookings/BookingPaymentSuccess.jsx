import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import api from '@/services/api';

/**
 * BookingPaymentSuccess - Handle successful Stripe payment redirect
 */
const BookingPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('booking_id');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    // Wait a moment for webhook to process, then verify booking status
    const timer = setTimeout(() => {
      verifyBooking();
    }, 2000);

    return () => clearTimeout(timer);
  }, [bookingId]);

  const verifyBooking = async () => {
    try {
      // Try to fetch booking details
      const response = await api.get(`/bookings/${bookingId}/`);
      setBooking(response.data);
      setError(null);
      
      // Store booking in localStorage for My Bookings feature
      const existingBookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
      const bookingExists = existingBookings.some(b => b.booking_id === response.data.booking_id);
      
      if (!bookingExists) {
        existingBookings.push({
          booking_id: response.data.booking_id,
          confirmation_number: response.data.confirmation_number,
          hotel_slug: response.data.hotel?.slug,
          hotel_name: response.data.hotel?.name,
          check_in: response.data.dates?.check_in,
          check_out: response.data.dates?.check_out,
          room_type: response.data.room?.type,
          total: response.data.pricing?.total,
          status: response.data.status || 'PAYMENT_COMPLETE',
          payment_completed: true,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('myBookings', JSON.stringify(existingBookings));
      }
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      // Set a generic success message if we can't fetch details
      setBooking({ booking_id: bookingId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Card className="text-center p-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem', margin: '0 auto' }} />
          <h4 className="mt-4">Processing your payment...</h4>
          <p className="text-muted">Please wait while we confirm your booking.</p>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
        <div className="text-center mt-4">
          <Link to="/" className="btn btn-primary">
            Back to Hotels
          </Link>
        </div>
      </Container>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <Container className="py-5">
      <div className="text-center mb-4">
        <div className="text-success mb-3">
          <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
        </div>
        <h2>Payment Successful!</h2>
        <p className="text-muted">Your booking has been confirmed</p>
      </div>

      <Card className="mb-4">
        <Card.Body className="p-4">
          <Alert variant="success">
            <i className="bi bi-check-circle me-2"></i>
            <strong>Booking Confirmed!</strong> A confirmation email has been sent to your email address.
          </Alert>

          {booking.booking_id && (
            <div className="mb-4">
              <h5>Booking Reference</h5>
              <p className="mb-0 fs-4 text-primary">
                <strong>{booking.confirmation_number || booking.booking_id}</strong>
              </p>
            </div>
          )}

          {booking.hotel && (
            <div className="mb-4">
              <h5>Hotel Details</h5>
              <p className="mb-1"><strong>{booking.hotel.name}</strong></p>
              {booking.hotel.address && <p className="mb-0 text-muted">{booking.hotel.address}</p>}
              {booking.hotel.phone && (
                <p className="mb-0">
                  <i className="bi bi-telephone me-2"></i>
                  {booking.hotel.phone}
                </p>
              )}
            </div>
          )}

          {booking.room && (
            <div className="mb-4">
              <h5>Room Details</h5>
              <p className="mb-0"><strong>{booking.room.type}</strong></p>
            </div>
          )}

          {booking.dates && (
            <div className="mb-4">
              <h5>Stay Details</h5>
              <p className="mb-1">
                <strong>Check-in:</strong> {booking.dates.check_in}
              </p>
              <p className="mb-1">
                <strong>Check-out:</strong> {booking.dates.check_out}
              </p>
              <p className="mb-0">
                <strong>Nights:</strong> {booking.dates.nights}
              </p>
            </div>
          )}

          {booking.guests && (
            <div className="mb-4">
              <h5>Guests</h5>
              <p className="mb-0">
                {booking.guests.adults} Adult{booking.guests.adults !== 1 ? 's' : ''}
                {booking.guests.children > 0 && `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}`}
              </p>
            </div>
          )}

          {booking.pricing && (
            <div className="mb-4">
              <h5>Payment Summary</h5>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>€{parseFloat(booking.pricing.subtotal).toFixed(2)}</span>
              </div>
              {booking.pricing.discount && parseFloat(booking.pricing.discount) > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount:</span>
                  <span>-€{parseFloat(booking.pricing.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Taxes:</span>
                <span>€{parseFloat(booking.pricing.taxes).toFixed(2)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total Paid:</strong>
                <strong className="text-success fs-5">€{parseFloat(booking.pricing.total).toFixed(2)}</strong>
              </div>
            </div>
          )}

          <div className="d-grid gap-2 mt-4">
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => navigate(`/${booking.hotel?.slug || ''}`)}
            >
              <i className="bi bi-house-door me-2"></i>
              Back to Hotel
            </Button>
            <Button 
              variant="outline-secondary"
              onClick={() => navigate('/')}
            >
              Browse More Hotels
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Alert variant="info">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Need help?</strong> Contact the hotel directly if you have any questions about your booking.
      </Alert>
    </Container>
  );
};

export default BookingPaymentSuccess;
