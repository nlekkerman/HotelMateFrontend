import React, { useEffect, useState } from "react";
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

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;

  // Helper to calculate guest count
  const getGuestCount = (booking) => {
    if (!booking) return 0;

    // Try direct fields first
    if (booking.adults !== undefined || booking.children !== undefined) {
      return (booking.adults || 0) + (booking.children || 0);
    }

    // Try guests object
    if (booking.guests?.total) {
      return booking.guests.total;
    }

    // Fallback
    return booking.total_guests || 0;
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
      case "pending_approval":
      case "pending approval":
      case "pending":
        return {
          color: "warning",
          icon: "clock-history",
          text: "Pending Approval",
        };
      case "cancelled":
      case "canceled":
        return { color: "danger", icon: "x-circle", text: "Cancelled" };
      case "completed":
        return { color: "success", icon: "check-circle", text: "Completed" };
      case "declined":
        return { color: "danger", icon: "x-circle-fill", text: "Declined" };
      case "checked_in":
      case "checked in":
        return { color: "info", icon: "door-open", text: "Checked In" };
      case "checked_out":
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
      setCanCancel(data.can_cancel || false);
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

    try {
      setCancelling(true);
      setCancelError(null);

      // Call the hotel-specific booking cancellation API
      const response = await publicAPI.post(
        `/hotel/${hotelSlug}/room-bookings/${bookingId}/`,
        {
          token,
          reason: cancelReason.trim() || "Cancelled by guest",
        }
      );

      const data = unwrap(response);

      // Store cancellation success details
      setCancellationSuccess(data.cancellation || {
        cancelled_at: new Date().toISOString(),
        cancellation_fee: data.cancellation_fee || "0.00",
        refund_amount: data.refund_amount,
        description: data.message || "Booking cancelled successfully",
        refund_reference: data.refund_reference
      });

      // Update booking data with cancelled status
      setBooking({
        ...booking,
        status: "CANCELLED",
        cancelled_at: data.cancellation?.cancelled_at || new Date().toISOString(),
      });
      setCanCancel(false);
      setShowCancelModal(false);

    } catch (err) {
      console.error("Failed to cancel booking:", err);

      // Enhanced error handling based on status codes
      let errorMessage;
      switch (err.response?.status) {
        case 400:
          errorMessage = err.response?.data?.error || "This booking cannot be cancelled";
          break;
        case 401:
          errorMessage = "Invalid access link. Please check your email for the correct link.";
          break;
        case 403:
          errorMessage = "This cancellation link has expired or been used.";
          break;
        case 502:
          errorMessage = "Payment processing failed. Please contact the hotel directly.";
          break;
        default:
          errorMessage = err.response?.data?.error || err.response?.data?.detail || "Unable to cancel booking. Please contact the hotel.";
      }
      setCancelError(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetchBookingStatus();
  }, [bookingId]);

  if (loading) {
    return (
      <div className={`booking-status-page page-style-${preset}`}>
        <Container className="py-5 text-center">
          <Spinner animation="border" />
          <p className="mt-3">Loading booking information...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`booking-status-page page-style-${preset}`}>
        <Container className="py-5">
          <div className="text-center mb-4">
            <div
              className="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: "80px", height: "80px" }}
            >
              <i
                className="bi bi-exclamation-triangle text-white"
                style={{ fontSize: "2.5rem" }}
              ></i>
            </div>
            <h1 className="display-6 fw-bold text-danger mb-2">
              Booking Not Found
            </h1>
            <p className="lead text-muted">{error}</p>
          </div>

          <div className="text-center">
            <Button variant="primary" onClick={() => navigate("/")}>
              <i className="bi bi-house me-2"></i>
              Go to Homepage
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={`booking-status-page page-style-${preset}`}>
        <Container className="py-5">
          <Alert variant="warning" className="text-center">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No booking data available
          </Alert>
        </Container>
      </div>
    );
  }

  const statusInfo = getStatusDisplay(booking.status);

  return (
    <div
      className={`booking-status-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: "100vh" }}
    >
      <Container className="py-5">
        {/* Status Header */}
        <div className="text-center mb-5">
          <div
            className={`rounded-circle bg-${statusInfo.color} d-inline-flex align-items-center justify-content-center mb-3`}
            style={{ width: "80px", height: "80px" }}
          >
            <i
              className={`bi bi-${statusInfo.icon} text-white`}
              style={{ fontSize: "2.5rem" }}
            ></i>
          </div>
          <h1 className="display-6 fw-bold mb-2">Booking Status</h1>
          <div className={`badge bg-${statusInfo.color} fs-5 px-4 py-2`}>
            {statusInfo.text}
          </div>
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

        {/* Booking Details Grid */}
        <div className="row g-4 mb-4">
          {/* Booking Reference */}
          <div className="col-12">
            <Card className="border-0 shadow-sm bg-primary bg-opacity-5">
              <Card.Body className="p-4 text-center">
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <i className="bi bi-receipt text-primary me-2 fs-5"></i>
                  <h5 className="mb-0 text-primary">Booking Reference</h5>
                </div>
                <div className="fs-2 fw-bold text-primary mb-0">
                  {booking.confirmation_number || booking.id || bookingId}
                </div>
                <small className="text-muted">
                  Save this reference for future communication
                </small>

                {/* Created date */}
                {booking.created_at && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Booked:{" "}
                      {new Date(booking.created_at).toLocaleDateString()}
                    </small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Hotel Details */}
          {hotel && (
            <div className="col-md-6">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div
                      className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3"
                      style={{ width: "40px", height: "40px" }}
                    >
                      <i className="bi bi-building text-white"></i>
                    </div>
                    <h5 className="mb-0 text-success">Hotel Details</h5>
                  </div>
                  <h6 className="fw-bold mb-2">{hotel.name}</h6>
                  {hotel.phone && (
                    <p className="mb-2">
                      <i className="bi bi-telephone me-2 text-success"></i>
                      <span className="fw-medium">{hotel.phone}</span>
                    </p>
                  )}
                  {hotel.email && (
                    <p className="mb-0">
                      <i className="bi bi-envelope me-2 text-success"></i>
                      <span>{hotel.email}</span>
                    </p>
                  )}
                </Card.Body>
              </Card>
            </div>
          )}

          {/* Stay Details */}
          <div className="col-md-6">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle bg-info d-flex align-items-center justify-content-center me-3"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="bi bi-door-open text-white"></i>
                  </div>
                  <h5 className="mb-0 text-info">Stay Details</h5>
                </div>

                {booking.room_type_name && (
                  <div className="mb-3">
                    <div className="fw-bold mb-1">Room Type</div>
                    <div className="text-muted">{booking.room_type_name}</div>
                  </div>
                )}

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <div className="small fw-bold text-muted">Check-in</div>
                    <div>{booking.check_in}</div>
                  </div>
                  <div className="col-6">
                    <div className="small fw-bold text-muted">Check-out</div>
                    <div>{booking.check_out}</div>
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <div className="small fw-bold text-muted">Nights</div>
                    <div>{booking.nights || "-"}</div>
                  </div>
                  <div className="col-6">
                    <div className="small fw-bold text-muted">Guests</div>
                    <div>
                      {(() => {
                        const guestCount = getGuestCount(booking);
                        return guestCount > 0
                          ? `${guestCount} Guest${guestCount !== 1 ? "s" : ""}`
                          : "-";
                      })()}
                    </div>
                  </div>
                </div>

                {/* Guest Information */}
                {booking.primary_guest_name && (
                  <div className="mt-3">
                    <div className="small fw-bold text-muted">
                      Primary Guest
                    </div>
                    <div>{booking.primary_guest_name}</div>
                    {booking.primary_email && (
                      <div className="small text-muted">
                        {booking.primary_email}
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Payment Summary */}
        {booking.total_amount && (
          <Card className="border-0 shadow-sm bg-success bg-opacity-5 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <div
                  className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="bi bi-credit-card text-white"></i>
                </div>
                <h5 className="mb-0 text-success">Payment Summary</h5>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <span className="fs-5">Total Amount</span>
                <span className="fs-3 fw-bold text-success">
                  {booking.currency || "€"}
                  {parseFloat(booking.total_amount).toFixed(2)}
                </span>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Cancellation Policy & Actions */}
        {cancellationPolicy && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <div
                  className="rounded-circle bg-warning d-flex align-items-center justify-content-center me-3"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="bi bi-shield-exclamation text-white"></i>
                </div>
                <h5 className="mb-0 text-warning">Cancellation Policy</h5>
              </div>

              <div className="mb-3">
                <h6 className="fw-bold">{cancellationPolicy.name}</h6>
                <p className="text-muted mb-0">
                  {cancellationPolicy.description}
                </p>
              </div>

              {/* Enhanced Cancellation Preview */}
              {cancellationPreview && canCancel && (
                <div className="bg-light p-4 rounded-3 border mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                      <i className="bi bi-exclamation-triangle text-white"></i>
                    </div>
                    <div>
                      <h5 className="mb-1 fw-bold">Cancellation Summary</h5>
                      <small className="text-muted">Review charges before cancelling</small>
                    </div>
                  </div>
                  
                  <div className="row g-3 mb-3">
                    {cancellationPreview.fee_amount && parseFloat(cancellationPreview.fee_amount) > 0 ? (
                      <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 bg-danger bg-opacity-10 rounded-3">
                          <i className="bi bi-dash-circle-fill text-danger me-2"></i>
                          <div>
                            <small className="fw-bold text-danger d-block">Cancellation Fee</small>
                            <span className="h6 text-danger mb-0">
                              {booking.pricing?.currency || 'EUR'} {parseFloat(cancellationPreview.fee_amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 bg-success bg-opacity-10 rounded-3">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          <div>
                            <small className="fw-bold text-success d-block">No Cancellation Fee</small>
                            <small className="text-muted">Free cancellation available</small>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="col-md-6">
                      <div className="d-flex align-items-center p-3 bg-info bg-opacity-10 rounded-3">
                        <i className="bi bi-arrow-return-left text-info me-2"></i>
                        <div>
                          <small className="fw-bold text-info d-block">Refund Amount</small>
                          <span className="h6 text-info mb-0">
                            {booking.pricing?.currency || 'EUR'} {parseFloat(cancellationPreview.refund_amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {cancellationPreview.description && (
                    <div className="d-flex align-items-center">
                      <i className="bi bi-info-circle text-primary me-2"></i>
                      <small className="text-muted">{cancellationPreview.description}</small>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Button */}
              {canCancel && booking.status !== "CANCELLED" && (
                <Button
                  variant="outline-danger"
                  onClick={() => setShowCancelModal(true)}
                  className="me-2"
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel Booking
                </Button>
              )}

              {!canCancel && booking.status !== "CANCELLED" && (
                <Alert variant="info" className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  This booking cannot be cancelled online. Please contact the
                  hotel directly.
                </Alert>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Action Buttons */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="row g-3">
              {hotel?.slug && (
                <div className="col-md-6">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100"
                    onClick={() => navigate(`/hotel/${hotel.slug}`)}
                  >
                    <i className="bi bi-house-door me-2"></i>
                    View Hotel
                  </Button>
                </div>
              )}
              <div className="col-md-6">
                <Button
                  variant="outline-secondary"
                  size="lg"
                  className="w-100"
                  onClick={() => navigate("/")}
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
              Contact the hotel directly if you have any questions about your
              booking.
            </p>
            {hotel?.phone && (
              <p className="text-muted mt-2 mb-0">
                <i className="bi bi-telephone me-1"></i>
                <strong>{hotel.phone}</strong>
              </p>
            )}
          </Card.Body>
        </Card>
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
              <i className="bi bi-exclamation-triangle me-2"></i>
              {cancelError}
            </Alert>
          )}

          <div className="mb-3">
            <p className="fw-bold">
              Are you sure you want to cancel this booking?
            </p>
            <div className="bg-light p-3 rounded">
              <div className="small fw-bold mb-2">
                Booking: {booking?.confirmation_number || booking?.id}
              </div>
              <div className="small text-muted">
                {hotel?.name} • {booking?.check_in} to {booking?.check_out}
              </div>
            </div>
          </div>

          {/* Cancellation Preview */}
          {cancellationPreview && (
            <div className="bg-warning bg-opacity-10 p-3 rounded mb-3">
              <div className="fw-bold mb-2">
                <i className="bi bi-info-circle text-warning me-2"></i>
                Cancellation Details
              </div>
              {cancellationPreview.fee_amount &&
              parseFloat(cancellationPreview.fee_amount) > 0 ? (
                <div className="row">
                  <div className="col-6">
                    <div className="small text-muted">Cancellation Fee</div>
                    <div className="text-danger fw-bold">
                      {booking?.currency || "€"}
                      {parseFloat(cancellationPreview.fee_amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Refund Amount</div>
                    <div className="text-success fw-bold">
                      {booking?.currency || "€"}
                      {parseFloat(
                        cancellationPreview.refund_amount || 0
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-success">
                  <i className="bi bi-check-circle me-2"></i>
                  Full refund - No cancellation fee
                </div>
              )}
              {cancellationPreview.description && (
                <div className="small text-muted mt-2">
                  {cancellationPreview.description}
                </div>
              )}
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Reason for cancellation (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please let us know why you're cancelling..."
            />
          </Form.Group>

          <div className="text-muted small">
            <i className="bi bi-info-circle me-2"></i>
            You'll receive a cancellation confirmation email once this is
            processed.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
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
