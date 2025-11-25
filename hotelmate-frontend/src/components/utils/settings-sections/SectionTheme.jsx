import React from "react";
import { Card, Form, Row, Col, Button } from "react-bootstrap";

export default function SectionTheme({ formData, onChange }) {
  const colorFields = [
    { key: 'primary_color', label: 'Primary' },
    { key: 'secondary_color', label: 'Secondary' },
    { key: 'accent_color', label: 'Accent' },
    { key: 'button_color', label: 'Button' },
    { key: 'button_text_color', label: 'Button Text' },
    { key: 'button_hover_color', label: 'Button Hover' },
    { key: 'text_color', label: 'Text' },
    { key: 'background_color', label: 'Background' },
    { key: 'border_color', label: 'Border' },
    { key: 'link_color', label: 'Link' },
    { key: 'link_hover_color', label: 'Link Hover' },
  ];

  // Default color values
  const getColor = (key) => {
    const defaults = {
      primary_color: '#3498db',
      secondary_color: '#2ecc71',
      accent_color: '#F59E0B',
      button_color: '#004faf',
      button_text_color: '#ffffff',
      button_hover_color: '#0066cc',
      text_color: '#333333',
      background_color: '#ffffff',
      border_color: '#e5e7eb',
      link_color: '#007bff',
      link_hover_color: '#0056b3',
    };
    return formData[key] || defaults[key];
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-palette me-2"></i>
          Theme Settings
        </h4>
        <p className="text-muted mb-3">
          Customize your hotel's color scheme
        </p>
        
        <hr className="my-3" />
        
        <Form>
          <Row className="g-3 mb-4">
            {colorFields.map((field) => (
              <Col xs={6} md={4} lg={3} key={field.key}>
                <div className="d-flex flex-column gap-2">
                  <Form.Label className="fw-bold small mb-0">{field.label}</Form.Label>
                  <div className="d-flex gap-2 align-items-center">
                    <Form.Control
                      type="color"
                      value={getColor(field.key)}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      style={{ width: '50px', height: '40px', padding: '4px' }}
                    />
                    <Form.Control
                      type="text"
                      value={getColor(field.key)}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      size="sm"
                      className="font-monospace"
                    />
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {/* Preview Card */}
          <div className="mt-4">
            <label className="fw-bold mb-2">Preview</label>
            <div 
              className="p-4 rounded border"
              style={{ 
                backgroundColor: getColor('background_color'),
                borderColor: getColor('border_color'),
                color: getColor('text_color')
              }}
            >
              <h5 style={{ color: getColor('primary_color') }}>
                Sample Heading
              </h5>
              <p className="mb-3">
                This is a sample paragraph with{' '}
                <a 
                  href="#"
                  style={{ color: getColor('link_color') }}
                  onMouseEnter={(e) => e.target.style.color = getColor('link_hover_color')}
                  onMouseLeave={(e) => e.target.style.color = getColor('link_color')}
                >
                  a link
                </a>
                {' '}showing your theme colors.
              </p>
              <Button
                style={{
                  backgroundColor: getColor('button_color'),
                  color: getColor('button_text_color'),
                  borderColor: getColor('button_color'),
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = getColor('button_hover_color');
                  e.target.style.borderColor = getColor('button_hover_color');
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = getColor('button_color');
                  e.target.style.borderColor = getColor('button_color');
                }}
              >
                Sample Button
              </Button>
              <span 
                className="ms-3"
                style={{ color: getColor('secondary_color') }}
              >
                Secondary Text
              </span>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
