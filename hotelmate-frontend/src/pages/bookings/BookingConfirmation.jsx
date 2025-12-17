import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Container, Card, Row, Col, Alert } from 'react-bootstrap';

/**
 * BookingConfirmation - Display booking confirmation details
 */
const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const { booking, hotel, room, dates, guests } = location.state || {};
  const preset = (hotel && (hotel.preset || hotel.public_settings?.preset || hotel.global_style_variant)) || 1;

  if (!booking || !hotel) {
    return (
      <div
        className={`hotel-public-page booking-page page-style-${preset}`}
        data-preset={preset}
        style={{ minHeight: '100vh' }}
      >
      <Container className="py-5 booking-layout booking-layout--confirmation">
        <Alert variant="warning" className="text-center">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Booking details not available
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

  return (
    <div
      className={`hotel-public-page booking-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: '100vh' }}
    >
    <Container className="py-5 booking-layout booking-layout--confirmation">
      <Row className="justify-content-center">
        <Col lg={8}>
          {/* Success Message */}
          <Card className="border-success mb-4">
            <Card.Body className="text-center py-5">
              <div className="text-success mb-3">
                <i className="bi bi-check-circle" style={{ fontSize: '4rem' }}></i>
              </div>
              <h2 className="mb-3">Booking Confirmed!</h2>
              <p className="lead text-muted mb-0">
                Your booking has been successfully created.
              </p>
              <p className="text-muted">
                Booking Reference: <strong>#{booking.id || bookingId}</strong>
              </p>
            </Card.Body>
          </Card>

          {/* Booking Details */}
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Booking Details
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Hotel</h6>
                  <p className="mb-0">{hotel.name}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Room Type</h6>
                  <p className="mb-0">{room?.room_type_name || booking.room_type || 'Standard Room'}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Check-in</h6>
                  <p className="mb-0">
                    <i className="bi bi-calendar-check me-2"></i>
                    {dates?.checkIn ? new Date(dates.checkIn).toLocaleDateString() : 'N/A'}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Check-out</h6>
                  <p className="mb-0">
                    <i className="bi bi-calendar-x me-2"></i>
                    {dates?.checkOut ? new Date(dates.checkOut).toLocaleDateString() : 'N/A'}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Guests</h6>
                  <p className="mb-0">
                    <i className="bi bi-people me-2"></i>
                    {(() => {
                      const guestCount = booking.party?.total_count || guests?.adults + guests?.children || 0;
                      return `${guestCount} Guest${guestCount !== 1 ? 's' : ''}`;
                    })()}
                  </p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Status</h6>
                  <p className="mb-0">
                    <span className="badge bg-warning">{booking.status || 'Pending Payment'}</span>
                  </p>
                </Col>
              </Row>

              <hr />

              <Row>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Guest Name</h6>
                  <p className="mb-0">{booking.first_name} {booking.last_name}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Email</h6>
                  <p className="mb-0">{booking.email}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="text-muted mb-2">Phone</h6>
                  <p className="mb-0">{booking.phone}</p>
                </Col>
              </Row>

              {room?.total_price && (
                <>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Total Amount</h5>
                    <h4 className="mb-0 text-primary">
                      €{parseFloat(room.total_price).toFixed(2)}
                    </h4>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Next Steps */}
          <Card className="mb-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-list-check me-2"></i>
                What's Next?
              </h5>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  A confirmation email has been sent to <strong>{booking.email}</strong>
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Please check your email for payment instructions
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Your booking will be confirmed once payment is received
                </li>
                <li className="mb-0">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Contact the hotel directly if you have any questions
                </li>
              </ul>
            </Card.Body>
          </Card>

          {/* Actions */}
          <div className="d-flex gap-3 justify-content-center">
            <Link to="/" className="btn btn-outline-primary">
              <i className="bi bi-house me-2"></i>
              Back to Hotels
            </Link>
            <Link to={`/${hotel.slug}`} className="btn btn-primary">
              <i className="bi bi-building me-2"></i>
              View Hotel
            </Link>
          </div>
        </Col>
      </Row>

      <style jsx>{`
        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.5;
        }

        .step-indicator.active {
          opacity: 1;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .step-indicator.active .step-number {
          background: #0d6efd;
          color: white;
        }

        .step-label {
          font-size: 0.875rem;
          font-weight: 500;
        }
      `}</style>
    </Container>
    </div>
  );
};

export default BookingConfirmation;
