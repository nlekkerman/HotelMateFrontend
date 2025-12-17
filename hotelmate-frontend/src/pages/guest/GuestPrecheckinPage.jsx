import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { publicAPI } from '@/services/api';
import { toast } from 'react-toastify';

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
  
  // Form state
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  
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
        
        // Extract configuration
        const {
          precheckin_config = {},
          precheckin_field_registry = {},
          booking: bookingData = null,
          party: partyData = null,
          hotel: hotelData = null
        } = data;
        
        setRegistry(precheckin_field_registry);
        setEnabled(precheckin_config.enabled || {});
        setRequired(precheckin_config.required || {});
        setBooking(bookingData);
        setParty(partyData);
        
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

  // Validate required fields
  const validateForm = () => {
    const errors = {};
    const activeFields = getActiveFields();
    
    activeFields.forEach(([fieldKey, meta]) => {
      if (required[fieldKey] === true && !values[fieldKey]?.trim()) {
        errors[fieldKey] = `${meta.label} is required`;
      }
    });
    
    return errors;
  };

  // Build payload from active fields only
  const buildPayload = () => {
    const payload = {};
    const activeFields = getActiveFields();
    
    activeFields.forEach(([fieldKey]) => {
      payload[fieldKey] = values[fieldKey] || '';
    });
    
    return payload;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
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
      
      // Map backend 400 field errors to inline errors
      if (err.response?.status === 400 && err.response?.data?.field_errors) {
        setFieldErrors(err.response.data.field_errors);
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

  // Main form render
  return (
    <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-sm">
              <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
                <h5 className="mb-1">Pre-Check-In Details</h5>
                <small className="text-muted">Please complete the required information</small>
              </Card.Header>
              
              <Form onSubmit={handleSubmit}>
                <Card.Body>
                  {/* Render dynamic fields from registry */}
                  {activeFields.map(([fieldKey, meta]) => (
                    <Form.Group key={fieldKey} className="mb-3">
                      <Form.Label>
                        {meta.label}
                        {required[fieldKey] === true && (
                          <span className="text-danger ms-1">*</span>
                        )}
                      </Form.Label>
                      
                      {meta.description && (
                        <div className="text-muted small mb-2">{meta.description}</div>
                      )}
                      
                      {renderField(fieldKey, meta)}
                      
                      {fieldErrors[fieldKey] && (
                        <Form.Control.Feedback type="invalid" className="d-block">
                          {fieldErrors[fieldKey]}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  ))}
                </Card.Body>
                
                <Card.Footer className="d-flex justify-content-between">
                  <Button variant="outline-secondary" disabled={submitting}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={submitting}
                    style={{ backgroundColor: themeColor, borderColor: themeColor }}
                  >
                    {submitting && <Spinner animation="border" size="sm" className="me-2" />}
                    Submit
                  </Button>
                </Card.Footer>
              </Form>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default GuestPrecheckinPage;