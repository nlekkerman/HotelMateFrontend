import React, { useState } from "react";
import { Card, Form, Button, Spinner } from "react-bootstrap";
import api from "@/services/api";
import { toast } from "react-toastify";

export default function SectionContent({ formData, onChange, hotelSlug, onSaved }) {
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

          <Form.Group className="mb-3">
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
          
          <div className="d-flex justify-content-end">
            <SaveButton hotelSlug={hotelSlug} formData={formData} section="content" onSaved={onSaved} />
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

function SaveButton({ hotelSlug, formData, section, onSaved }) {
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        welcome_message: formData.welcome_message,
        short_description: formData.short_description,
        long_description: formData.long_description,
      };
      
      await api.patch(`/staff/hotel/${hotelSlug}/settings/`, dataToSave);
      toast.success('Content saved successfully!');
      onSaved?.();
    } catch (error) {
      console.error('Failed to save content:', error);
      toast.error(error.response?.data?.error || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Button variant="primary" onClick={handleSave} disabled={saving}>
      {saving ? (
        <>
          <Spinner animation="border" size="sm" className="me-2" />
          Saving...
        </>
      ) : (
        <>
          <i className="bi bi-check2 me-2"></i>
          Save Content
        </>
      )}
    </Button>
  );
}
