import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Form, Spinner ,Card} from 'react-bootstrap';
import { publicAPI } from '@/services/api';
import { toast } from 'react-toastify';

import PrecheckinHeader from '@/components/guest/PrecheckinHeader';
import BookingContactCard from '@/components/guest/BookingContactCard';
import PrimaryGuestCard from '@/components/guest/PrimaryGuestCard';
import CompanionsSection from '@/components/guest/CompanionsSection';
import ExtrasSection from '@/components/guest/ExtrasSection';
import SubmitBar from '@/components/guest/SubmitBar';

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
  
  // Pad companion slots to exactly the expected count
  const padCompanionSlots = (companions, expectedCount) => {
    const slots = [...companions];
    
    // Fill up to expectedCount with empty companions
    while (slots.length < expectedCount) {
      slots.push({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_staying: true
      });
    }
    
    // Trim down to expectedCount if too many
    return slots.slice(0, expectedCount);
  };
  
  // Normalize pre-check-in data using booker_type (deterministic approach)
  const normalizePrecheckinData = (data) => {
    const booking = data.booking;
    const party = data.party || {};
    
    // Get primary guest from party structure (always exists per backend contract)
    const primary = party.primary || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      is_staying: true
    };
    
    const expectedGuests = booking.adults + booking.children;
    
    // Pad companions to exactly expectedGuests - 1 (fixed slots)
    const companionSlots = padCompanionSlots(
      party.companions || [],
      Math.max(0, expectedGuests - 1)
    );
    
    // Determine booking contact based on booker_type (no heuristics)
    let bookingContact;
    if (booking.booker_type === 'SELF') {
      // For SELF bookings, booker fields remain empty and primary guest = booker
      bookingContact = {
        name: `${primary.first_name} ${primary.last_name}`,
        email: primary.email,
        phone: primary.phone,
        isPrimary: true,
        badge: 'Booking contact & staying guest'
      };
    } else {
      // For THIRD_PARTY bookings, show booker fields normally
      bookingContact = {
        name: `${booking.booker_first_name || ''} ${booking.booker_last_name || ''}`.trim(),
        email: booking.booker_email || '',
        phone: booking.booker_phone || '',
        isPrimary: false,
        badge: 'Booking contact'
      };
    }
    
    return {
      booking,
      bookingContact,
      primary,
      companionSlots,
      expectedGuests,
      precheckin_field_registry: data.precheckin_field_registry || {},
      precheckin_config: data.precheckin_config || { enabled: {}, required: {} }
    };
  };
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Normalized data from backend
  const [normalizedData, setNormalizedData] = useState(null);
  
  // Form state for party and extras
  const [partyPrimary, setPartyPrimary] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_staying: true
  });
  const [companionSlots, setCompanionSlots] = useState([]);
  const [extrasValues, setExtrasValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({
    party: { primary: {}, companions: [] },
    extras: {}
  });
  
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
        
        // Use new normalize function - trusts booker_type, no heuristics
        const normalized = normalizePrecheckinData(data);
        console.log('Normalized precheckin data:', normalized);
        
        setNormalizedData(normalized);
        setPartyPrimary(normalized.primary);
        setCompanionSlots(normalized.companionSlots);
        
        // Set theme from hotel data
        const hotelData = data.hotel;
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

  // Handle extras field changes
  const handleExtrasChange = (fieldKey, value) => {
    setExtrasValues(prev => ({ ...prev, [fieldKey]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors.extras[fieldKey]) {
      setFieldErrors(prev => ({
        ...prev,
        extras: { ...prev.extras, [fieldKey]: undefined }
      }));
    }
  };

  // Validation for party and extras
  const validateForm = () => {
    if (!normalizedData) return { hasErrors: true };

    const errors = { party: { primary: {}, companions: [] }, extras: {} };
    
    // Party validation: primary first + last required
    if (!partyPrimary.first_name?.trim()) {
      errors.party.primary.first_name = "First name is required";
    }
    if (!partyPrimary.last_name?.trim()) {
      errors.party.primary.last_name = "Last name is required";
    }
    
    // Companions validation: every slot first + last required (fixed slots)
    companionSlots.forEach((companion, index) => {
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
    
    // Extras validation: only enabled fields, enforce required ⊆ enabled
    const { precheckin_field_registry: registry, precheckin_config: config } = normalizedData;
    const enabledFields = Object.entries(registry).filter(([k]) => config.enabled[k] === true);
    
    enabledFields.forEach(([fieldKey, meta]) => {
      if (config.required[fieldKey] && !extrasValues[fieldKey]?.toString().trim()) {
        errors.extras[fieldKey] = `${meta.label} is required`;
      }
    });
    
    const hasErrors = 
      Object.keys(errors.party.primary).length > 0 ||
      errors.party.companions.some(c => Object.keys(c).length > 0) ||
      Object.keys(errors.extras).length > 0;
    
    return { errors, hasErrors };
  };

  // Build unified payload with party + extras
  const buildPayload = () => {
    if (!normalizedData) return {};

    const { precheckin_field_registry: registry, precheckin_config: config } = normalizedData;
    
    // Build extras object from enabled fields only
    const extras = {};
    Object.entries(registry)
      .filter(([k]) => config.enabled[k] === true)
      .forEach(([fieldKey]) => {
        extras[fieldKey] = extrasValues[fieldKey] || '';
      });
    
    const payload = {
      party: {
        primary: partyPrimary,
        companions: companionSlots
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
    
    const { errors, hasErrors } = validateForm();
    
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }
    
    try {
      setSubmitting(true);
      setFieldErrors({ party: { primary: {}, companions: [] }, extras: {} });
      
      const payload = buildPayload();
      console.log('Submitting payload:', payload);
      
      await publicAPI.post(
        `/hotel/${hotelSlug}/precheckin/submit/?token=${encodeURIComponent(token)}`,
        payload
      );
      
      setSuccess(true);
      toast.success('Pre-check-in completed successfully!');
      
    } catch (err) {
      console.error('Failed to submit precheckin:', err);
      
      // Handle field errors from backend
      if (err.response?.status === 400 && err.response?.data?.field_errors) {
        const mappedErrors = err.response.data.field_errors;
        setFieldErrors(mappedErrors);
      }
      
      const errorMessage = err.response?.data?.detail || 'Failed to submit pre-check-in. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get missing count for display
  const getMissingCount = () => {
    if (!normalizedData) return 0;
    
    const filledSlots = companionSlots.filter(c => 
      c.first_name?.trim() && c.last_name?.trim()
    ).length;
    const primaryFilled = partyPrimary.first_name?.trim() && partyPrimary.last_name?.trim() ? 1 : 0;
    const totalFilled = primaryFilled + filledSlots;
    
    return Math.max(0, normalizedData.expectedGuests - totalFilled);
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

  // Ensure we have normalized data before rendering
  if (!normalizedData) {
    return null;
  }

  const { 
    booking, 
    bookingContact, 
    expectedGuests, 
    precheckin_field_registry: registry, 
    precheckin_config: config 
  } = normalizedData;

  // Check if no additional details required (no enabled extras)
  const hasEnabledExtras = Object.values(config.enabled || {}).some(enabled => enabled === true);
  
  if (!hasEnabledExtras) {
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
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  const themeColor = getThemeColor();
  const missingCount = getMissingCount();
  const { hasErrors } = validateForm();

  // Main form render using component structure
  return (
    <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            
            <PrecheckinHeader 
              booking={booking}
              expectedGuests={expectedGuests}
              missingCount={missingCount}
            />
            
            <BookingContactCard 
              bookingContact={bookingContact}
            />
            
            <Form onSubmit={handleSubmit}>
              <PrimaryGuestCard
                value={partyPrimary}
                onChange={setPartyPrimary}
                errors={fieldErrors.party.primary}
                themeColor={themeColor}
              />
              
              <CompanionsSection
                slots={companionSlots}
                onChange={setCompanionSlots}
                errors={fieldErrors.party.companions}
                themeColor={themeColor}
              />
              
              <ExtrasSection
                registry={registry}
                enabled={config.enabled || {}}
                required={config.required || {}}
                values={extrasValues}
                onChange={handleExtrasChange}
                errors={fieldErrors.extras}
                themeColor={themeColor}
              />
              
              <SubmitBar
                isValid={!hasErrors}
                submitting={submitting}
                onSubmit={handleSubmit}
                themeColor={themeColor}
              />
            </Form>
            {/* OLD CODE REPLACED - REMOVE EVERYTHING BELOW */}
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
              {/* Primary Guest Section */}
              <Card className="shadow-sm mb-4">
                <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
                  <h5 className="mb-1">Primary Guest</h5>
                  <small className="text-muted">Main guest information</small>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          First Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={partyPrimary.first_name || ''}
                          onChange={(e) => setPartyPrimary(prev => ({ ...prev, first_name: e.target.value }))}
                          isInvalid={!!fieldErrors.party?.primary?.first_name}
                          required
                        />
                        {fieldErrors.party?.primary?.first_name && (
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.party?.primary?.first_name}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Last Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={partyPrimary.last_name || ''}
                          onChange={(e) => setPartyPrimary(prev => ({ ...prev, last_name: e.target.value }))}
                          isInvalid={!!fieldErrors.party?.primary?.last_name}
                          required
                        />
                        {fieldErrors.party?.primary?.last_name && (
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.party?.primary?.last_name}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={partyPrimary.email || ''}
                          onChange={(e) => setPartyPrimary(prev => ({ ...prev, email: e.target.value }))}
                          isInvalid={!!fieldErrors.party?.primary?.email}
                        />
                        {fieldErrors.party?.primary?.email && (
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.party?.primary?.email}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="tel"
                          value={partyPrimary.phone || ''}
                          onChange={(e) => setPartyPrimary(prev => ({ ...prev, phone: e.target.value }))}
                          isInvalid={!!fieldErrors.party?.primary?.phone}
                        />
                        {fieldErrors.party?.primary?.phone && (
                          <Form.Control.Feedback type="invalid">
                            {fieldErrors.party?.primary?.phone}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Companions Section - Only if multiple guests */}
              {maxCompanions > 0 && (
                <Card className="shadow-sm mb-4">
                  <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
                    <h5 className="mb-1">Companions</h5>
                    <small className="text-muted">Additional guests for your stay</small>
                  </Card.Header>
                  <Card.Body>
                    {missingCount > 0 && (
                      <Badge bg="warning" className="mb-3">
                        Missing {missingCount} guest name(s)
                      </Badge>
                    )}

                    {partyCompanions.length === 0 && maxCompanions === 0 ? (
                      <p className="text-muted text-center py-3">
                        <i className="bi bi-person-check me-2"></i>
                        This reservation is for one guest only
                      </p>
                    ) : (
                      <>
                        {partyCompanions.map((companion, index) => (
                          <div key={index} className="companion-section mb-4 p-3 bg-light rounded">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0">Companion {index + 1}</h6>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                  const newCompanions = partyCompanions.filter((_, i) => i !== index);
                                  setPartyCompanions(newCompanions);
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>
                                    First Name <span className="text-danger">*</span>
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={companion.first_name || ''}
                                    onChange={(e) => {
                                      const newCompanions = [...partyCompanions];
                                      newCompanions[index] = { ...newCompanions[index], first_name: e.target.value };
                                      setPartyCompanions(newCompanions);
                                    }}
                                    isInvalid={!!fieldErrors.party?.companions?.[index]?.first_name}
                                    required
                                  />
                                  {fieldErrors.party?.companions?.[index]?.first_name && (
                                    <Form.Control.Feedback type="invalid">
                                      {fieldErrors.party?.companions?.[index]?.first_name}
                                    </Form.Control.Feedback>
                                  )}
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>
                                    Last Name <span className="text-danger">*</span>
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={companion.last_name || ''}
                                    onChange={(e) => {
                                      const newCompanions = [...partyCompanions];
                                      newCompanions[index] = { ...newCompanions[index], last_name: e.target.value };
                                      setPartyCompanions(newCompanions);
                                    }}
                                    isInvalid={!!fieldErrors.party?.companions?.[index]?.last_name}
                                    required
                                  />
                                  {fieldErrors.party?.companions?.[index]?.last_name && (
                                    <Form.Control.Feedback type="invalid">
                                      {fieldErrors.party?.companions?.[index]?.last_name}
                                    </Form.Control.Feedback>
                                  )}
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Email</Form.Label>
                                  <Form.Control
                                    type="email"
                                    value={companion.email || ''}
                                    onChange={(e) => {
                                      const newCompanions = [...partyCompanions];
                                      newCompanions[index] = { ...newCompanions[index], email: e.target.value };
                                      setPartyCompanions(newCompanions);
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Phone</Form.Label>
                                  <Form.Control
                                    type="tel"
                                    value={companion.phone || ''}
                                    onChange={(e) => {
                                      const newCompanions = [...partyCompanions];
                                      newCompanions[index] = { ...newCompanions[index], phone: e.target.value };
                                      setPartyCompanions(newCompanions);
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                          </div>
                        ))}

                        {partyCompanions.length < maxCompanions && (
                          <div className="text-center">
                            <Button
                              variant="outline-primary"
                              onClick={() => {
                                setPartyCompanions([...partyCompanions, {
                                  first_name: '',
                                  last_name: '',
                                  email: '',
                                  phone: '',
                                  is_staying: true
                                }]);
                              }}
                            >
                              <i className="bi bi-person-plus me-2"></i>
                              Add Companion
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Card.Body>
                </Card>
              )}

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