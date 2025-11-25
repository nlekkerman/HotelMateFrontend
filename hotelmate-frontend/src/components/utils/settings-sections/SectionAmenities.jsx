import React, { useState } from "react";
import { Card, Form, Row, Col, Button, Badge, InputGroup } from "react-bootstrap";

const SUGGESTED_AMENITIES = [
  'Swimming Pool', 'Gym', 'Spa', 'Free Parking', 'Bar', 'Kids Area',
  'Room Service', 'Restaurant', 'Breakfast', 'Free WiFi', 'Laundry',
  'Concierge', 'Airport Shuttle', 'Pet Friendly', 'Business Center', 'Meeting Rooms'
];

export default function SectionAmenities({ formData, onChange }) {
  const [newAmenity, setNewAmenity] = useState('');
  const amenities = formData.amenities || [];
  
  const handleAddAmenity = (amenityText) => {
    const trimmed = amenityText.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      onChange('amenities', [...amenities, trimmed]);
      setNewAmenity('');
    }
  };

  const handleRemoveAmenity = (amenityToRemove) => {
    onChange('amenities', amenities.filter(a => a !== amenityToRemove));
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-star me-2"></i>
          Amenities
        </h4>
        <p className="text-muted mb-3">
          Add amenities available at your hotel
        </p>
        
        <hr className="my-3" />
        
        {/* Add Custom Amenity */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-bold">Add Custom Amenity</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="e.g., Rooftop Pool, 24-Hour Security..."
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity(newAmenity);
                }
              }}
            />
            <Button
              variant="primary"
              onClick={() => handleAddAmenity(newAmenity)}
              disabled={!newAmenity.trim()}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Add
            </Button>
          </InputGroup>
        </Form.Group>

        {/* Suggested Amenities */}
        <div className="mb-4">
          <Form.Label className="fw-bold">Quick Add (Suggested)</Form.Label>
          <div className="d-flex flex-wrap gap-2">
            {SUGGESTED_AMENITIES.filter(sug => !amenities.includes(sug)).map((suggested, idx) => (
              <Badge
                key={idx}
                bg="light"
                text="dark"
                className="px-3 py-2 border"
                style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => handleAddAmenity(suggested)}
              >
                <i className="bi bi-plus-circle me-1"></i>
                {suggested}
              </Badge>
            ))}
          </div>
        </div>

        {/* Current Amenities */}
        <div>
          <Form.Label className="fw-bold">
            Current Amenities ({amenities.length})
          </Form.Label>
          {amenities.length > 0 ? (
            <div className="d-flex flex-wrap gap-2">
              {amenities.map((amenity, index) => (
                <Badge
                  key={index}
                  bg="primary"
                  className="px-3 py-2 d-flex align-items-center gap-2"
                  style={{ fontSize: '0.95rem' }}
                >
                  <i className="bi bi-check-circle"></i>
                  {amenity}
                  <i
                    className="bi bi-x-circle"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleRemoveAmenity(amenity)}
                  ></i>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted mb-0">
              No amenities added yet. Use the input above or click on suggested amenities.
            </p>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
