import React, { useState } from "react";
import { Card, Button, Row, Col, Form, Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "@/services/api";

export default function SectionRooms({ hotelSlug, roomTypes, onRoomsUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
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

  // Debug: Log room data to check for missing IDs
  React.useEffect(() => {
    console.log('[SectionRooms] 🏨 Received roomTypes prop:', roomTypes);
    console.log('[SectionRooms] 🏨 roomTypes is array?', Array.isArray(roomTypes));
    console.log('[SectionRooms] 🏨 roomTypes length:', roomTypes?.length);
    console.log('[SectionRooms] 🏨 roomTypes type:', typeof roomTypes);
    
    if (roomTypes?.length > 0) {
      console.log('[SectionRooms] 🏨 First room:', roomTypes[0]);
      console.log('[SectionRooms] Room types data:', roomTypes);
      const roomsWithoutIds = roomTypes.filter(room => !room.id);
      if (roomsWithoutIds.length > 0) {
        console.warn('[SectionRooms] ⚠️ Rooms without IDs:', roomsWithoutIds);
      }
    }
  }, [roomTypes]);

  const handleEdit = (room) => {
    if (!room.id) {
      toast.error('Cannot edit this room - missing ID. Please refresh the page and try again.');
      console.error('Room data:', room);
      return;
    }
    
    setEditingRoom(room);
    setSelectedFile(null);
    setPreviewUrl(null);
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
    setSelectedFile(null);
    setPreviewUrl(null);
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
      await api.delete(`/staff/hotel/${hotelSlug}/room-types/${roomId}/`);
      toast.success('Room type deleted successfully!');
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room type');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      e.target.value = '';
      return;
    }

    // Store file and create preview
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
    
    e.target.value = ''; // Reset so same file can be selected again
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    setUploadingImage(true);
    try {
      let roomId = editingRoom?.id;
      
      // Step 1: Save/create the room first
      if (editingRoom && editingRoom.id) {
        // Updating existing room - ensure ID exists
        const response = await api.patch(
          `/staff/hotel/${hotelSlug}/room-types/${editingRoom.id}/`,
          formData
        );
        roomId = response.data.id || editingRoom.id;
      } else {
        // Creating new room
        const response = await api.post(
          `/staff/hotel/${hotelSlug}/room-types/`,
          formData
        );
        roomId = response.data.id; // Get the new room ID
      }

      // Step 2: Upload image if file was selected
      if (selectedFile && roomId) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('photo', selectedFile);
          
          const response = await api.post(
            `/staff/hotel/${hotelSlug}/room-types/${roomId}/upload-image/`,
            uploadFormData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            }
          );
          
          if (!response.data.photo_url) {
            toast.warning('Room saved but image upload failed. Please try again.');
          }
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          toast.warning('Room saved but image upload failed. You can edit the room to add an image later.');
        }
      }

      toast.success(editingRoom ? 'Room type updated successfully!' : 'Room type created successfully!');
      setShowModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setEditingRoom(null);
      
      if (onRoomsUpdate) {
        // Force refresh to get updated room data with IDs
        onRoomsUpdate();
      }
    } catch (error) {
      console.error('Failed to save room:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.response?.data?.error
        || 'Failed to save room type. Please check all required fields.';
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
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
              {roomTypes.map((room, index) => {
                // Generate a stable unique key
                const uniqueKey = room.id 
                  ? `room-id-${room.id}` 
                  : room.code && room.code.trim() 
                    ? `room-code-${room.code}` 
                    : `room-idx-${index}-${room.name?.substring(0, 10) || 'unnamed'}`;
                
                return (
                <Col md={6} lg={4} key={uniqueKey}>
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
                      
                      {!room.id && (
                        <div className="alert alert-warning py-2 px-2 mb-2 small">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Room missing ID - refresh page to edit
                        </div>
                      )}
                      
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="flex-grow-1"
                          disabled={!room.id}
                          title={!room.id ? 'Room ID missing - please refresh the page' : 'Edit room'}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(room)}
                          disabled={!room.id}
                          title={!room.id ? 'Room ID missing - cannot delete' : 'Delete room'}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
              })}
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
              <Form.Label className="fw-bold">Room Photo</Form.Label>
              
              {/* File Upload Button */}
              <div className="mb-3">
                <div className="d-flex gap-2 align-items-center">
                  <Button
                    variant="outline-primary"
                    onClick={() => document.getElementById('room-image-upload').click()}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Choose Image
                  </Button>
                  {selectedFile && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <i className="bi bi-x-lg"></i>
                    </Button>
                  )}
                  <Form.Text className="text-muted">
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'or enter URL below'}
                  </Form.Text>
                </div>
                <input
                  id="room-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* URL Input */}
              <Form.Control
                type="url"
                placeholder="https://example.com/room-photo.jpg"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                disabled={uploadingImage}
              />
              <Form.Text className="text-muted">
                Paste Cloudinary URL or choose file to upload
              </Form.Text>
              
              {/* Image Preview */}
              {(previewUrl || formData.photo_url) && (
                <div className="mt-3">
                  <small className="text-muted d-block mb-2">Preview</small>
                  <div className="position-relative" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                    <img
                      src={previewUrl || formData.photo_url}
                      alt="Room preview"
                      style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="d-none align-items-center justify-content-center bg-light rounded"
                      style={{ height: '200px' }}
                    >
                      <div className="text-center text-muted">
                        <i className="bi bi-image fs-1 d-block mb-2"></i>
                        <small>Preview not available</small>
                      </div>
                    </div>
                    {previewUrl && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '4px' }}>
                        <small className="text-white">New image selected</small>
                      </div>
                    )}
                  </div>
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
            disabled={!formData.name || (!editingRoom && !formData.code) || uploadingImage}
          >
            {uploadingImage ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                {editingRoom ? 'Save Changes' : 'Create Room Type'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
