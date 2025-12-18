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
  const [extendedPolling, setExtendedPolling] = useState(false);
  
  // Guard to prevent multiple verification calls
  const didVerifyRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Debug logging (development only)
  const debugBookingStatus = (booking, context = 'unknown') => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PAYMENT_SUCCESS_DEBUG] ${context}:`, {
        bookingId: booking?.booking_id || bookingId,
        rawStatus: booking?.status,
        paid_at: booking?.paid_at,
        payment_provider: booking?.payment_provider,
        payment_reference: booking?.payment_reference,
        normalizedStatus: normalizeStatus(booking?.status),
        isPaymentVerified: isPaymentVerified(booking)
      });
    }
  };

  // Normalize status to handle case variations
  const normalizeStatus = (status) => {
    if (!status) return 'UNKNOWN';
    return status.toString().toUpperCase();
  };

  // Check if payment is verified
  const isPaymentVerified = (booking) => {
    if (!booking) return false;
    
    // Payment verified if paid_at exists OR (payment_provider AND payment_reference)
    return !!(booking.paid_at || (booking.payment_provider && booking.payment_reference));
  };

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
    if (!finalHotelSlug || !bookingId) {
      console.warn('[PAYMENT_SUCCESS] Missing hotel slug or booking ID:', { finalHotelSlug, bookingId });
      return null;
    }
    
    const canonicalUrl = `/hotel/${finalHotelSlug}/room-bookings/${bookingId}/`;
    console.log(`[PAYMENT_SUCCESS] Polling: GET ${canonicalUrl} (via publicAPI: ${publicAPI.defaults.baseURL})`);
    const response = await publicAPI.get(canonicalUrl);
    debugBookingStatus(response.data, 'POLL_RESPONSE');
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
          
          // Extended polling logic with different timeouts
          const normalizedStatus = normalizeStatus(bookingData?.status);
          const paymentVerified = isPaymentVerified(bookingData);
          
          // Stop immediately on final states
          const isFinalState = normalizedStatus === 'CONFIRMED' || normalizedStatus === 'DECLINED';
          
          // For PENDING_APPROVAL: poll for up to 5 minutes (100 attempts)
          // For PENDING_PAYMENT: poll for up to 1 minute (20 attempts)
          const maxAttempts = normalizedStatus === 'PENDING_APPROVAL' ? 100 : 20;
          
          const shouldStopPolling = (
            isFinalState ||
            paymentVerified || // Backward compatibility
            newAttempts >= maxAttempts
          );
          
          // Track if we're in extended polling mode
          if (normalizedStatus === 'PENDING_APPROVAL' && newAttempts > 20) {
            setExtendedPolling(true);
          }
          
          if (shouldStopPolling) {
            console.log('[PAYMENT_SUCCESS] Stopping polling:', { 
              normalizedStatus, 
              paymentVerified, 
              attempts: newAttempts 
            });
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
        
        // Debug initial booking state
        debugBookingStatus(bookingResponse.data, 'INITIAL_LOAD');
        
        const hotelPreset = bookingResponse.data.hotel_preset || bookingResponse.data.hotel?.preset || bookingResponse.data.hotel?.global_style_variant || 1;
        setPreset(hotelPreset);
        
        // Check booking status and start polling if needed
        const normalizedStatus = normalizeStatus(bookingResponse.data?.status);
        const paymentVerified = isPaymentVerified(bookingResponse.data);
        
        if (normalizedStatus === 'PENDING_PAYMENT' && !paymentVerified) {
          console.log('[PAYMENT_SUCCESS] Starting polling for pending payment');
          startPolling();
        } else {
          console.log('[PAYMENT_SUCCESS] No polling needed - booking processed:', {
            normalizedStatus,
            paymentVerified,
            state: normalizedStatus === 'PENDING_APPROVAL' ? 'authorization_success' : 
                   normalizedStatus === 'CONFIRMED' ? 'booking_confirmed' :
                   normalizedStatus === 'DECLINED' ? 'booking_declined' : 'other'
          });
        }
        
        // Backend business logic note for developers
        if (process.env.NODE_ENV === 'development' && normalizedStatus === 'CONFIRMED' && paymentVerified) {
          console.warn(`
[PAYMENT_SUCCESS] BACKEND BUSINESS LOGIC QUESTION:
Booking ${bookingResponse.data.booking_id} is CONFIRMED after payment.
Should it be PENDING_HOTEL_CONFIRMATION instead?
Current: Payment → CONFIRMED
Proposed: Payment → PENDING_HOTEL_CONFIRMATION → Staff confirms → CONFIRMED
          `);
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

  // Debug current booking state
  debugBookingStatus(booking, 'RENDER_STATE');
  
  // Determine UI state based on normalized status and payment verification
  const normalizedStatus = normalizeStatus(booking?.status);
  const paymentVerified = isPaymentVerified(booking);
  
  // Map booking status to UI states with safer confirmation logic
  const isConfirmed = normalizedStatus === 'CONFIRMED' || Boolean(booking?.paid_at); // Legacy fallback
  const isPendingApproval = normalizedStatus === 'PENDING_APPROVAL';
  const isDeclined = normalizedStatus === 'DECLINED';
  const isPendingPayment = normalizedStatus === 'PENDING_PAYMENT' && !paymentVerified;
  const isUnknownState = !isConfirmed && !isPendingApproval && !isDeclined && !isPendingPayment;
  
  // Extended polling timeout for PENDING_APPROVAL (5 minutes = 100 attempts at 3s intervals)
  const maxExtendedAttempts = 100;
  const showPollingTimeout = isPendingPayment && pollAttempts >= 20;
  const showExtendedTimeout = isPendingApproval && pollAttempts >= maxExtendedAttempts;

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
            <h2>Booking confirmed ✅</h2>
            <p className="text-muted">Your booking is confirmed and payment has been captured.</p>
            <p className="text-muted small">You'll receive a pre-check-in email shortly.</p>
          </>
        ) : isPendingApproval ? (
          <>
            <div className="text-success mb-3">
              <i className="bi bi-check-circle" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Payment authorized ✅</h2>
            <p className="text-muted">
              Your card has been authorized. The hotel will review and confirm your booking.
            </p>
            <p className="text-muted small">
              This can take up to 24 hours (sometimes longer during busy periods). You'll receive an email when it's confirmed.
            </p>
          </>
        ) : isDeclined ? (
          <>
            <div className="text-danger mb-3">
              <i className="bi bi-x-circle" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Booking not accepted ❌</h2>
            <p className="text-muted">The hotel couldn't confirm this booking.</p>
            <p className="text-muted small">No charge was captured. Any temporary authorization hold will be released by your bank.</p>
            <p className="text-muted small">You can make a new booking or contact the hotel.</p>
          </>
        ) : isPendingPayment ? (
          <>
            <div className="text-warning mb-3">
              <i className="bi bi-hourglass-split" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Payment status not confirmed yet</h2>
            <p className="text-muted">
              We couldn't confirm a successful payment for this booking.
            </p>
            <p className="text-muted small">
              If you were charged, you'll receive an email receipt. Otherwise, please try again.
            </p>
            {isPolling && showPollingTimeout && (
              <Spinner animation="border" size="sm" className="mt-2" />
            )}
          </>
        ) : isUnknownState ? (
          <>
            <div className="text-info mb-3">
              <i className="bi bi-info-circle" style={{ fontSize: '4rem' }}></i>
            </div>
            <h2>Processing Update...</h2>
            <p className="text-muted">We're updating your booking status. Please contact the hotel if you need immediate assistance.</p>
            <p className="small text-muted">Reference: {booking?.confirmation_number || booking?.booking_id}</p>
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
          ) : isPendingApproval ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Payment authorized</strong> The hotel will confirm your booking. You'll receive an email when it's approved.<br />
              <small className="text-muted">No charge will be captured unless the booking is accepted.</small><br />
              <small className="text-muted mt-1"><strong>You don't need to stay on this page — we'll email you once the hotel confirms.</strong></small>
            </Alert>
          ) : isDeclined ? (
            <Alert variant="danger">
              <i className="bi bi-x-circle me-2"></i>
              <strong>Booking not accepted</strong> The hotel couldn't confirm this booking. No charge was captured. Any temporary authorization hold will be released by your bank.
            </Alert>
          ) : isPendingPayment && showPollingTimeout ? (
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Payment status not confirmed yet</strong> If you were charged, you'll receive an email receipt. Please contact the hotel if this continues.
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
          ) : isPendingPayment ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Checking payment status...</strong> This usually takes just a few seconds.
            </Alert>
          ) : isUnknownState ? (
            <Alert variant="warning">
              <i className="bi bi-question-circle me-2"></i>
              <strong>Status Update</strong> Please contact the hotel for assistance with booking reference: {booking?.confirmation_number || booking?.booking_id}
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
