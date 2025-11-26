import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import HeroSectionEditor from '@/components/sections/HeroSectionEditor';
import GallerySectionEditor from '@/components/sections/GallerySectionEditor';
import ListSectionEditor from '@/components/sections/ListSectionEditor';
import NewsSectionEditor from '@/components/sections/NewsSectionEditor';
import {
  listSections,
  createSection,
  updateSection,
  deleteSection,
} from '@/services/sectionEditorApi';

/**
 * SectionEditorPage - Main page for managing hotel sections
 * Requires Super Admin permission
 */
const SectionEditorPage = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperStaffAdmin } = usePermissions();
  
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState('hero');
  const [newSectionName, setNewSectionName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isSuperStaffAdmin) {
      toast.error('You do not have permission to access this page');
      navigate(`/${hotelSlug}`);
      return;
    }

    fetchSections();
  }, [hotelSlug, isSuperStaffAdmin, navigate]);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSections(hotelSlug);
      setSections(data.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error('Failed to fetch sections:', err);
      setError('Failed to load sections');
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      toast.error('Please enter a section name');
      return;
    }

    try {
      setCreating(true);
      await createSection(hotelSlug, {
        section_type: newSectionType,
        name: newSectionName,
        position: sections.length,
      });
      toast.success(`${newSectionType} section created successfully`);
      setShowAddSection(false);
      setNewSectionName('');
      setNewSectionType('hero');
      fetchSections();
    } catch (error) {
      console.error('Failed to create section:', error);
      toast.error('Failed to create section');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSection = async (sectionId, sectionName) => {
    if (!confirm(`Delete section "${sectionName}"? This will delete all content in this section.`)) {
      return;
    }

    try {
      await deleteSection(hotelSlug, sectionId);
      toast.success('Section deleted successfully');
      fetchSections();
    } catch (error) {
      console.error('Failed to delete section:', error);
      toast.error('Failed to delete section');
    }
  };

  const handleToggleActive = async (sectionId, currentActive) => {
    try {
      await updateSection(hotelSlug, sectionId, {
        is_active: !currentActive,
      });
      toast.success(`Section ${currentActive ? 'deactivated' : 'activated'}`);
      fetchSections();
    } catch (error) {
      console.error('Failed to toggle section:', error);
      toast.error('Failed to toggle section');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedSections = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    
    setSections(updatedSections);

    // Save new positions to backend
    try {
      await Promise.all(
        updatedSections.map((section) =>
          updateSection(hotelSlug, section.id, { position: section.position })
        )
      );
      toast.success('Section order updated');
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
      fetchSections(); // Reload on error
    }
  };

  const renderSectionEditor = (section) => {
    const commonProps = {
      section,
      hotelSlug,
      onUpdate: fetchSections,
    };

    switch (section.section_type) {
      case 'hero':
        return <HeroSectionEditor {...commonProps} />;
      case 'gallery':
        return <GallerySectionEditor {...commonProps} />;
      case 'list':
        return <ListSectionEditor {...commonProps} />;
      case 'news':
        return <NewsSectionEditor {...commonProps} />;
      default:
        return (
          <Alert variant="warning">
            Unknown section type: {section.section_type}
          </Alert>
        );
    }
  };

  const getSectionIcon = (type) => {
    switch (type) {
      case 'hero': return 'bi-star';
      case 'gallery': return 'bi-images';
      case 'list': return 'bi-card-list';
      case 'news': return 'bi-newspaper';
      default: return 'bi-question-circle';
    }
  };

  if (loading) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading sections...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchSections}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <i className="bi bi-wrench me-2"></i>
                Section Editor
              </h2>
              <p className="text-muted mb-0">
                Manage sections for your hotel's public page
              </p>
            </div>
            <div>
              <Button
                variant="outline-secondary"
                className="me-2"
                onClick={() => navigate(`/hotel/${hotelSlug}`)}
              >
                <i className="bi bi-eye me-2"></i>
                Preview Page
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowAddSection(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add Section
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {sections.length === 0 ? (
        <Alert variant="info" className="text-center">
          <i className="bi bi-info-circle me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">No Sections Yet</h4>
          <p>Get started by adding your first section. Try a Hero section to welcome visitors!</p>
          <Button variant="primary" onClick={() => setShowAddSection(true)}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Your First Section
          </Button>
        </Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {sections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="mb-4"
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <Card>
                          <Card.Header className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div
                                {...provided.dragHandleProps}
                                className="me-3"
                                style={{ cursor: 'grab' }}
                              >
                                <i className="bi bi-grip-vertical" style={{ fontSize: '1.5rem' }}></i>
                              </div>
                              <div>
                                <h5 className="mb-0">
                                  <i className={`${getSectionIcon(section.section_type)} me-2`}></i>
                                  {section.name}
                                </h5>
                                <small className="text-muted">
                                  Position: {section.position + 1} | Type: {section.section_type}
                                </small>
                              </div>
                            </div>
                            <div>
                              <Button
                                variant={section.is_active ? 'success' : 'secondary'}
                                size="sm"
                                className="me-2"
                                onClick={() => handleToggleActive(section.id, section.is_active)}
                              >
                                <i className={`bi bi-${section.is_active ? 'eye' : 'eye-slash'} me-1`}></i>
                                {section.is_active ? 'Active' : 'Inactive'}
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteSection(section.id, section.name)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </Card.Header>
                          <Card.Body>
                            {renderSectionEditor(section)}
                          </Card.Body>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add Section Modal */}
      <Modal show={showAddSection} onHide={() => setShowAddSection(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Section Type</Form.Label>
            <Form.Select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
            >
              <option value="hero">Hero - Welcome banner with title, text, and images</option>
              <option value="gallery">Gallery - Photo collections</option>
              <option value="list">List/Cards - Offers, facilities, services</option>
              <option value="news">News - Articles with text and images</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Section Name</Form.Label>
            <Form.Control
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Welcome Hero, Photo Gallery, Special Offers"
            />
          </Form.Group>

          <Alert variant="info" className="mb-0">
            <small>
              <strong>Tip:</strong> Hero sections are pre-filled with placeholder text. 
              Other sections start empty - you'll add content after creation.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddSection(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateSection} disabled={creating}>
            {creating ? 'Creating...' : 'Create Section'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SectionEditorPage;
