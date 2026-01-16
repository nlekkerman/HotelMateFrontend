// TODO: migrate this domain to centralized realtime (eventBus + store)
import React, { useState, useEffect } from 'react';
import { Row, Col, Modal, Badge, Spinner, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import Pusher from 'pusher-js';
import api from '@/services/api';

/**
 * GallerySection - Display hotel galleries organized by category
 * Fetches from the new gallery system API with real-time updates
 */
const GallerySection = ({ hotelSlug, hotelName, isStaff = false }) => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const scrollContainerRef = React.useRef(null);

  // Category options for filtering
  const categoryOptions = [
    { value: 'all', label: 'All', icon: 'grid' },
    { value: 'rooms', label: 'Rooms', icon: 'door-closed' },
    { value: 'facilities', label: 'Facilities', icon: 'building' },
    { value: 'dining', label: 'Dining', icon: 'cup-hot' },
    { value: 'spa', label: 'Spa', icon: 'water' },
    { value: 'events', label: 'Events', icon: 'calendar-event' },
    { value: 'exterior', label: 'Exterior', icon: 'house' },
    { value: 'activities', label: 'Activities', icon: 'bicycle' },
    { value: 'other', label: 'Other', icon: 'images' },
  ];

  // Fetch galleries from API
  const fetchGalleries = async () => {
    try {
      setLoading(true);
      console.log('[GallerySection] 📡 Fetching galleries for:', hotelSlug);
      const response = await api.get(`/staff/hotel/${hotelSlug}/galleries/`);
      console.log('[GallerySection] 📦 Response received:', response);
      
      // Handle paginated response - check for results array
      let data = [];
      if (response.data && response.data.results) {
        // Paginated response
        data = response.data.results;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
      } else if (Array.isArray(response)) {
        // Response is already the array
        data = response;
      }
      
      console.log('[GallerySection] 📊 Data to process:', data);
      console.log('[GallerySection] 🔍 Data is array?', Array.isArray(data));
      
      // For staff: show all active galleries (even empty ones)
      // For public: only show galleries with images
      const activeGalleries = isStaff 
        ? data.filter(g => g.is_active)
        : data.filter(g => g.is_active && g.images && g.images.length > 0);
      
      console.log('[GallerySection] ✅ Active galleries:', activeGalleries);
      setGalleries(activeGalleries);
    } catch (error) {
      console.error('[GallerySection] ❌ Failed to fetch galleries:', error);
      console.error('[GallerySection] Error details:', error.response || error.message);
      setGalleries([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Setup initial fetch and real-time updates via Pusher
  useEffect(() => {
    if (!hotelSlug) return;

    // Initial fetch
    fetchGalleries();

    // REMOVED: Direct Pusher usage - gallery updates should come through canonical stores  
    // All realtime updates must flow through channelRegistry → eventBus → stores
    console.warn('[GallerySection] Direct Pusher usage removed - implement gallery store if realtime needed');
  }, [hotelSlug]);

  // Get unique categories that actually have galleries
  const availableCategories = [...new Set(galleries.map(g => g.category))];
  
  // Filter category options to only show categories with galleries
  const activeCategoryOptions = categoryOptions.filter(cat => 
    cat.value === 'all' || availableCategories.includes(cat.value)
  );

  // Filter galleries by selected category
  const filteredGalleries = selectedCategory === 'all'
    ? galleries
    : galleries.filter(g => g.category === selectedCategory);

  // Scroll function for gallery navigation
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 370; // 350px image width + 20px gap
      const newScrollPosition = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="gallery-section py-5 bg-light">
        <div className="section-container text-center">
          <Spinner animation="border" />
          <p className="mt-2 text-muted">Loading gallery...</p>
        </div>
      </section>
    );
  }

  // No galleries at all - show placeholder for staff, hide for public
  if (galleries.length === 0) {
    if (isStaff) {
      return (
        <section className="gallery-section py-5 bg-light">
          <div className="section-container">
            <Card className="shadow-sm border-2 border-dashed" style={{ borderColor: '#3498db' }}>
              <Card.Body className="text-center py-5">
                <div className="mb-3" style={{ fontSize: '4rem', color: '#3498db', opacity: 0.3 }}>
                  <i className="bi bi-images"></i>
                </div>
                <h3 className="mb-3 text-muted">No Galleries Yet</h3>
                <p className="text-muted mb-2">
                  Create your first gallery to organize hotel images by category.
                </p>
                <p className="text-muted small mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Go to Settings → Gallery Management to create galleries
                </p>
              </Card.Body>
            </Card>
          </div>
        </section>
      );
    }
    return null; // Hide for public users
  }

  // Check if all galleries are empty (no images)
  const allGalleriesEmpty = galleries.every(g => !g.images || g.images.length === 0);
  
  if (allGalleriesEmpty) {
    if (isStaff) {
      return (
        <section className="gallery-section py-5 bg-light">
          <div className="section-container">
            <Card className="shadow-sm border-2 border-dashed" style={{ borderColor: '#3498db' }}>
              <Card.Body className="text-center py-5">
                <div className="mb-3" style={{ fontSize: '4rem', color: '#3498db', opacity: 0.3 }}>
                  <i className="bi bi-images"></i>
                </div>
                <h3 className="mb-3 text-muted">Galleries Created, Awaiting Images</h3>
                <p className="text-muted mb-2">
                  You have {galleries.length} {galleries.length === 1 ? 'gallery' : 'galleries'} set up, but they need images to display here.
                </p>
                <p className="text-muted small mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Go to Settings → Gallery Management to upload photos
                </p>
              </Card.Body>
            </Card>
          </div>
        </section>
      );
    }
    return null; // Hide for public users
  }

  return (
    <>
      <section className="gallery-section py-5 bg-light">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="section-heading text-center mb-4">
              <i className="bi bi-images me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
              Explore Our Hotel
            </h3>

            {/* Category Filter - Only show categories that exist */}
            {activeCategoryOptions.length > 1 && (
              <div className="d-flex justify-content-center gap-2 mb-4 flex-wrap">
                {activeCategoryOptions.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    style={{
                      padding: '8px 16px',
                      border: selectedCategory === cat.value ? '2px solid var(--main-color, #3498db)' : '1px solid #ddd',
                      borderRadius: '20px',
                      background: selectedCategory === cat.value ? 'var(--main-color, #3498db)' : 'white',
                      color: selectedCategory === cat.value ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontSize: '0.9rem',
                    }}
                    className="category-filter-btn"
                  >
                    <i className={`bi bi-${cat.icon} me-1`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Display filtered galleries */}
            {filteredGalleries.map((gallery, galleryIndex) => {
              // Skip galleries with no images
              if (!gallery.images || gallery.images.length === 0) return null;
                
                return (
                <div key={gallery.id} className="mb-5">
                  <div className="d-flex align-items-center justify-content-between mb-3 px-3">
                    <div>
                      <h4 className="mb-1">
                        <i className={`bi bi-${categoryOptions.find(c => c.value === gallery.category)?.icon || 'images'} me-2`}></i>
                        {gallery.name}
                      </h4>
                      {gallery.description && (
                        <p className="text-muted mb-0 small">{gallery.description}</p>
                      )}
                    </div>
                    <Badge bg="info">{gallery.images.length} photos</Badge>
                  </div>

                  <div style={{ position: 'relative' }}>
                    {/* Left Arrow */}
                    {gallery.images.length > 3 && (
                      <button
                        onClick={() => scroll('left', galleryIndex)}
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          transition: 'all 0.3s',
                        }}
                        className="gallery-nav-btn"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                      >
                        <i className="bi bi-chevron-left" style={{ fontSize: '1.5rem', color: 'var(--main-color, #3498db)' }}></i>
                      </button>
                    )}

                    {/* Right Arrow */}
                    {gallery.images.length > 3 && (
                      <button
                        onClick={() => scroll('right', galleryIndex)}
                        style={{
                          position: 'absolute',
                          right: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          transition: 'all 0.3s',
                        }}
                        className="gallery-nav-btn"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                      >
                        <i className="bi bi-chevron-right" style={{ fontSize: '1.5rem', color: 'var(--main-color, #3498db)' }}></i>
                      </button>
                    )}

                    <div
                      ref={el => scrollContainerRef.current = el}
                      className="gallery-horizontal-scroll"
                      style={{
                        display: 'flex',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        gap: '1rem',
                        padding: '1rem 2rem',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--main-color, #3498db) #f0f0f0'
                      }}
                    >
                      {gallery.images.map((image, index) => (
                        <motion.div
                          key={image.id}
                          className="gallery-item"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setSelectedImage({ url: image.image_url, caption: image.caption, alt: image.alt_text })}
                          style={{
                            cursor: 'pointer',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            minWidth: '350px',
                            height: '250px',
                            position: 'relative',
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={image.image_url}
                            alt={image.alt_text || image.caption || `${hotelName} - ${gallery.name}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            loading="lazy"
                            onError={(e) => {
                              console.error('Gallery image failed to load:', image.image_url);
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                              padding: '30px 15px 15px',
                              color: 'white',
                              opacity: 0,
                              transition: 'opacity 0.3s',
                            }}
                            className="gallery-item-overlay"
                          >
                            {image.caption && (
                              <p className="mb-1 small">{image.caption}</p>
                            )}
                            <i className="bi bi-arrows-fullscreen"></i>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <Modal
        show={!!selectedImage}
        onHide={() => setSelectedImage(null)}
        size="xl"
        centered
        className="gallery-modal"
      >
        <Modal.Body className="p-0" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            ×
          </button>
          {selectedImage && (
            <div>
              <img
                src={selectedImage.url}
                alt={selectedImage.alt || selectedImage.caption || hotelName}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                }}
              />
              {selectedImage.caption && (
                <div style={{ 
                  color: 'white', 
                  textAlign: 'center', 
                  padding: '15px',
                  fontSize: '1.1rem'
                }}>
                  {selectedImage.caption}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      <style>{`
        .gallery-item:hover .gallery-item-overlay {
          opacity: 1 !important;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar {
          height: 8px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 10px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-thumb {
          background: var(--main-color, #3498db);
          border-radius: 10px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-thumb:hover {
          background: #2980b9;
        }
        
        .category-filter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
};

export default GallerySection;
