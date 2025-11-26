import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createListContainer, createCard, uploadCardImage } from '@/services/sectionEditorApi';

/**
 * ListSectionView - Public view for list/cards section with inline editing
 */
const ListSectionView = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const lists = section.lists || [];
  const [showNewCard, setShowNewCard] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [cardForm, setCardForm] = useState({ title: '', subtitle: '', description: '' });
  const [cardImage, setCardImage] = useState(null);
  const [saving, setSaving] = useState(false);

  if (lists.length === 0) {
    return null;
  }

  const hasCards = lists.some(l => l.cards && l.cards.length > 0);

  const handleCreateCard = async () => {
    if (!cardForm.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      setSaving(true);
      const newCard = await createCard(slug, {
        list_container: selectedList.id,
        title: cardForm.title,
        subtitle: cardForm.subtitle,
        description: cardForm.description,
        sort_order: selectedList.cards?.length || 0,
      });

      // Upload image if provided
      if (cardImage) {
        await uploadCardImage(slug, newCard.id, cardImage);
      }

      toast.success('Card created successfully');
      setCardForm({ title: '', subtitle: '', description: '' });
      setCardImage(null);
      setShowNewCard(false);
      setSelectedList(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create card:', error);
      toast.error('Failed to create card');
    } finally {
      setSaving(false);
    }
  };

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
                  <Card 
                    className="h-100 shadow-sm"
                    style={{ 
                      cursor: 'pointer',
                      border: '2px dashed #dee2e6',
                      backgroundColor: '#f8f9fa',
                      minHeight: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      setSelectedList(list);
                      setShowNewCard(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                      e.currentTarget.style.borderColor = '#adb5bd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#dee2e6';
                    }}
                  >
                    <Card.Body className="text-center">
                      <i className="bi bi-plus-circle" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                      <p className="mt-3 mb-0 text-muted">Add Card</p>
                    </Card.Body>
                  </Card>
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

      {/* New Card Modal */}
      <Modal show={showNewCard} onHide={() => {
        setShowNewCard(false);
        setSelectedList(null);
        setCardForm({ title: '', subtitle: '', description: '' });
        setCardImage(null);
      }} size="lg">
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
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowNewCard(false);
            setSelectedList(null);
            setCardForm({ title: '', subtitle: '', description: '' });
            setCardImage(null);
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create Card'}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
        {`
          .hover-lift {
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .hover-lift:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
          }
        `}
      </style>
    </section>
  );
};

export default ListSectionView;
