import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useSurveyData } from '@/hooks/useSurveyData';
import { useSurveyForm } from '@/hooks/useSurveyForm';

/**
 * GuestSurveyPage Component
 * 
 * Mirrors GuestPrecheckinPage.jsx patterns exactly for survey functionality
 * Handles token-based survey access with all states: loading|invalid|expired|completed|ready
 */
const GuestSurveyPage = () => {
  // URL parameters - Mirror pre-check-in pattern
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Data loading hook
  const {
    loading,
    error,
    surveyState,
    surveyConfig,
    fieldRegistry,
    booking,
    preset,
    hotelName,
    checkInDate,
    checkOutDate,
    isReady,
    isCompleted,
    isInvalid,
    isExpired
  } = useSurveyData(hotelSlug, token);

  // Form management hook
  const {
    surveyData,
    fieldErrors,
    submitting,
    success,
    activeFields,
    isValid,
    hasChanges,
    updateField,
    submitForm,
    renderField,
    getFieldValue,
    getFieldError,
    isFieldRequired,
    canSubmit
  } = useSurveyForm({
    surveyConfig,
    fieldRegistry,
    token,
    hotelSlug
  });

  // Render rating field component
  const renderRatingField = (fieldKey, meta, value, onChange, error, required) => {
    return (
      <div className="rating-field">
        <div className="d-flex gap-2 justify-content-center">
          {[1, 2, 3, 4, 5].map(rating => (
            <Form.Check
              key={rating}
              type="radio"
              id={`${fieldKey}-${rating}`}
              name={fieldKey}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              label={
                <span className="rating-label">
                  {rating} <span className="text-warning">★</span>
                </span>
              }
              className="rating-option"
            />
          ))}
        </div>
        {error && (
          <Form.Text className="text-danger">
            {error}
          </Form.Text>
        )}
      </div>
    );
  };

  // Render form field based on type
  const renderFormField = (fieldKey, meta) => {
    const value = getFieldValue(fieldKey);
    const error = getFieldError(fieldKey);
    const required = isFieldRequired(fieldKey);
    const onChange = (newValue) => updateField(fieldKey, newValue);

    const fieldConfig = renderField(fieldKey, meta, value, onChange, error, required);

    return (
      <Form.Group key={fieldKey} className="mb-4">
        <Form.Label className={required ? 'required' : ''}>
          {meta.label || fieldKey}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
        
        {meta.description && (
          <Form.Text className="text-muted d-block mb-2">
            {meta.description}
          </Form.Text>
        )}

        {/* Render based on field type */}
        {fieldConfig.type === 'rating' && renderRatingField(fieldKey, meta, value, onChange, error, required)}
        
        {fieldConfig.type === 'textarea' && (
          <Form.Control
            as="textarea"
            rows={fieldConfig.rows}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            isInvalid={!!error}
            placeholder={`Enter ${meta.label.toLowerCase()}...`}
          />
        )}
        
        {fieldConfig.type === 'checkbox' && (
          <Form.Check
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            label={meta.label}
            isInvalid={!!error}
          />
        )}
        
        {fieldConfig.type === 'select' && (
          <Form.Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            isInvalid={!!error}
          >
            <option value="">Select {meta.label.toLowerCase()}...</option>
            {(meta.choices || []).map(choice => (
              <option key={choice.value || choice} value={choice.value || choice}>
                {choice.label || choice}
              </option>
            ))}
          </Form.Select>
        )}
        
        {fieldConfig.type === 'date' && (
          <Form.Control
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            isInvalid={!!error}
          />
        )}
        
        {(fieldConfig.type === 'text' || !fieldConfig.type) && (
          <Form.Control
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            isInvalid={!!error}
            placeholder={`Enter ${meta.label.toLowerCase()}...`}
          />
        )}

        {error && (
          <Form.Control.Feedback type="invalid">
            {error}
          </Form.Control.Feedback>
        )}
      </Form.Group>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="shadow-sm">
                <Card.Body className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading survey...</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Invalid token state
  if (isInvalid) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="shadow-sm">
                <Card.Body className="text-center py-5">
                  <div className="text-danger mb-3">
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h3 className="mb-3">Invalid Survey Link</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <p className="text-muted">
                    If you believe this is an error, please contact the hotel directly.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Expired token state  
  if (isExpired) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="shadow-sm">
                <Card.Body className="text-center py-5">
                  <div className="text-warning mb-3">
                    <i className="bi bi-clock-history" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h3 className="mb-3">Survey Link Expired</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <p className="text-muted">
                    Please contact the hotel if you still wish to provide feedback.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Already completed state or success after submission
  if (isCompleted || success) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="border-success shadow-sm">
                <Card.Body className="text-center py-5">
                  <div className="text-success mb-3">
                    <i className="bi bi-check-circle" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h2 className="mb-3">Thank you for your feedback.</h2>
                  <p className="lead text-muted">Your response helps us improve our service.</p>
                  {hotelName && (
                    <p className="text-muted mt-4">
                      <strong>{hotelName}</strong>
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Ready state - Render survey form
  if (isReady) {
    return (
      <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              {/* Survey Header */}
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                  <h3 className="mb-0">Guest Survey</h3>
                  {hotelName && <p className="mb-0 opacity-75">{hotelName}</p>}
                </Card.Header>
                <Card.Body>
                  {booking && (
                    <div className="row">
                      {checkInDate && (
                        <div className="col-md-6 mb-2">
                          <small className="text-muted">Check-in:</small>
                          <div>{new Date(checkInDate).toLocaleDateString()}</div>
                        </div>
                      )}
                      {checkOutDate && (
                        <div className="col-md-6 mb-2">
                          <small className="text-muted">Check-out:</small>
                          <div>{new Date(checkOutDate).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mb-0 text-muted">
                    Please share your feedback about your recent stay.
                  </p>
                </Card.Body>
              </Card>

              {/* Survey Form */}
              <Card className="shadow-sm">
                <Card.Body>
                  {activeFields.length === 0 ? (
                    <Alert variant="info">
                      <i className="bi bi-info-circle me-2"></i>
                      No survey questions are currently available.
                    </Alert>
                  ) : (
                    <Form>
                      {activeFields.map(([fieldKey, meta]) => 
                        renderFormField(fieldKey, meta)
                      )}
                      
                      {/* Submit Button */}
                      <div className="d-grid gap-2 mt-4">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={submitForm}
                          disabled={!canSubmit}
                        >
                          {submitting ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Submitting Survey...
                            </>
                          ) : (
                            'Submit Survey'
                          )}
                        </Button>
                      </div>

                      {hasChanges && !isValid && (
                        <div className="text-center mt-3">
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Please fill in all required fields marked with *
                          </small>
                        </div>
                      )}
                    </Form>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Fallback error state
  return (
    <div className={`hotel-public-page page-style-${preset}`} style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="shadow-sm">
              <Card.Body className="text-center py-5">
                <div className="text-danger mb-3">
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
                </div>
                <h3 className="mb-3">Unable to Load Survey</h3>
                <p className="text-muted mb-4">
                  {error || 'Something went wrong. Please try again later.'}
                </p>
                <Button 
                  variant="outline-primary" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default GuestSurveyPage;