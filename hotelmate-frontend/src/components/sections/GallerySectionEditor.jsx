import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Modal, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createGalleryContainer,
  updateGalleryContainer,
  deleteGalleryContainer,
  bulkUploadGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
} from '@/services/sectionEditorApi';

/**
 * GallerySectionEditor - Manage multiple gallery containers with images
 */
const GallerySectionEditor = ({ section, hotelSlug, onUpdate }) => {
  const galleries = section.galleries || [];
  
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [imageCaption, setImageCaption] = useState('');

  const handleAddGallery = async () => {
    if (!newGalleryName.trim()) {
      toast.error('Please enter a gallery name');
      return;
    }

    try {
      setAdding(true);
      await createGalleryContainer(hotelSlug, {
        section: section.id,
        name: newGalleryName,
        sort_order: galleries.length,
      });
      toast.success('Gallery created successfully');
      setNewGalleryName('');
      setShowAddGallery(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create gallery:', error);
      toast.error('Failed to create gallery');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGallery = async (galleryId, galleryName) => {
    if (!confirm(`Delete gallery "${galleryName}"? This will also delete all images in it.`)) {
      return;
    }

    try {
      await deleteGalleryContainer(hotelSlug, galleryId);
      toast.success('Gallery deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete gallery:', error);
      toast.error('Failed to delete gallery');
    }
  };

  const handleImageUpload = async (galleryId, event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length > 20) {
      toast.error('Maximum 20 images at once');
      return;
    }

    try {
      setUploadingTo(galleryId);
      await bulkUploadGalleryImages(hotelSlug, galleryId, files);
      toast.success(`${files.length} image(s) uploaded successfully`);
      onUpdate();
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingTo(null);
    }
  };

  const handleUpdateImageCaption = async () => {
    if (!editingImage) return;

    try {
      await updateGalleryImage(hotelSlug, editingImage.id, {
        caption: imageCaption,
      });
      toast.success('Caption updated successfully');
      setEditingImage(null);
      setImageCaption('');
      onUpdate();
    } catch (error) {
      console.error('Failed to update caption:', error);
      toast.error('Failed to update caption');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Delete this image?')) return;

    try {
      await deleteGalleryImage(hotelSlug, imageId);
      toast.success('Image deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-images me-2"></i>
          Gallery Section
        </h5>
        <Button
          variant="light"
          size="sm"
          onClick={() => setShowAddGallery(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add Gallery
        </Button>
      </Card.Header>
      <Card.Body>
        {galleries.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-images" style={{ fontSize: '3rem' }}></i>
            <p className="mt-2">No galleries yet. Click "Add Gallery" to create one.</p>
          </div>
        ) : (
          galleries.map((gallery) => (
            <Card key={gallery.id} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">{gallery.name}</h6>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteGallery(gallery.id, gallery.name)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </Card.Header>
              <Card.Body>
                {/* Upload button */}
                <div className="mb-3">
                  <Form.Label>
                    <i className="bi bi-upload me-2"></i>
                    Upload Images (max 20)
                  </Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(gallery.id, e)}
                    disabled={uploadingTo === gallery.id}
                  />
                  {uploadingTo === gallery.id && (
                    <div className="mt-2">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Uploading images...
                    </div>
                  )}
                </div>

                {/* Image grid */}
                {gallery.images && gallery.images.length > 0 ? (
                  <Row>
                    {gallery.images.map((image) => (
                      <Col key={image.id} xs={6} md={4} lg={3} className="mb-3">
                        <div className="position-relative">
                          <img
                            src={image.image_url}
                            alt={image.caption || 'Gallery image'}
                            className="w-100 rounded"
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                          <div className="position-absolute top-0 end-0 p-1">
                            <Button
                              variant="light"
                              size="sm"
                              className="me-1"
                              onClick={() => {
                                setEditingImage(image);
                                setImageCaption(image.caption || '');
                              }}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteImage(image.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                          {image.caption && (
                            <div className="small text-muted mt-1">{image.caption}</div>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center text-muted py-3">
                    <i className="bi bi-image" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No images yet. Upload some above.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))
        )}
      </Card.Body>

      {/* Add Gallery Modal */}
      <Modal show={showAddGallery} onHide={() => setShowAddGallery(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Gallery</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Gallery Name</Form.Label>
            <Form.Control
              type="text"
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              placeholder="e.g., Pool Area, Restaurant, Rooms"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddGallery(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddGallery} disabled={adding}>
            {adding ? 'Adding...' : 'Add Gallery'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Image Caption Modal */}
      <Modal show={!!editingImage} onHide={() => setEditingImage(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Image Caption</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingImage && (
            <>
              <img
                src={editingImage.image_url}
                alt="Preview"
                className="w-100 rounded mb-3"
                style={{ maxHeight: '200px', objectFit: 'cover' }}
              />
              <Form.Group>
                <Form.Label>Caption</Form.Label>
                <Form.Control
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Enter image caption"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingImage(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateImageCaption}>
            Save Caption
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default GallerySectionEditor;
