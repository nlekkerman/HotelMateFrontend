import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';

const PrimaryGuestCard = ({ value, onChange, errors, themeColor, guestFields = {}, onGuestFieldChange }) => {
  // Get enabled guest-scoped fields
  const enabledGuestFields = Object.entries(guestFields.registry || {})
    .filter(([fieldKey, meta]) => 
      guestFields.enabled?.[fieldKey] === true && 
      meta.scope === 'guest'
    )
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

  const renderGuestField = (fieldKey, meta) => {
    const fieldValue = value.precheckin_data?.[fieldKey] || '';
    const isRequired = guestFields.required?.[fieldKey] === true;
    
    switch (meta.type) {
      case 'select':
        return (
          <Form.Select
            value={fieldValue}
            onChange={(e) => onGuestFieldChange?.(fieldKey, e.target.value)}
            isInvalid={!!errors?.[fieldKey]}
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
            onChange={(e) => onGuestFieldChange?.(fieldKey, e.target.value)}
            isInvalid={!!errors?.[fieldKey]}
            required={isRequired}
          />
        );
      default: // text
        return (
          <Form.Control
            type="text"
            value={fieldValue}
            onChange={(e) => onGuestFieldChange?.(fieldKey, e.target.value)}
            isInvalid={!!errors?.[fieldKey]}
            required={isRequired}
          />
        );
    }
  };
  return (
    <Card className="shadow-sm mb-4">
      <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h5 className="mb-1">Primary Guest</h5>
        <small className="text-muted">Main staying guest information</small>
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
                value={value.first_name || ''}
                onChange={(e) => onChange(prev => ({ ...prev, first_name: e.target.value }))}
                isInvalid={!!errors?.first_name}
                required
              />
              {errors?.first_name && (
                <Form.Control.Feedback type="invalid">
                  {errors.first_name}
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
                value={value.last_name || ''}
                onChange={(e) => onChange(prev => ({ ...prev, last_name: e.target.value }))}
                isInvalid={!!errors?.last_name}
                required
              />
              {errors?.last_name && (
                <Form.Control.Feedback type="invalid">
                  {errors.last_name}
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
                value={value.email || ''}
                onChange={(e) => onChange(prev => ({ ...prev, email: e.target.value }))}
                isInvalid={!!errors?.email}
              />
              {errors?.email && (
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                value={value.phone || ''}
                onChange={(e) => onChange(prev => ({ ...prev, phone: e.target.value }))}
                isInvalid={!!errors?.phone}
              />
              {errors?.phone && (
                <Form.Control.Feedback type="invalid">
                  {errors.phone}
                </Form.Control.Feedback>
              )}
            </Form.Group>
          </Col>
        </Row>
        
        {/* Guest-scoped precheckin fields */}
        {enabledGuestFields.length > 0 && (
          <>
            <hr className="my-4" />
            <h6 className="mb-3 text-muted">Personal Information</h6>
            {enabledGuestFields.map(([fieldKey, meta]) => (
              <Row key={fieldKey}>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      {meta.label}
                      {guestFields.required?.[fieldKey] && <span className="text-danger"> *</span>}
                    </Form.Label>
                    {meta.description && (
                      <div className="form-text mb-2">{meta.description}</div>
                    )}
                    {renderGuestField(fieldKey, meta)}
                    {errors?.[fieldKey] && (
                      <Form.Control.Feedback type="invalid" className="d-block">
                        {errors[fieldKey]}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            ))}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default PrimaryGuestCard;