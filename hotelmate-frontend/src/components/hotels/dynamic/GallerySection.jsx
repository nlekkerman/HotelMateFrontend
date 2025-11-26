import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Modal, Button } from 'react-bootstrap';
import InlineItemEditor from '@/components/builder/InlineItemEditor';
import { useAuth } from '@/context/AuthContext';

const GallerySection = ({ element, onRefresh }) => {
  const { title, items = [], settings = {} } = element;
  const { layout = 'grid' } = settings;
  const { isStaff } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const hotelSlug = window.location.pathname.split('/')[2] || window.location.pathname.split('/')[1];

  const handleAddSuccess = () => {
    setShowAddModal(false);
    if (onRefresh) onRefresh();
    // Refresh page to show new image
    window.location.reload();
  };

  // Show placeholder if no items
  if (!items || items.length === 0) {
    return (
      <>
        <section className="gallery-section py-5" style={{ backgroundColor: '#f8f9fa', position: 'relative' }}>
          <Container>
            <div className="text-center py-5">
              <i className="bi bi-images display-1 text-muted mb-3"></i>
              <h3 className="text-muted">{title || 'Photo Gallery'}</h3>
              <p className="text-muted mb-4">No images have been added yet.</p>
              {isStaff && (
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => setShowAddModal(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Images to Gallery
                </Button>
              )}
            </div>
          </Container>
        </section>

        {isStaff && (
          <InlineItemEditor
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            elementId={element.id}
            elementType="gallery"
            hotelSlug={hotelSlug}
            onSuccess={handleAddSuccess}
          />
        )}
      </>
    );
  }

  const handleImageClick = (item) => {
    setSelectedImage(item);
    setShowModal(true);
  };

  if (layout === 'carousel') {
    // Simple carousel implementation - can be enhanced with a carousel library
    return (
      <section className="gallery-section py-5 bg-light">
        <Container>
          {title && (
            <h2 className="text-center fw-bold mb-5">{title}</h2>
          )}
          
          <div id="galleryCarousel" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {items.map((item, index) => (
                <div key={item.id} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="d-block w-100"
                    style={{ maxHeight: '600px', objectFit: 'cover' }}
                  />
                  {item.title && (
                    <div className="carousel-caption">
                      <h5>{item.title}</h5>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {items.length > 1 && (
              <>
                <button 
                  className="carousel-control-prev" 
                  type="button" 
                  data-bs-target="#galleryCarousel" 
                  data-bs-slide="prev"
                >
                  <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span className="visually-hidden">Previous</span>
                </button>
                <button 
                  className="carousel-control-next" 
                  type="button" 
                  data-bs-target="#galleryCarousel" 
                  data-bs-slide="next"
                >
                  <span className="carousel-control-next-icon" aria-hidden="true"></span>
                  <span className="visually-hidden">Next</span>
                </button>
              </>
            )}
          </div>
        </Container>
      </section>
    );
  }

  // Grid layout (default)
  return (
    <>
      <section className="gallery-section py-5 bg-light">
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-5">
            {title && (
              <h2 className="fw-bold mb-0">{title}</h2>
            )}
            {isStaff && (
              <Button 
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add Image
              </Button>
            )}
          </div>
        
        <Row className="g-3">
          {items.map((item, index) => {
            // Create interesting grid layout
            const colSize = index % 4 === 0 ? 8 : 4;
            
            return (
              <Col key={item.id} xs={12} md={colSize}>
                <div 
                  className="gallery-item position-relative overflow-hidden rounded shadow-sm cursor-pointer"
                  style={{ height: '300px' }}
                  onClick={() => handleImageClick(item)}
                >
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-100 h-100 object-fit-cover hover-scale transition"
                    style={{ cursor: 'pointer' }}
                  />
                  
                  {item.title && (
                    <div 
                      className="position-absolute bottom-0 start-0 end-0 p-3 text-white"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)'
                      }}
                    >
                      <h5 className="mb-0">{item.title}</h5>
                    </div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </Container>
      
      {/* Image View Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="xl" 
        centered
      >
        <Modal.Body className="p-0">
          {selectedImage && (
            <div className="position-relative">
              <img 
                src={selectedImage.image_url} 
                alt={selectedImage.title}
                className="w-100"
                style={{ maxHeight: '90vh', objectFit: 'contain' }}
              />
              {selectedImage.title && (
                <div 
                  className="position-absolute bottom-0 start-0 end-0 p-4 text-white"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                  }}
                >
                  <h4>{selectedImage.title}</h4>
                </div>
              )}
              <button 
                className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
                onClick={() => setShowModal(false)}
                style={{ fontSize: '1.5rem' }}
              ></button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Add Image Modal */}
      {isStaff && (
        <InlineItemEditor
          show={showAddModal}
          onHide={() => setShowAddModal(false)}
          elementId={element.id}
          elementType="gallery"
          hotelSlug={hotelSlug}
          onSuccess={handleAddSuccess}
        />
      )}
    </section>
    </>
  );
};

GallerySection.propTypes = {
  element: PropTypes.shape({
    title: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string,
        image_url: PropTypes.string.isRequired,
        sort_order: PropTypes.number,
      })
    ),
    settings: PropTypes.shape({
      layout: PropTypes.oneOf(['grid', 'carousel']),
    }),
  }).isRequired,
};

export default GallerySection;
