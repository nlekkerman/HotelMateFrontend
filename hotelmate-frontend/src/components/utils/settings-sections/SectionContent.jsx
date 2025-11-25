import React from "react";
import { Card, Form } from "react-bootstrap";

export default function SectionContent({ formData, onChange }) {
  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-file-text me-2"></i>
          Content
        </h4>
        <p className="text-muted mb-3">
          Edit the text content displayed on your public page
        </p>
        
        <hr className="my-3" />
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Welcome Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="A warm welcome message for guests..."
              value={formData.welcome_message || ''}
              onChange={(e) => onChange('welcome_message', e.target.value)}
            />
            <Form.Text className="text-muted">
              Displayed prominently on the hero section
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Short Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Brief description of your hotel..."
              value={formData.short_description || ''}
              onChange={(e) => onChange('short_description', e.target.value)}
            />
            <Form.Text className="text-muted">
              A concise overview of your property
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="fw-bold">Long Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Detailed information about your hotel, facilities, and services..."
              value={formData.long_description || ''}
              onChange={(e) => onChange('long_description', e.target.value)}
            />
            <Form.Text className="text-muted">
              Comprehensive details about your hotel
            </Form.Text>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
}
