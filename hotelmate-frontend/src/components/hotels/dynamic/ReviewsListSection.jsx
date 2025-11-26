import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import InlineItemEditor from '../../builder/InlineItemEditor';

const ReviewsListSection = ({ element, hotelSlug }) => {
  const { title, items = [] } = element;
  const { isStaff } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  const handleAddSuccess = (newItem) => {
    setLocalItems([...localItems, newItem]);
    setShowAddModal(false);
  };

  // Show placeholder if no items
  if (!localItems || localItems.length === 0) {
    return (
      <>
        <section className="reviews-list-section py-5" style={{ backgroundColor: '#f8f9fa' }}>
          <Container>
            <div className="text-center py-5">
              <i className="bi bi-star display-1 text-muted mb-3"></i>
              <h3 className="text-muted">{title || 'Customer Reviews'}</h3>
              <p className="text-muted mb-4">No reviews have been added yet.</p>
              {/* Add button - visible to staff */}
              {isStaff && (
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowAddModal(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Reviews
                </button>
              )}
            </div>
          </Container>
        </section>

        {/* Add Review Modal */}
        {isStaff && (
          <InlineItemEditor
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            elementId={element.id}
            elementType="reviews_list"
            hotelSlug={hotelSlug}
            onSuccess={handleAddSuccess}
          />
        )}
      </>
    );
  }

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`star-${i}`} className="bi bi-star-fill text-warning"></i>);
    }
    
    if (hasHalfStar) {
      stars.push(<i key="star-half" className="bi bi-star-half text-warning"></i>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="bi bi-star text-warning"></i>);
    }
    
    return stars;
  };

  return (
    <>
    <section className="reviews-list-section py-5">
      <Container>
        {/* Header with Add Button */}
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div className="text-center w-100">
            {title && (
              <h2 className="fw-bold">{title}</h2>
            )}
          </div>
          
          {isStaff && (
            <button 
              className="btn btn-outline-primary btn-sm ms-3"
              onClick={() => setShowAddModal(true)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Review
            </button>
          )}
        </div>
        
        <Row className="g-4">
          {localItems.map((item) => (
            <Col key={item.id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body>
                  {/* Rating Badge */}
                  {item.badge && (
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex gap-1">
                        {item.meta?.rating && renderStars(item.meta.rating)}
                      </div>
                      <span className="badge bg-success">{item.badge}</span>
                    </div>
                  )}
                  
                  {/* Review Title */}
                  {item.title && (
                    <Card.Title className="fw-bold mb-3">{item.title}</Card.Title>
                  )}
                  
                  {/* Review Text */}
                  {item.body && (
                    <Card.Text className="text-muted mb-3" style={{ fontStyle: 'italic' }}>
                      "{item.body}"
                    </Card.Text>
                  )}
                  
                  {/* Reviewer */}
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                    {item.subtitle && (
                      <small className="text-muted fw-bold">— {item.subtitle}</small>
                    )}
                    
                    {item.meta?.source && (
                      <small className="text-muted">
                        via {item.meta.source}
                      </small>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>

    {/* Add Review Modal */}
    {isStaff && (
      <InlineItemEditor
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        elementId={element.id}
        elementType="reviews_list"
        hotelSlug={hotelSlug}
        onSuccess={handleAddSuccess}
      />
    )}
    </>
  );
};

ReviewsListSection.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string,
        subtitle: PropTypes.string,
        body: PropTypes.string,
        badge: PropTypes.string,
        meta: PropTypes.shape({
          rating: PropTypes.number,
          source: PropTypes.string,
        }),
      })
    ),
  }).isRequired,
  hotelSlug: PropTypes.string.isRequired,
};

export default ReviewsListSection;
