import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { publicAPI } from '@/services/api';
import { toast } from 'react-toastify';
import PartyDetailsSection from '@/components/guest/PartyDetailsSection';

/**
 * GuestPrecheckinPage - Fetch-first, config-driven precheckin form
 * Never hardcode field keys - render from precheckin_field_registry only
 * Enforce Required ⊆ Enabled constraint in UI + payload
 */
const GuestPrecheckinPage = () => {
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;
  
  // TODO: Remove once backend unified serializer is deployed
  const SEND_EXTRAS_FLAT = true;
  
  // Normalize party data from backend RoomBookingDetailSerializer structure
  const normalizePartyData = (responseData) => {
    // Primary guest data is directly in the booking details
    const primary = {
      first_name: responseData.booker_first_name || '',
      last_name: responseData.booker_last_name || '',
      email: responseData.booker_email || responseData.primary_email || '',
      phone: responseData.booker_phone || responseData.primary_phone || '',
      is_staying: true
    };
    
    // Extract companions from party structure
    const companions = responseData.party?.companions || [];
    
    return { primary, companions };
  };
  
  // Compute missing guest count - prefer backend calculation
  const computeMissingCount = (responseData, adults, partyCount) => {
    // Use backend party_missing_count if available (more authoritative)
    if (typeof responseData.party_missing_count === 'number') {
      return responseData.party_missing_count;
    }
    
    // Fallback to frontend calculation
    return Math.max(0, adults - partyCount);
  };
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Configuration from backend
  const [registry, setRegistry] = useState({});
  const [enabled, setEnabled] = useState({});
  const [required, setRequired] = useState({});
  const [booking, setBooking] = useState(null);
  const [party, setParty] = useState(null);
  
  // Form state (extras)
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Party state (separate domain from extras)
  const [partyPrimary, setPartyPrimary] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_staying: true
  });
  const [partyCompanions, setPartyCompanions] = useState([]);
  const [missingCount, setMissingCount] = useState(0);
  
  // Hotel theming
  const [preset, setPreset] = useState(1);
  
  // Theme color resolution
  const getThemeColor = () => {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--main-color').trim();
    if (cssVar) return cssVar;
    return '#0d6efd'; // Bootstrap primary fallback
  };

  // Fetch precheckin configuration on mount
  useEffect(() => {
    const loadPrecheckinData = async () => {
      if (!token) {
        setError('Missing precheckin token. Please use the link provided in your email.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await publicAPI.get(
          `/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`
        );
        
        const data = unwrap(response);
        console.log('Precheckin API response data:', data);
        
        // Extract configuration
        const {
          precheckin_config = {},
          precheckin_field_registry = {},
          booking: bookingData = null,
          party: partyData = null,
          hotel: hotelData = null
        } = data;
        
        console.log('Extracted booking data:', bookingData);
        console.log('Extracted party data:', partyData);
        
        setRegistry(precheckin_field_registry);
        setEnabled(precheckin_config.enabled || {});
        setRequired(precheckin_config.required || {});
        
        // Handle booking data from RoomBookingDetailSerializer
        const normalizedBooking = bookingData || {
          id: data.id,
          booking_id: data.booking_id,
          adults: data.adults || 1,
          children: data.children || 0,
          check_in: data.check_in,
          check_out: data.check_out,
          room_type: data.room_type_name,
          hotel_preset: data.hotel_preset || 1,
          // Include guest data fields for normalization fallback
          booker_first_name: data.booker_first_name || '',
          booker_last_name: data.booker_last_name || '',
          booker_email: data.booker_email || '',
          booker_phone: data.booker_phone || '',
          primary_email: data.primary_email || '',
          primary_phone: data.primary_phone || '',
          guest_first_name: data.guest_first_name || '',
          guest_last_name: data.guest_last_name || '',
          guest_email: data.guest_email || '',
          guest_phone: data.guest_phone || ''
        };
        
        setBooking(normalizedBooking);
        setParty(partyData || data.party);
        
        // Set theme from booking data
        if (normalizedBooking.hotel_preset) {
          setPreset(normalizedBooking.hotel_preset);
        } else if (hotelData) {
          const hotelPreset = hotelData.preset || hotelData.public_settings?.preset || hotelData.global_style_variant || 1;
          setPreset(hotelPreset);
        }
        
        // Normalize and set party data - pass normalized booking for fallbacks
        const dataWithBooking = { ...data, booking: normalizedBooking };
        const normalizedParty = normalizePartyData(dataWithBooking);
        console.log('Normalized party data:', normalizedParty);
        console.log('Setting primary:', normalizedParty.primary);
        console.log('Setting companions:', normalizedParty.companions);
        setPartyPrimary(normalizedParty.primary);
        setPartyCompanions(normalizedParty.companions);
        
        // Compute missing guest count using backend data
        const adults = normalizedBooking.adults || 1;
        const partyCount = 1 + (normalizedParty.companions ? normalizedParty.companions.length : 0);
        setMissingCount(computeMissingCount(data, adults, partyCount));
        
        // Set theme from hotel data
        if (hotelData) {
          const hotelPreset = hotelData.preset || hotelData.public_settings?.preset || hotelData.global_style_variant || 1;
          setPreset(hotelPreset);
        }
        
      } catch (err) {
        console.error('Failed to load precheckin data:', err);
        if (err.response?.status === 401) {
          setError('Invalid or expired precheckin link. Please contact the hotel for a new link.');
        } else {
          setError('Failed to load precheckin information. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (hotelSlug) {
      loadPrecheckinData();
    }
  }, [hotelSlug, token]);

  // Calculate active fields and sort them for stable render order
  const getActiveFields = () => {
    const activeFields = Object.entries(registry).filter(([k]) => enabled[k] === true);
    
    // Stable render order: sort by order if available, else by label
    activeFields.sort((a, b) => {
      const [keyA, metaA] = a;
      const [keyB, metaB] = b;
      
      // If registry meta has order, sort by it
      if (metaA.order && metaB.order) {
        return metaA.order - metaB.order;
      }
      
      // Else sort by label
      return (metaA.label || keyA).localeCompare(metaB.label || keyB);
    });
    
    return activeFields;
  };

  // Handle field value changes
  const handleFieldChange = (fieldKey, value) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Unified validation for both party and extras domains
  const validateForm = () => {
    const errors = { party: { primary: {}, companions: [] }, extras: {} };
    
    // Party validation
    if (!partyPrimary.first_name?.trim()) {
      errors.party.primary.first_name = "First name is required";
    }
    if (!partyPrimary.last_name?.trim()) {
      errors.party.primary.last_name = "Last name is required";
    }
    
    // Companions validation
    partyCompanions.forEach((companion, index) => {
      const companionErrors = {};
      if (!companion.first_name?.trim()) {
        companionErrors.first_name = "First name is required";
      }
      if (!companion.last_name?.trim()) {
        companionErrors.last_name = "Last name is required";
      }
      if (Object.keys(companionErrors).length > 0) {
        errors.party.companions[index] = companionErrors;
      }
    });
    
    // Extras validation (use existing registry-based logic)
    const activeFields = getActiveFields();
    activeFields.forEach(([fieldKey, meta]) => {
      if (required[fieldKey] && !values[fieldKey]?.trim()) {
        errors.extras[fieldKey] = `${meta.label} is required`;
      }
    });
    
    return errors;
  };

  // Build unified payload with party + extras
  const buildPayload = () => {
    const activeFields = getActiveFields();
    
    // Build extras object from active fields only
    const extras = {};
    activeFields.forEach(([fieldKey]) => {
      extras[fieldKey] = values[fieldKey] || '';
    });
    
    const payload = {
      party: {
        primary: partyPrimary,
        companions: partyCompanions
      },
      extras: extras
    };
    
    // Compatibility: also send extras flattened at root (temporary)
    if (SEND_EXTRAS_FLAT) {
      Object.keys(extras).forEach(key => {
        payload[key] = extras[key];
      });
    }
    
    return payload;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate both domains
    const errors = validateForm();
    const hasErrors = Object.keys(errors.party.primary).length > 0 ||
                      errors.party.companions.some(c => Object.keys(c).length > 0) ||
                      Object.keys(errors.extras).length > 0;
    
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }
    
    try {
      setSubmitting(true);
      setFieldErrors({});
      
      const payload = buildPayload();
      
      await publicAPI.post(
        `/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`,
        payload
      );
      
      setSuccess(true);
      toast.success('Pre-check-in completed successfully!');
      
    } catch (err) {
      console.error('Failed to submit precheckin:', err);
      
      // Handle field errors from backend
      if (err.response?.status === 400 && err.response?.data?.field_errors) {
        // Map backend errors to our structure if needed
        const mappedErrors = err.response.data.field_errors;
        setFieldErrors(mappedErrors);
      }
      
      const errorMessage = err.response?.data?.detail || 'Failed to submit pre-check-in. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (fieldKey, meta) => {
    const isRequired = required[fieldKey] === true;
    const hasError = !!fieldErrors[fieldKey];
    
    switch (meta.type) {
      case 'checkbox':
        return (
          <Form.Check
            type="checkbox"
            checked={values[fieldKey] === 'true' || values[fieldKey] === true || values[fieldKey] === '1'}
            onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
            isInvalid={hasError}
            label={
              <>
                {meta.label}
                {isRequired && <span className="text-danger ms-1">*</span>}
              </>
            }
            required={isRequired}
          />
        );
      case 'select':
        return (
          <Form.Select
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          >
            <option value="">Select...</option>
            {meta.options && meta.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        );
      case 'time':
        return (
          <Form.Control
            type="time"
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          />
        );
      case 'email':
        return ( 
          <Form.Control
            type="email"
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          />
        );
      case 'tel':
      case 'phone':
        return (
          <Form.Control
            type="tel"
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          />
        );
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          />
        );
      case 'text':
      default:
        return (
          <Form.Control
            type="text"
            value={values[fieldKey] || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            isInvalid={hasError}
            required={isRequired}
          />
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5 text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Loading pre-check-in information...</p>
        </Container>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body className="text-center py-5">
                  <div className="text-danger mb-3">
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h4 className="text-danger mb-3">Unable to Load Pre-Check-In</h4>
                  <p className="text-muted">{error}</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="border-success shadow-sm">
                <Card.Body className="text-center py-5">
                  <div className="text-success mb-3">
                    <i className="bi bi-check-circle" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h2 className="mb-3">Pre-check-in Complete!</h2>
                  <p className="lead text-muted">Your information has been successfully submitted.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  const activeFields = getActiveFields();

  // No additional details required branch
  if (activeFields.length === 0) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="border-success shadow-sm">
                <Card.Body className="text-center py-4">
                  <i className="bi bi-check-circle text-success mb-3" style={{ fontSize: '3rem' }}></i>
                  <h4>No additional details required</h4>
                  <p className="text-muted">Your pre-check-in is already complete.</p>
                  <Button variant="success">Done</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  const themeColor = getThemeColor();
  const maxCompanions = booking ? Math.max(0, (booking.adults || 1) - 1) : 0;

  // Main form render
  return (
    <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            {/* Booking Summary Header */}
            {booking && (
              <Card className="shadow-sm mb-4">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col>
                      <h6 className="mb-1">Booking #{booking.booking_id}</h6>
                      <div className="text-muted small">
                        {booking.check_in && booking.check_out && (
                          <span>{booking.check_in} - {booking.check_out}</span>
                        )}
                        {booking.adults && (
                          <span className="ms-3">{booking.adults} adult(s)</span>
                        )}
                        {booking.children > 0 && (
                          <span>, {booking.children} child(ren)</span>
                        )}
                      </div>
                    </Col>
                    <Col xs="auto">
                      {booking.room_type && (
                        <Badge bg="primary">{booking.room_type}</Badge>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            <Form onSubmit={handleSubmit}>
              {/* Party Details Section */}
              <Card className="shadow-sm mb-4">
                <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
                  <h5 className="mb-1">Party Details</h5>
                  <small className="text-muted">Guest information for your stay</small>
                </Card.Header>
                <Card.Body>
                  <PartyDetailsSection
                    primary={partyPrimary}
                    companions={partyCompanions}
                    onPrimaryChange={setPartyPrimary}
                    onCompanionsChange={setPartyCompanions}
                    maxCompanions={maxCompanions}
                    missingCount={missingCount}
                    errors={fieldErrors.party || {}}
                    hotel={booking}
                  />
                </Card.Body>
              </Card>

              {/* Extra Details Section - Only show if there are active fields */}
              {activeFields.length > 0 && (
                <Card className="shadow-sm mb-4">
                  <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
                    <h5 className="mb-1">Additional Information</h5>
                    <small className="text-muted">Please complete the required information</small>
                  </Card.Header>
                  <Card.Body>
                    {/* Render dynamic fields from registry */}
                    {activeFields.map(([fieldKey, meta]) => (
                      <Form.Group key={fieldKey} className="mb-3">
                        {meta.type !== 'checkbox' && (
                          <Form.Label>
                            {meta.label}
                            {required[fieldKey] === true && (
                              <span className="text-danger ms-1">*</span>
                            )}
                          </Form.Label>
                        )}
                        
                        {meta.description && (
                          <div className="text-muted small mb-2">{meta.description}</div>
                        )}
                        
                        {renderField(fieldKey, meta)}
                        
                        {fieldErrors.extras && fieldErrors.extras[fieldKey] && (
                          <Form.Control.Feedback type="invalid" className="d-block">
                            {fieldErrors.extras[fieldKey]}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    ))}
                  </Card.Body>
                </Card>
              )}

              {/* Single Submit Button */}
              <div className="text-center">
                <Button 
                  variant="primary" 
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  style={{ backgroundColor: themeColor, borderColor: themeColor }}
                  className="px-5"
                >
                  {submitting && <Spinner animation="border" size="sm" className="me-2" />}
                  Complete Pre-Check-in
                </Button>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default GuestPrecheckinPage;