import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Modal, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createListContainer,
  updateListContainer,
  deleteListContainer,
  createCard,
  updateCard,
  uploadCardImage,
  deleteCard,
} from '@/services/sectionEditorApi';

/**
 * ListSectionEditor - Manage list containers with cards
 */
const ListSectionEditor = ({ section, hotelSlug, onUpdate }) => {
  const lists = section.lists || [];
  
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  
  const [showAddCard, setShowAddCard] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({
    title: '',
    subtitle: '',
    description: '',
  });
  const [savingCard, setSavingCard] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);

  const handleAddList = async () => {
    if (!newListTitle.trim()) {
      toast.error('Please enter a list title');
      return;
    }

    try {
      setAddingList(true);
      await createListContainer(hotelSlug, {
        section: section.id,
        title: newListTitle,
        sort_order: lists.length,
      });
      toast.success('List created successfully');
      setNewListTitle('');
      setShowAddList(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create list:', error);
      toast.error('Failed to create list');
    } finally {
      setAddingList(false);
    }
  };

  const handleDeleteList = async (listId, listTitle) => {
    if (!confirm(`Delete list "${listTitle}"? This will also delete all cards in it.`)) {
      return;
    }

    try {
      await deleteListContainer(hotelSlug, listId);
      toast.success('List deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete list:', error);
      toast.error('Failed to delete list');
    }
  };

  const handleSaveCard = async () => {
    if (!cardForm.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      setSavingCard(true);
      
      if (editingCard) {
        // Update existing card
        await updateCard(hotelSlug, editingCard.id, cardForm);
        toast.success('Card updated successfully');
      } else if (showAddCard) {
        // Create new card
        await createCard(hotelSlug, {
          list_container: showAddCard,
          ...cardForm,
          sort_order: 0,
        });
        toast.success('Card created successfully');
      }
      
      setShowAddCard(null);
      setEditingCard(null);
      setCardForm({ title: '', subtitle: '', description: '' });
      onUpdate();
    } catch (error) {
      console.error('Failed to save card:', error);
      toast.error('Failed to save card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Delete this card?')) return;

    try {
      await deleteCard(hotelSlug, cardId);
      toast.success('Card deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleCardImageUpload = async (cardId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(cardId);
      await uploadCardImage(hotelSlug, cardId, file);
      toast.success('Image uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const openEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      title: card.title,
      subtitle: card.subtitle || '',
      description: card.description || '',
    });
  };

  const closeCardModal = () => {
    setShowAddCard(null);
    setEditingCard(null);
    setCardForm({ title: '', subtitle: '', description: '' });
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-card-list me-2"></i>
          List/Cards Section
        </h5>
        <Button
          variant="light"
          size="sm"
          onClick={() => setShowAddList(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add List
        </Button>
      </Card.Header>
      <Card.Body>
        {lists.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-card-list" style={{ fontSize: '3rem' }}></i>
            <p className="mt-2">No lists yet. Click "Add List" to create one.</p>
          </div>
        ) : (
          lists.map((list) => (
            <Card key={list.id} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">{list.title}</h6>
                <div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="me-2"
                    onClick={() => setShowAddCard(list.id)}
                  >
                    <i className="bi bi-plus me-1"></i>
                    Add Card
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteList(list.id, list.title)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {list.cards && list.cards.length > 0 ? (
                  <Row>
                    {list.cards.map((card) => (
                      <Col key={card.id} xs={12} md={6} lg={4} className="mb-3">
                        <Card className="h-100">
                          {card.image_url && (
                            <Card.Img
                              variant="top"
                              src={card.image_url}
                              style={{ height: '150px', objectFit: 'cover' }}
                            />
                          )}
                          <Card.Body>
                            <Card.Title>{card.title}</Card.Title>
                            {card.subtitle && (
                              <Card.Subtitle className="mb-2 text-muted">
                                {card.subtitle}
                              </Card.Subtitle>
                            )}
                            {card.description && (
                              <Card.Text>{card.description}</Card.Text>
                            )}
                            
                            <div className="mt-3">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => openEditCard(card)}
                              >
                                <i className="bi bi-pencil me-1"></i>
                                Edit
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteCard(card.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>

                            <div className="mt-2">
                              <Form.Label className="small">Update Image</Form.Label>
                              <Form.Control
                                type="file"
                                size="sm"
                                accept="image/*"
                                onChange={(e) => handleCardImageUpload(card.id, e)}
                                disabled={uploadingImage === card.id}
                              />
                              {uploadingImage === card.id && (
                                <Spinner animation="border" size="sm" className="mt-1" />
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center text-muted py-3">
                    <i className="bi bi-card-text" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No cards yet. Click "Add Card" above.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))
        )}
      </Card.Body>

      {/* Add List Modal */}
      <Modal show={showAddList} onHide={() => setShowAddList(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New List</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>List Title</Form.Label>
            <Form.Control
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="e.g., Special Offers, Facilities, Services"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddList(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddList} disabled={addingList}>
            {addingList ? 'Adding...' : 'Add List'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Card Modal */}
      <Modal show={!!showAddCard || !!editingCard} onHide={closeCardModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingCard ? 'Edit Card' : 'Add New Card'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
              placeholder="Card title"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Subtitle</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.subtitle}
              onChange={(e) => setCardForm({ ...cardForm, subtitle: e.target.value })}
              placeholder="Card subtitle (optional)"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cardForm.description}
              onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
              placeholder="Card description (optional)"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCardModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCard} disabled={savingCard}>
            {savingCard ? 'Saving...' : 'Save Card'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default ListSectionEditor;
