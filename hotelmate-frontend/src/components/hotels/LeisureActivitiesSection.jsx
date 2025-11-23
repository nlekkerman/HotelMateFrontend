import React from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';

/**
 * LeisureActivitiesSection - Display hotel facilities and activities
 */
const LeisureActivitiesSection = ({ hotel }) => {
  const activities = hotel?.leisure_activities || [];

  if (activities.length === 0) return null;

  const getCategoryColor = (category) => {
    const colors = {
      Wellness: 'purple',
      Family: 'orange',
      Dining: 'success',
      Recreation: 'primary',
      Business: 'secondary',
      Sports: 'info',
      Entertainment: 'warning',
    };
    return colors[category] || 'info';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Wellness: 'heart-pulse',
      Family: 'people',
      Dining: 'cup-hot',
      Recreation: 'water',
      Business: 'briefcase',
      Sports: 'bicycle',
      Entertainment: 'music-note-beamed',
    };
    return icons[category] || 'star';
  };

  return (
    <section className="leisure-activities-section py-5 bg-white">
      <Container>
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-2">Leisure & Facilities</h2>
          <p className="text-muted">Explore what makes your stay special</p>
        </div>

        <Row xs={1} md={2} lg={3} className="g-4">
          {activities.map((activity) => (
            <Col key={activity.id}>
              <Card className="h-100 border-0 shadow-sm hover-shadow">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-start mb-3">
                    <div
                      className="activity-icon me-3 flex-shrink-0"
                      style={{
                        fontSize: '2.5rem',
                        color: `var(--bs-${getCategoryColor(activity.category)})`,
                      }}
                    >
                      <i className={`bi bi-${getCategoryIcon(activity.category)}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <Card.Title className="h5 mb-2">{activity.name}</Card.Title>
                      <Badge bg={getCategoryColor(activity.category)} className="mb-2">
                        {activity.category}
                      </Badge>
                    </div>
                  </div>

                  {activity.short_description && (
                    <Card.Text className="text-muted">{activity.short_description}</Card.Text>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <style jsx>{`
        .hover-shadow:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.3s ease;
        }
      `}</style>
    </section>
  );
};

export default LeisureActivitiesSection;
