import React, { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateSection } from '@/services/sectionEditorApi';

/**
 * RoomsSectionEditor - Simple editor for rooms section
 * Rooms are auto-populated from PMS, only meta settings available
 */
const RoomsSectionEditor = ({ section, hotelSlug, onUpdate }) => {
  const roomsData = section.rooms_data || {};
  
  const [name, setName] = useState(section.name || 'Our Rooms');
  const [subtitle, setSubtitle] = useState(roomsData.subtitle || '');
  const [description, setDescription] = useState(roomsData.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update section name at the section level
      await updateSection(hotelSlug, section.id, {
        name,
      });
      
      // If rooms_data exists, update subtitle and description
      // Note: This might need a different endpoint depending on backend implementation
      // For now, we'll just update the section name
      
      toast.success('Rooms section updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to update rooms section:', error);
      toast.error('Failed to update rooms section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-door-open me-2"></i>
          Rooms Section
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Info Alert */}
        <Alert variant="info" className="mb-4">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Auto-populated from PMS:</strong> This section automatically displays all active room types from your PMS system. 
          To manage room types, prices, and availability, use the PMS settings. Manual card/list editing is disabled for this section type.
        </Alert>

        {/* Section Name */}
        <Form.Group className="mb-3">
          <Form.Label>Section Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Our Rooms & Suites"
          />
          <Form.Text className="text-muted">
            This is the heading displayed at the top of the rooms section.
          </Form.Text>
        </Form.Group>

        {/* Subtitle */}
        <Form.Group className="mb-3">
          <Form.Label>Subtitle (Optional)</Form.Label>
          <Form.Control
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g., Choose from our selection of comfortable accommodations"
            disabled
          />
          <Form.Text className="text-muted">
            Subtitle editing will be available in the full rooms section management page. Current value from backend.
          </Form.Text>
        </Form.Group>

        {/* Description */}
        <Form.Group className="mb-4">
          <Form.Label>Description (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional description for the rooms section"
            disabled
          />
          <Form.Text className="text-muted">
            Description editing will be available in the full rooms section management page.
          </Form.Text>
        </Form.Group>

        {/* Save Button */}
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-2"></i>
              Save Changes
            </>
          )}
        </Button>

        {/* Preview Info */}
        <hr className="my-4" />
        <div className="text-muted small">
          <p className="mb-2">
            <i className="bi bi-eye me-2"></i>
            <strong>Preview:</strong> Use the "Preview Page" button at the top to see how your rooms section appears to visitors.
          </p>
          <p className="mb-0">
            <i className="bi bi-gear me-2"></i>
            <strong>Room Management:</strong> Add, edit, or remove room types in the PMS section to update what appears here.
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RoomsSectionEditor;
