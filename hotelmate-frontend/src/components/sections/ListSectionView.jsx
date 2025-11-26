import React from 'react';
import { Container, Row, Col, Card, Alert, Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { useListSectionActions } from '@/hooks/useListSectionActions';
import '@/styles/sections.css';

/**
 * ListSectionView - Public view for list/cards section with inline editing
 */
const ListSectionView = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const lists = section.lists || [];
  
  const {
    showAddCard,
    selectedList,
    cardForm,
    setCardForm,
    cardImage,
    setCardImage,
    handleCreateCard,
    openAddCard,
    closeCardModal,
    saving,
  } = useListSectionActions(slug, section, onUpdate);

  console.log('ListSectionView - showAddCard:', showAddCard);
  console.log('ListSectionView - selectedList:', selectedList);
  console.log('ListSectionView - isStaff:', isStaff);
  console.log('ListSectionView - lists:', lists);

  if (lists.length === 0) {
    return null;
  }

  const hasCards = lists.some(l => l.cards && l.cards.length > 0);
  console.log('ListSectionView - hasCards:', hasCards);

  return (
    <section className="list-section-view py-5">
      <Container>
        <h2 className="text-center mb-5">{section.name}</h2>
        
        {/* Empty state for staff */}
        {isStaff && !hasCards && (
          <Alert variant="info" className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <i className="bi bi-card-list fs-1 d-block mb-3"></i>
            <h5>No Cards Yet</h5>
            <p>Use the "Edit Sections" button to manage this list section.</p>
          </Alert>
        )}
        
        {lists.map((list) => (
          <div key={list.id} className="mb-5">
            <h3 className="mb-4">{list.title}</h3>
            
            <Row>
              {/* Add Card Placeholder - For Staff */}
              {isStaff && (
                <Col xs={12} md={6} lg={4} className="mb-4">
                  <div className="placeholder-add-card" onClick={() => {
                    console.log('Placeholder clicked, list:', list);
                    console.log('openAddCard function:', openAddCard);
                    openAddCard(list);
                  }}>
                    <i className="bi bi-plus-circle"></i>
                    <p className="mt-3 mb-0 text-muted">Add Card</p>
                  </div>
                </Col>
              )}
              
              {/* Existing Cards */}
              {list.cards?.map((card) => (
                <Col key={card.id} xs={12} md={6} lg={4} className="mb-4">
                  <Card className="h-100 shadow-sm hover-lift">
                    {card.image_url && (
                      <Card.Img 
                        variant="top" 
                        src={card.image_url} 
                        alt={card.title}
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
          </div>
        ))}
      </Container>

      {/* Add Card Modal */}
      <Modal show={showAddCard} onHide={closeCardModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Card to {selectedList?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm({...cardForm, title: e.target.value})}
              placeholder="Card title"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Subtitle</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.subtitle}
              onChange={(e) => setCardForm({...cardForm, subtitle: e.target.value})}
              placeholder="Optional subtitle"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cardForm.description}
              onChange={(e) => setCardForm({...cardForm, description: e.target.value})}
              placeholder="Card description"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Image</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => setCardImage(e.target.files?.[0] || null)}
            />
            {cardImage && (
              <Form.Text className="text-muted">
                <i className="bi bi-check-circle text-success me-1"></i>
                {cardImage.name}
              </Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCardModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create Card'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default ListSectionView;
