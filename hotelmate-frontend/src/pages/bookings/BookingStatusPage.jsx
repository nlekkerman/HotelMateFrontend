import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { publicAPI } from '@/services/api';

/**
 * BookingStatusPage - Public booking status lookup page
 * Allows anyone to check booking status using booking reference
 */
const BookingStatusPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(1);

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;

  // Helper to calculate guest count
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

  // Normalize status for display
  const normalizeStatus = (status) => {
    if (!status) return 'Unknown';
    return status.toString().toLowerCase().replace('_', ' ');
  };

  // Get status color and icon
  const getStatusDisplay = (status) => {
    const normalized = normalizeStatus(status).toLowerCase();
    
    switch (normalized) {
      case 'confirmed':
        return { color: 'success', icon: 'check-circle-fill', text: 'Confirmed' };
      case 'pending approval':
      case 'pending':
        return { color: 'warning', icon: 'clock-history', text: 'Pending Approval' };
      case 'cancelled':
      case 'canceled':
        return { color: 'danger', icon: 'x-circle', text: 'Cancelled' };
      case 'checked in':
      case 'checkin':
        return { color: 'info', icon: 'door-open', text: 'Checked In' };
      case 'checked out':
      case 'checkout':
        return { color: 'secondary', icon: 'door-closed', text: 'Checked Out' };
      default:
        return { color: 'secondary', icon: 'question-circle', text: status || 'Unknown' };
    }
  };

  // Fetch booking details
  const fetchBookingStatus = async () => {
    if (!bookingId) {
      setError('No booking reference provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to fetch booking details using public API
      const response = await publicAPI.get(`/booking/status/${bookingId}`);
      const data = unwrap(response);
      
      setBooking(data);
      
      // Set hotel preset if available
      if (data.hotel?.preset) {
        setPreset(data.hotel.preset);
      }
      
    } catch (err) {
      console.error('Failed to fetch booking status:', err);
      
      if (err.response?.status === 404) {
        setError('Booking not found. Please check your booking reference and try again.');
      } else {
        const errorMessage = err.response?.data?.detail 
          || err.response?.data?.error 
          || 'Unable to retrieve booking information. Please try again later.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
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
            <div className="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-exclamation-triangle text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h1 className="display-6 fw-bold text-danger mb-2">Booking Not Found</h1>
            <p className="lead text-muted">{error}</p>
          </div>
          
          <div className="text-center">
            <Button variant="primary" onClick={() => navigate('/')}>
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
    <div className={`booking-status-page page-style-${preset}`} data-preset={preset} style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        {/* Status Header */}
        <div className="text-center mb-5">
          <div className={`rounded-circle bg-${statusInfo.color} d-inline-flex align-items-center justify-content-center mb-3`} style={{ width: '80px', height: '80px' }}>
            <i className={`bi bi-${statusInfo.icon} text-white`} style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h1 className="display-6 fw-bold mb-2">Booking Status</h1>
          <div className={`badge bg-${statusInfo.color} fs-5 px-4 py-2`}>
            {statusInfo.text}
          </div>
        </div>

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
                  {booking.confirmation_number || booking.booking_id || bookingId}
                </div>
                <small className="text-muted">Your booking reference number</small>
              </Card.Body>
            </Card>
          </div>

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

          {/* Stay Details */}
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
          <Card className="border-0 shadow-sm bg-success bg-opacity-5 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-credit-card text-white"></i>
                </div>
                <h5 className="mb-0 text-success">Payment Summary</h5>
              </div>
              
              <div className="row">
                <div className="col-md-8">
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span>Subtotal</span>
                    <span>€{parseFloat(booking.pricing.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {booking.pricing.discount && parseFloat(booking.pricing.discount) > 0 && (
                    <div className="d-flex justify-content-between py-2 border-bottom text-success">
                      <span>Discount</span>
                      <span>-€{parseFloat(booking.pricing.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span>Taxes & Fees</span>
                    <span>€{parseFloat(booking.pricing.taxes || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="col-md-4 d-flex align-items-center justify-content-end">
                  <div className="text-end">
                    <div className="small text-muted">Total</div>
                    <div className="fs-3 fw-bold text-success">€{parseFloat(booking.pricing.total || 0).toFixed(2)}</div>
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
              {booking.hotel?.slug && (
                <div className="col-md-6">
                  <Button 
                    variant="primary" 
                    size="lg"
                    className="w-100"
                    onClick={() => navigate(`/hotel/${booking.hotel.slug}`)}
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
            {booking.hotel?.phone && (
              <p className="text-muted mt-2 mb-0">
                <i className="bi bi-telephone me-1"></i>
                <strong>{booking.hotel.phone}</strong>
              </p>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default BookingStatusPage;