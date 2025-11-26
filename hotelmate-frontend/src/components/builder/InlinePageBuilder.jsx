import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Offcanvas, Card, Badge, ListGroup, Modal, Form } from 'react-bootstrap';
import { createSection, deleteSection, updateSection } from '@/services/sectionEditorApi';
import { toast } from 'react-toastify';

/**
 * InlinePageBuilder - Section-based builder overlay
 * Only visible to super staff admins
 */
function InlinePageBuilder({ hotel, sections, onUpdate }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [selectedSectionType, setSelectedSectionType] = useState(null);
  const [sectionName, setSectionName] = useState('');
  const [containerName, setContainerName] = useState('');

  const sectionTypes = [
    { key: 'hero', label: 'Hero Section', icon: '🎯', section_type: 'hero', description: 'Welcome banner with images' },
    { key: 'gallery', label: 'Photo Gallery', icon: '🖼️', section_type: 'gallery', description: 'Multiple image galleries' },
    { key: 'list', label: 'Cards/Lists', icon: '📇', section_type: 'list', description: 'Offers, facilities, services' },
    { key: 'news', label: 'News/Articles', icon: '📰', section_type: 'news', description: 'News with text and images' }
  ];

  const handleAddSection = async (sectionType) => {
    // For hero and news sections, create directly without modal
    if (sectionType.section_type === 'hero' || sectionType.section_type === 'news') {
      setLoading(true);
      try {
        const newSection = await createSection(hotel.slug, {
          section_type: sectionType.section_type
        });
        
        console.log('[InlinePageBuilder] ✅ Section created:', newSection);
        toast.success(`${sectionType.label} created successfully!`);
        
        // Refresh to show new section
        await onUpdate();
      } catch (err) {
        console.error('[InlinePageBuilder] Error creating section:', err);
        toast.error('Failed to create section');
      } finally {
        setLoading(false);
      }
      return;
    }

    // For gallery and list sections, show modal
    setSelectedSectionType(sectionType);
    setSectionName('');
    setContainerName('');
    setShowNewSectionModal(true);
  };

  const handleCreateSectionWithContainer = async () => {
    setLoading(true);
    try {
      // Build payload - backend will use defaults for empty fields
      const payload = {
        section_type: selectedSectionType.section_type
      };

      // Only add name if provided
      if (sectionName.trim()) {
        payload.name = sectionName.trim();
      }

      // Only add container_name if provided
      if (containerName.trim()) {
        payload.container_name = containerName.trim();
      }

      // Backend creates section and first container automatically
      const newSection = await createSection(hotel.slug, payload);
      
      console.log('[InlinePageBuilder] ✅ Section created with container:', newSection);
      toast.success(`${selectedSectionType.label} created successfully!`);
      
      // Reset and close
      setShowNewSectionModal(false);
      setSelectedSectionType(null);
      setSectionName('');
      setContainerName('');
      
      // Refresh to show new section
      await onUpdate();
    } catch (err) {
      console.error('[InlinePageBuilder] Error creating section:', err);
      toast.error('Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSection = async (section) => {
    try {
      await updateSection(hotel.slug, section.id, {
        is_active: !section.is_active
      });
      toast.success(`Section ${section.is_active ? 'hidden' : 'shown'}`);
      onUpdate();
    } catch (err) {
      console.error('Error toggling section:', err);
      toast.error('Failed to toggle section');
    }
  };

  const handleDeleteSection = async (section) => {
    if (!confirm(`Delete "${section.name}"? This will remove all content.`)) return;
    
    try {
      await deleteSection(hotel.slug, section.id);
      toast.success('Section deleted');
      onUpdate();
    } catch (err) {
      console.error('Error deleting section:', err);
      toast.error('Failed to delete section');
    }
  };

  return (
    <>
      {/* Floating Buttons */}
      <div 
        className="position-fixed d-flex flex-column gap-2" 
        style={{ top: '20px', right: '20px', zIndex: 1050 }}
      >
        {/* Page Builder Button */}
        <Button 
          variant="primary" 
          onClick={() => setShow(true)}
          className="shadow-lg"
          style={{ borderRadius: '50px', padding: '12px 24px' }}
        >
          <i className="bi bi-pencil-square me-2"></i>
          Edit Sections
          {sections.length > 0 && (
            <Badge bg="light" text="dark" className="ms-2">{sections.length}</Badge>
          )}
        </Button>

        {/* Toggle to Staff Feed */}
        <Button 
          variant="dark" 
          href={`/staff/${hotel.slug}/feed`}
          className="shadow-lg"
          style={{ borderRadius: '50px', padding: '12px 24px' }}
        >
          <i className="bi bi-person-badge me-2"></i>
          Staff View
        </Button>
      </div>

      {/* Builder Sidebar */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" style={{ width: '450px' }}>
        <Offcanvas.Header closeButton className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Offcanvas.Title>
            <i className="bi bi-pencil-square me-2"></i>
            Quick Section Manager
          </Offcanvas.Title>
        </Offcanvas.Header>
        
        <Offcanvas.Body>
          {/* Hotel Info */}
          <div className="mb-4">
            <h5 className="mb-1">{hotel.name}</h5>
            <small className="text-muted">{hotel.city}, {hotel.country}</small>
          </div>

          {/* Stats */}
          <Card className="mb-4 border-0 bg-light">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted d-block">Total Sections</small>
                  <h4 className="mb-0">{sections.length}</h4>
                </div>
                <div className="text-end">
                  <small className="text-muted d-block">Active</small>
                  <h4 className="mb-0 text-success">
                    {sections.filter(s => s.is_active !== false).length}
                  </h4>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Add Section */}
          <h6 className="mb-3">
            <i className="bi bi-plus-circle me-2"></i>
            Add New Section
          </h6>
          <div className="d-grid gap-2 mb-4">
            {sectionTypes.map((type) => (
              <Button
                key={type.key}
                variant="outline-primary"
                className="text-start d-flex align-items-center"
                onClick={() => handleAddSection(type)}
                disabled={loading}
              >
                <span className="fs-4 me-3">{type.icon}</span>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{type.label}</div>
                  <small className="text-muted">{type.description}</small>
                </div>
              </Button>
            ))}
          </div>

          {/* Current Sections */}
          {sections.length > 0 && (
            <>
              <hr />
              <h6 className="mb-3">
                <i className="bi bi-layers me-2"></i>
                Current Sections
              </h6>
              <ListGroup>
                {sections
                  .sort((a, b) => a.position - b.position)
                  .map((section) => (
                    <ListGroup.Item 
                      key={section.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {section.name}
                          {section.is_active === false && (
                            <Badge bg="secondary" className="ms-2">Hidden</Badge>
                          )}
                        </div>
                        <small className="text-muted">
                          {section.section_type} · Position {section.position + 1}
                        </small>
                      </div>
                      <div className="d-flex gap-1">
                        <Button
                          size="sm"
                          variant={section.is_active === false ? 'outline-success' : 'outline-secondary'}
                          onClick={() => handleToggleSection(section)}
                          title={section.is_active === false ? 'Show' : 'Hide'}
                        >
                          <i className={`bi bi-eye${section.is_active === false ? '-slash' : ''}`}></i>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteSection(section)}
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
              </ListGroup>

              <div className="mt-3 text-center">
                <small className="text-muted d-block">
                  Click sections below to edit content
                </small>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* New Section Modal - Only for Gallery and List */}
      <Modal show={showNewSectionModal} onHide={() => {
        setShowNewSectionModal(false);
        setSelectedSectionType(null);
        setSectionName('');
        setContainerName('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSectionType?.icon} Create {selectedSectionType?.label}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Section Name (optional)</Form.Label>
            <Form.Control
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder={
                selectedSectionType?.section_type === 'gallery'
                  ? 'e.g., Hotel Photos'
                  : 'e.g., Hotel Amenities'
              }
              autoFocus
            />
            <Form.Text className="text-muted">
              Leave empty to use default: "{selectedSectionType?.label}"
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              First {selectedSectionType?.section_type === 'gallery' ? 'Gallery' : 'List'} Name (optional)
            </Form.Label>
            <Form.Control
              type="text"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder={
                selectedSectionType?.section_type === 'gallery' 
                  ? 'e.g., Lobby & Reception' 
                  : 'e.g., Room Features'
              }
            />
            <Form.Text className="text-muted">
              {selectedSectionType?.section_type === 'gallery' 
                ? 'Leave empty to use default: "Gallery 1"' 
                : 'Leave empty for no title'}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowNewSectionModal(false);
            setSelectedSectionType(null);
            setSectionName('');
            setContainerName('');
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateSectionWithContainer} disabled={loading}>
            {loading ? 'Creating...' : 'Create Section'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

InlinePageBuilder.propTypes = {
  hotel: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    city: PropTypes.string,
    country: PropTypes.string
  }).isRequired,
  sections: PropTypes.array.isRequired,
  onUpdate: PropTypes.func.isRequired
};

export default InlinePageBuilder;
