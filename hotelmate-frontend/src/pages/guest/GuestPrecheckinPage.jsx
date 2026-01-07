import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Form, Card, Spinner } from 'react-bootstrap';
import { publicAPI } from '@/services/api';
import { toast } from 'react-toastify';

import PrecheckinHeader from '@/components/guest/PrecheckinHeader';
import BookingContactCard from '@/components/guest/BookingContactCard';
import PrimaryGuestCard from '@/components/guest/PrimaryGuestCard';
import CompanionsSection from '@/components/guest/CompanionsSection';
import ExtrasSection from '@/components/guest/ExtrasSection';
import SubmitBar from '@/components/guest/SubmitBar';

/**
 * GuestPrecheckinPage - Refactored with component structure
 * Uses deterministic booker_type logic, no heuristics
 * Fixed companion slots, party + extras validation
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
    // Ensure companions is an array
    const companionsArray = Array.isArray(companions) ? companions : [];
    const slots = [...companionsArray].map(companion => ({
      ...companion,
      // Merge existing precheckin_payload data for each companion
      ...(companion.precheckin_payload || {}),
      // Ensure basic fields exist
      first_name: companion.first_name || '',
      last_name: companion.last_name || '',
      email: companion.email || '',
      phone: companion.phone || '',
      is_staying: companion.is_staying !== undefined ? companion.is_staying : true
    }));
    
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
    
    // Get primary guest from party structure and merge with existing precheckin data
    const primaryBase = party.primary || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      is_staying: true
    };
    
    // Merge existing precheckin payload data (guest-scoped fields like nationality)
    const primary = {
      ...primaryBase,
      ...(primaryBase.precheckin_payload || {}) // Flatten precheckin_payload into primary object for form
    };
    
    console.log('🔄 Primary guest merge - Base:', primaryBase);
    console.log('🔄 Primary guest merge - Payload:', primaryBase.precheckin_payload);
    console.log('🔄 Primary guest merge - Final:', primary);
    
    // CANONICAL: Use booking.expected_guests directly from public precheckin API
    const expectedGuests = booking.expected_guests || 0;
    console.log('🎯 Guest precheckin - Expected guests from backend:', expectedGuests);
    console.log('📊 Party data - Total recorded:', data.party?.total_count, 'Missing:', data.party_missing_count);
    
    // Validate we have expected_guests data
    if (expectedGuests === 0) {
      console.warn('⚠️ No expected_guests data. Backend precheckin API must include booking.expected_guests.');
    }
    

    
    // Companion slots = expectedGuests - 1 (primary takes one slot)
    const maxCompanions = Math.max(0, expectedGuests - 1);
    const companionSlots = padCompanionSlots(
      party.companions || [],
      maxCompanions
    );
    
    console.log('👥 Companion slots calculation:');
    console.log('  • Expected guests:', expectedGuests);
    console.log('  • Max companions (expected - 1):', maxCompanions);
    console.log('  • Current companions from backend:', party.companions?.length || 0);
    console.log('  • Missing companions needed:', Math.max(0, maxCompanions - (party.companions?.length || 0)));
    
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
    
    // Final comparison logging  
    const recordedGuests = party?.total_count || 0;
    const partyMissingCount = data.party_missing_count || 0;
    console.log('📊 EXPECTED vs RECORDED COMPARISON:');
    console.log('  • Expected: booking.expected_guests =', expectedGuests);
    console.log('  • Recorded: party.total_count =', recordedGuests);
    console.log('  • Missing: party_missing_count =', partyMissingCount);
    console.log('  • Max companion slots available:', maxCompanions);
    console.log('  • Actual companion slots created:', companionSlots.length);

    return {
      booking,
      bookingContact,
      primary,
      companionSlots,
      expectedGuests,
      maxCompanions, // Include for debugging
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
        console.log('🏗️ Field registry (old format):', data.precheckin_field_registry);
        console.log('🏗️ Precheckin fields (new format):', data.precheckin_fields);
        console.log('📋 Config enabled:', data.precheckin_config?.enabled);
        console.log('📋 Config required:', data.precheckin_config?.required);
        
        // Detailed field configurations
        if (data.precheckin_field_registry) {
          console.log('🔍 ETA field config:', data.precheckin_field_registry.eta);
          console.log('🔍 Nationality field config:', data.precheckin_field_registry.nationality);
          console.log('🔍 Consent checkbox config:', data.precheckin_field_registry.consent_checkbox);
          console.log('🔍 Special requests config:', data.precheckin_field_registry.special_requests);
          
          // Show nationality choices
          if (data.precheckin_field_registry.nationality?.choices) {
            console.log('🌍 Available nationality choices:', data.precheckin_field_registry.nationality.choices);
          }
        }
        
        // Use new normalize function - trusts booker_type, no heuristics
        const normalized = normalizePrecheckinData(data);
        
        setNormalizedData(normalized);
        setPartyPrimary(normalized.primary);
        setCompanionSlots(normalized.companionSlots);
        
        // Initialize extras with existing data from booking.extras
        if (data.booking?.extras) {
          console.log('🎯 Initializing extras with existing data:', data.booking.extras);
          setExtrasValues(data.booking.extras);
        }
        
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

  // Handle guest-scoped field changes for primary guest
  const handlePrimaryGuestFieldChange = (fieldKey, value) => {
    setPartyPrimary(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Handle guest-scoped field changes for companions
  const handleCompanionGuestFieldChange = (companionIndex, fieldKey, value) => {
    setCompanionSlots(prev => {
      const newSlots = [...prev];
      newSlots[companionIndex] = {
        ...newSlots[companionIndex],
        [fieldKey]: value
      };
      return newSlots;
    });
  };

  // Validation for party and extras
  const validateForm = () => {
    if (!normalizedData) return { hasErrors: true };

    const errors = { party: { primary: {}, companions: [] }, extras: {} };
    const { precheckin_field_registry: registry, precheckin_config: config } = normalizedData;
    
    // Party validation: primary first + last required
    if (!partyPrimary.first_name?.trim()) {
      errors.party.primary.first_name = "First name is required";
    }
    if (!partyPrimary.last_name?.trim()) {
      errors.party.primary.last_name = "Last name is required";
    }
    
    // Primary guest-scoped field validation
    Object.entries(registry)
      .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && meta.scope === 'guest' && config.required[fieldKey] === true)
      .forEach(([fieldKey, meta]) => {
        if (!partyPrimary[fieldKey]?.toString().trim()) {
          errors.party.primary[fieldKey] = `${meta.label} is required`;
        }
      });
    
    // Companions validation: every slot first + last required (fixed slots)
    companionSlots.forEach((companion, index) => {
      const companionErrors = {};
      if (!companion.first_name?.trim()) {
        companionErrors.first_name = "First name is required";
      }
      if (!companion.last_name?.trim()) {
        companionErrors.last_name = "Last name is required";
      }
      
      // Companion guest-scoped field validation
      Object.entries(registry)
        .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && meta.scope === 'guest' && config.required[fieldKey] === true)
        .forEach(([fieldKey, meta]) => {
          if (!companion[fieldKey]?.toString().trim()) {
            companionErrors[fieldKey] = `${meta.label} is required`;
          }
        });
      
      if (Object.keys(companionErrors).length > 0) {
        errors.party.companions[index] = companionErrors;
      }
    });
    
    // Extras validation: only booking-scoped enabled fields, enforce required ⊆ enabled
    Object.entries(registry)
      .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && (meta.scope || 'booking') === 'booking')
      .forEach(([fieldKey, meta]) => {
        if (config.required[fieldKey] && !extrasValues[fieldKey]?.toString().trim()) {
          errors.extras[fieldKey] = `${meta.label} is required`;
        }
      });
    
    const hasErrors = 
      Object.keys(errors.party.primary).length > 0 ||
      errors.party.companions.some(c => Object.keys(c || {}).length > 0) ||
      Object.keys(errors.extras).length > 0;
    
    return { errors, hasErrors };
  };

  // Build payload matching backend expected format
  const buildPayload = () => {
    if (!normalizedData) return {};

    const { precheckin_field_registry: registry, precheckin_config: config } = normalizedData;
    
    // Helper to add guest-scoped fields directly to guest object (not nested in precheckin_payload)
    const addGuestScopedFields = (guestObject, guestData) => {
      Object.entries(registry)
        .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && meta.scope === 'guest')
        .forEach(([fieldKey]) => {
          if (guestData[fieldKey] !== undefined && guestData[fieldKey] !== '') {
            guestObject[fieldKey] = guestData[fieldKey]; // Direct assignment, not nested
          }
        });
      
      // Ensure all possible guest-scoped fields are handled
      const guestScopedFields = [
        'nationality', 'country_of_residence', 'date_of_birth', 
        'id_document_type', 'id_document_number', 'address_line_1', 
        'city', 'postcode', 'postal_code'
      ];
      
      guestScopedFields.forEach(fieldKey => {
        if (guestData[fieldKey] !== undefined && guestData[fieldKey] !== '') {
          guestObject[fieldKey] = guestData[fieldKey];
        }
      });
    };
    
    // Start with the basic party structure
    const payload = {
      party: {
        primary: {
          first_name: partyPrimary.first_name,
          last_name: partyPrimary.last_name,
          email: partyPrimary.email,
          phone: partyPrimary.phone,
          is_staying: partyPrimary.is_staying !== false
        },
        companions: companionSlots
          .filter(companion => companion.first_name?.trim() && companion.last_name?.trim())
          .map(companion => {
            const companionObj = {
              first_name: companion.first_name,
              last_name: companion.last_name,
              email: companion.email,
              phone: companion.phone,
              is_staying: companion.is_staying !== false
            };
            // Add guest-scoped fields directly to companion object
            addGuestScopedFields(companionObj, companion);
            return companionObj;
          })
      }
    };
    
    // Add guest-scoped fields directly to primary guest object
    addGuestScopedFields(payload.party.primary, partyPrimary);
    
    // Add booking-scoped fields directly to root level (not in extras object)
    Object.entries(registry)
      .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && (meta.scope || 'booking') === 'booking')
      .forEach(([fieldKey]) => {
        const value = extrasValues[fieldKey] || '';
        if (value !== undefined && value !== '') {
          // All booking-scoped fields go to root level
          if (fieldKey === 'consent_checkbox') {
            payload[fieldKey] = value === true || value === 'true';
          } else {
            payload[fieldKey] = value; // Direct to root, not nested in extras
          }
        }
      });
    
    console.log('🔍 Built payload (backend format):', JSON.stringify(payload, null, 2));
    
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
      // Add token to payload instead of query parameter
      payload.token = token;
      console.log('🚀 Submitting payload:', JSON.stringify(payload, null, 2));
      
      await publicAPI.post(
        `/precheckin/${hotelSlug}/submit/`,
        payload
      );
      
      setSuccess(true);
      toast.success('Pre-check-in completed successfully!');
      
    } catch (err) {
      console.error('❌ Precheckin submission failed:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      // Handle field errors from backend
      if (err.response?.status === 400 && err.response?.data?.field_errors) {
        console.log('🔍 Backend field errors:', err.response.data.field_errors);
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
                guestFields={{
                  registry: registry,
                  enabled: config.enabled || {},
                  required: config.required || {}
                }}
                onGuestFieldChange={handlePrimaryGuestFieldChange}
              />
              
              <CompanionsSection
                slots={companionSlots}
                onChange={setCompanionSlots}
                errors={fieldErrors.party.companions}
                themeColor={themeColor}
                guestFields={{
                  registry: registry,
                  enabled: config.enabled || {},
                  required: config.required || {}
                }}
                onGuestFieldChange={handleCompanionGuestFieldChange}
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
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default GuestPrecheckinPage;