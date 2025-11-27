import React, { useState } from 'react';
import { Container, Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createGalleryContainer, bulkUploadGalleryImages } from '@/services/sectionEditorApi';

/**
 * GallerySectionView - Public view for gallery section with inline editing
 */
const GallerySectionView = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const galleries = section.galleries || [];
  const [selectedImage, setSelectedImage] = useState(null);
  const [showHover, setShowHover] = useState(false);
  const [showNewGallery, setShowNewGallery] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingTo, setUploadingTo] = useState(null);
  // Auto-select first gallery if only one exists, otherwise show 'all'
  const [activeView, setActiveView] = useState(
    galleries.length === 1 ? galleries[0]?.id : 'all'
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show empty state for staff if no galleries yet
  if (galleries.length === 0 && isStaff) {
    return (
      <section 
        className="gallery-section-view" 
        style={{ 
          width: '100vw', 
          marginLeft: 'calc(-50vw + 50%)'
        }}
      >
        <Container fluid className="px-3 px-md-5">
          <h2 className="text-center mb-4">{section.name}</h2>
          <div className="text-center py-5">
            <i className="bi bi-images" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
            <h4 className="mt-3 text-muted">No Galleries Yet</h4>
            <p className="text-muted mb-4">Create your first gallery to start adding photos</p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => setShowNewGallery(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create First Gallery
            </Button>
          </div>
        </Container>

        {/* New Gallery Modal */}
        <Modal show={showNewGallery} onHide={() => setShowNewGallery(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Create New Gallery</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Gallery Name</Form.Label>
              <Form.Control
                type="text"
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
                placeholder="e.g., Lobby & Reception, Rooms, Restaurant"
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewGallery(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateGallery} disabled={creating}>
              {creating ? 'Creating...' : 'Create Gallery'}
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    );
  }

  // Don't render for non-staff if no galleries
  if (galleries.length === 0) {
    return null;
  }

  const hasImages = galleries.some(g => g.images && g.images.length > 0);
  
  // Get all images for "All Images" view
  const allImages = galleries.flatMap(g => g.images || []);
  
  // Get currently selected gallery
  const selectedGallery = activeView === 'all' ? null : galleries.find(g => g.id === activeView);

  // Get current images to display
  const displayImages = activeView === 'all' 
    ? allImages 
    : (selectedGallery?.images || []);

  // Calculate total items (images + add button for staff in single gallery view)
  const totalItems = activeView !== 'all' && isStaff 
    ? displayImages.length + 1 
    : displayImages.length;

  const imagesPerView = 3; // Show 3 images at a time
  const maxIndex = Math.max(0, totalItems - imagesPerView);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Reset index when changing views
  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentIndex(0);
  };

  const handleCreateGallery = async () => {
    if (!newGalleryName.trim()) {
      toast.error('Please enter a gallery name');
      return;
    }

    try {
      setCreating(true);
      await createGalleryContainer(slug, {
        section: section.id,
        name: newGalleryName,
        sort_order: galleries.length,
      });
      toast.success('Gallery created successfully');
      setNewGalleryName('');
      setShowNewGallery(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create gallery:', error);
      toast.error('Failed to create gallery');
    } finally {
      setCreating(false);
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
      await bulkUploadGalleryImages(slug, galleryId, files);
      toast.success(`${files.length} image(s) uploaded successfully`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingTo(null);
    }
  };

  return (
    <section 
      className="gallery-section-view position-relative"
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      {/* Create Gallery Button - Top Right Corner on Hover */}
      {isStaff && showHover && (
        <div 
          className="position-absolute" 
          style={{ 
            top: '20px', 
            right: '20px', 
            zIndex: 10,
            transition: 'opacity 0.3s'
          }}
        >
          <Button
            variant="success"
            size="sm"
            onClick={() => setShowNewGallery(true)}
            className="shadow"
          >
            <i className="bi bi-plus-circle me-2"></i>
            New Gallery
          </Button>
        </div>
      )}

      <Container>
        <h2 className="text-center mb-4">{section.name}</h2>
        
        {/* Gallery Filter Buttons */}
        {galleries.length > 1 && (
          <div className="d-flex justify-content-center mb-4 flex-wrap gap-2">
            <Button
              variant={activeView === 'all' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => handleViewChange('all')}
            >
              All Images
            </Button>
            {galleries.map((gallery) => (
              <Button
                key={gallery.id}
                variant={activeView === gallery.id ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleViewChange(gallery.id)}
              >
                {gallery.name}
              </Button>
            ))}
          </div>
        )}

        {/* Display Images with Arrow Navigation */}
        {totalItems === 0 ? (
          isStaff && activeView !== 'all' && selectedGallery ? (
            <div className="text-center py-5">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(selectedGallery.id, e)}
                style={{ display: 'none' }}
                id={`gallery-upload-empty-${selectedGallery.id}`}
                disabled={uploadingTo === selectedGallery.id}
              />
              <div
                onClick={() => document.getElementById(`gallery-upload-empty-${selectedGallery.id}`).click()}
                style={{
                  maxWidth: '400px',
                  margin: '0 auto',
                  padding: '3rem',
                  backgroundColor: '#f8f9fa',
                  border: '2px dashed #dee2e6',
                  borderRadius: '12px',
                  cursor: uploadingTo === selectedGallery.id ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (uploadingTo !== selectedGallery.id) {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                    e.currentTarget.style.borderColor = '#adb5bd';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }}
              >
                {uploadingTo === selectedGallery.id ? (
                  <>
                    <Spinner animation="border" />
                    <p className="mt-3 text-muted">Uploading images...</p>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-upload" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <h5 className="mt-3">Add Images to {selectedGallery.name}</h5>
                    <p className="text-muted mb-0">Click to upload up to 20 images</p>
                    <small className="text-muted">or drag and drop</small>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted text-center py-5">No images yet</p>
          )
        ) : (
          <div className="position-relative">
            {/* Previous Button */}
            {currentIndex > 0 && (
              <Button
                variant="light"
                className="position-absolute start-0 top-50 translate-middle-y shadow"
                style={{ zIndex: 10 }}
                onClick={handlePrevious}
              >
                <i className="bi bi-chevron-left"></i>
              </Button>
            )}

            {/* Images Container */}
            <div 
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem 2.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  transform: `translateX(-${currentIndex * (100 / imagesPerView + 1)}%)`,
                  transition: 'transform 0.3s ease',
                  width: '100%',
                }}
              >
                {/* Add Images Button/Placeholder - Only for single gallery view */}
                {activeView !== 'all' && isStaff && (
                  <div style={{ flexShrink: 0, width: `calc(${100 / imagesPerView}% - 1rem)`, minWidth: '250px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(selectedGallery.id, e)}
                      style={{ display: 'none' }}
                      id={`gallery-upload-${selectedGallery.id}`}
                      disabled={uploadingTo === selectedGallery.id}
                    />
                    <div
                      onClick={() => document.getElementById(`gallery-upload-${selectedGallery.id}`).click()}
                      style={{
                        height: '250px',
                        backgroundColor: '#f8f9fa',
                        border: '2px dashed #dee2e6',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: uploadingTo === selectedGallery.id ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (uploadingTo !== selectedGallery.id) {
                          e.currentTarget.style.backgroundColor = '#e9ecef';
                          e.currentTarget.style.borderColor = '#adb5bd';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#dee2e6';
                      }}
                    >
                      {uploadingTo === selectedGallery.id ? (
                        <>
                          <Spinner animation="border" />
                          <small className="mt-2 text-muted">Uploading...</small>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                          <small className="mt-2 text-muted">Add Images</small>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Gallery Images */}
                {displayImages.map((image) => (
                  <div
                    key={image.id}
                    style={{
                      flexShrink: 0,
                      width: `calc(${100 / imagesPerView}% - 1rem)`,
                      minWidth: '250px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.image_url}
                      alt={image.caption || 'Gallery image'}
                      className="rounded shadow-sm"
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                    {image.caption && (
                      <p className="text-center mt-2 small text-muted mb-0">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Button */}
            {currentIndex < maxIndex && (
              <Button
                variant="light"
                className="position-absolute end-0 top-50 translate-middle-y shadow"
                style={{ zIndex: 10 }}
                onClick={handleNext}
              >
                <i className="bi bi-chevron-right"></i>
              </Button>
            )}
          </div>
        )}
      </Container>

      {/* Image Modal */}
      <Modal 
        show={!!selectedImage} 
        onHide={() => setSelectedImage(null)}
        size="xl"
        centered
      >
        <Modal.Body className="p-0">
          {selectedImage && (
            <>
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption || 'Gallery image'}
                className="w-100"
                style={{ maxHeight: '90vh', objectFit: 'contain' }}
              />
              {selectedImage.caption && (
                <div className="p-3 bg-dark text-white">
                  {selectedImage.caption}
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* New Gallery Modal */}
      <Modal show={showNewGallery} onHide={() => setShowNewGallery(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Gallery</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Gallery Name</Form.Label>
            <Form.Control
              type="text"
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              placeholder="e.g., Dining Area, Pool, Lobby"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewGallery(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateGallery} disabled={creating}>
            {creating ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create Gallery'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default GallerySectionView;
