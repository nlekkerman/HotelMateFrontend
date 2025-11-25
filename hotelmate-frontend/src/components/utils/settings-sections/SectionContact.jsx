import React from "react";
import { Card, Form, Row, Col } from "react-bootstrap";

export default function SectionContact({ formData, onChange }) {
  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-telephone me-2"></i>
          Contact Information
        </h4>
        <p className="text-muted mb-3">
          How guests can reach your hotel
        </p>
        
        <hr className="my-3" />
        
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="contact@hotel.com"
                  value={formData.contact_email || ''}
                  onChange={(e) => onChange('contact_email', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.contact_phone || ''}
                  onChange={(e) => onChange('contact_phone', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Physical Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="123 Main Street, City, State, ZIP, Country"
              value={formData.contact_address || ''}
              onChange={(e) => onChange('contact_address', e.target.value)}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Website</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://www.yourhotel.com"
                  value={formData.website || ''}
                  onChange={(e) => onChange('website', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label className="fw-bold">Google Maps Embed Link</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={formData.google_maps_link || ''}
                  onChange={(e) => onChange('google_maps_link', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Embed link for showing your location
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}
