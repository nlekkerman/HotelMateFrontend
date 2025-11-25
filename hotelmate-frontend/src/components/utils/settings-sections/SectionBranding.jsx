import React from "react";
import { Card, Form, Row, Col } from "react-bootstrap";

export default function SectionBranding({ formData, onChange }) {
  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-badge-tm me-2"></i>
          Branding
        </h4>
        <p className="text-muted mb-3">
          Upload your hotel's logo and branding assets
        </p>
        
        <hr className="my-3" />
        
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Logo URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo || ''}
                  onChange={(e) => onChange('logo', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Main logo for your hotel (recommended: transparent PNG)
                </Form.Text>
                {formData.logo && (
                  <div className="mt-3 p-3 bg-light rounded text-center">
                    <img 
                      src={formData.logo} 
                      alt="Logo preview" 
                      style={{ maxHeight: '80px', maxWidth: '100%' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Favicon URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={formData.favicon || ''}
                  onChange={(e) => onChange('favicon', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Small icon shown in browser tabs (16x16 or 32x32px)
                </Form.Text>
                {formData.favicon && (
                  <div className="mt-3 p-3 bg-light rounded text-center">
                    <img 
                      src={formData.favicon} 
                      alt="Favicon preview" 
                      style={{ height: '32px', width: '32px' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-0">
            <Form.Label className="fw-bold">Slogan (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Your comfort is our priority"
              value={formData.slogan || ''}
              onChange={(e) => onChange('slogan', e.target.value)}
              maxLength={100}
            />
            <Form.Text className="text-muted">
              A catchy tagline for your hotel
            </Form.Text>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
}
