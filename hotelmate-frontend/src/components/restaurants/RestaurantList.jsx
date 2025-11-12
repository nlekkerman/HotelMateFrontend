import React from "react";
import { Row, Col, Card } from "react-bootstrap";

const RestaurantList = ({ restaurants, selectedRestaurant, onSelect, onAddRestaurant }) => {
  return (
    <Row className="g-4">
      {/* Add Restaurant Card - Big Plus Button */}
      <Col xs={12} sm={6} md={4} lg={3}>
        <Card 
          className="h-100 border-0 shadow-sm"
          onClick={onAddRestaurant}
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '280px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }}
        >
          <Card.Body className="d-flex flex-column align-items-center justify-content-center text-white">
            <div 
              className="mb-3"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              <i className="bi bi-plus-lg" style={{ fontSize: '3.5rem' }}></i>
            </div>
            <h4 className="fw-bold mb-2">Add Restaurant</h4>
            <p className="text-center mb-0" style={{ opacity: 0.9 }}>
              Create a new restaurant
            </p>
          </Card.Body>
        </Card>
      </Col>

      {/* Restaurant Cards */}
      {restaurants.map((restaurant) => (
        <Col xs={12} sm={6} md={4} lg={3} key={restaurant.id}>
          <Card 
            className={`h-100 border-0 shadow-sm ${selectedRestaurant?.id === restaurant.id ? 'border-primary' : ''}`}
            onClick={() => onSelect(restaurant)}
            style={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minHeight: '280px',
              borderWidth: selectedRestaurant?.id === restaurant.id ? '3px' : '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div 
              style={{
                height: '160px',
                backgroundImage: 'url(https://res.cloudinary.com/dg0ssec7u/image/upload/v1758363070/ypfbole10rpggvq1vdgq.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active Badge */}
              {selectedRestaurant?.id === restaurant.id && (
                <div 
                  className="position-absolute top-0 end-0 m-3"
                  style={{
                    background: '#28a745',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}
                >
                  <i className="bi bi-check-circle-fill me-1"></i>
                  Active
                </div>
              )}
            </div>
            
            <Card.Body className="d-flex flex-column">
              <h5 className="fw-bold mb-2" style={{ color: '#2c3e50' }}>
                {restaurant.name}
              </h5>
              <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: '0.9rem' }}>
                {restaurant.description || 'Fine dining experience'}
              </p>
              
              {/* Stats Row */}
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <div className="text-center">
                  <i className="bi bi-calendar-event text-primary"></i>
                  <small className="d-block text-muted mt-1">Bookings</small>
                </div>
                <div className="text-center">
                  <i className="bi bi-people text-success"></i>
                  <small className="d-block text-muted mt-1">Capacity</small>
                </div>
                <div className="text-center">
                  <i className="bi bi-star-fill text-warning"></i>
                  <small className="d-block text-muted mt-1">Rating</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}

      {/* Empty State */}
      {restaurants.length === 0 && (
        <Col xs={12}>
          <div className="text-center py-5">
            <i className="bi bi-shop" style={{ fontSize: '4rem', color: '#ddd' }}></i>
            <h4 className="mt-3 text-muted">No restaurants found</h4>
            <p className="text-muted">Click the "Add Restaurant" button to create your first restaurant</p>
          </div>
        </Col>
      )}
    </Row>
  );
};

// Helper function to generate random gradient colors based on ID
const getRandomGradient = (id) => {
  const gradients = [
    '#f093fb 0%, #f5576c 100%',
    '#4facfe 0%, #00f2fe 100%',
    '#43e97b 0%, #38f9d7 100%',
    '#fa709a 0%, #fee140 100%',
    '#30cfd0 0%, #330867 100%',
    '#a8edea 0%, #fed6e3 100%',
    '#ff9a9e 0%, #fecfef 100%',
    '#ffecd2 0%, #fcb69f 100%',
    '#ff6e7f 0%, #bfe9ff 100%',
    '#e0c3fc 0%, #8ec5fc 100%',
  ];
  return gradients[id % gradients.length];
};

export default RestaurantList;
