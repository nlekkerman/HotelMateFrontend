import React from 'react';
import { Form, Button, Badge, Row, Col } from 'react-bootstrap';

/**
 * PartyDetailsSection - Manages primary guest + companions
 * Separate domain from extras - NOT registry-driven
 */
const PartyDetailsSection = ({
  primary,
  companions,
  onPrimaryChange,
  onCompanionsChange,
  maxCompanions,
  missingCount,
  errors = {},
  hotel = null
}) => {
  const handlePrimaryFieldChange = (field, value) => {
    onPrimaryChange({ ...primary, [field]: value });
  };

  const handleCompanionFieldChange = (index, field, value) => {
    const newCompanions = [...companions];
    newCompanions[index] = { ...newCompanions[index], [field]: value };
    onCompanionsChange(newCompanions);
  };

  const addCompanion = () => {
    if (companions.length < maxCompanions) {
      const newCompanion = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_staying: true
      };
      onCompanionsChange([...companions, newCompanion]);
    }
  };

  const removeCompanion = (index) => {
    const newCompanions = companions.filter((_, i) => i !== index);
    onCompanionsChange(newCompanions);
  };

  const primaryErrors = errors.primary || {};
  const companionErrors = errors.companions || [];

  return (
    <div>
      {/* Missing guest indicator */}
      {missingCount > 0 && (
        <Badge bg="warning" className="mb-3">
          Missing {missingCount} guest name(s)
        </Badge>
      )}

      {/* Primary Guest Section */}
      <h6 className="mb-3">Primary Guest</h6>
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>
              First Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              value={primary.first_name || ''}
              onChange={(e) => handlePrimaryFieldChange('first_name', e.target.value)}
              isInvalid={!!primaryErrors.first_name}
              required
            />
            {primaryErrors.first_name && (
              <Form.Control.Feedback type="invalid">
                {primaryErrors.first_name}
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
              value={primary.last_name || ''}
              onChange={(e) => handlePrimaryFieldChange('last_name', e.target.value)}
              isInvalid={!!primaryErrors.last_name}
              required
            />
            {primaryErrors.last_name && (
              <Form.Control.Feedback type="invalid">
                {primaryErrors.last_name}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={primary.email || ''}
              onChange={(e) => handlePrimaryFieldChange('email', e.target.value)}
              isInvalid={!!primaryErrors.email}
            />
            {primaryErrors.email && (
              <Form.Control.Feedback type="invalid">
                {primaryErrors.email}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              type="tel"
              value={primary.phone || ''}
              onChange={(e) => handlePrimaryFieldChange('phone', e.target.value)}
              isInvalid={!!primaryErrors.phone}
            />
            {primaryErrors.phone && (
              <Form.Control.Feedback type="invalid">
                {primaryErrors.phone}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
      </Row>

      {/* Companions Section */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Companions</h6>
        {companions.length < maxCompanions && (
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={addCompanion}
            className="d-flex align-items-center"
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Companion
          </Button>
        )}
      </div>

      {companions.length === 0 ? (
        <div className="text-muted text-center py-3 border rounded bg-light">
          <i className="bi bi-people me-2"></i>
          No companions added yet
          {maxCompanions > 0 && (
            <div className="small mt-1">You can add up to {maxCompanions} companion(s)</div>
          )}
        </div>
      ) : (
        companions.map((companion, index) => {
          const companionError = companionErrors[index] || {};
          
          return (
            <div key={index} className="border rounded p-3 mb-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Companion {index + 1}</h6>
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => removeCompanion(index)}
                  className="d-flex align-items-center"
                >
                  <i className="bi bi-trash me-1"></i>
                  Remove
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
                      onChange={(e) => handleCompanionFieldChange(index, 'first_name', e.target.value)}
                      isInvalid={!!companionError.first_name}
                      required
                    />
                    {companionError.first_name && (
                      <Form.Control.Feedback type="invalid">
                        {companionError.first_name}
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
                      onChange={(e) => handleCompanionFieldChange(index, 'last_name', e.target.value)}
                      isInvalid={!!companionError.last_name}
                      required
                    />
                    {companionError.last_name && (
                      <Form.Control.Feedback type="invalid">
                        {companionError.last_name}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-0">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={companion.email || ''}
                      onChange={(e) => handleCompanionFieldChange(index, 'email', e.target.value)}
                      isInvalid={!!companionError.email}
                    />
                    {companionError.email && (
                      <Form.Control.Feedback type="invalid">
                        {companionError.email}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-0">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      value={companion.phone || ''}
                      onChange={(e) => handleCompanionFieldChange(index, 'phone', e.target.value)}
                      isInvalid={!!companionError.phone}
                    />
                    {companionError.phone && (
                      <Form.Control.Feedback type="invalid">
                        {companionError.phone}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </div>
          );
        })
      )}

      {maxCompanions === 0 && (
        <div className="text-muted text-center py-3">
          <i className="bi bi-info-circle me-2"></i>
          This reservation is for one guest only
        </div>
      )}
    </div>
  );
};

export default PartyDetailsSection;