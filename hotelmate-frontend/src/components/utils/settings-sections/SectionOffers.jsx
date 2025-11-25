import React, { useState, useEffect } from "react";
import { Card, Button, Row, Col, Form, Modal, Badge, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "@/services/api";
import Pusher from "pusher-js";

export default function SectionOffers({ hotelSlug, offers, onOffersUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [localOffers, setLocalOffers] = useState(offers || []);
  const [formData, setFormData] = useState({
    title: '',
    tag: '',
    short_description: '',
    details_text: '',
    valid_from: '',
    valid_to: '',
    photo_url: '',
    book_now_url: '',
    is_active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Sync local offers with prop changes
  useEffect(() => {
    setLocalOffers(offers || []);
  }, [offers]);

  const handleEdit = (offer) => {
    console.log('AAAAAAAAAAAAAAAAAAA[SectionOffers] editing offer:', offer);
    setEditingOffer(offer);
    setFormData({
      title: offer.title || '',
      tag: offer.tag || '',
      short_description: offer.short_description || '',
      details_text: offer.details_text || '',
      valid_from: offer.valid_from || '',
      valid_to: offer.valid_to || '',
      photo_url: offer.photo_url || '',
      book_now_url: offer.book_now_url || '',
      is_active: offer.is_active !== undefined ? offer.is_active : true,
    });
    setImagePreview(offer.photo_url || null);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleCreate = () => {
    console.log('[SectionOffers] Opening create modal');
    setEditingOffer(null);
    setFormData({
      title: '',
      tag: '',
      short_description: '',
      details_text: '',
      valid_from: '',
      valid_to: '',
      photo_url: '',
      book_now_url: '',
      is_active: true,
    });
    setImagePreview(null);
    setSelectedFile(null);
    setShowModal(true);
    console.log('[SectionOffers] Form reset for new offer');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };



  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, photo_url: '' }));
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/offers/${offer.id}/`);
      toast.success('Offer deleted successfully!');
      
      // Update local state immediately
      setLocalOffers(prevOffers => prevOffers.filter(o => o.id !== offer.id));
      
      // Pusher will broadcast to other users
      if (onOffersUpdate) {
        onOffersUpdate();
      }
    } catch (error) {
      console.error('Failed to delete offer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete offer');
    }
  };

  const handleSave = async () => {
    console.log('[SectionOffers] 💾 Saving offer...', {
      isEditing: !!editingOffer,
      hasFile: !!selectedFile,
      formData: formData
    });
    
    setUploadingImage(true);
    try {
      let response;
      
      if (editingOffer) {
        // Update existing offer
        if (selectedFile) {
          // If there's a file to upload, use FormData
          const formDataUpload = new FormData();
          Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
              formDataUpload.append(key, formData[key]);
            }
          });
          formDataUpload.append('photo', selectedFile);
          
          response = await api.patch(
            `/staff/hotel/${hotelSlug}/offers/${editingOffer.id}/`,
            formDataUpload,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } else {
          // No file, just update JSON data
          response = await api.patch(
            `/staff/hotel/${hotelSlug}/offers/${editingOffer.id}/`,
            formData
          );
        }
        
        toast.success('Offer updated successfully!');
        
        // Update local state
        setLocalOffers(prevOffers => 
          prevOffers.map(offer => 
            offer.id === editingOffer.id ? response.data : offer
          )
        );
      } else {
        // Create new offer
        if (selectedFile) {
          // If there's a file, use FormData
          const formDataUpload = new FormData();
          Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
              formDataUpload.append(key, formData[key]);
            }
          });
          formDataUpload.append('photo', selectedFile);
          
          response = await api.post(
            `/staff/hotel/${hotelSlug}/offers/`,
            formDataUpload,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } else {
          // No file, just send JSON
          response = await api.post(
            `/staff/hotel/${hotelSlug}/offers/`,
            formData
          );
        }
        
        toast.success('Offer created successfully!');
        console.log('[SectionOffers] ✅ Offer created:', response.data);
        
        // Add to local state
        setLocalOffers(prevOffers => {
          console.log('[SectionOffers] Adding to local state. Previous count:', prevOffers.length);
          return [response.data, ...prevOffers];
        });
      }
      
      setShowModal(false);
      setSelectedFile(null);
      setImagePreview(null);
      
      // Pusher will broadcast to other users
      if (onOffersUpdate) {
        console.log('[SectionOffers] Calling onOffersUpdate callback');
        onOffersUpdate();
      }
    } catch (error) {
      console.error('[SectionOffers] ❌ Failed to save offer:', error);
      console.error('[SectionOffers] Error details:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save offer');
    } finally {
      setUploadingImage(false);
    }
  };

  const isExpired = (validTo) => {
    if (!validTo) return false;
    return new Date(validTo) < new Date();
  };

  const isValid = (validFrom, validTo) => {
    const now = new Date();
    const from = validFrom ? new Date(validFrom) : null;
    const to = validTo ? new Date(validTo) : null;
    
    if (from && from > now) return false;
    if (to && to < now) return false;
    return true;
  };

  // Pusher real-time updates
  useEffect(() => {
    if (!hotelSlug) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`hotel-${hotelSlug}`);

    // Listen for new offer creation
    channel.bind('offer-created', (data) => {
      console.log('[SectionOffers] ✅ Offer created:', data);
      setLocalOffers(prevOffers => {
        // Avoid duplicates
        const exists = prevOffers.some(o => o.id === data.offer.id);
        if (exists) return prevOffers;
        return [data.offer, ...prevOffers];
      });
      toast.info(`New offer: ${data.offer.title}`);
    });

    // Listen for offer updates
    channel.bind('offer-updated', (data) => {
      console.log('[SectionOffers] 🔄 Offer updated:', data);
      setLocalOffers(prevOffers => 
        prevOffers.map(offer => {
          if (offer.id === data.offer.id) {
            // If photo_url changed, add cache buster
            const updatedOffer = { ...data.offer };
            if (updatedOffer.photo_url && updatedOffer.photo_url !== offer.photo_url) {
              updatedOffer.photo_url = `${updatedOffer.photo_url}?t=${Date.now()}`;
            }
            return updatedOffer;
          }
          return offer;
        })
      );
    });

    // Listen for offer deletion
    channel.bind('offer-deleted', (data) => {
      console.log('[SectionOffers] 🗑️ Offer deleted:', data);
      setLocalOffers(prevOffers => 
        prevOffers.filter(offer => offer.id !== data.offer_id)
      );
      toast.info(`Offer deleted: ${data.offer_title}`);
    });

    // Listen for image updates
    channel.bind('offer-image-updated', (data) => {
      console.log('[SectionOffers] 🖼️ Offer image updated:', data);
      setLocalOffers(prevOffers => 
        prevOffers.map(offer => 
          offer.id === data.offer_id 
            ? { ...offer, photo_url: `${data.photo_url}?t=${Date.now()}` }
            : offer
        )
      );
    });

    // Listen for generic offers-updated (fallback/refresh trigger)
    channel.bind('offers-updated', (data) => {
      console.log('[SectionOffers] 🔄 Generic offers-updated sync:', data);
      // Trigger parent refresh to get latest data
      if (onOffersUpdate) {
        onOffersUpdate();
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`hotel-${hotelSlug}`);
      pusher.disconnect();
    };
  }, [hotelSlug, onOffersUpdate]);

  return (
    <>
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                <i className="bi bi-tag me-2"></i>
                Offers & Packages
              </h4>
              <p className="text-muted mb-0">
                Manage special offers and promotional packages
              </p>
            </div>
            <Button variant="primary" onClick={handleCreate}>
              <i className="bi bi-plus-lg me-2"></i>
              Add Offer
            </Button>
          </div>
          
          <hr className="my-3" />
          
          {localOffers && localOffers.length > 0 ? (
            <Row className="g-3">
              {localOffers.map((offer) => (
                <Col md={6} lg={4} key={offer.id}>
                  <Card className="h-100 shadow-sm">
                    {offer.photo_url && (
                      <Card.Img 
                        variant="top" 
                        src={offer.photo_url} 
                        alt={offer.title}
                        key={offer.photo_url}
                        style={{ height: '180px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="mb-0 flex-grow-1">
                          {offer.title}
                        </Card.Title>
                        <div className="d-flex gap-1">
                          {offer.is_active ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="secondary">Inactive</Badge>
                          )}
                          {isExpired(offer.valid_to) && (
                            <Badge bg="danger">Expired</Badge>
                          )}
                        </div>
                      </div>
                      
                      {offer.tag && (
                        <Badge bg="info" className="mb-2">
                          {offer.tag}
                        </Badge>
                      )}
                      
                      {offer.short_description && (
                        <Card.Text className="text-muted small mb-2">
                          {offer.short_description}
                        </Card.Text>
                      )}
                      
                      <div className="mb-2 small">
                        {offer.valid_from && (
                          <div>
                            <i className="bi bi-calendar-check me-1"></i>
                            From: {new Date(offer.valid_from).toLocaleDateString()}
                          </div>
                        )}
                        {offer.valid_to && (
                          <div>
                            <i className="bi bi-calendar-x me-1"></i>
                            To: {new Date(offer.valid_to).toLocaleDateString()}
                          </div>
                        )}
                        {isValid(offer.valid_from, offer.valid_to) && offer.is_active && (
                          <Badge bg="success" className="mt-1">Currently Valid</Badge>
                        )}
                      </div>
                      
                      <div className="d-flex gap-2 mt-auto">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleEdit(offer)}
                          className="flex-grow-1"
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(offer)}
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
              <i className="bi bi-tag fs-1 text-muted d-block mb-3"></i>
              <p className="text-muted mb-3">No offers added yet</p>
              <Button variant="primary" onClick={handleCreate}>
                <i className="bi bi-plus-lg me-2"></i>
                Add Your First Offer
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Offer Edit/Create Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingOffer ? 'Edit Offer' : 'Add New Offer'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Offer Title *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Weekend Getaway Package"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Tag</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Summer Sale"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Short Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Brief description for the offer card..."
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Detailed Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Full details about the offer, terms and conditions..."
                value={formData.details_text}
                onChange={(e) => setFormData({ ...formData, details_text: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Offer Photo</Form.Label>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 position-relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ 
                      maxHeight: '200px', 
                      width: '100%', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      border: '2px solid #dee2e6'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      toast.error('Failed to load image preview');
                    }}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="position-absolute top-0 end-0 m-2"
                    onClick={handleRemoveImage}
                  >
                    <i className="bi bi-x-lg"></i>
                  </Button>
                </div>
              )}

              {/* File Input */}
              <div className="mb-2">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploadingImage}
                />
              </div>
              
              <Form.Text className="text-muted">
                Select an image file (max 10MB). It will be uploaded when you save the offer. Or paste a URL below.
              </Form.Text>

              {/* URL Input (Alternative) */}
              <Form.Control
                type="url"
                placeholder="Or paste image URL directly"
                value={formData.photo_url}
                onChange={(e) => {
                  setFormData({ ...formData, photo_url: e.target.value });
                  setImagePreview(e.target.value);
                }}
                className="mt-2"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Valid From (Optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                  <Form.Text className="text-muted">
                    Leave empty for no start date restriction
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Valid To (Optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                  <Form.Text className="text-muted">
                    Leave empty for no end date restriction
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Book Now URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://booking.com/special-offer"
                value={formData.book_now_url}
                onChange={(e) => setFormData({ ...formData, book_now_url: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="offer-active"
                label="Active (visible on public page)"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={uploadingImage}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!formData.title?.trim() || !formData.short_description?.trim() || uploadingImage}
          >
            {uploadingImage ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {selectedFile ? 'Uploading & Saving...' : 'Saving...'}
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                {editingOffer ? 'Save Changes' : 'Create Offer'}
              </>
            )}
          </Button>
          {(!formData.title?.trim() || !formData.short_description?.trim()) && (
            <div className="text-muted small mt-2 w-100 text-center">
              Please fill in title and short description to enable save
            </div>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}
