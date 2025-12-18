import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';

const PrimaryGuestCard = ({ value, onChange, errors, themeColor }) => {
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
      </Card.Body>
    </Card>
  );
};

export default PrimaryGuestCard;