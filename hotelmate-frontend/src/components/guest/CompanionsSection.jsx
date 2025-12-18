import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';

const CompanionsSection = ({ slots, onChange, errors, themeColor, guestFields = {}, onGuestFieldChange }) => {
  // Get enabled guest-scoped fields
  const enabledGuestFields = Object.entries(guestFields.registry || {})
    .filter(([fieldKey, meta]) => 
      guestFields.enabled?.[fieldKey] === true && 
      meta.scope === 'guest'
    )
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

  const renderGuestField = (fieldKey, meta, companionIndex) => {
    const fieldValue = slots[companionIndex]?.precheckin_data?.[fieldKey] || '';
    const isRequired = guestFields.required?.[fieldKey] === true;
    
    switch (meta.type) {
      case 'select':
        return (
          <Form.Select
            value={fieldValue}
            onChange={(e) => onGuestFieldChange?.(companionIndex, fieldKey, e.target.value)}
            isInvalid={!!errors?.[companionIndex]?.[fieldKey]}
            required={isRequired}
          >
            <option value="">-- Select --</option>
            {meta.choices?.map((choice, index) => {
              const choiceValue = typeof choice === 'object' ? choice.value : choice;
              const choiceLabel = typeof choice === 'object' ? choice.label : choice;
              
              return (
                <option key={`${choiceValue}-${index}`} value={choiceValue}>
                  {choiceLabel}
                </option>
              );
            })}
          </Form.Select>
        );
      case 'date':
        return (
          <Form.Control
            type="date"
            value={fieldValue}
            onChange={(e) => onGuestFieldChange?.(companionIndex, fieldKey, e.target.value)}
            isInvalid={!!errors?.[companionIndex]?.[fieldKey]}
            required={isRequired}
          />
        );
      default: // text
        return (
          <Form.Control
            type="text"
            value={fieldValue}
            onChange={(e) => onGuestFieldChange?.(companionIndex, fieldKey, e.target.value)}
            isInvalid={!!errors?.[companionIndex]?.[fieldKey]}
            required={isRequired}
          />
        );
    }
  };
  // Don't render if no slots are expected
  if (!slots) {
    return null;
  }
  
  // If slots array exists but is empty, still render with message
  if (slots.length === 0) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
          <h5 className="mb-1">Companions</h5>
          <small className="text-muted">Additional guests for your stay</small>
        </Card.Header>
        <Card.Body>
          <p className="text-muted text-center py-3">
            <i className="bi bi-person-check me-2"></i>
            This reservation is for one guest only
          </p>
        </Card.Body>
      </Card>
    );
  }

  const handleSlotChange = (index, field, value) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    onChange(newSlots);
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h5 className="mb-1">Companions</h5>
        <small className="text-muted">Additional guests for your stay ({slots.length} slot{slots.length !== 1 ? 's' : ''})</small>
      </Card.Header>
      <Card.Body>
        {slots.map((companion, index) => (
          <div key={index} className="companion-slot mb-4 p-3 bg-light rounded">
            <div className="mb-3">
              <h6 className="mb-0">Companion {index + 1}</h6>
              <small className="text-muted">Required information</small>
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
                    onChange={(e) => handleSlotChange(index, 'first_name', e.target.value)}
                    isInvalid={!!errors?.[index]?.first_name}
                    required
                  />
                  {errors?.[index]?.first_name && (
                    <Form.Control.Feedback type="invalid">
                      {errors[index].first_name}
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
                    onChange={(e) => handleSlotChange(index, 'last_name', e.target.value)}
                    isInvalid={!!errors?.[index]?.last_name}
                    required
                  />
                  {errors?.[index]?.last_name && (
                    <Form.Control.Feedback type="invalid">
                      {errors[index].last_name}
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
                    onChange={(e) => handleSlotChange(index, 'email', e.target.value)}
                    isInvalid={!!errors?.[index]?.email}
                  />
                  {errors?.[index]?.email && (
                    <Form.Control.Feedback type="invalid">
                      {errors[index].email}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={companion.phone || ''}
                    onChange={(e) => handleSlotChange(index, 'phone', e.target.value)}
                    isInvalid={!!errors?.[index]?.phone}
                  />
                  {errors?.[index]?.phone && (
                    <Form.Control.Feedback type="invalid">
                      {errors[index].phone}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
            </Row>
            
            {/* Guest-scoped precheckin fields for this companion */}
            {enabledGuestFields.length > 0 && (
              <>
                <hr className="my-3" />
                <h6 className="mb-3 text-muted small">Personal Information</h6>
                {enabledGuestFields.map(([fieldKey, meta]) => (
                  <Row key={fieldKey}>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="small">
                          {meta.label}
                          {guestFields.required?.[fieldKey] && <span className="text-danger"> *</span>}
                        </Form.Label>
                        {meta.description && (
                          <div className="form-text mb-2 small">{meta.description}</div>
                        )}
                        {renderGuestField(fieldKey, meta, index)}
                        {errors?.[index]?.[fieldKey] && (
                          <Form.Control.Feedback type="invalid" className="d-block">
                            {errors[index][fieldKey]}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );
};

export default CompanionsSection;