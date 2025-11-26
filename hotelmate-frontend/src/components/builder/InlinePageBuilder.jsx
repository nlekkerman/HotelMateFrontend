import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Offcanvas, Card, Badge, ListGroup } from 'react-bootstrap';
import { createSection, deleteSection, updateSection } from '@/services/sectionEditorApi';
import { toast } from 'react-toastify';

/**
 * InlinePageBuilder - NEW Section-based builder overlay
 * Only visible to super staff admins
 */
function InlinePageBuilder({ hotel, sections, onUpdate }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const sectionTypes = [
    { key: 'hero', label: 'Hero Section', icon: '🎯', section_type: 'hero', description: 'Welcome banner with images' },
    { key: 'gallery', label: 'Photo Gallery', icon: '🖼️', section_type: 'gallery', description: 'Multiple image galleries' },
    { key: 'list', label: 'Cards/Lists', icon: '📇', section_type: 'list', description: 'Offers, facilities, services' },
    { key: 'news', label: 'News/Articles', icon: '📰', section_type: 'news', description: 'News with text and images' }
  ];

  const handleAddSection = async (sectionType) => {
    setLoading(true);
    try {
      const newSection = await createSection(hotel.slug, {
        section_type: sectionType.section_type,
        name: sectionType.label,
        position: sections.length
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

        {/* Full Editor Button */}
        <Button 
          variant="success" 
          href={`/staff/${hotel.slug}/section-editor`}
          className="shadow-lg"
          style={{ borderRadius: '50px', padding: '12px 24px' }}
        >
          <i className="bi bi-tools me-2"></i>
          Full Editor
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
                <Button
                  variant="primary"
                  href={`/staff/${hotel.slug}/section-editor`}
                  className="w-100"
                >
                  <i className="bi bi-pencil-square me-2"></i>
                  Open Full Editor
                </Button>
                <small className="text-muted d-block mt-2">
                  Edit content, reorder sections, and more
                </small>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>
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
