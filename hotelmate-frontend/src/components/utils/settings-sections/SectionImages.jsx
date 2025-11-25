import React, { useState } from "react";
import { Card, Form, Button, InputGroup, ListGroup, Spinner, Accordion, Badge, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { useHotelGalleries } from "@/hooks/useHotelGalleries";

export default function SectionImages({ formData, onChange, hotelSlug, onSaved }) {
  console.log('[SectionImages] Rendering with hotelSlug:', hotelSlug);
  
  // Use the new gallery system hook
  const {
    galleries,
    loading: galleriesLoading,
    createGallery,
    updateGallery,
    deleteGallery,
    uploadImage,
    deleteImage,
    updateImage,
    reorderImages,
  } = useHotelGalleries(hotelSlug);

  // Local state
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('rooms');
  const [newGalleryDescription, setNewGalleryDescription] = useState('');
  const [uploadingToGallery, setUploadingToGallery] = useState(null);
  const [editingCaption, setEditingCaption] = useState(null);
  const [captionValue, setCaptionValue] = useState('');
  
  // Image preview/upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [currentGalleryId, setCurrentGalleryId] = useState(null);
  
  // Gallery categories
  const categoryOptions = [
    { value: 'rooms', label: 'Rooms', icon: 'door-closed' },
    { value: 'facilities', label: 'Facilities', icon: 'building' },
    { value: 'dining', label: 'Dining', icon: 'cup-hot' },
    { value: 'spa', label: 'Spa & Wellness', icon: 'water' },
    { value: 'events', label: 'Events', icon: 'calendar-event' },
    { value: 'exterior', label: 'Exterior', icon: 'house' },
    { value: 'activities', label: 'Activities', icon: 'bicycle' },
    { value: 'other', label: 'Other', icon: 'images' },
  ];

  // Create new gallery
  const handleCreateGallery = async () => {
    if (!newGalleryName.trim()) {
      toast.error('Please enter a gallery name');
      return;
    }

    try {
      await createGallery({
        name: newGalleryName,
        category: newGalleryCategory,
        description: newGalleryDescription,
        is_active: true,
        display_order: galleries.length,
      });
      
      toast.success('Gallery created successfully!');
      setShowCreateModal(false);
      setNewGalleryName('');
      setNewGalleryCategory('rooms');
      setNewGalleryDescription('');
    } catch (error) {
      console.error('[SectionImages] Create gallery error:', error);
      toast.error('Failed to create gallery');
    }
  };

  // Handle file selection - show preview modal
  const handleFileSelect = (galleryId, files) => {
    if (!files || files.length === 0) return;

    const validImages = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`Skipped ${file.name}: Not an image file`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Skipped ${file.name}: File too large (max 10MB)`);
        continue;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      validImages.push({
        file,
        previewUrl,
        caption: '',
        filename: file.name,
      });
    }

    if (validImages.length > 0) {
      setPendingImages(validImages);
      setCurrentGalleryId(galleryId);
      setShowUploadModal(true);
    }
  };

  // Update caption for pending image
  const handleUpdatePendingCaption = (index, caption) => {
    setPendingImages(prev => 
      prev.map((img, i) => i === index ? { ...img, caption } : img)
    );
  };

  // Remove pending image
  const handleRemovePendingImage = (index) => {
    setPendingImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // Clean up object URL
      URL.revokeObjectURL(prev[index].previewUrl);
      return newImages;
    });
  };

  // Actually upload the images
  const handleConfirmUpload = async () => {
    if (pendingImages.length === 0) return;

    setUploadingToGallery(currentGalleryId);
    let successCount = 0;

    try {
      for (const { file, caption } of pendingImages) {
        await uploadImage(currentGalleryId, file, caption || file.name, caption || file.name, false);
        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} image(s) uploaded successfully!`);
      }

      // Clean up
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setShowUploadModal(false);
      setCurrentGalleryId(null);
    } catch (error) {
      console.error('[SectionImages] Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingToGallery(null);
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setPendingImages([]);
    setShowUploadModal(false);
    setCurrentGalleryId(null);
  };

  // Delete gallery
  const handleDeleteGallery = async (galleryId, galleryName) => {
    if (!confirm(`Delete gallery "${galleryName}"? This will remove all images in the gallery.`)) {
      return;
    }

    try {
      await deleteGallery(galleryId);
      toast.success('Gallery deleted successfully!');
    } catch (error) {
      console.error('[SectionImages] Delete gallery error:', error);
      toast.error('Failed to delete gallery');
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId, galleryName) => {
    if (!confirm(`Remove this image from "${galleryName}"?`)) {
      return;
    }

    try {
      await deleteImage(imageId);
      toast.success('Image removed successfully!');
    } catch (error) {
      console.error('[SectionImages] Delete image error:', error);
      toast.error('Failed to remove image');
    }
  };

  // Update image caption
  const handleSaveCaption = async (imageId) => {
    try {
      await updateImage(imageId, { 
        caption: captionValue,
        alt_text: captionValue 
      });
      toast.success('Caption updated!');
      setEditingCaption(null);
    } catch (error) {
      console.error('[SectionImages] Update caption error:', error);
      toast.error('Failed to update caption');
    }
  };

  // Toggle gallery active status
  const handleToggleActive = async (gallery) => {
    try {
      await updateGallery(gallery.id, { is_active: !gallery.is_active });
      toast.success(`Gallery ${gallery.is_active ? 'hidden' : 'shown'} on public page`);
    } catch (error) {
      console.error('[SectionImages] Toggle active error:', error);
      toast.error('Failed to update gallery');
    }
  };

  // Move image within gallery
  const handleMoveImage = async (gallery, imageIndex, direction) => {
    const images = [...gallery.images];
    const newIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;
    
    if (newIndex < 0 || newIndex >= images.length) return;

    // Swap
    [images[imageIndex], images[newIndex]] = [images[newIndex], images[imageIndex]];
    
    try {
      await reorderImages(gallery.id, images.map(img => img.id));
      toast.success('Images reordered');
    } catch (error) {
      console.error('[SectionImages] Reorder error:', error);
      toast.error('Failed to reorder images');
    }
  };

  if (galleriesLoading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4 text-center">
          <Spinner animation="border" />
          <p className="mt-2 text-muted">Loading galleries...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                <i className="bi bi-images me-2"></i>
                Gallery Management
              </h4>
              <p className="text-muted mb-0">
                Organize your hotel images into galleries by category
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-lg me-2"></i>
              Create Gallery
            </Button>
          </div>

          <hr className="my-3" />

          {!galleries || galleries.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-images fs-1 text-muted d-block mb-3"></i>
              <h5 className="text-muted">No galleries yet</h5>
              <p className="text-muted">Create your first gallery to organize hotel images</p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <i className="bi bi-plus-lg me-2"></i>
                Create Gallery
              </Button>
            </div>
          ) : (
            <Accordion>
              {galleries.map((gallery) => (
                <Accordion.Item eventKey={gallery.id.toString()} key={gallery.id}>
                  <Accordion.Header>
                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi bi-${categoryOptions.find(c => c.value === gallery.category)?.icon || 'images'}`}></i>
                        <strong>{gallery.name}</strong>
                        <Badge bg={gallery.is_active ? 'success' : 'secondary'}>
                          {gallery.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                        <Badge bg="info">{gallery.image_count} images</Badge>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    {/* Gallery Controls */}
                    <div className="d-flex gap-2 mb-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleToggleActive(gallery)}
                      >
                        <i className={`bi bi-eye${gallery.is_active ? '-slash' : ''} me-1`}></i>
                        {gallery.is_active ? 'Hide' : 'Show'} on Public Page
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteGallery(gallery.id, gallery.name)}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete Gallery
                      </Button>
                    </div>

                    {/* Upload Images */}
                    <div className="mb-3">
                      <Form.Label className="fw-bold">Upload Images</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(gallery.id, Array.from(e.target.files))}
                        disabled={uploadingToGallery === gallery.id}
                      />
                      <Form.Text className="text-muted">
                        Select images to preview and add captions before uploading (max 10MB each)
                      </Form.Text>
                      {uploadingToGallery === gallery.id && (
                        <div className="mt-2">
                          <Spinner animation="border" size="sm" className="me-2" />
                          <small>Uploading...</small>
                        </div>
                      )}
                    </div>

                    {/* Gallery Images */}
                    {gallery.images && gallery.images.length > 0 ? (
                      <div className="row g-3">
                        {gallery.images.map((image, index) => (
                          <div key={image.id} className="col-md-6 col-lg-4">
                            <Card className="h-100">
                              <Card.Img
                                variant="top"
                                src={image.image_url}
                                alt={image.alt_text || image.caption}
                                style={{ height: '200px', objectFit: 'cover' }}
                              />
                              <Card.Body className="p-2">
                                {editingCaption === image.id ? (
                                  <InputGroup size="sm">
                                    <Form.Control
                                      value={captionValue}
                                      onChange={(e) => setCaptionValue(e.target.value)}
                                      placeholder="Enter caption..."
                                    />
                                    <Button
                                      variant="success"
                                      onClick={() => handleSaveCaption(image.id)}
                                    >
                                      <i className="bi bi-check"></i>
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() => setEditingCaption(null)}
                                    >
                                      <i className="bi bi-x"></i>
                                    </Button>
                                  </InputGroup>
                                ) : (
                                  <div
                                    className="small text-truncate cursor-pointer"
                                    onClick={() => {
                                      setEditingCaption(image.id);
                                      setCaptionValue(image.caption || '');
                                    }}
                                    title="Click to edit caption"
                                  >
                                    {image.caption || 'No caption (click to add)'}
                                  </div>
                                )}
                                <div className="d-flex gap-1 mt-2">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleMoveImage(gallery, index, 'up')}
                                    disabled={index === 0}
                                  >
                                    <i className="bi bi-arrow-up"></i>
                                  </Button>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleMoveImage(gallery, index, 'down')}
                                    disabled={index === gallery.images.length - 1}
                                  >
                                    <i className="bi bi-arrow-down"></i>
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="ms-auto"
                                    onClick={() => handleDeleteImage(image.id, gallery.name)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 bg-light rounded border border-2 border-dashed">
                        <i className="bi bi-cloud-upload fs-1 text-primary d-block mb-3" style={{ opacity: 0.5 }}></i>
                        <h5 className="text-muted mb-2">Gallery ready for images!</h5>
                        <p className="text-muted mb-3">
                          Upload images using the button above to populate this gallery.
                        </p>
                        <p className="text-muted small mb-0">
                          <i className="bi bi-info-circle me-1"></i>
                          Gallery will appear on public page once images are added
                        </p>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Body>
      </Card>

      {/* Create Gallery Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Gallery</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Gallery Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Luxury Rooms, Pool Area"
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={newGalleryCategory}
                onChange={(e) => setNewGalleryCategory(e.target.value)}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Brief description of this gallery..."
                value={newGalleryDescription}
                onChange={(e) => setNewGalleryDescription(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateGallery}>
            <i className="bi bi-plus-lg me-2"></i>
            Create Gallery
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Upload Preview Modal */}
      <Modal show={showUploadModal} onHide={handleCancelUpload} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-upload me-2"></i>
            Preview & Add Captions
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {pendingImages.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No images to upload</p>
            </div>
          ) : (
            <div className="row g-3">
              {pendingImages.map((img, index) => (
                <div key={index} className="col-md-6">
                  <Card>
                    <div style={{ position: 'relative' }}>
                      <Card.Img
                        variant="top"
                        src={img.previewUrl}
                        alt={img.filename}
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                        }}
                        onClick={() => handleRemovePendingImage(index)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </Button>
                    </div>
                    <Card.Body>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Caption</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter image caption..."
                          value={img.caption}
                          onChange={(e) => handleUpdatePendingCaption(index, e.target.value)}
                        />
                        <Form.Text className="text-muted">
                          {img.filename}
                        </Form.Text>
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelUpload}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmUpload}
            disabled={pendingImages.length === 0 || uploadingToGallery}
          >
            {uploadingToGallery ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload me-2"></i>
                Upload {pendingImages.length} Image{pendingImages.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
