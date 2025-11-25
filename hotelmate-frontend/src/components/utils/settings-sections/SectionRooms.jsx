import React, { useState } from "react";
import { Card, Button, Row, Col, Form, Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "@/services/api";

export default function SectionRooms({ hotelSlug, roomTypes, onRoomsUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    short_description: '',
    photo_url: '',
    max_occupancy: 2,
    bed_setup: '',
    starting_price_from: '',
    currency: 'EUR',
  });

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name || '',
      code: room.code || '',
      short_description: room.short_description || '',
      photo_url: room.photo_url || '',
      max_occupancy: room.max_occupancy || 2,
      bed_setup: room.bed_setup || '',
      starting_price_from: room.starting_price_from || '',
      currency: room.currency || 'EUR',
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      code: '',
      short_description: '',
      photo_url: '',
      max_occupancy: 2,
      bed_setup: '',
      starting_price_from: '',
      currency: 'EUR',
    });
    setShowModal(true);
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/staff/room-types/${room.id}/`);
      toast.success('Room type deleted successfully!');
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room type');
    }
  };

  const handleSave = async () => {
    try {
      if (editingRoom) {
        // Update existing room type
        await api.patch(
          `/staff/hotel/${hotelSlug}/staff/room-types/${editingRoom.id}/`,
          formData
        );
        toast.success('Room type updated successfully!');
      } else {
        // Create new room type
        await api.post(
          `/staff/hotel/${hotelSlug}/staff/room-types/`,
          formData
        );
        toast.success('Room type created successfully!');
      }
      setShowModal(false);
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error) {
      console.error('Failed to save room:', error);
      toast.error(error.response?.data?.message || 'Failed to save room type');
    }
  };

  return (
    <>
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                <i className="bi bi-door-open me-2"></i>
                Rooms & Suites
              </h4>
              <p className="text-muted mb-0">
                Manage your hotel's room types and accommodation options
              </p>
            </div>
            <Button variant="primary" onClick={handleCreate}>
              <i className="bi bi-plus-lg me-2"></i>
              Add Room Type
            </Button>
          </div>
          
          <hr className="my-3" />
          
          {roomTypes && roomTypes.length > 0 ? (
            <Row className="g-3">
              {roomTypes.map((room) => (
                <Col md={6} lg={4} key={room.id || room.code}>
                  <Card className="h-100 shadow-sm">
                    {room.photo_url && (
                      <Card.Img 
                        variant="top" 
                        src={room.photo_url} 
                        alt={room.name}
                        style={{ height: '180px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <Card.Body>
                      <Card.Title className="d-flex justify-content-between align-items-start">
                        {room.name}
                        <Badge bg="secondary" className="ms-2">
                          {room.code}
                        </Badge>
                      </Card.Title>
                      
                      {room.short_description && (
                        <Card.Text className="text-muted small">
                          {room.short_description}
                        </Card.Text>
                      )}
                      
                      <div className="mb-2">
                        {room.max_occupancy && (
                          <small className="d-block">
                            <i className="bi bi-people me-1"></i>
                            Up to {room.max_occupancy} guests
                          </small>
                        )}
                        {room.bed_setup && (
                          <small className="d-block">
                            <i className="bi bi-moon me-1"></i>
                            {room.bed_setup}
                          </small>
                        )}
                        {room.starting_price_from && (
                          <small className="d-block fw-bold mt-2">
                            <i className="bi bi-tag me-1"></i>
                            From {room.currency} {room.starting_price_from}/night
                          </small>
                        )}
                      </div>
                      
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="flex-grow-1"
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(room)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center py-5 bg-light rounded">
              <i className="bi bi-door-open fs-1 text-muted d-block mb-3"></i>
              <p className="text-muted mb-3">No room types added yet</p>
              <Button variant="primary" onClick={handleCreate}>
                <i className="bi bi-plus-lg me-2"></i>
                Add Your First Room Type
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Room Edit/Create Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingRoom ? 'Edit Room Type' : 'Add New Room Type'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Room Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Deluxe Suite"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Room Code *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., DLX"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!!editingRoom}
                  />
                  <Form.Text className="text-muted">
                    Unique identifier (cannot be changed after creation)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Short Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Brief description of the room..."
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Photo URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://example.com/room-photo.jpg"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              />
              {formData.photo_url && (
                <div className="mt-2">
                  <img
                    src={formData.photo_url}
                    alt="Preview"
                    style={{ maxHeight: '150px', width: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Max Occupancy</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_occupancy}
                    onChange={(e) => setFormData({ ...formData, max_occupancy: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Bed Setup</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., 1 King Bed, 2 Twin Beds"
                    value={formData.bed_setup}
                    onChange={(e) => setFormData({ ...formData, bed_setup: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Starting Price (per night)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    placeholder="99.00"
                    value={formData.starting_price_from}
                    onChange={(e) => setFormData({ ...formData, starting_price_from: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Currency</Form.Label>
                  <Form.Select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!formData.name || !formData.code}
          >
            <i className="bi bi-save me-2"></i>
            {editingRoom ? 'Save Changes' : 'Create Room Type'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
