import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { publicAPI } from '@/services/api';

/**
 * BookingPaymentSuccess - Handle successful Stripe payment redirect
 */
const BookingPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hotelSlug } = useParams();
  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id');
  
  // Fallback: extract hotel slug from URL path if not in params (for legacy routes)
  const pathParts = window.location.pathname.split('/');
  const hotelSlugFromPath = pathParts[2]; // /booking/{hotelSlug}/payment/success
  const finalHotelSlug = hotelSlug || hotelSlugFromPath;
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState(null);
  
  // Guard to prevent multiple verification calls
  const didVerifyRef = useRef(false);

  useEffect(() => {
    if (didVerifyRef.current) return;
    if (!bookingId || !sessionId) {
      setError('Missing booking ID or session ID');
      setLoading(false);
      return;
    }

    didVerifyRef.current = true;

    (async () => {
      try {
        if (!finalHotelSlug) {
          throw new Error('Hotel slug not found in URL');
        }
        
        // Verify payment with Stripe session
        const verifyResponse = await publicAPI.get(
          `/hotel/${finalHotelSlug}/room-bookings/${bookingId}/payment/verify/`,
          { params: { session_id: sessionId } }
        );
        
        // Fetch booking details
        const bookingResponse = await publicAPI.get(`/hotel/${finalHotelSlug}/room-bookings/${bookingId}/`);
        
        setPaymentStatus(verifyResponse.data?.payment_status || "verified");
        setBooking(bookingResponse.data);
        
        const hotelPreset = bookingResponse.data.hotel_preset || bookingResponse.data.hotel?.preset || bookingResponse.data.hotel?.global_style_variant || 1;
        setPreset(hotelPreset);
        
        // Store booking in localStorage for My Bookings feature
        const existingBookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
        const bookingExists = existingBookings.some(b => b.booking_id === bookingResponse.data.booking_id);
        
        if (!bookingExists) {
          existingBookings.push({
            booking_id: bookingResponse.data.booking_id,
            confirmation_number: bookingResponse.data.confirmation_number,
            hotel_slug: bookingResponse.data.hotel?.slug,
            hotel_name: bookingResponse.data.hotel?.name,
            check_in: bookingResponse.data.dates?.check_in,
            check_out: bookingResponse.data.dates?.check_out,
            room_type: bookingResponse.data.room?.type,
            total: bookingResponse.data.pricing?.total,
            status: bookingResponse.data.status || 'PAYMENT_COMPLETE',
            payment_completed: true,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('myBookings', JSON.stringify(existingBookings));
        }
      } catch (err) {
        console.error('Failed to verify payment:', err);
        setPaymentStatus("error");
        setError('Unable to verify payment status');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, sessionId]);



  if (loading) {
    return (
      <div
        className={`hotel-public-page booking-page page-style-${preset}`}
        data-preset={preset}
      >
      <Container className="py-5 booking-layout booking-layout--payment-success">
        <Card className="text-center p-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem', margin: '0 auto' }} />
          <h4 className="mt-4">Processing your payment...</h4>
          <p className="text-muted">Please wait while we confirm your booking.</p>
        </Card>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`hotel-public-page booking-page page-style-${preset}`}
        data-preset={preset}
        style={{ minHeight: '100vh' }}
      >
      <Container className="py-5 booking-layout booking-layout--payment-success">
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
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div
      className={`hotel-public-page booking-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: '100vh' }}
    >
    <Container className="py-5 booking-layout booking-layout--payment-success">
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
              onClick={() => navigate(`/hotel/${booking.hotel?.slug || ''}`)}
            >
              <i className="bi bi-house-door me-2"></i>
              Back to Hotel
            </Button>
            <Button 
              variant="success"
              onClick={() => navigate('/my-bookings')}
            >
              <i className="bi bi-calendar-check me-2"></i>
              View My Bookings
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
    </div>
  );
};

export default BookingPaymentSuccess;
