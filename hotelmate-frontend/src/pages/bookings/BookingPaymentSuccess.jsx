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
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  
  // Guard to prevent multiple verification calls
  const didVerifyRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Helper to calculate guest count with reliable fallbacks
  const getGuestCount = (booking) => {
    if (!booking) return 0;
    
    // Try guests.total first
    if (booking.guests?.total) {
      return booking.guests.total;
    }
    
    // Try adults + children
    if (booking.adults !== undefined || booking.children !== undefined) {
      return (booking.adults || 0) + (booking.children || 0);
    }
    
    // Try party array (companions-only assumption: 1 + party.length)
    if (booking.party && Array.isArray(booking.party)) {
      return 1 + booking.party.length;
    }
    
    // Fallback to party.total_count if available
    if (booking.party?.total_count) {
      return booking.party.total_count;
    }
    
    // Never default to 0 if we have any indication of guests
    if (booking.primary_first_name) {
      return 1; // At least primary guest
    }
    
    return 0;
  };

  // Fetch booking details (for polling)
  const fetchBookingDetails = React.useCallback(async () => {
    if (!finalHotelSlug || !bookingId) return null;
    
    const response = await publicAPI.get(`/hotel/${finalHotelSlug}/room-bookings/${bookingId}/`);
    return response.data;
  }, [finalHotelSlug, bookingId]);

  // Stop polling
  const stopPolling = React.useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start polling for payment confirmation
  const startPolling = React.useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling
    
    setIsPolling(true);
    setPollAttempts(0);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const bookingData = await fetchBookingDetails();
        setBooking(bookingData);
        setPollAttempts(prev => {
          const newAttempts = prev + 1;
          
          // Stop polling if confirmed or if we've tried too many times
          if (bookingData?.status === 'CONFIRMED' || newAttempts >= 20) { // Max 60 seconds (3s * 20)
            stopPolling();
          }
          
          return newAttempts;
        });
      } catch (err) {
        console.error('Polling error:', err);
        setPollAttempts(prev => {
          const newAttempts = prev + 1;
          
          if (newAttempts >= 20) {
            stopPolling();
          }
          
          return newAttempts;
        });
      }
    }, 3000); // Poll every 3 seconds
  }, [fetchBookingDetails, stopPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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
        
        // Check booking status and start polling if needed
        if (bookingResponse.data?.status === 'PENDING_PAYMENT') {
          startPolling();
        }
        
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

  // Determine UI state based on booking status
  const isConfirmed = booking.status === 'CONFIRMED' && booking.paid_at;
  const isPending = booking.status === 'PENDING_PAYMENT';
  const showPollingTimeout = isPending && pollAttempts >= 20;

  return (
    <div
      className={`hotel-public-page booking-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: '100vh' }}
    >
    <Container className="py-5 booking-layout booking-layout--payment-success">
      <div className="text-center mb-4">
        {isConfirmed ? (
          <>
            <div className="text-success mb-3">
              <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Payment Successful!</h2>
            <p className="text-muted">Your booking has been confirmed</p>
          </>
        ) : isPending ? (
          <>
            <div className="text-warning mb-3">
              <i className="bi bi-hourglass-split" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Payment Processing...</h2>
            <p className="text-muted">
              {isPolling ? 'We\'re confirming your payment with the bank' : 'Please wait while we verify your payment'}
            </p>
            {isPolling && (
              <Spinner animation="border" size="sm" className="mt-2" />
            )}
          </>
        ) : (
          <>
            <div className="text-info mb-3">
              <i className="bi bi-clock" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Payment Received</h2>
            <p className="text-muted">Processing your booking</p>
          </>
        )}
      </div>

      <Card className="mb-4">
        <Card.Body className="p-4">
          {isConfirmed ? (
            <Alert variant="success">
              <i className="bi bi-check-circle me-2"></i>
              <strong>Booking Confirmed!</strong> A confirmation email has been sent to your email address.
            </Alert>
          ) : isPending && showPollingTimeout ? (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Still Processing</strong> We're still confirming your payment. Please refresh this page or contact the hotel if this continues.
              <Button 
                variant="outline-warning" 
                size="sm" 
                className="ms-3"
                onClick={() => window.location.reload()}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </Button>
            </Alert>
          ) : isPending ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Payment Processing...</strong> We're confirming your payment. This usually takes a few seconds.
            </Alert>
          ) : (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Payment Received</strong> Your booking is being processed.
            </Alert>
          )}

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

          {(() => {
            const guestCount = getGuestCount(booking);
            if (guestCount > 0) {
              return (
                <div className="mb-4">
                  <h5>Guests</h5>
                  <p className="mb-0">
                    {`${guestCount} Guest${guestCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              );
            }
            return null;
          })()}

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
