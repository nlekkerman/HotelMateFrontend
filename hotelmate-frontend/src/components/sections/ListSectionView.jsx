import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

/**
 * ListSectionView - Public view for list/cards section
 */
const ListSectionView = ({ section }) => {
  const lists = section.lists || [];

  if (lists.length === 0) {
    return null;
  }

  return (
    <section className="list-section-view py-5">
      <Container>
        <h2 className="text-center mb-5">{section.name}</h2>
        
        {lists.map((list) => (
          <div key={list.id} className="mb-5">
            <h3 className="mb-4">{list.title}</h3>
            
            {list.cards && list.cards.length > 0 ? (
              <Row>
                {list.cards.map((card) => (
                  <Col key={card.id} xs={12} md={6} lg={4} className="mb-4">
                    <Card className="h-100 shadow-sm hover-lift">
                      {card.image_url && (
                        <Card.Img 
                          variant="top" 
                          src={card.image_url}
                          style={{ height: '200px', objectFit: 'cover' }}
                        />
                      )}
                      <Card.Body>
                        <Card.Title>{card.title}</Card.Title>
                        {card.subtitle && (
                          <Card.Subtitle className="mb-3 text-muted">
                            {card.subtitle}
                          </Card.Subtitle>
                        )}
                        {card.description && (
                          <Card.Text>{card.description}</Card.Text>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <p className="text-muted text-center">No cards in this list yet.</p>
            )}
          </div>
        ))}
      </Container>
      
      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </section>
  );
};

export default ListSectionView;
