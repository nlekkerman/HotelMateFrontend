import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Card, Alert, Button } from 'react-bootstrap';

/**
 * BookingPaymentCancel - Handle cancelled Stripe payment
 */
const BookingPaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [preset] = useState(1); // Can be extended later with hotel data

  return (
    <div
      className={`hotel-public-page booking-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: '100vh' }}
    >
    <Container className="py-5 booking-layout booking-layout--payment-cancel">
      <div className="text-center mb-4">
        <div className="text-warning mb-3">
          <i className="bi bi-x-circle" style={{ fontSize: '4rem' }}></i>
        </div>
        <h2>Payment Cancelled</h2>
      </div>

      <Card className="mb-4">
        <Card.Body className="p-4">
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            Your payment was cancelled and no charges were made.
          </Alert>

          {bookingId && (
            <Alert variant="warning">
              <strong>Booking Reference:</strong> {bookingId}
              <p className="mb-0 mt-2">
                Your booking has been created but is not yet confirmed. 
                Please complete the payment to confirm your reservation.
              </p>
            </Alert>
          )}

          <div className="mt-4">
            <h5 className="mb-3">What would you like to do?</h5>
            <div className="d-grid gap-3">
              {bookingId && (
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => window.history.back()}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Return to Payment
                </Button>
              )}
              
              <Link to="/" className="btn btn-outline-secondary btn-lg">
                <i className="bi bi-house me-2"></i>
                Back to Hotels
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="bg-light">
        <Card.Body>
          <h6 className="mb-2">Need Help?</h6>
          <p className="mb-0 small text-muted">
            If you're experiencing issues with payment, please contact the hotel directly 
            or try again later.
          </p>
        </Card.Body>
      </Card>
    </Container>
    </div>
  );
};

export default BookingPaymentCancel;
