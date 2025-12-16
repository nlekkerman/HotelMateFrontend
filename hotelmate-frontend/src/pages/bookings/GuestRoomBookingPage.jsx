import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api, { publicAPI } from '@/services/api';

/**
 * GuestRoomBookingPage - Guest room reservation flow (HTTP-first, no realtime)
 */
const GuestRoomBookingPage = () => {
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Hotel data
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [preset, setPreset] = useState(1);
  
  // Booking data - read room_type_code from URL params for preselection
  const preselectedRoomCode = searchParams.get('room_type_code') || searchParams.get('room') || '';
  const [selectedRoom, setSelectedRoom] = useState(preselectedRoomCode);
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
      const response = await api.get(`/public/hotel/${hotelSlug}/page/`);
      console.log('Hotel API Response:', response.data);
      setHotel(response.data.hotel || response.data);
      setRoomTypes(response.data.room_types || []);
      const hotelPreset = response.data.hotel?.preset || response.data.preset || response.data.global_style_variant || 1;
      console.log('Setting preset to:', hotelPreset);
      setPreset(hotelPreset);
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
      
      const response = await publicAPI.get(`/public/hotel/${hotelSlug}/availability/`, {
        params: {
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          adults: guests.adults,
          children: guests.children
        }
      });
      
      setAvailability(response.data);
      
      // If room_type_code was provided in URL, try to preselect it in Step 2
      if (preselectedRoomCode && response.data.available_rooms) {
        const preselectedRoom = response.data.available_rooms.find(
          room => room.room_type_code === preselectedRoomCode && room.is_available
        );
        
        // If preselected room is available, keep it selected
        // Otherwise, clear selection and let user choose
        if (!preselectedRoom) {
          setSelectedRoom('');
        }
      }
      
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
      
      const response = await publicAPI.post(`/public/hotel/${hotelSlug}/pricing/quote/`, {
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
      
      const response = await publicAPI.post(`/public/hotel/${hotelSlug}/bookings/`, {
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
      
      const response = await publicAPI.post(
        `/public/hotel/${hotelSlug}/room-bookings/${bookingData.booking_id}/payment/`,
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
    <div
      className={`hotel-public-page booking-page page-style-${preset}`}
      data-preset={preset}
      style={{ minHeight: '100vh' }}
    >
      <Container className="py-5 booking-layout">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3 mb-3">
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => step > 1 ? setStep(step - 1) : navigate(`/hotel/${hotelSlug}`)}
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
        <div className={`booking-step booking-step--1 booking-step--preset-${preset}`}>
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
        </div>
      )}

      {/* Step 2: Select Room */}
      {step === 2 && availability && (
        <div className={`booking-step booking-step--2 booking-step--preset-${preset}`}>
        <>
          {preselectedRoomCode && (
            <Alert variant="info" className="mb-4">
              <i className="bi bi-info-circle me-2"></i>
              {selectedRoom ? (
                <>Room type preselected from your request. You can select a different room below if preferred.</>
              ) : (
                <>The requested room type is not available for your selected dates. Please choose from the available options below.</>
              )}
            </Alert>
          )}
          
          {/* Room Selection Cards */}
          <Row className="g-4 justify-content-center">
            {availability.available_rooms?.map((room, index) => {
              const isPreselected = preselectedRoomCode && 
                (room.room_type_code === selectedRoom || room.code === selectedRoom || room.name === preselectedRoomCode);
              const roomKey = `${room.room_type_code || room.code || room.name}-${index}`;
              
              // Debug pricing - try multiple possible price fields
              const roomPrice = room.base_rate || room.current_price || room.price || room.starting_price_from || room.rate || 0;
              
              // Debug log to see what data we have
              console.log('Room data for pricing:', {
                name: room.name || room.room_type_name,
                base_rate: room.base_rate,
                current_price: room.current_price,
                price: room.price,
                starting_price_from: room.starting_price_from,
                rate: room.rate,
                finalPrice: roomPrice,
                allRoomData: room
              });
              
              return (
                <Col sm={6} md={4} lg={4} xl={3} key={roomKey}>
                  <Card 
                    className={`h-100 position-relative ${isPreselected ? 'border-primary border-2 shadow' : 'border-light'}`}
                  >
                    {/* Room Image */}
                    {room.photo_url && (
                      <div className="room-image">
                        <Card.Img 
                          variant="top" 
                          src={room.photo_url} 
                          alt={room.name || room.room_type_name}
                          className="room-image-img"
                        />
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="position-absolute top-0 end-0 m-2 d-flex flex-column align-items-end gap-1">
                      {isPreselected && (
                        <span className="badge  fs-6 px-3 py-2">
                          <i className="bi bi-check-circle me-1"></i>
                          Preselected
                        </span>
                      )}
                      {room.has_discount && room.discount_percent > 0 && (
                        <span className="badge bg-success fs-6 px-2">
                          {room.discount_percent}% OFF
                        </span>
                      )}
                    </div>

                    <Card.Body className="d-flex flex-column p-4">
                      {/* Room Title */}
                      <Card.Title className="h5 mb-2">
                        {room.name || room.room_type_name}
                      </Card.Title>
                      
                      {/* Guest Capacity */}
                      <p className="text-muted mb-3">
                        <i className="bi bi-people me-2"></i>
                        <span>Up to {room.max_occupancy} guests
                        {room.bed_setup && (
                          <>
                            <br />
                            <i className="bi bi-bed me-2"></i>
                            {room.bed_setup}
                          </>
                        )}</span>
                      </p>

                      {/* Rate Plan */}
                      {room.rate_plan_name && room.rate_plan_name !== 'Standard Rate' && (
                        <div className="mb-3">
                          <span className="badge bg-light text-dark border px-3 py-2">
                            {room.rate_plan_name}
                          </span>
                        </div>
                      )}

                      {/* Pricing Section */}
                      <div className="mb-3 p-3 bg-light rounded">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Price per night</span>
                          <div className="text-end">
                            <div className="h4 mb-0 text-primary fw-bold">
                              €{parseFloat(roomPrice).toFixed(0)}
                            </div>
                            {room.has_discount && room.original_price && parseFloat(room.original_price) > parseFloat(roomPrice) && (
                              <small className="text-muted">
                                <s>€{parseFloat(room.original_price).toFixed(0)}</s>
                              </small>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Policies */}
                      <div className="mb-3">
                        <div className={`d-flex align-items-center ${room.is_refundable !== false ? 'text-success' : 'text-warning'}`}>
                          <i className={`bi ${room.is_refundable !== false ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                          <small className="fw-medium">
                            {room.is_refundable !== false ? 'Refundable' : 'Non-Refundable'}
                          </small>
                        </div>
                      </div>

                      {/* Availability Note */}
                      {room.note && (
                        <Alert variant="info" className="py-2 small">
                          {room.note}
                        </Alert>
                      )}

                      {/* Action Button */}
                      <Button 
                        variant={isPreselected ? "success" : "primary"}
                        className="w-100 mt-auto py-2"
                        onClick={() => getPriceQuote(room.room_type_code || room.code || room.name)}
                        disabled={!room.is_available || loading}
                        size="lg"
                      >
                        {loading ? (
                          <Spinner animation="border" size="sm" />
                        ) : isPreselected ? (
                          <>
                            <i className="bi bi-arrow-right me-2"></i>
                            Continue with This Room
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check me-2"></i>
                            Select This Room
                          </>
                        )}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
        </div>
      )}

      {/* Step 3: Guest Information */}
      {step === 3 && quote && (
        <div className={`booking-step booking-step--3 booking-step--preset-${preset}`}>
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
              <Card className="sticky-top booking-summary-card">
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
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && bookingData && quote && (
        <div className={`booking-step booking-step--4 booking-step--preset-${preset}`}>
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
        </div>
      )}


      </Container>
    </div>
  );
};

export default GuestRoomBookingPage;
