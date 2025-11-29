import React from 'react';
import { Row, Col, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { useListSectionActions } from '@/hooks/useListSectionActions';
import CardRenderer from './CardRenderer';

/**
 * ListSectionPreset - Renders list/cards section based on numeric style_variant (1-5)
 * 
 * Preset 1: 3 cards with shadows (Clean & Modern)
 * Preset 2: Vertical stacked with borders (Dark & Elegant)
 * Preset 3: Horizontal scroll (Minimal & Sleek)
 * Preset 4: 4-column with overlays (Vibrant & Playful)
 * Preset 5: Featured grid - large + small (Professional & Structured)
 */
const ListSectionPreset = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const variant = section.style_variant ?? 1; // Default to Preset 1
  const lists = section.lists || [];
  
  const {
    showAddList,
    setShowAddList,
    listForm,
    setListForm,
    showAddCard,
    showEditCard,
    showDeleteConfirm,
    selectedList,
    selectedCard,
    cardForm,
    setCardForm,
    cardImage,
    setCardImage,
    handleCreateList,
    handleCreateCard,
    handleUpdateCard,
    handleDeleteCard,
    openAddCard,
    openEditCard,
    openDeleteConfirm,
    closeListModal,
    closeCardModal,
    closeEditModal,
    closeDeleteConfirm,
    saving,
  } = useListSectionActions(slug, section, onUpdate);

  if (lists.length === 0) {
    return null;
  }

  const hasCards = lists.some(l => l.cards && l.cards.length > 0);

  if (!hasCards) {
    return null;
  }

  // Render the appropriate preset section
  let sectionContent = null;

  // All presets use same layout - 3-column grid
  // Only styling differs via CSS classes
  sectionContent = (
    <section className={`list-section list-section--preset-${variant} ${section.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container">
        <div className={`section-header section-header--preset-${variant}`}>
          <div className="section-header__content">
            <h2 className={`section-header__title font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <button
                className="list-section-add-list"
                onClick={() => setShowAddList(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add List
              </button>
            )}
          </div>
        </div>
        {lists.map((list) => (
          <div key={list.id} className="list-section__container mb-5 ">
            {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
            <Row className="g-2 d-flex justify-content-center">
              {isStaff && (
                <Col xs={12} sm={6} md={4}>
                  <button className="list-section-add-card" onClick={() => openAddCard(list)}>
                    <i className="bi bi-plus-circle"></i>
                    <p className="mt-3 mb-0">Add Card</p>
                  </button>
                </Col>
              )}
              {list.cards?.map((card) => (
                <Col key={card.id} xs={12} sm={6} md={4}>
                  <CardRenderer 
                    card={card} 
                    variant={variant}
                    onEdit={isStaff ? () => openEditCard(card, list) : undefined}
                  />
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </div>
    </section>
  );

  // Render section content with modals
  return (
    <>
      {sectionContent}

      {/* Add List Modal */}
      <Modal show={showAddList} onHide={closeListModal} data-preset={variant}>
        <Modal.Header closeButton>
          <Modal.Title>Add New List</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>List Title *</Form.Label>
            <Form.Control
              type="text"
              value={listForm.title}
              onChange={(e) => setListForm({ title: e.target.value })}
              placeholder="e.g., Special Offers, Facilities, Services"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <button className="list-modal-cancel" onClick={closeListModal}>
            Cancel
          </button>
          <button className="list-modal-create" onClick={handleCreateList} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create List'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Add Card Modal */}
      <Modal show={showAddCard} onHide={closeCardModal} size="lg" data-preset={variant}>
        <Modal.Header closeButton>
          <Modal.Title>Add Card to {selectedList?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
              placeholder="Card title"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Subtitle</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.subtitle}
              onChange={(e) => setCardForm({ ...cardForm, subtitle: e.target.value })}
              placeholder="Optional subtitle"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cardForm.description}
              onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
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
          <button className="card-modal-cancel" onClick={closeCardModal}>
            Cancel
          </button>
          <button className="card-modal-create" onClick={handleCreateCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create Card'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Edit Card Modal */}
      <Modal show={showEditCard} onHide={closeEditModal} size="lg" data-preset={variant}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
              placeholder="Card title"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Subtitle</Form.Label>
            <Form.Control
              type="text"
              value={cardForm.subtitle}
              onChange={(e) => setCardForm({ ...cardForm, subtitle: e.target.value })}
              placeholder="Optional subtitle"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cardForm.description}
              onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
              placeholder="Card description"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Image</Form.Label>
            {selectedCard?.image_url && !cardImage && (
              <div className="mb-2">
                <img 
                  src={selectedCard.image_url} 
                  alt="Current" 
                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }}
                />
                <Form.Text className="d-block text-muted">Current image</Form.Text>
              </div>
            )}
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => setCardImage(e.target.files?.[0] || null)}
            />
            {cardImage && (
              <Form.Text className="text-muted">
                <i className="bi bi-check-circle text-success me-1"></i>
                New image: {cardImage.name}
              </Form.Text>
            )}
          </Form.Group>

          <div className="d-flex gap-2 mt-4">
            <Button 
              variant="outline-danger" 
              onClick={() => {
                closeEditModal();
                openDeleteConfirm(selectedCard);
              }}
              className="flex-grow-1"
            >
              <i className="bi bi-trash me-2"></i>
              Delete Card
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="card-modal-cancel" onClick={closeEditModal}>
            Cancel
          </button>
          <button className="card-modal-create" onClick={handleUpdateCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Updating...</> : 'Update Card'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={closeDeleteConfirm} centered data-preset={variant}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this card?</p>
          <p className="text-muted mb-0">
            <strong>{selectedCard?.title}</strong>
          </p>
          <p className="text-danger mt-3 mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteConfirm}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Deleting...</> : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ListSectionPreset;
