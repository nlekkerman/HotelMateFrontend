import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import InlineItemEditor from '../../builder/InlineItemEditor';

const CardsListSection = ({ element, hotelSlug }) => {
  const { title, subtitle, items = [], settings = {} } = element;
  const { columns = 3 } = settings;
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
        <section className="cards-list-section py-5" style={{ backgroundColor: '#f8f9fa' }}>
          <Container>
            <div className="text-center py-5">
              <i className="bi bi-card-list display-1 text-muted mb-3"></i>
              <h3 className="text-muted">{title || 'Cards Section'}</h3>
              <p className="text-muted mb-4">No cards have been added yet.</p>
              {/* Add button - visible to staff */}
              {isStaff && (
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowAddModal(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Cards
                </button>
              )}
            </div>
          </Container>
        </section>

        {/* Add Card Modal */}
        {isStaff && (
          <InlineItemEditor
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            elementId={element.id}
            elementType="cards_list"
            hotelSlug={hotelSlug}
            onSuccess={handleAddSuccess}
          />
        )}
      </>
    );
  }

  return (
    <>
    <section className="cards-list-section py-5">
      <Container>
        {/* Header with Add Button */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="text-center w-100">
            {title && (
              <h2 className="fw-bold mb-2">{title}</h2>
            )}
            
            {subtitle && (
              <p className="text-muted mb-0">{subtitle}</p>
            )}
          </div>
          
          {isStaff && (
            <button 
              className="btn btn-outline-primary btn-sm ms-3"
              onClick={() => setShowAddModal(true)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Card
            </button>
          )}
        </div>
        
        <Row className="g-4">
          {localItems.map((item) => (
            <Col key={item.id} xs={12} md={columns === 4 ? 3 : columns === 2 ? 6 : 4}>
              <Card className="h-100 border-0 shadow-sm text-center hover-shadow-lg transition">
                <Card.Body className="p-4">
                  {item.badge && (
                    <span className="badge bg-primary mb-3">{item.badge}</span>
                  )}
                  
                  {item.meta?.icon && (
                    <div className="mb-3">
                      <i className={`bi bi-${item.meta.icon} text-primary`} style={{ fontSize: '3rem' }}></i>
                    </div>
                  )}
                  
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="mb-3"
                      style={{ maxWidth: '80px', height: 'auto' }}
                    />
                  )}
                  
                  {item.title && (
                    <Card.Title className="fw-bold">{item.title}</Card.Title>
                  )}
                  
                  {item.subtitle && (
                    <Card.Subtitle className="mb-3 text-muted">{item.subtitle}</Card.Subtitle>
                  )}
                  
                  {item.body && (
                    <Card.Text className="text-muted">{item.body}</Card.Text>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>

    {/* Add Card Modal */}
    {isStaff && (
      <InlineItemEditor
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        elementId={element.id}
        elementType="cards_list"
        hotelSlug={hotelSlug}
        onSuccess={handleAddSuccess}
      />
    )}
    </>
  );
};

CardsListSection.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string,
        subtitle: PropTypes.string,
        body: PropTypes.string,
        badge: PropTypes.string,
        image_url: PropTypes.string,
        meta: PropTypes.object,
      })
    ),
    settings: PropTypes.shape({
      columns: PropTypes.number,
    }),
  }).isRequired,
  hotelSlug: PropTypes.string.isRequired,
};

export default CardsListSection;
