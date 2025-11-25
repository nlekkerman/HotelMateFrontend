import React, { useState } from "react";
import { Card, Form, Button, InputGroup, ListGroup, Spinner } from "react-bootstrap";
import api from "@/services/api";
import { toast } from "react-toastify";

export default function SectionImages({ formData, onChange }) {
  console.log('[SectionImages] Rendering with formData.hero_image:', formData?.hero_image);
  console.log('[SectionImages] Full formData:', formData);
  
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  
  const handleHeroImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/hotel/upload-image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      console.log('[SectionImages] Upload response:', response.data);
      
      // Update hero image with uploaded URL
      if (response.data.url) {
        onChange('hero_image', response.data.url);
        toast.success('Hero image uploaded successfully!');
      }
    } catch (error) {
      console.error('[SectionImages] Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingHero(false);
    }
  };
  
  const handleAddGalleryImage = () => {
    if (newGalleryUrl.trim()) {
      onChange('gallery', [...(formData.gallery || []), newGalleryUrl.trim()]);
      setNewGalleryUrl('');
    }
  };

  const handleRemoveGalleryImage = (index) => {
    onChange('gallery', (formData.gallery || []).filter((_, i) => i !== index));
  };

  const handleMoveImage = (index, direction) => {
    const gallery = [...(formData.gallery || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < gallery.length) {
      [gallery[index], gallery[newIndex]] = [gallery[newIndex], gallery[index]];
      onChange('gallery', gallery);
    }
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-images me-2"></i>
          Images
        </h4>
        <p className="text-muted mb-3">
          Upload and manage your hotel's visual content
        </p>
        
        <hr className="my-3" />
        
        <Form>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Hero Image</Form.Label>
            
            {/* File Upload */}
            <div className="mb-3">
              <div className="d-flex gap-2">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageUpload}
                  disabled={uploadingHero}
                />
                {uploadingHero && (
                  <Button variant="primary" disabled>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Uploading...
                  </Button>
                )}
              </div>
              <Form.Text className="text-muted">
                Upload an image (max 5MB) or enter URL below
              </Form.Text>
            </div>

            {/* URL Input */}
            <Form.Control
              type="url"
              placeholder="https://example.com/hero-image.jpg"
              value={formData?.hero_image || ''}
              onChange={(e) => onChange('hero_image', e.target.value)}
              disabled={uploadingHero}
            />
            <Form.Text className="text-muted">
              Main banner image displayed at the top of your page
            </Form.Text>
            
            {/* Preview */}
            {formData.hero_image && (
              <div className="mt-3">
                <small className="text-muted d-block mb-2">Hero preview</small>
                <div className="position-relative" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                  <img 
                    src={formData.hero_image} 
                    alt="Hero preview" 
                    className="img-fluid rounded w-100"
                    style={{ height: '200px', objectFit: 'cover' }}
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
                      <br />
                      <small className="text-truncate d-block" style={{ maxWidth: '300px' }}>
                        {formData.hero_image}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="fw-bold">
              Gallery Images ({(formData.gallery || []).length})
            </Form.Label>
            <InputGroup className="mb-3">
              <Form.Control
                type="url"
                placeholder="https://example.com/image.jpg"
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGalleryImage())}
              />
              <Button variant="primary" onClick={handleAddGalleryImage}>
                <i className="bi bi-plus-lg me-1"></i> Add
              </Button>
            </InputGroup>
            
            <ListGroup style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(formData.gallery || []).map((url, index) => (
                <ListGroup.Item key={index} className="d-flex align-items-center gap-3 p-3">
                  <img 
                    src={url} 
                    alt={`Gallery ${index + 1}`}
                    className="rounded"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                    onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3C/svg%3E'}
                  />
                  <small className="flex-grow-1 text-truncate">{url}</small>
                  <div className="d-flex gap-1">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => handleMoveImage(index, 'up')}
                      disabled={index === 0}
                    >
                      <i className="bi bi-arrow-up"></i>
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => handleMoveImage(index, 'down')}
                      disabled={index === (formData.gallery || []).length - 1}
                    >
                      <i className="bi bi-arrow-down"></i>
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleRemoveGalleryImage(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
              {(formData.gallery || []).length === 0 && (
                <ListGroup.Item className="text-center text-muted py-4">
                  <i className="bi bi-images fs-1 d-block mb-2"></i>
                  No gallery images yet
                </ListGroup.Item>
              )}
            </ListGroup>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
}
