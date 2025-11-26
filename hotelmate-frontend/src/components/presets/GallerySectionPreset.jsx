import React, { useState, useMemo, useRef } from 'react';
import { Row, Col, Button, ButtonGroup } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import GalleryImageRenderer from './GalleryImageRenderer';
import { useGalleryScroll } from './useGalleryScroll';
import { bulkUploadGalleryImages } from '@/services/sectionEditorApi';

/**
 * GallerySectionPreset - Renders gallery section based on numeric style_variant (1-5)
 * 
 * Features:
 * - Shows ALL images initially
 * - Filter buttons to show specific gallery
 * - Lightbox with navigation arrows
 * - Add image placeholder for staff (+ button)
 * - Maintains preset styling (1-5)
 */
const GallerySectionPreset = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const variant = section.style_variant ?? 1; // Default to Preset 1
  const galleries = section.galleries || [];
  const [selectedGalleryId, setSelectedGalleryId] = useState('all'); // 'all' or specific gallery id
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  if (galleries.length === 0) {
    return null;
  }

  // Get all images from all galleries
  const allImages = useMemo(() => {
    return galleries.flatMap(gallery => 
      (gallery.images || []).map(img => ({ ...img, gallery_name: gallery.name }))
    );
  }, [galleries]);

  // Get filtered images based on selected gallery
  const displayedImages = useMemo(() => {
    if (selectedGalleryId === 'all') {
      return allImages;
    }
    const gallery = galleries.find(g => g.id === selectedGalleryId);
    return gallery?.images || [];
  }, [selectedGalleryId, galleries, allImages]);

  // Use custom hook for gallery scrolling
  const { scrollPosition, setScrollPosition, maxScroll, scrollContainerRef, handleScroll } = useGalleryScroll(displayedImages);

  const handleImageClick = (image) => {
    const index = displayedImages.findIndex(img => img.id === image.id);
    setCurrentImageIndex(index);
    setSelectedImage(image);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction) => {
    const newIndex = direction === 'next' 
      ? (currentImageIndex + 1) % displayedImages.length
      : (currentImageIndex - 1 + displayedImages.length) % displayedImages.length;
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(displayedImages[newIndex]);
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (selectedGalleryId === 'all') {
      toast.error('Please select a specific gallery to upload images');
      return;
    }

    if (files.length > 20) {
      toast.error('Maximum 20 images at once');
      return;
    }

    try {
      setUploadingImages(true);
      await bulkUploadGalleryImages(slug, selectedGalleryId, files);
      toast.success(`${files.length} image(s) uploaded successfully`);
      if (onUpdate) onUpdate();
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddImageClick = () => {
    setShowAddImageModal(true);
    // TODO: Implement image upload modal
    console.log('Add image clicked for gallery:', selectedGalleryId);
  };



  // Render gallery filter buttons
  const renderGalleryFilters = () => {
    if (galleries.length <= 1) return null;

    return (
      <div className="gallery__filters text-center mb-4">
        <ButtonGroup>
          <Button 
            variant={selectedGalleryId === 'all' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedGalleryId('all')}
          >
            All Images ({allImages.length})
          </Button>
          {galleries.map(gallery => (
            <Button
              key={gallery.id}
              variant={selectedGalleryId === gallery.id ? 'primary' : 'outline-primary'}
              onClick={() => setSelectedGalleryId(gallery.id)}
            >
              {gallery.name} ({gallery.images?.length || 0})
            </Button>
          ))}
        </ButtonGroup>
      </div>
    );
  };

  // Common gallery layout for all presets
  const renderGalleryLayout = () => {
    return (
      <>
        <h2 className={`gallery__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
        {renderGalleryFilters()}
        
        <div 
          style={{ position: 'relative', padding: '0 50px' }}
          onMouseEnter={() => setShowHover(true)}
          onMouseLeave={() => setShowHover(false)}
        >
          {/* Left Arrow */}
          {scrollPosition > 0 && showHover && (
            <button
              onClick={() => handleScroll('left')}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 1)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <i className="bi bi-chevron-left" style={{ fontSize: '1.5rem' }}></i>
            </button>
          )}

          {/* Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            style={{
              display: 'flex',
              gap: '1rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              padding: '1rem 0'
            }}
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {/* Add Image Placeholder - First */}
            {isStaff && selectedGalleryId !== 'all' && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id={`gallery-upload-${selectedGalleryId}`}
                  ref={fileInputRef}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flexShrink: 0,
                    width: '300px',
                    height: '250px',
                    border: '3px dashed #dee2e6',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingImages ? 'wait' : 'pointer',
                    backgroundColor: '#f8f9fa',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadingImages) {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                      e.currentTarget.style.borderColor = '#adb5bd';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#dee2e6';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {uploadingImages ? (
                    <>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Uploading...</span>
                      </div>
                      <p style={{ marginTop: '1rem', color: '#6c757d', fontWeight: '500' }}>Uploading...</p>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                      <p style={{ marginTop: '1rem', color: '#6c757d', fontWeight: '500' }}>Add Images</p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Images */}
            {displayedImages.map((image) => (
              <div
                key={image.id}
                style={{
                  flexShrink: 0,
                  width: '300px',
                  height: '250px',
                  cursor: 'pointer',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s ease'
                }}
                onClick={() => handleImageClick(image)}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <img
                  src={image.image_url}
                  alt={image.caption || image.alt_text || 'Gallery image'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {scrollPosition < maxScroll - 10 && showHover && (
            <button
              onClick={() => handleScroll('right')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 1)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <i className="bi bi-chevron-right" style={{ fontSize: '1.5rem' }}></i>
            </button>
          )}
        </div>
      </>
    );
  };

  // Preset 1: Clean & Modern - Horizontal scroll
  if (variant === 1) {
    return (
      <section className={`gallery gallery--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          {renderGalleryLayout()}
        </div>
        {renderLightbox()}
      </section>
    );
  }

  // Preset 2: Dark & Elegant - Horizontal scroll
  if (variant === 2) {
    return (
      <section className={`gallery gallery--preset-2 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          {renderGalleryLayout()}
        </div>
        {renderLightbox()}
      </section>
    );
  }

  // Preset 3: Minimal & Sleek - Horizontal scroll
  if (variant === 3) {
    return (
      <section className={`gallery gallery--preset-3 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          {renderGalleryLayout()}
        </div>
        {renderLightbox()}
      </section>
    );
  }

  // Preset 4: Vibrant & Playful - Horizontal scroll
  if (variant === 4) {
    return (
      <section className={`gallery gallery--preset-4 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          {renderGalleryLayout()}
        </div>
        {renderLightbox()}
      </section>
    );
  }

  // Preset 5: Professional & Structured - Horizontal scroll
  if (variant === 5) {
    return (
      <section className={`gallery gallery--preset-5 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          {renderGalleryLayout()}
        </div>
        {renderLightbox()}
      </section>
    );
  }

  // Fallback to Preset 1
  return (
    <section className={`gallery gallery--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container">
        {renderGalleryLayout()}
      </div>
      {renderLightbox()}
    </section>
  );

  function renderLightbox() {
    if (!selectedImage) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
        onClick={closeLightbox}
      >
        {/* Close Button */}
        <button 
          onClick={closeLightbox}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1.5rem',
            transition: 'background 0.3s ease',
            zIndex: 10000
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          <i className="bi bi-x-lg"></i>
        </button>

        {/* Image Container */}
        <div 
          style={{
            position: 'relative',
            width: '95vw',
            maxHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Previous Arrow */}
          {displayedImages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.5rem',
                transition: 'all 0.3s ease',
                zIndex: 10001
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
          )}

          {/* Image */}
          <img 
            src={selectedImage.image_url} 
            alt={selectedImage.caption || selectedImage.alt_text || 'Gallery image'}
            style={{
              width: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          {/* Next Arrow */}
          {displayedImages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.5rem',
                transition: 'all 0.3s ease',
                zIndex: 10001
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          )}

          {/* Caption */}
          {selectedImage.caption && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                textAlign: 'center',
                fontSize: '1rem',
                maxWidth: '600px',
                padding: '0.5rem'
              }}
            >
              {selectedImage.caption}
            </div>
          )}

          {/* Image counter */}
          <div 
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            {currentImageIndex + 1} / {displayedImages.length}
          </div>
        </div>
      </div>
    );
  }
};

export default GallerySectionPreset;
