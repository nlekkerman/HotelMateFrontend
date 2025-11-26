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
    selectedList,
    cardForm,
    setCardForm,
    cardImage,
    setCardImage,
    handleCreateList,
    handleCreateCard,
    openAddCard,
    closeListModal,
    closeCardModal,
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

  // Preset 1: Clean & Modern - 3-column grid with shadows
  if (variant === 1) {
    sectionContent = (
      <section className={`list-section list-section--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowAddList(true)}
                style={{ minWidth: '120px' }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add List
              </Button>
            )}
          </div>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
              <Row className="g-4">
                {isStaff && (
                  <Col xs={12} sm={6} md={4}>
                    <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                      <i className="bi bi-plus-circle"></i>
                      <p className="mt-3 mb-0 text-muted">Add Card</p>
                    </div>
                  </Col>
                )}
                {list.cards?.map((card) => (
                  <Col key={card.id} xs={12} sm={6} md={4}>
                    <CardRenderer card={card} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Preset 2: Dark & Elegant - Vertical stacked with borders
  else if (variant === 2) {
    sectionContent = (
      <section className={`list-section list-section--preset-2 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button variant="outline-primary" size="sm" onClick={() => setShowAddList(true)} style={{ minWidth: '120px' }}>
                <i className="bi bi-plus-circle me-2"></i>Add List
              </Button>
            )}
          </div>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
              <div className="list-section__vertical">
                {isStaff && (
                  <div className="list-section__vertical-item mb-3">
                    <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                      <i className="bi bi-plus-circle"></i>
                      <p className="mt-3 mb-0 text-muted">Add Card</p>
                    </div>
                  </div>
                )}
                {list.cards?.map((card) => (
                  <div key={card.id} className="list-section__vertical-item mb-3">
                    <CardRenderer card={card} variant={variant} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Preset 3: Minimal & Sleek - Horizontal scroll
  else if (variant === 3) {
    sectionContent = (
      <section className={`list-section list-section--preset-3 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button variant="outline-primary" size="sm" onClick={() => setShowAddList(true)} style={{ minWidth: '120px' }}>
                <i className="bi bi-plus-circle me-2"></i>Add List
              </Button>
            )}
          </div>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className={`list-section__subtitle mb-4 px-3 font-preset-${variant}-subtitle`}>{list.title}</h3>}
              <div className="list-section__scroll-wrapper">
                <div className="list-section__scroll-track">
                    {isStaff && (
                      <div className="list-section__scroll-item">
                        <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                          <i className="bi bi-plus-circle"></i>
                          <p className="mt-3 mb-0 text-muted">Add Card</p>
                        </div>
                      </div>
                    )}
                    {list.cards?.map((card) => (
                      <div key={card.id} className="list-section__scroll-item">
                      <CardRenderer card={card} variant={variant} />
                    </div>
                  ))}
                </div>
              </div>
          </div>)
        )}
        </div>
      </section>
    );
  }

  // Preset 4: Vibrant & Playful - 4-column with overlays
  else if (variant === 4) {
    sectionContent = (
      <section className={`list-section list-section--preset-4 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button variant="outline-primary" size="sm" onClick={() => setShowAddList(true)} style={{ minWidth: '120px' }}>
                <i className="bi bi-plus-circle me-2"></i>Add List
              </Button>
            )}
          </div>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
              <Row className="g-3">
                {isStaff && (
                  <Col xs={6} sm={6} md={3}>
                    <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                      <i className="bi bi-plus-circle"></i>
                      <p className="mt-3 mb-0 text-muted">Add Card</p>
                    </div>
                  </Col>
                )}
                {list.cards?.map((card) => (
                  <Col key={card.id} xs={6} sm={6} md={3}>
                    <CardRenderer card={card} variant={variant} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Preset 5: Professional & Structured - Featured grid
  else if (variant === 5) {
    sectionContent = (
      <section className={`list-section list-section--preset-5 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button variant="outline-primary" size="sm" onClick={() => setShowAddList(true)} style={{ minWidth: '120px' }}>
                <i className="bi bi-plus-circle me-2"></i>Add List
              </Button>
            )}
          </div>
          {lists.map((list) => {
            const [firstCard, ...restCards] = list.cards || [];
            return (
              <div key={list.id} className="list-section__container mb-5">
                {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
                {!firstCard && isStaff ? (
                  <Row className="g-4">
                    <Col xs={12} sm={6} md={4}>
                      <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                        <i className="bi bi-plus-circle"></i>
                        <p className="mt-3 mb-0 text-muted">Add Card</p>
                      </div>
                    </Col>
                  </Row>
                ) : firstCard && (
                  <Row className="g-4">
                    <Col xs={12} md={8}>
                      <CardRenderer card={firstCard} variant={variant} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Row className="g-4">
                        {restCards.slice(0, 2).map((card) => (
                          <Col key={card.id} xs={12}>
                            <CardRenderer card={card} variant={variant} />
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  </Row>
                )}
                {restCards.length > 2 && (
                  <Row className="g-4 mt-4">
                    {restCards.slice(2).map((card) => (
                      <Col key={card.id} xs={12} sm={6} md={4}>
                        <CardRenderer card={card} variant={variant} />
                      </Col>
                    ))}
                    {isStaff && (
                      <Col xs={12} sm={6} md={4}>
                        <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                          <i className="bi bi-plus-circle"></i>
                          <p className="mt-3 mb-0 text-muted">Add Card</p>
                        </div>
                      </Col>
                    )}
                  </Row>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Fallback to Preset 1
  else {
    sectionContent = (
      <section className={`list-section list-section--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h2 className={`list-section__title text-center flex-grow-1 mb-0 font-preset-${variant}-heading`}>{section.name}</h2>
            {isStaff && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowAddList(true)}
                style={{ minWidth: '120px' }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add List
              </Button>
            )}
          </div>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className={`list-section__subtitle mb-4 font-preset-${variant}-subtitle`}>{list.title}</h3>}
              <Row className="g-4">
                {isStaff && (
                  <Col xs={12} sm={6} md={4}>
                    <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                      <i className="bi bi-plus-circle"></i>
                      <p className="mt-3 mb-0 text-muted">Add Card</p>
                    </div>
                  </Col>
                )}
                {list.cards?.map((card) => (
                  <Col key={card.id} xs={12} sm={6} md={4}>
                    <CardRenderer card={card} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Render section content with modals
  return (
    <>
      {sectionContent}

      {/* Add List Modal */}
      <Modal show={showAddList} onHide={closeListModal}>
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
          <Button variant="secondary" onClick={closeListModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateList} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create List'}
          </Button>
        </Modal.Footer>
      </Modal>

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
          <Button variant="secondary" onClick={closeCardModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateCard} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Creating...</> : 'Create Card'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ListSectionPreset;
