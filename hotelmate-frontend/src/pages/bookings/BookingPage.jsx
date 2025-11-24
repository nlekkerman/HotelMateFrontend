import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '@/services/api';

/**
 * BookingPage - Custom booking flow for room reservations
 */
const BookingPage = () => {
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Hotel data
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  
  // Booking data
  const [selectedRoom, setSelectedRoom] = useState(searchParams.get('room') || '');
  const [dates, setDates] = useState({
    checkIn: '',
    checkOut: ''
  });
  const [guests, setGuests] = useState({
    adults: 2,
    children: 0
  });
  const [availability, setAvailability] = useState(null);
  const [quote, setQuote] = useState(null);
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });
  const [bookingData, setBookingData] = useState(null);

  // Fetch hotel data
  useEffect(() => {
    fetchHotelData();
  }, [hotelSlug]);

  const fetchHotelData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hotel/public/page/${hotelSlug}/`);
      setHotel(response.data);
      setRoomTypes(response.data.room_types || []);
    } catch (err) {
      setError('Failed to load hotel information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Check Availability
  const checkAvailability = async (e) => {
    e.preventDefault();
    
    if (!dates.checkIn || !dates.checkOut) {
      setError('Please select check-in and check-out dates');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/hotel/${hotelSlug}/availability/`, {
        params: {
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          adults: guests.adults,
          children: guests.children
        }
      });
      
      setAvailability(response.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check availability');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get Price Quote
  const getPriceQuote = async (roomCode) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/hotel/${hotelSlug}/pricing/quote/`, {
        room_type_code: roomCode,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        adults: guests.adults,
        children: guests.children
      });
      
      setQuote(response.data);
      setSelectedRoom(roomCode);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get price quote');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create Booking
  const createBooking = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/hotel/${hotelSlug}/bookings/`, {
        quote_id: quote?.quote_id,
        room_type_code: selectedRoom,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        adults: guests.adults,
        children: guests.children,
        guest: {
          first_name: guestInfo.firstName,
          last_name: guestInfo.lastName,
          email: guestInfo.email,
          phone: guestInfo.phone
        },
        special_requests: guestInfo.specialRequests
      });
      
      // Store booking data and move to payment step
      setBookingData(response.data);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Process Payment
  const processPayment = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(
        `/hotel/${hotelSlug}/bookings/${bookingData.booking_id}/payment/`,
        {
          booking: bookingData,
          payment_method: 'stripe',
          success_url: `${window.location.origin}/booking/payment/success?booking_id=${bookingData.booking_id}`,
          cancel_url: `${window.location.origin}/booking/payment/cancel?booking_id=${bookingData.booking_id}`
        }
      );
      
      // Redirect to Stripe Checkout
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        setError('Payment URL not provided');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to process payment');
      console.error('Payment error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !hotel) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3 mb-3">
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => step > 1 ? setStep(step - 1) : navigate(`/${hotelSlug}`)}
            >
              <i className="bi bi-arrow-left me-1"></i>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <h2 className="mb-0">Book Your Stay at {hotel?.name}</h2>
          </div>
          
          {/* Progress Steps */}
          <div className="d-flex gap-3 mb-3">
            <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Dates</span>
            </div>
            <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Room</span>
            </div>
            <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Details</span>
            </div>
            <div className={`step-indicator ${step >= 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              <span className="step-label">Payment</span>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step 1: Select Dates */}
      {step === 1 && (
        <Card>
          <Card.Body className="p-4">
            <h4 className="mb-4">Select Your Dates</h4>
            <Form onSubmit={checkAvailability}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Check-in Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dates.checkIn}
                      onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      style={{
                        colorScheme: 'light'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Check-out Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dates.checkOut}
                      onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
                      min={dates.checkIn || new Date().toISOString().split('T')[0]}
                      required
                      style={{
                        colorScheme: 'light'
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Adults</Form.Label>
                    <Form.Select
                      value={guests.adults}
                      onChange={(e) => setGuests({ ...guests, adults: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Children</Form.Label>
                    <Form.Select
                      value={guests.children}
                      onChange={(e) => setGuests({ ...guests, children: parseInt(e.target.value) })}
                    >
                      {[0, 1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Button type="submit" variant="primary" size="lg" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Check Availability'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Step 2: Select Room */}
      {step === 2 && availability && (
        <Row>
          {availability.available_rooms?.map(room => (
            <Col md={6} lg={4} key={room.room_type_code} className="mb-4">
              <Card className="h-100">
                {room.photo_url && (
                  <Card.Img variant="top" src={room.photo_url} alt={room.room_type_name} />
                )}
                <Card.Body>
                  <Card.Title>{room.room_type_name}</Card.Title>
                  <p className="text-muted small">
                    <i className="bi bi-people me-1"></i>
                    Up to {room.max_occupancy} guests
                  </p>
                  {room.note && (
                    <Alert variant="warning" className="py-2">
                      <small>{room.note}</small>
                    </Alert>
                  )}
                  <Button 
                    variant="primary" 
                    className="w-100"
                    onClick={() => getPriceQuote(room.room_type_code)}
                    disabled={!room.is_available || loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Select Room'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Step 3: Guest Information */}
      {step === 3 && quote && (
        <Row>
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Body className="p-4">
                <h4 className="mb-4">Guest Information</h4>
                <Form onSubmit={createBooking}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={guestInfo.firstName}
                          onChange={(e) => setGuestInfo({ ...guestInfo, firstName: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={guestInfo.lastName}
                          onChange={(e) => setGuestInfo({ ...guestInfo, lastName: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Email *</Form.Label>
                    <Form.Control
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Phone *</Form.Label>
                    <Form.Control
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Special Requests (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={guestInfo.specialRequests}
                      onChange={(e) => setGuestInfo({ ...guestInfo, specialRequests: e.target.value })}
                      placeholder="e.g., Late check-in, specific floor preference..."
                    />
                  </Form.Group>

                  <Button type="submit" variant="success" size="lg" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : 'Confirm Booking'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="sticky-top" style={{ top: '100px' }}>
              <Card.Body>
                <h5 className="mb-3">Booking Summary</h5>
                <div className="mb-3">
                  <small className="text-muted">Dates</small>
                  <p className="mb-1">{dates.checkIn} to {dates.checkOut}</p>
                  <small className="text-muted">{quote.breakdown?.number_of_nights} nights</small>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted">Guests</small>
                  <p className="mb-0">{guests.adults} adults, {guests.children} children</p>
                </div>

                <hr />

                <div className="mb-2 d-flex justify-content-between">
                  <span>Subtotal:</span>
                  <span>€{quote.breakdown?.subtotal}</span>
                </div>
                <div className="mb-2 d-flex justify-content-between">
                  <span>Taxes & Fees:</span>
                  <span>€{quote.breakdown?.taxes}</span>
                </div>
                {quote.breakdown?.discount !== "0.00" && (
                  <div className="mb-2 d-flex justify-content-between text-success">
                    <span>Discount:</span>
                    <span>-€{quote.breakdown?.discount}</span>
                  </div>
                )}
                
                <hr />
                
                <div className="d-flex justify-content-between">
                  <strong>Total:</strong>
                  <strong className="fs-4 text-primary">€{quote.breakdown?.total}</strong>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Step 4: Payment */}
      {step === 4 && bookingData && quote && (
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Body className="p-4">
                <h4 className="mb-4">Complete Payment</h4>
                
                {/* Booking Summary */}
                <div className="mb-4 p-4 bg-light rounded">
                  <h5 className="mb-3">Booking Summary</h5>
                  <Row>
                    <Col md={6}>
                      <p className="mb-2"><strong>Hotel:</strong> {hotel.name}</p>
                      <p className="mb-2"><strong>Room:</strong> {quote.room_type_name}</p>
                      <p className="mb-2"><strong>Check-in:</strong> {new Date(dates.checkIn).toLocaleDateString()}</p>
                      <p className="mb-2"><strong>Check-out:</strong> {new Date(dates.checkOut).toLocaleDateString()}</p>
                    </Col>
                    <Col md={6}>
                      <p className="mb-2"><strong>Guests:</strong> {guests.adults} Adults, {guests.children} Children</p>
                      <p className="mb-2"><strong>Nights:</strong> {quote.breakdown?.number_of_nights}</p>
                      <p className="mb-2"><strong>Guest:</strong> {guestInfo.firstName} {guestInfo.lastName}</p>
                      <p className="mb-2"><strong>Email:</strong> {guestInfo.email}</p>
                    </Col>
                  </Row>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Total Amount:</h5>
                    <h3 className="mb-0 text-primary">€{parseFloat(quote.breakdown?.total).toFixed(2)}</h3>
                  </div>
                </div>

                <Alert variant="info" className="mb-4">
                  <i className="bi bi-shield-check me-2"></i>
                  Your payment is secured by Stripe. You'll be redirected to a secure checkout page.
                </Alert>

                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Booking Reference:</strong> {bookingData.booking_id}
                </Alert>

                <Form onSubmit={processPayment}>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg" 
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-credit-card me-2"></i>
                        Proceed to Secure Payment
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <style jsx>{`
        .step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
        }
        
        .step-indicator.active {
          opacity: 1;
        }
        
        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #dee2e6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        
        .step-indicator.active .step-number {
          background: #0d6efd;
          color: white;
        }
      `}</style>
    </Container>
  );
};

export default BookingPage;
