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
        
        // Note: Booking management is now handled via token-based system
        // Users receive email links with tokens to view/manage their bookings
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
      <div className="text-center mb-5">
        {isConfirmed ? (
          <>
            <div className="rounded-circle bg-success d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-check-circle-fill text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-success mb-2">Booking Confirmed!</h1>
            <p className="lead text-muted">Your booking is confirmed and payment has been captured.</p>
            <p className="text-muted">You'll receive a pre-check-in email shortly.</p>
          </>
        ) : isPendingApproval ? (
          <>
            <div className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-check-circle text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-primary mb-2">Payment Authorized ✅</h1>
            <p className="lead text-muted mb-3">
              Your card has been authorized. The hotel will review and confirm your booking.
            </p>
            <div className="bg-light p-4 rounded-3 mx-auto" style={{ maxWidth: '500px' }}>
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-clock-history text-primary me-2"></i>
                <small className="fw-bold">Review Time: Up to 24 hours</small>
              </div>
              <div className="d-flex align-items-center">
                <i className="bi bi-envelope text-primary me-2"></i>
                <small>You'll receive an email when confirmed</small>
              </div>
            </div>
          </>
        ) : isDeclined ? (
          <>
            <div className="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-x-circle text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-danger mb-2">Booking Not Accepted</h1>
            <p className="lead text-muted">The hotel couldn't confirm this booking.</p>
            <p className="text-muted">No charge was captured. Any temporary authorization hold will be released by your bank.</p>
          </>
        ) : isPendingPayment ? (
          <>
            <div className="rounded-circle bg-warning d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-hourglass-split text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-warning mb-2">Payment Pending</h1>
            <p className="lead text-muted">
              We couldn't confirm a successful payment for this booking.
            </p>
            <p className="text-muted">
              If you were charged, you'll receive an email receipt. Otherwise, please try again.
            </p>
            {isPolling && showPollingTimeout && (
              <Spinner animation="border" size="sm" className="mt-2" />
            )}
          </>
        ) : isUnknownState ? (
          <>
            <div className="rounded-circle bg-info d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-info-circle text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-info mb-2">Processing Update...</h1>
            <p className="text-muted">We're updating your booking status. Please contact the hotel if you need immediate assistance.</p>
            <p className="small text-muted">Reference: {booking?.confirmation_number || booking?.booking_id}</p>
          </>
        ) : (
          <>
            <div className="rounded-circle bg-info d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-clock text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-info mb-2">Payment Received</h1>
            <p className="lead text-muted">Processing your booking</p>
          </>
        )}
      </div>

{/* Status Alert */}
      <div className="row mb-4">
        <div className="col-12">
          {isConfirmed ? (
            <Alert variant="success" className="border-0 bg-success bg-opacity-10 p-4">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-check-circle text-white"></i>
                </div>
                <div>
                  <div className="fw-bold text-success mb-1">Booking Confirmed!</div>
                  <small className="text-success">A confirmation email has been sent to your email address.</small>
                </div>
              </div>
            </Alert>
          ) : isPendingApproval ? (
            <Alert variant="primary" className="border-0 bg-primary bg-opacity-10 p-4">
              <div className="d-flex align-items-start">
                <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-info-circle text-white"></i>
                </div>
                <div>
                  <div className="fw-bold text-primary mb-2">Payment Authorized - Awaiting Hotel Confirmation</div>
                  <div className="mb-2">
                    <small className="text-primary d-block mb-1">✓ No charge will be captured unless the booking is accepted</small>
                    <small className="text-primary d-block">✓ You don't need to stay on this page — we'll email you once confirmed</small>
                  </div>
                </div>
              </div>
            </Alert>
          ) : isDeclined ? (
            <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 p-4">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-x-circle text-white"></i>
                </div>
                <div>
                  <div className="fw-bold text-danger mb-1">Booking Not Accepted</div>
                  <small className="text-danger">The hotel couldn't confirm this booking. No charge was captured.</small>
                </div>
              </div>
            </Alert>
          ) : isPendingPayment && showPollingTimeout ? (
            <Alert variant="warning" className="border-0 bg-warning bg-opacity-10 p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                    <i className="bi bi-exclamation-triangle text-white"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-warning mb-1">Payment Status Not Confirmed</div>
                    <small className="text-warning">If you were charged, you'll receive an email receipt.</small>
                  </div>
                </div>
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </Button>
              </div>
            </Alert>
          ) : (
            <Alert variant="info" className="border-0 bg-info bg-opacity-10 p-4">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-info d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-info-circle text-white"></i>
                </div>
                <div>
                  <div className="fw-bold text-info mb-1">Payment Received</div>
                  <small className="text-info">Your booking is being processed.</small>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </div>

      {/* Booking Details Grid */}
      <div className="row g-4 mb-4">
        {/* Booking Reference */}
        {booking.booking_id && (
          <div className="col-12">
            <Card className="border-0 shadow-sm bg-primary bg-opacity-5">
              <Card.Body className="p-4 text-center">
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <i className="bi bi-receipt text-primary me-2 fs-5"></i>
                  <h5 className="mb-0 text-primary">Booking Reference</h5>
                </div>
                <div className="fs-2 fw-bold text-primary mb-0">
                  {booking.confirmation_number || booking.booking_id}
                </div>
                <small className="text-muted">Save this reference for future communication</small>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Hotel Details */}
        {booking.hotel && (
          <div className="col-md-6">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-building text-white"></i>
                  </div>
                  <h5 className="mb-0 text-success">Hotel Details</h5>
                </div>
                <h6 className="fw-bold mb-2">{booking.hotel.name}</h6>
                {booking.hotel.address && (
                  <p className="text-muted mb-2 small">
                    <i className="bi bi-geo-alt me-1"></i>
                    {booking.hotel.address}
                  </p>
                )}
                {booking.hotel.phone && (
                  <p className="mb-0">
                    <i className="bi bi-telephone me-2 text-success"></i>
                    <span className="fw-medium">{booking.hotel.phone}</span>
                  </p>
                )}
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Room & Stay Details */}
        <div className="col-md-6">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle bg-info d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-door-open text-white"></i>
                </div>
                <h5 className="mb-0 text-info">Stay Details</h5>
              </div>
              
              {booking.room && (
                <div className="mb-3">
                  <div className="fw-bold mb-1">Room Type</div>
                  <div className="text-muted">{booking.room.type}</div>
                </div>
              )}
              
              {booking.dates && (
                <>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <div className="small fw-bold text-muted">Check-in</div>
                      <div>{booking.dates.check_in}</div>
                    </div>
                    <div className="col-6">
                      <div className="small fw-bold text-muted">Check-out</div>
                      <div>{booking.dates.check_out}</div>
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="small fw-bold text-muted">Nights</div>
                      <div>{booking.dates.nights}</div>
                    </div>
                    <div className="col-6">
                      <div className="small fw-bold text-muted">Guests</div>
                      <div>{(() => {
                        const guestCount = getGuestCount(booking);
                        return guestCount > 0 ? `${guestCount} Guest${guestCount !== 1 ? 's' : ''}` : '-';
                      })()}</div>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Payment Summary */}
      {booking.pricing && (
        <Card className="border-0 shadow-sm  bg-opacity-5 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle  d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-credit-card text-white"></i>
              </div>
              <h5 className="mb-0 ">Payment Summary</h5>
            </div>
            
            <div className="row">
              <div className="col-md-8">
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Subtotal</span>
                  <span>€{parseFloat(booking.pricing.subtotal).toFixed(2)}</span>
                </div>
                {booking.pricing.discount && parseFloat(booking.pricing.discount) > 0 && (
                  <div className="d-flex justify-content-between py-2 border-bottom text-success">
                    <span>Discount</span>
                    <span>-€{parseFloat(booking.pricing.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Taxes & Fees</span>
                  <span>€{parseFloat(booking.pricing.taxes).toFixed(2)}</span>
                </div>
              </div>
              <div className="col-md-4 d-flex align-items-center justify-content-end">
                <div className="text-end">
                  <div className="small text-muted">Total Paid</div>
                  <div className="fs-3 fw-bold text-success">€{parseFloat(booking.pricing.total).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="row g-3">
            <div className="col-md-4">
              <Button 
                variant="primary" 
                size="lg"
                className="w-100"
                onClick={() => navigate(`/hotel/${booking.hotel?.slug || ''}`)}
              >
                <i className="bi bi-house-door me-2"></i>
                Back to Hotel
              </Button>
            </div>
            <div className="col-md-4">
              <Button 
                variant="success"
                size="lg"
                className="w-100"
                onClick={() => navigate('/my-bookings')}
              >
                <i className="bi bi-calendar-check me-2"></i>
                My Bookings
              </Button>
            </div>
            <div className="col-md-4">
              <Button 
                variant="outline-secondary"
                size="lg"
                className="w-100"
                onClick={() => navigate('/')}
              >
                <i className="bi bi-search me-2"></i>
                Browse Hotels
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Help Section */}
      <Card className="border-0 bg-light">
        <Card.Body className="p-4 text-center">
          <div className="d-flex align-items-center justify-content-center mb-2">
            <i className="bi bi-headset text-primary me-2 fs-5"></i>
            <h6 className="mb-0 text-primary">Need Help?</h6>
          </div>
          <p className="text-muted mb-0">
            Contact the hotel directly if you have any questions about your booking.
          </p>
        </Card.Body>
      </Card>
    </Container>
    </div>
  );
};

export default BookingPaymentSuccess;
