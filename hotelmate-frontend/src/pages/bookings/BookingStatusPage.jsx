import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Container,
  Card,
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { publicAPI } from "@/services/api";
import Pusher from 'pusher-js';

/**
 * BookingStatusPage - Token-based booking management page
 * Allows guests to view and manage bookings using secure tokens from email
 */
const BookingStatusPage = () => {
  const { hotelSlug, bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [cancellationPreview, setCancellationPreview] = useState(null);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(1);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancellationSuccess, setCancellationSuccess] = useState(null);
  
  // Real-time updates state
  const [realtimeBooking, setRealtimeBooking] = useState(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // Initialize Pusher and subscribe to guest booking events
  useEffect(() => {
    if (!bookingId || !token) return;
    
    console.log('🚀 Initializing Pusher for booking:', bookingId);
    
    // Initialize Pusher with guest token authentication
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      auth: {
        headers: {
          'Authorization': `GuestToken ${token}`,
        },
      },
      authEndpoint: `/api/notifications/pusher/auth/?hotel_slug=${hotelSlug}`,
    });
    
    pusherRef.current = pusher;
    
    // Subscribe to private guest booking channel
    const channelName = `private-guest-booking-${bookingId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;
    
    // Handle booking confirmation event
    channel.bind('guest-booking-confirmed', function(data) {
      console.log('🎉 Guest booking confirmed:', data);
      const updatedBooking = data.booking;
      setRealtimeBooking(updatedBooking);
      
      // Show success toast
      if (window.location.pathname.includes('booking-status')) {
        import('react-toastify').then(({ toast }) => {
          toast.success('🎉 Your booking has been confirmed!');
        }).catch(() => {
          console.log('✅ Booking confirmed');
        });
      }
    });
    
    // Handle booking cancellation event
    channel.bind('guest-booking-cancelled', function(data) {
      console.log('❌ Guest booking cancelled:', data);
      const updatedBooking = data.booking;
      setRealtimeBooking(updatedBooking);
      
      // Show info toast
      if (window.location.pathname.includes('booking-status')) {
        import('react-toastify').then(({ toast }) => {
          toast.error('❌ Your booking has been cancelled');
        }).catch(() => {
          console.log('❌ Booking cancelled');
        });
      }
    });
    
    // Handle check-in event
    channel.bind('guest-booking-checked-in', function(data) {
      console.log('🏨 Guest booking checked in:', data);
      // Use complete canonical booking data from event
      const updatedBooking = data.booking;
      setRealtimeBooking(updatedBooking);
      
      // Show success toast
      if (window.location.pathname.includes('booking-status')) {
        import('react-toastify').then(({ toast }) => {
          toast.success(`🎉 Welcome to ${updatedBooking.hotel?.name || 'the hotel'}! You're checked in to Room ${updatedBooking.assigned_room_number}`);
        }).catch(() => {
          console.log('✅ Checked in to room', updatedBooking.assigned_room_number);
        });
      }
    });
    
    // Handle general booking updates (room changes, special requests, etc.)
    channel.bind('guest-booking-updated', function(data) {
      console.log('📝 Guest booking updated:', data);
      const updatedBooking = data.booking;
      setRealtimeBooking(updatedBooking);
      
      // Show info toast for non-status updates
      if (window.location.pathname.includes('booking-status')) {
        import('react-toastify').then(({ toast }) => {
          // Show different messages based on what changed
          if (updatedBooking.assigned_room_number && !booking?.assigned_room_number) {
            toast.info(`🏠 Room ${updatedBooking.assigned_room_number} has been assigned to your booking`);
          } else if (updatedBooking.status === 'CHECKED_OUT') {
            toast.info('👋 You have been checked out. Safe travels!');
          } else {
            toast.info('📝 Your booking has been updated');
          }
        }).catch(() => {
          console.log('📝 Booking updated');
        });
      }
    });
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ Successfully subscribed to guest booking channel:', channelName);
    });
    
    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ Failed to subscribe to guest booking channel:', error);
    });
    
    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelName);
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [bookingId, token, booking, hotelSlug]);
  
  // Update booking state when real-time data changes
  useEffect(() => {
    if (realtimeBooking) {
      console.log('📡 Updating booking with realtime data:', realtimeBooking);
      setBooking(prevBooking => {
        const updated = { ...prevBooking, ...realtimeBooking };
        console.log('📡 Updated booking state:', updated);
        return updated;
      });
    }
  }, [realtimeBooking]);
  
  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;

  // Helper to calculate guest count
  const getGuestCount = (booking) => {
    if (!booking?.guests) return 0;
    
    // Use canonical guests structure
    if (booking.guests.total) {
      return booking.guests.total;
    }
    
    // Calculate from adults and children
    return (booking.guests.adults || 0) + (booking.guests.children || 0);
  };

  // Get status display information
  const getStatusDisplay = (status) => {
    const normalized = status?.toString().toLowerCase() || "";

    switch (normalized) {
      case "confirmed":
        return {
          color: "success",
          icon: "check-circle-fill",
          text: "Confirmed",
        };
      case "pending_payment":
      case "pending payment":
        return {
          color: "warning",
          icon: "credit-card",
          text: "Payment Required",
        };
      case "pending_approval":
      case "pending approval":
      case "pending":
        return {
          color: "warning",
          icon: "clock-history",
          text: "Awaiting Approval",
        };
      case "cancelled":
      case "canceled":
        return { color: "danger", icon: "x-circle", text: "Cancelled" };
      case "completed":
        return { color: "success", icon: "check-circle", text: "Completed" };
      case "declined":
        return { color: "danger", icon: "x-circle-fill", text: "Declined" };
      case "checked_in":
      case "CHECKED_IN":
      case "checked in":
        return { color: "success", icon: "door-open", text: "Checked In" };
      case "checked_out":
      case "CHECKED_OUT":
      case "checked out":
        return { color: "secondary", icon: "door-closed", text: "Checked Out" };
      default:
        return {
          color: "secondary",
          icon: "question-circle",
          text: status || "Unknown",
        };
    }
  };

  // Fetch booking details using token-based API
  const fetchBookingStatus = async () => {
    // Validate required parameters
    if (!hotelSlug) {
      return (
        <Container className="py-5 text-center">
          <Alert variant="danger">
            <h4>Invalid Link</h4>
            <p>Hotel information is missing from the booking link.</p>
          </Alert>
        </Container>
      );
    }

    if (!bookingId) {
      setError("No booking reference provided");
      setLoading(false);
      return;
    }

    if (!token) {
      setError(
        "Access token required. Please use the link from your booking confirmation email."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the existing hotel-specific booking endpoint with token
      const response = await publicAPI.get(
        `/hotel/${hotelSlug}/room-bookings/${bookingId}/`,
        { params: { token } }
      );

      const data = unwrap(response);

      // The API returns booking data directly with can_cancel and cancellation_preview
      setBooking(data);
      setHotel(data.hotel);
      setCancellationPolicy(data.cancellation_policy);
      
      // Debug initial booking data structure
      console.log('📥 Initial booking data loaded:', {
        status: data.status,
        checked_in_at: data.checked_in_at,
        assigned_room_number: data.assigned_room_number,
        room: data.room,
        hotel: data.hotel,
        guest: data.guest,
        dates: data.dates,
        guests: data.guests
      });
      
      // Determine if cancellation should be allowed
      // Use API can_cancel if provided, otherwise check status-based logic
      const cancellableStatuses = ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED'];
      const shouldAllowCancel = data.can_cancel !== undefined 
        ? data.can_cancel 
        : cancellableStatuses.includes(data.status?.toUpperCase()) && !data.cancelled_at;
      
      setCanCancel(shouldAllowCancel);
      setCancellationPreview(data.cancellation_preview);

      // Set hotel preset if available
      if (data.hotel?.preset) {
        setPreset(data.hotel.preset);
      }
    } catch (err) {
      console.error("Failed to fetch booking status:", err);

      if (err.response?.status === 404) {
        setError(
          "Booking not found. Please check your booking reference and try again."
        );
      } else if (err.response?.status === 403 || err.response?.status === 401) {
        setError(
          "Invalid or expired access token. Please use the latest link from your booking email."
        );
      } else {
        const errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to retrieve booking information. Please try again later.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle booking cancellation
  const handleCancellation = async () => {
    if (!token || !booking) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const response = await publicAPI.post(
        `/hotel/${hotelSlug}/room-bookings/${bookingId}/cancel/`,
        {
          reason: cancelReason,
          token: token
        }
      );

      const result = unwrap(response);
      console.log("Cancellation response:", result);

      // Set cancellation success data
      setCancellationSuccess(result);
      
      // Update booking state
      setBooking(prevBooking => ({
        ...prevBooking,
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        can_cancel: false
      }));
      
      setCanCancel(false);
      setShowCancelModal(false);
      
    } catch (err) {
      console.error("Cancellation failed:", err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.error || 
                          "Failed to cancel booking. Please try again or contact the hotel directly.";
      setCancelError(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetchBookingStatus();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Container className="py-5 text-center">
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Container>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Container className="py-5 text-center">
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No booking data available
          </Alert>
        </Container>
      </div>
    );
  }

  const statusInfo = getStatusDisplay(booking.status);
  
  // Check if guest is checked in - either by status or by having checked_in_at timestamp
  const isCheckedIn = booking?.checked_in_at && booking?.assigned_room_number;
  const hasRoomAssigned = booking?.assigned_room_number && !isCheckedIn;
  
  // Debug current booking state
  console.log('🔍 Current booking state:', {
    status: booking?.status,
    checked_in_at: booking?.checked_in_at,
    assigned_room_number: booking?.assigned_room_number,
    isCheckedIn: isCheckedIn,
    hasRoomAssigned: hasRoomAssigned,
    statusInfo: statusInfo
  });

  return (
    <div
      className={`booking-status-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: "100vh" }}
    >
      <Container className="py-4">
        {/* Modern Header - Dynamic based on status */}
        <div className="text-center mb-4">
          <div className="position-relative d-inline-block">
            <div
              className={`rounded-circle bg-${statusInfo.color} d-inline-flex align-items-center justify-content-center mb-3`}
              style={{ width: "100px", height: "100px" }}
            >
              <i
                className={`bi bi-${statusInfo.icon} text-white`}
                style={{ fontSize: "3rem" }}
              ></i>
            </div>
            {isCheckedIn && (
              <div className="position-absolute top-0 end-0 bg-white rounded-circle p-2 shadow-sm">
                <i className="bi bi-check-circle-fill text-success fs-5"></i>
              </div>
            )}
          </div>
          <h1 className="display-4 fw-bold mb-2">
            {isCheckedIn ? `Room ${booking.assigned_room_number}` : 
             hasRoomAssigned ? `Room ${booking.assigned_room_number} Ready` : 
             statusInfo.text}
          </h1>
          <div className={`badge bg-${isCheckedIn ? 'success' : statusInfo.color} fs-5 px-4 py-2 mb-3`}>
            {isCheckedIn ? 'Welcome! You\'re Checked In' : 
             hasRoomAssigned ? 'Room Ready - Check In Available' : 
             `Booking ${statusInfo.text}`}
          </div>
          <p className="text-muted lead">
            {isCheckedIn ? `Enjoy your stay at ${booking.hotel?.name}` : 
             hasRoomAssigned ? `Your room is ready at ${booking.hotel?.name}` :
             `Your booking with ${booking.hotel?.name}`}
          </p>
        </div>

        {/* Cancellation Success Alert */}
        {cancellationSuccess && (
          <Alert variant="success" className="mb-4">
            <div className="d-flex align-items-center">
              <div className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                <i className="bi bi-check-circle-fill text-white fs-4"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="alert-heading mb-2">Booking Successfully Cancelled</h5>
                <p className="mb-2">{cancellationSuccess.description}</p>
                <div className="row g-2">
                  {cancellationSuccess.cancellation_fee && parseFloat(cancellationSuccess.cancellation_fee) > 0 && (
                    <div className="col-md-6">
                      <small className="text-muted d-block">Cancellation Fee</small>
                      <strong>{booking.pricing?.currency || 'EUR'} {parseFloat(cancellationSuccess.cancellation_fee).toFixed(2)}</strong>
                    </div>
                  )}
                  {cancellationSuccess.refund_amount && (
                    <div className="col-md-6">
                      <small className="text-muted d-block">Refund Amount</small>
                      <strong className="text-success">{booking.pricing?.currency || 'EUR'} {parseFloat(cancellationSuccess.refund_amount).toFixed(2)}</strong>
                    </div>
                  )}
                  {cancellationSuccess.refund_reference && (
                    <div className="col-12">
                      <small className="text-muted d-block">Refund Reference</small>
                      <code>{cancellationSuccess.refund_reference}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Quick Info Cards */}
        <div className="row g-3 mb-4">
          {/* Show room number prominently when checked in */}
          {isCheckedIn && (
            <div className="col-12 mb-3">
              <div className="card border-0 shadow-sm bg-success text-white">
                <div className="card-body text-center p-4">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="bi bi-door-open-fill fs-1 me-3"></i>
                    <div>
                      <div className="mb-3">
                        <div className="fw-bold mb-1">Your Room</div>
                        <div className="display-6 fw-bold">Room {booking.assigned_room_number}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <i className="bi bi-house-door text-primary fs-2 mb-2"></i>
                <h6 className="card-title">{booking.room?.type}</h6>
                <p className="card-text text-muted mb-0">
                  {isCheckedIn ? `Room ${booking.assigned_room_number}` : 'Your Room'}
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <i className="bi bi-calendar-check text-info fs-2 mb-2"></i>
                <h6 className="card-title">{booking.dates?.nights} Night{(booking.dates?.nights > 1) ? 's' : ''}</h6>
                <p className="card-text text-muted mb-0">Until {new Date(booking.dates?.check_out).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <i className="bi bi-people text-warning fs-2 mb-2"></i>
                <h6 className="card-title">{booking.guests?.total} Guest{(booking.guests?.total > 1) ? 's' : ''}</h6>
                <p className="card-text text-muted mb-0">
                  {booking.guests?.adults} Adult{(booking.guests?.adults > 1) ? 's' : ''}{booking.guests?.children > 0 && `, ${booking.guests.children} Child${(booking.guests?.children > 1) ? 'ren' : ''}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Information Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="card-title text-primary mb-3">
              <i className="bi bi-person-circle me-2"></i>
              Guest Information
            </h5>
            <div className="row">
              <div className="col-md-8">
                <h6 className="fw-bold">{booking.guest?.name}</h6>
                <div className="text-muted mb-2">
                  <i className="bi bi-envelope me-2"></i>
                  {booking.guest?.email}
                </div>
                {booking.guest?.phone && (
                  <div className="text-muted mb-2">
                    <i className="bi bi-telephone me-2"></i>
                    {booking.guest?.phone}
                  </div>
                )}
                <div className="small text-muted">
                  <i className="bi bi-star-fill me-2"></i>
                  Primary Guest
                </div>
              </div>
              <div className="col-md-4 text-end">
                <div className="small text-muted mb-1">Party Size</div>
                <div className="fs-4 fw-bold text-primary">{booking.guests?.total}</div>
                <div className="small text-muted">
                  {booking.guests?.adults} Adults • {booking.guests?.children} Children
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Reference Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4 text-center">
            <h6 className="text-muted mb-2">Booking Reference</h6>
            <h4 className="text-primary fw-bold">{booking.confirmation_number}</h4>
            <small className="text-muted">Show this to hotel staff if needed</small>
          </div>
        </div>

        {/* Hotel Contact */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <h5 className="card-title mb-3">Need Assistance?</h5>
            <p className="text-muted mb-3">Contact {booking.hotel?.name} for any help during your stay</p>
            <div className="d-flex justify-content-center gap-3">
              <a href={`tel:${booking.hotel?.phone}`} className="btn btn-outline-primary">
                <i className="bi bi-telephone me-2"></i>
                Call Hotel
              </a>
              <a href={`mailto:${booking.hotel?.email}`} className="btn btn-outline-secondary">
                <i className="bi bi-envelope me-2"></i>
                Email
              </a>
            </div>
          </div>
        </div>
      </Container>

      {/* Cancellation Modal */}
      <Modal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-warning me-2"></i>
            Cancel Booking
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelError && (
            <Alert variant="danger" className="mb-3">
              {cancelError}
            </Alert>
          )}
          
          <p>Are you sure you want to cancel this booking?</p>
          
          {cancellationPreview && (
            <div className="bg-light p-3 rounded mb-3">
              <h6>Cancellation Summary</h6>
              <div className="row text-center">
                <div className="col-6">
                  <div className="text-muted small">Cancellation Fee</div>
                  <div className="fw-bold text-danger">
                    {booking.pricing?.currency || 'EUR'} {parseFloat(cancellationPreview.fee_amount || 0).toFixed(2)}
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Refund Amount</div>
                  <div className="fw-bold text-success">
                    {booking.pricing?.currency || 'EUR'} {parseFloat(cancellationPreview.refund_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <small className="text-muted">{cancellationPreview.description}</small>
              </div>
            </div>
          )}
          
          <Form>
            <Form.Group>
              <Form.Label>Reason for cancellation (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCancelModal(false)}
            disabled={cancelling}
          >
            Keep Booking
          </Button>
          <Button
            variant="danger"
            onClick={handleCancellation}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              <>
                <i className="bi bi-x-circle me-2"></i>
                Cancel Booking
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BookingStatusPage;