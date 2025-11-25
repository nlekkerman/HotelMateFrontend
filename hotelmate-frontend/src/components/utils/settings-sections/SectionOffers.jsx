import React, { useState } from "react";
import { Card, Button, Row, Col, Form, Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "@/services/api";

export default function SectionOffers({ hotelSlug, offers, onOffersUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
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

  const handleEdit = (offer) => {
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
    setShowModal(true);
  };

  const handleCreate = () => {
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
    setShowModal(true);
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/staff/offers/${offer.id}/`);
      toast.success('Offer deleted successfully!');
      if (onOffersUpdate) {
        onOffersUpdate();
      }
    } catch (error) {
      console.error('Failed to delete offer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete offer');
    }
  };

  const handleSave = async () => {
    try {
      if (editingOffer) {
        await api.patch(
          `/staff/hotel/${hotelSlug}/staff/offers/${editingOffer.id}/`,
          formData
        );
        toast.success('Offer updated successfully!');
      } else {
        await api.post(
          `/staff/hotel/${hotelSlug}/staff/offers/`,
          formData
        );
        toast.success('Offer created successfully!');
      }
      setShowModal(false);
      if (onOffersUpdate) {
        onOffersUpdate();
      }
    } catch (error) {
      console.error('Failed to save offer:', error);
      toast.error(error.response?.data?.message || 'Failed to save offer');
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
          
          {offers && offers.length > 0 ? (
            <Row className="g-3">
              {offers.map((offer) => (
                <Col md={6} lg={4} key={offer.id}>
                  <Card className="h-100 shadow-sm">
                    {offer.photo_url && (
                      <Card.Img 
                        variant="top" 
                        src={offer.photo_url} 
                        alt={offer.title}
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
              <Form.Label className="fw-bold">Photo URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://example.com/offer-photo.jpg"
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Valid From *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Valid To *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!formData.title || !formData.short_description || !formData.valid_from || !formData.valid_to}
          >
            <i className="bi bi-save me-2"></i>
            {editingOffer ? 'Save Changes' : 'Create Offer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
