import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import api from '@/services/api';

/**
 * InlineItemEditor - Add/Edit items (images, cards, reviews) directly on public page
 */
const InlineItemEditor = ({ show, onHide, elementId, elementType, hotelSlug, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    body: '',
    image_url: '',
    badge: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/staff/hotel/${hotelSlug}/public-element-items/`, {
        element: elementId,
        ...formData,
        sort_order: 0,
        is_active: true
      });
      
      // Reset form
      setFormData({
        title: '',
        subtitle: '',
        body: '',
        image_url: '',
        badge: ''
      });
      
      if (onSuccess) onSuccess();
      onHide();
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      gallery: {
        title: 'Caption',
        image_url: 'Image URL'
      },
      cards_list: {
        title: 'Card Title',
        subtitle: 'Subtitle',
        body: 'Description',
        image_url: 'Image URL',
        badge: 'Badge (optional)'
      },
      reviews_list: {
        title: 'Customer Name',
        subtitle: 'Location/Date',
        body: 'Review Text',
        image_url: 'Photo URL (optional)',
        badge: 'Rating (1-5)'
      }
    };
    return labels[elementType]?.[field] || field;
  };

  const getFieldsForType = () => {
    switch (elementType) {
      case 'gallery':
        return ['image_url', 'title'];
      case 'cards_list':
        return ['image_url', 'title', 'subtitle', 'body', 'badge'];
      case 'reviews_list':
        return ['title', 'subtitle', 'body', 'badge', 'image_url'];
      default:
        return [];
    }
  };

  const fields = getFieldsForType();

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {elementType === 'gallery' && '📸 Add Image to Gallery'}
            {elementType === 'cards_list' && '📇 Add Card'}
            {elementType === 'reviews_list' && '⭐ Add Review'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {fields.map(field => {
            if (field === 'body') {
              return (
                <Form.Group className="mb-3" key={field}>
                  <Form.Label>{getFieldLabel(field)}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData[field]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    required={elementType === 'reviews_list'}
                  />
                </Form.Group>
              );
            }

            return (
              <Form.Group className="mb-3" key={field}>
                <Form.Label>{getFieldLabel(field)}</Form.Label>
                <Form.Control
                  type={field.includes('url') ? 'url' : 'text'}
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  placeholder={field.includes('url') ? 'https://example.com/image.jpg' : ''}
                  required={field === 'image_url' && elementType === 'gallery'}
                />
                {field === 'image_url' && formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                      className="rounded"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </Form.Group>
            );
          })}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              <>
                <i className="bi bi-plus-circle me-2"></i>
                Add {elementType === 'gallery' ? 'Image' : elementType === 'cards_list' ? 'Card' : 'Review'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default InlineItemEditor;
