import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { publicAPI } from '@/services/api';
import { getHold, setHold, clearHold } from '@/utils/bookingHoldStorage';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import { useExpiredBookingHandler } from '@/hooks/useExpiredBookingHandler';
import BookingExpiredModal from '@/components/modals/BookingExpiredModal';

/**
 * GuestRoomBookingPage - Guest room reservation flow (HTTP-first, no realtime)
 */
const GuestRoomBookingPage = () => {
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;
  
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
  
  // Booking relationship
  const [bookerType, setBookerType] = useState("SELF");
  
  // Primary guest (always required - the person staying)
  const [primaryGuest, setPrimaryGuest] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  // Booker (payer/contact - required only for THIRD_PARTY)
  const [booker, setBooker] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  // Other booking details
  const [specialRequests, setSpecialRequests] = useState('');
  const [promoCode, setPromoCode] = useState('');
  
  const [companions, setCompanions] = useState([]);
  const [addNamesLater, setAddNamesLater] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  
  // Booking hold and expiration state
  const [bookingHold, setBookingHold] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  
  // Expiration handling
  const expiredHandler = useExpiredBookingHandler(hotelSlug);
  
  // Countdown timer for booking hold (only when we have a hold)
  const { mmss, isExpired: timerExpired } = useCountdownTimer(
    bookingHold?.expiresAt,
    () => {
      // Only trigger expiration if we actually have a booking hold
      if (bookingHold) {
        setIsExpired(true);
        expiredHandler.openModal();
      }
    }
  );
  
  // Cancellation Policy Agreement
  const [policyAgreed, setPolicyAgreed] = useState(false);

  // Derive party calculations and validation
  const partySize = (guests.adults || 0) + (guests.children || 0);
  const companionsCount = Math.max(0, partySize - 1);

  // Validation helper
  const validateBookingForm = () => {
    const errors = [];
    
    // Guest limits validation
    if (guests.adults > 6) {
      errors.push('Maximum 6 adults allowed');
    }
    if (guests.children > 4) {
      errors.push('Maximum 4 children allowed');
    }
    if (partySize > 8) {
      errors.push('Maximum 8 total guests allowed');
    }
    
    // Primary guest validation (always required)
    if (!primaryGuest.firstName?.trim()) {
      errors.push('Primary guest first name is required');
    }
    if (!primaryGuest.lastName?.trim()) {
      errors.push('Primary guest last name is required');
    }
    if (bookerType === 'SELF' && !primaryGuest.email?.trim()) {
      errors.push('Email is required for self-bookings');
    }
    if (!primaryGuest.phone?.trim()) {
      errors.push('Primary phone is required');
    }
    
    // Booker validation (THIRD_PARTY only)
    if (bookerType === 'THIRD_PARTY') {
      if (!booker.firstName?.trim()) {
        errors.push('Booker first name is required for third-party bookings');
      }
      if (!booker.lastName?.trim()) {
        errors.push('Booker last name is required for third-party bookings');
      }
      if (!booker.email?.trim()) {
        errors.push('Booker email is required for third-party bookings');
      }
      if (!booker.phone?.trim()) {
        errors.push('Booker phone is required for third-party bookings');
      }
    }
    
    // Companion validation (avoid half-filled rows)
    if (!addNamesLater) {
      companions.forEach((comp, index) => {
        const hasFirst = comp.first_name?.trim();
        const hasLast = comp.last_name?.trim();
        if (hasFirst && !hasLast) {
          errors.push(`Guest ${index + 2}: Last name required if first name is provided`);
        }
        if (!hasFirst && hasLast) {
          errors.push(`Guest ${index + 2}: First name required if last name is provided`);
        }
      });
    }
    
    return errors;
  };

  // Build companions array when needed (Step 3 only)
  useEffect(() => {
    if (step !== 3) return;
    
    if (addNamesLater) {
      setCompanions([]);
      return;
    }
    
    setCompanions((prev) => {
      const next = [...prev];
      while (next.length < companionsCount) {
        next.push({ first_name: "", last_name: "" });
      }
      return next.slice(0, companionsCount);
    });
  }, [step, addNamesLater, companionsCount]);

  // Fetch hotel data
  useEffect(() => {
    console.log('[UseEffect] Hotel data useEffect triggered with hotelSlug:', hotelSlug);
    if (!hotelSlug) {
      console.log('[UseEffect] No hotel slug, skipping fetch');
      return;
    }
    console.log('[UseEffect] Calling fetchHotelData');
    fetchHotelData();
  }, [hotelSlug]);

  // Rehydrate booking hold on page load
  useEffect(() => {
    if (!hotelSlug) return;
    
    const existingHold = getHold(hotelSlug);
    if (existingHold) {
      console.log('[BOOKING_HOLD] Rehydrating existing hold:', existingHold);
      
      // Check if hold is expired
      const now = new Date();
      const expiresAt = new Date(existingHold.expiresAt);
      
      if (now > expiresAt) {
        console.log('[BOOKING_HOLD] Hold expired, clearing storage');
        clearHold(hotelSlug);
        return;
      }
      
      // Hold is still valid, fetch booking status
      fetchBookingStatus(existingHold.bookingId);
      setBookingHold(existingHold);
    }
  }, [hotelSlug]);

  const fetchBookingStatus = async (bookingId) => {
    try {
      const response = await publicAPI.get(`/hotel/${hotelSlug}/room-bookings/${bookingId}/`);
      const bookingData = unwrap(response);
      
      // Cross-hotel validation
      if (bookingData.hotel?.slug !== hotelSlug) {
        console.log('[BOOKING_HOLD] Cross-hotel booking detected, clearing storage');
        expiredHandler.handleExpired(new Error('Cross-hotel booking'));
        return;
      }
      
      // Check booking status
      if (expiredHandler.isExpiredBooking(bookingData)) {
        console.log('[BOOKING_HOLD] Booking expired or cancelled');
        expiredHandler.handleExpired(bookingData);
        return;
      }
      
      // If booking is confirmed, clear hold and navigate to success
      if (bookingData.status === 'CONFIRMED') {
        clearHold(hotelSlug);
        navigate(`/booking/${hotelSlug}/payment/success?booking_id=${bookingId}`);
        return;
      }
      
      // If still valid, continue to payment step
      if (bookingData.status === 'PENDING_PAYMENT') {
        setBookingData(bookingData);
        setStep(4);
      }
    } catch (error) {
      if (expiredHandler.isExpiredError(error)) {
        expiredHandler.handleExpired(error);
      } else {
        console.error('[BOOKING_HOLD] Error fetching booking status:', error);
      }
    }
  };

  const fetchHotelData = async () => {
    try {
      setLoading(true);
      const response = await publicAPI.get(`/hotel/${hotelSlug}/page/`);
      const data = unwrap(response);
      setHotel(data.hotel || data);
      setRoomTypes(data.room_types || []);
      const hotelPreset = data.hotel?.preset || data.preset || data.global_style_variant || 1;
      setPreset(hotelPreset);
    } catch (err) {
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || 'Failed to load hotel information';
      setError(errorMessage);
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
      
      const response = await publicAPI.get(`/hotel/${hotelSlug}/availability/`, {
        params: {
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          adults: guests.adults,
          children: guests.children
        }
      });
      
      const data = unwrap(response);
      setAvailability(data);
      
      // If room_type_code was provided in URL, try to preselect it in Step 2
      if (preselectedRoomCode && data.available_rooms) {
        const preselectedRoom = data.available_rooms.find(
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
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || 'Failed to check availability';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get Price Quote
  const getPriceQuote = async (roomCode) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await publicAPI.post(`/hotel/${hotelSlug}/pricing/quote/`, {
        room_type_code: roomCode,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        adults: guests.adults,
        children: guests.children,
        ...(promoCode.trim() && { promo_code: promoCode.trim() })
      });
      
      const quoteData = unwrap(response);
      console.log('[GuestRoomBookingPage] Full Quote response:', quoteData);
      console.log('[GuestRoomBookingPage] Cancellation policy data:', {
        cancellation_policy_id: quoteData?.cancellation_policy_id,
        cancellation_policy_text: quoteData?.cancellation_policy_text,
        cancellation_policy_name: quoteData?.cancellation_policy_name,
        cancellation_policy_code: quoteData?.cancellation_policy_code,
        template_type: quoteData?.template_type,
        is_refundable: quoteData?.is_refundable,
        hours_before_checkin: quoteData?.hours_before_checkin,
        penalty_type: quoteData?.penalty_type,
        penalty_amount: quoteData?.penalty_amount
      });
      console.log('[GuestRoomBookingPage] Backend should send policy info for hotel default policy!');
      
      setQuote(quoteData);
      setSelectedRoom(roomCode);
      setStep(3);
    } catch (err) {
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || 'Failed to get price quote';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to build canonical booking payload
  const buildBookingPayload = () => {
    // Always required fields
    const payload = {
      room_type_code: selectedRoom,
      check_in: dates.checkIn,
      check_out: dates.checkOut,
      adults: guests.adults,
      children: guests.children,
      booker_type: bookerType,
      
      // Primary guest (person staying) - always flat fields
      primary_first_name: primaryGuest.firstName,
      primary_last_name: primaryGuest.lastName,
      primary_email: primaryGuest.email,
      primary_phone: (primaryGuest.phone || '').trim(),
    };

    // Optional fields
    if (quote?.quote_id) {
      payload.quote_id = quote.quote_id;
    }
    if (quote?.cancellation_policy_id) {
      payload.cancellation_policy_id = quote.cancellation_policy_id;
    }
    if (specialRequests?.trim()) {
      payload.special_requests = specialRequests.trim();
    }
    if (promoCode?.trim()) {
      payload.promo_code = promoCode.trim();
    }

    // Booker fields (third party only)
    if (bookerType === 'THIRD_PARTY') {
      payload.booker_first_name = booker.firstName;
      payload.booker_last_name = booker.lastName;
      payload.booker_email = booker.email;
      payload.booker_phone = (booker.phone || '').trim();
    }
    // For SELF bookings, explicitly omit booker_* fields (cleaner than empty values)

    // Party field: companions-only (never include PRIMARY)
    if (!addNamesLater) {
      const validCompanions = companions
        .filter(c => c.first_name?.trim() && c.last_name?.trim())
        .map(c => ({
          first_name: c.first_name.trim(),
          last_name: c.last_name.trim(),
          // Note: role is not required - backend forces COMPANION
          // Note: email, phone, is_minor are optional
        }));
      
      if (validCompanions.length > 0) {
        payload.party = validCompanions;
      }
    }

    // Explicitly remove legacy keys if they exist
    delete payload.guest;
    delete payload.companions;
    delete payload.primary_guest;
    delete payload.booker;

    return payload;
  };

  // Step 3: Create Booking
  const createBooking = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    const validationErrors = validateBookingForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = buildBookingPayload();

      // Debug logging
      console.log('[BOOKING] 🚀 Final canonical payload:', payload);
      console.log('[BOOKING] 📋 Payload validation:', {
        has_booker_fields: bookerType === 'THIRD_PARTY' && payload.booker_first_name,
        no_booker_fields_for_self: bookerType === 'SELF' && !payload.booker_first_name,
        party_count: payload.party ? payload.party.length : 0,
        party_companions_only: payload.party ? !payload.party.some(p => p.role === 'PRIMARY') : true,
        no_legacy_keys: !payload.guest && !payload.companions && !payload.primary_guest && !payload.booker
      });

      const response = await publicAPI.post(`/hotel/${hotelSlug}/bookings/`, payload);
      
      // Store booking data and persist hold
      const bookingResponse = unwrap(response);
      setBookingData(bookingResponse);
      
      // Persist booking hold if expires_at is provided
      if (bookingResponse.expires_at && bookingResponse.booking_id) {
        const holdData = {
          bookingId: bookingResponse.booking_id,
          expiresAt: bookingResponse.expires_at
        };
        setHold(hotelSlug, holdData);
        setBookingHold(holdData);
        console.log('[BOOKING_HOLD] Persisted booking hold:', holdData);
      }
      
      setStep(4);
    } catch (err) {
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || 'Failed to create booking';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Process Payment
  const processPayment = async (e) => {
    e.preventDefault();
    
    // Check if expired before processing
    if (bookingHold && (isExpired || timerExpired)) {
      expiredHandler.openModal();
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await publicAPI.post(
  `/hotel/${hotelSlug}/room-bookings/${bookingData.booking_id}/payment/session/`,
  {
    success_url: `${window.location.origin}/booking/${hotelSlug}/payment/success?booking_id=${bookingData.booking_id}`,
    cancel_url: `${window.location.origin}/booking/${hotelSlug}/payment/cancel?booking_id=${bookingData.booking_id}`,
  }
);
      
      const data = unwrap(response);
      
      if (data.status === "paid") {
        // Already paid — clear hold and go straight to success
        clearHold(hotelSlug);
        navigate(`/booking/payment/success?booking_id=${bookingData.booking_id}`);
        return;
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError("Payment session could not be created");
      }
    } catch (err) {
      // Handle expired booking responses
      if (expiredHandler.handleExpired(err)) {
        return;
      }
      
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || 'Failed to process payment';
      setError(errorMessage);
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
                    <Form.Label>Adults (max 6)</Form.Label>
                    <Form.Select
                      value={guests.adults}
                      onChange={(e) => {
                        const adults = parseInt(e.target.value);
                        const children = guests.children;
                        // Enforce max 8 total guests
                        if (adults + children > 8) {
                          setGuests({ adults, children: 8 - adults });
                        } else {
                          setGuests({ ...guests, adults });
                        }
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Children (max 4)</Form.Label>
                    <Form.Select
                      value={guests.children}
                      onChange={(e) => {
                        const children = parseInt(e.target.value);
                        const adults = guests.adults;
                        // Enforce max 8 total guests and max 4 children
                        if (children > 4) {
                          setGuests({ ...guests, children: 4 });
                        } else if (adults + children > 8) {
                          setGuests({ adults: 8 - children, children });
                        } else {
                          setGuests({ ...guests, children });
                        }
                      }}
                    >
                      {[0, 1, 2, 3, 4].map(n => (
                        <option 
                          key={n} 
                          value={n}
                          disabled={guests.adults + n > 8}
                        >
                          {n}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              {/* Guest limits warning */}
              {partySize > 8 && (
                <Alert variant="warning" className="mb-3">
                  <small>
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Maximum 8 total guests allowed (max 6 adults, max 4 children)
                  </small>
                </Alert>
              )}

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
              
              // Get room price from available fields
              const roomPrice = room.base_rate || room.current_price || room.price || room.starting_price_from || room.rate || 0;
              
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
                  <h4 className="mb-4">Booking Information</h4>
                  <Form onSubmit={createBooking}>
                    {/* Booking Relationship Selector */}
                    <Form.Group className="mb-4">
                      <Form.Label className="mb-3"><strong>Who is this booking for?</strong></Form.Label>
                      <div className="d-flex gap-4">
                        <Form.Check
                          type="radio"
                          id="booker-self"
                          name="bookerType"
                          value="SELF"
                          checked={bookerType === "SELF"}
                          onChange={(e) => setBookerType(e.target.value)}
                          label="I am staying"
                        />
                        <Form.Check
                          type="radio"
                          id="booker-third-party"
                          name="bookerType"
                          value="THIRD_PARTY"
                          checked={bookerType === "THIRD_PARTY"}
                          onChange={(e) => setBookerType(e.target.value)}
                          label="I'm booking for someone else"
                        />
                      </div>
                    </Form.Group>

                    {/* Booker Section - Only show for THIRD_PARTY */}
                    {bookerType === "THIRD_PARTY" && (
                      <div className="mb-4">
                        <h5 className="mb-3">Booking Contact (Payer)</h5>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>First Name *</Form.Label>
                              <Form.Control
                                type="text"
                                value={booker.firstName}
                                onChange={(e) => setBooker({ ...booker, firstName: e.target.value })}
                                required
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Last Name *</Form.Label>
                              <Form.Control
                                type="text"
                                value={booker.lastName}
                                onChange={(e) => setBooker({ ...booker, lastName: e.target.value })}
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Email *</Form.Label>
                          <Form.Control
                            type="email"
                            value={booker.email}
                            onChange={(e) => setBooker({ ...booker, email: e.target.value })}
                            required
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Phone *</Form.Label>
                          <Form.Control
                            type="tel"
                            value={booker.phone}
                            onChange={(e) => setBooker({ ...booker, phone: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </div>
                    )}

                    {/* Primary Guest Section */}
                    <div className="mb-4">
                      <h5 className="mb-3">
                        {bookerType === "SELF" ? "Your Information" : "Guest Information (Person Staying)"}
                      </h5>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>First Name *</Form.Label>
                            <Form.Control
                              type="text"
                              value={primaryGuest.firstName}
                              onChange={(e) => setPrimaryGuest({ ...primaryGuest, firstName: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Last Name *</Form.Label>
                            <Form.Control
                              type="text"
                              value={primaryGuest.lastName}
                              onChange={(e) => setPrimaryGuest({ ...primaryGuest, lastName: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>
                          Email {bookerType === "SELF" ? "*" : "(Optional)"}
                        </Form.Label>
                        <Form.Control
                          type="email"
                          value={primaryGuest.email}
                          onChange={(e) => setPrimaryGuest({ ...primaryGuest, email: e.target.value })}
                          required={bookerType === "SELF"}
                          placeholder={bookerType === "THIRD_PARTY" ? "Optional" : ""}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Phone *</Form.Label>
                        <Form.Control
                          type="tel"
                          value={primaryGuest.phone}
                          onChange={(e) => setPrimaryGuest({ ...primaryGuest, phone: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </div>

                    {/* Promo Code and Special Requests */}
                    <Form.Group className="mb-3">
                      <Form.Label>Promo Code (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter promo code if you have one"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Special Requests (Optional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g., Late check-in, specific floor preference..."
                      />
                    </Form.Group>

                    {/* Additional Guests Section */}
                    {companionsCount > 0 && (
                      <div className="mb-4">
                        <Form.Check
                          type="checkbox"
                          id="add-names-later"
                          checked={addNamesLater}
                          onChange={(e) => setAddNamesLater(e.target.checked)}
                          label="I'll add guest names later"
                          className="mb-2"
                        />
                        <small className="text-muted d-block mb-3">
                          You can provide guest names later from your confirmation email or by contacting the hotel.
                        </small>

                        {!addNamesLater && companionsCount > 0 && (
                          <>
                            <Form.Label className="mb-3">
                              <strong>Additional guest names (optional)</strong>
                            </Form.Label>
                            <small className="text-muted d-block mb-3">
                              Only names are needed. You can leave this blank and add later.
                            </small>
                            {companions.map((companion, index) => (
                              <Row key={index} className="mb-3">
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label>Guest {index + 2} - First Name</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={companion.first_name}
                                      onChange={(e) => {
                                        const updated = [...companions];
                                        updated[index] = { ...updated[index], first_name: e.target.value };
                                        setCompanions(updated);
                                      }}
                                      placeholder="First name"
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label>Guest {index + 2} - Last Name</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={companion.last_name}
                                      onChange={(e) => {
                                        const updated = [...companions];
                                        updated[index] = { ...updated[index], last_name: e.target.value };
                                        setCompanions(updated);
                                      }}
                                      placeholder="Last name"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                            ))}
                          </>
                        )}
                      </div>
                    )}

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
                <div className="mb-4 p-4 rounded">
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
                      <p className="mb-2"><strong>Primary Guest:</strong> {primaryGuest.firstName} {primaryGuest.lastName}</p>
                      {bookerType === "THIRD_PARTY" && (
                        <p className="mb-2"><strong>Booked By:</strong> {booker.firstName} {booker.lastName}</p>
                      )}
                      <p className="mb-2"><strong>Contact Email:</strong> {bookerType === "SELF" ? primaryGuest.email : booker.email}</p>
                    </Col>
                  </Row>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Total Amount:</h5>
                    <h3 className="mb-0 text-primary">€{parseFloat(quote.breakdown?.total).toFixed(2)}</h3>
                  </div>
                </div>

                {/* Countdown Timer Display */}
                {bookingHold && !isExpired && !timerExpired && (
                  <Alert variant="info" className="mb-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-clock me-2"></i>
                        <span><strong>Reserved for:</strong></span>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="fw-bold text-primary me-2" style={{ fontSize: '1.2rem' }}>
                          {mmss}
                        </span>
                        <small className="text-muted">remaining</small>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-2">
                      Your room reservation will expire if payment is not completed within this time.
                    </small>
                  </Alert>
                )}

                {/* Expired State Display */}
                {bookingHold && (isExpired || timerExpired) && (
                  <Alert variant="danger" className="mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <span><strong>Your reservation has expired.</strong> Please start a new booking to check availability.</span>
                    </div>
                  </Alert>
                )}

                <Alert variant="info" className="mb-4">
                  <i className="bi bi-shield-check me-2"></i>
                  Your payment is secured by Stripe. You'll be redirected to a secure checkout page.
                </Alert>

                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Booking Reference:</strong> {bookingData.booking_id}
                </Alert>

                <Alert variant="info" className="mb-4">
                  <i className="bi bi-person-check me-2"></i>
                  <strong>Guest names:</strong>{' '}
                  {addNamesLater || companions.filter(c => c.first_name?.trim() || c.last_name?.trim()).length === 0
                    ? "You can add guest names later from your confirmation email or by contacting the hotel."
                    : "Guest names saved. You can update them later if needed."
                  }
                </Alert>

                {/* Cancellation Policy */}
                <div className="mb-4 p-4 border rounded-3">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                      <i className="bi bi-shield-check text-white"></i>
                    </div>
                    <div>
                      <h5 className="mb-1 fw-bold text-dark">Cancellation Policy</h5>
                      <small className="text-white">Know your booking terms</small>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    {/* Display cancellation policy from quote */}
                    {quote?.cancellation_policy ? (
                      <div className=" p-4 rounded-3 border">
                        <div className="d-flex align-items-start mb-3">
                          <i className="bi bi-clock-history  me-2 mt-1"></i>
                          <div>
                            <h6 className="fw-bold  mb-2">{quote.cancellation_policy.name}</h6>
                            <p className="mb-3 ">{quote.cancellation_policy.description}</p>
                          </div>
                        </div>
                        
                        {/* Dynamic policy details based on API data */}
                        {quote.cancellation_policy.is_refundable !== false && quote.cancellation_policy.hours_before_checkin && (
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="d-flex align-items-center p-3 bg-success bg-opacity-10 rounded-3">
                                <i className="bi bi-check-circle-fill text-success me-2"></i>
                                <div>
                                  <small className="fw-bold text-success d-block">Free Cancellation</small>
                                  <small className="text-muted">
                                    Up to {quote.cancellation_policy.hours_before_checkin} hours before check-in
                                  </small>
                                </div>
                              </div>
                            </div>
                            {quote.cancellation_policy.penalty_amount && quote.cancellation_policy.penalty_type && (
                              <div className="col-md-6">
                                <div className="d-flex align-items-center p-3 bg-warning bg-opacity-10 rounded-3">
                                  <i className="bi bi-exclamation-circle-fill text-warning me-2"></i>
                                  <div>
                                    <small className="fw-bold text-warning d-block">
                                      {quote.cancellation_policy.penalty_type === 'PERCENTAGE' ? 
                                        `${quote.cancellation_policy.penalty_amount}% Charge` : 
                                        quote.cancellation_policy.penalty_type === 'FIXED' ?
                                        `€${quote.cancellation_policy.penalty_amount} Fee` :
                                        quote.cancellation_policy.penalty_type === 'FIRST_NIGHT' ?
                                        'First Night Charge' :
                                        quote.cancellation_policy.penalty_type === 'FULL_STAY' ?
                                        'Full Stay Charge' :
                                        'Penalty Applies'
                                      }
                                    </small>
                                    <small className="text-muted">After cancellation deadline</small>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <hr className="my-3" />
                        
                        <div className="d-flex align-items-center">
                          <i className="bi bi-info-circle text-primary me-2"></i>
                          <small className="text-muted">
                            <strong>Important:</strong> Cancellation must be made through your booking confirmation email or by contacting the hotel directly.
                          </small>
                        </div>
                      </div>
                    ) : quote?.cancellation_policy_text ? (
                      <div className="bg-white p-4 rounded-3 border">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-shield-exclamation text-primary me-2 mt-1"></i>
                          <div>
                            <h6 className="fw-bold text-dark mb-2">Cancellation Terms</h6>
                            <p className="mb-0 text-dark">{quote.cancellation_policy_text}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-3 border border-warning">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-exclamation-triangle text-warning me-2 mt-1"></i>
                          <div>
                            <h6 className="fw-bold text-warning mb-2">Policy Information Unavailable</h6>
                            <p className="mb-2 text-muted">
                              We're unable to display the cancellation policy at this time.
                            </p>
                            <p className="mb-0 text-muted">
                              Please contact the hotel directly for detailed cancellation terms and conditions.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="mb-0">
                      By proceeding with this booking, you acknowledge that you have read and agree to these terms.
                    </p>
                  </div>
                  
                  <Form.Check
                    type="checkbox"
                    id="policy-agreement"
                    checked={policyAgreed}
                    onChange={(e) => setPolicyAgreed(e.target.checked)}
                    label={
                      <span className="small">
                        I have read and agree to the <strong>cancellation policy</strong> and <strong>terms of service</strong> for this booking.
                      </span>
                    }
                    className="mb-0"
                    required
                  />
                </div>

                <Form onSubmit={processPayment}>
                  {!policyAgreed && (
                    <Alert variant="warning" className="mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Please read and agree to the cancellation policy above to proceed with payment.
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg" 
                    className="w-100"
                    disabled={loading || !policyAgreed || (bookingHold && (isExpired || timerExpired))}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Redirecting to Stripe...
                      </>
                    ) : (bookingHold && (isExpired || timerExpired)) ? (
                      <>
                        <i className="bi bi-x-circle me-2"></i>
                        Reservation Expired
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

      {/* Booking Expired Modal */}
      <BookingExpiredModal 
        open={expiredHandler.isModalOpen}
        onRestart={expiredHandler.restart}
        message="Your room reservation has expired. The selected room is no longer reserved for you."
      />


      </Container>
    </div>
  );
};

export default GuestRoomBookingPage;
