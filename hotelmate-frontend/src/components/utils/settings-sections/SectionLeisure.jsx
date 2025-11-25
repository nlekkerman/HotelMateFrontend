import React, { useState } from "react";
import { Card, Button, Row, Col, Form, Modal, Badge, Accordion } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "@/services/api";

const CATEGORIES = [
  'Wellness',
  'Family',
  'Dining',
  'Sports',
  'Entertainment',
  'Business',
  'Other'
];

export default function SectionLeisure({ hotelSlug, activities, onActivitiesUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Wellness',
    short_description: '',
    details_html: '',
    icon: '',
    image_url: '',
    is_active: true,
  });

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name || '',
      category: activity.category || 'Wellness',
      short_description: activity.short_description || '',
      details_html: activity.details_html || '',
      icon: activity.icon || '',
      image_url: activity.image_url || '',
      is_active: activity.is_active !== undefined ? activity.is_active : true,
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setFormData({
      name: '',
      category: 'Wellness',
      short_description: '',
      details_html: '',
      icon: '',
      image_url: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleDelete = async (activity) => {
    if (!window.confirm(`Are you sure you want to delete "${activity.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/staff/hotel/${hotelSlug}/staff/leisure-activities/${activity.id}/`);
      toast.success('Activity deleted successfully!');
      if (onActivitiesUpdate) {
        onActivitiesUpdate();
      }
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast.error(error.response?.data?.message || 'Failed to delete activity');
    }
  };

  const handleSave = async () => {
    try {
      if (editingActivity) {
        await api.patch(
          `/staff/hotel/${hotelSlug}/staff/leisure-activities/${editingActivity.id}/`,
          formData
        );
        toast.success('Activity updated successfully!');
      } else {
        await api.post(
          `/staff/hotel/${hotelSlug}/staff/leisure-activities/`,
          formData
        );
        toast.success('Activity created successfully!');
      }
      setShowModal(false);
      if (onActivitiesUpdate) {
        onActivitiesUpdate();
      }
    } catch (error) {
      console.error('Failed to save activity:', error);
      toast.error(error.response?.data?.message || 'Failed to save activity');
    }
  };

  // Group activities by category
  const groupedActivities = activities?.reduce((acc, activity) => {
    const category = activity.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(activity);
    return acc;
  }, {});

  // Filter activities
  const filteredActivities = selectedCategory === 'All' 
    ? activities 
    : activities?.filter(a => a.category === selectedCategory);

  // Get count per category
  const getCategoryCount = (category) => {
    return activities?.filter(a => a.category === category).length || 0;
  };

  return (
    <>
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                <i className="bi bi-activity me-2"></i>
                Leisure & Facilities
              </h4>
              <p className="text-muted mb-0">
                Manage activities and facilities grouped by category
              </p>
            </div>
            <Button variant="primary" onClick={handleCreate}>
              <i className="bi bi-plus-lg me-2"></i>
              Add Activity
            </Button>
          </div>
          
          <hr className="my-3" />
          
          {/* Category Filter */}
          <div className="mb-3 d-flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'All' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setSelectedCategory('All')}
            >
              All ({activities?.length || 0})
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({getCategoryCount(category)})
              </Button>
            ))}
          </div>
          
          {filteredActivities && filteredActivities.length > 0 ? (
            <Accordion defaultActiveKey="0">
              {CATEGORIES.map((category) => {
                const categoryActivities = filteredActivities.filter(a => a.category === category);
                if (categoryActivities.length === 0 && selectedCategory !== 'All') return null;
                if (categoryActivities.length === 0) return null;
                
                return (
                  <Accordion.Item eventKey={category} key={category}>
                    <Accordion.Header>
                      <strong>{category}</strong>
                      <Badge bg="secondary" className="ms-2">{categoryActivities.length}</Badge>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Row className="g-3">
                        {categoryActivities.map((activity) => (
                          <Col md={6} lg={4} key={activity.id}>
                            <Card className="h-100 shadow-sm">
                              {activity.image_url && (
                                <Card.Img 
                                  variant="top" 
                                  src={activity.image_url} 
                                  alt={activity.name}
                                  style={{ height: '150px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <Card.Body>
                                <div className="d-flex align-items-start justify-content-between mb-2">
                                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                                    {activity.icon && (
                                      <i className={`bi bi-${activity.icon} fs-4`}></i>
                                    )}
                                    <Card.Title className="mb-0">{activity.name}</Card.Title>
                                  </div>
                                  {activity.is_active ? (
                                    <Badge bg="success">Active</Badge>
                                  ) : (
                                    <Badge bg="secondary">Inactive</Badge>
                                  )}
                                </div>
                                
                                {activity.short_description && (
                                  <Card.Text className="text-muted small">
                                    {activity.short_description}
                                  </Card.Text>
                                )}
                                
                                <div className="d-flex gap-2 mt-2">
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={() => handleEdit(activity)}
                                    className="flex-grow-1"
                                  >
                                    <i className="bi bi-pencil me-1"></i>
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => handleDelete(activity)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-5 bg-light rounded">
              <i className="bi bi-activity fs-1 text-muted d-block mb-3"></i>
              <p className="text-muted mb-3">No activities added yet</p>
              <Button variant="primary" onClick={handleCreate}>
                <i className="bi bi-plus-lg me-2"></i>
                Add Your First Activity
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Activity Edit/Create Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingActivity ? 'Edit Activity' : 'Add New Activity'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Activity Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Indoor Pool"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Category *</Form.Label>
                  <Form.Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Short Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Brief description for the activity card..."
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Detailed Description (HTML)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="<p>Full details about the activity...</p>"
                value={formData.details_html}
                onChange={(e) => setFormData({ ...formData, details_html: e.target.value })}
              />
              <Form.Text className="text-muted">
                You can use HTML tags for formatting
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Icon Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., water, heart-pulse, tree"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                  <Form.Text className="text-muted">
                    Bootstrap icon name (without bi- prefix)
                  </Form.Text>
                  {formData.icon && (
                    <div className="mt-2">
                      <i className={`bi bi-${formData.icon} fs-1`}></i>
                    </div>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Image URL</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="https://example.com/activity.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        style={{ maxHeight: '100px', width: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="activity-active"
                label="Active (visible on public page)"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!formData.name || !formData.short_description}
          >
            <i className="bi bi-save me-2"></i>
            {editingActivity ? 'Save Changes' : 'Create Activity'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
