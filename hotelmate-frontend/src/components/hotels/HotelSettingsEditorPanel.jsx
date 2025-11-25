import React, { useState, useEffect } from 'react';
import { Offcanvas, Tabs, Tab, Form, Button, Badge, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { updateHotelPublicSettings } from '@/services/api';

/**
 * HotelSettingsEditorPanel - Side panel for editing hotel public settings
 * Includes tabs for Content, Images, Contact, Amenities, and Branding
 */
const HotelSettingsEditorPanel = ({ show, onHide, hotelSlug, settings, onSettingsUpdate }) => {
  const queryClient = useQueryClient();
  
  // Form state initialized from settings
  const [formData, setFormData] = useState({
    welcome_message: '',
    short_description: '',
    long_description: '',
    hero_image: '',
    gallery: [],
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    amenities: [],
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    background_color: '',
    button_color: '',
    theme_mode: 'light',
  });

  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        welcome_message: settings.welcome_message || '',
        short_description: settings.short_description || '',
        long_description: settings.long_description || '',
        hero_image: settings.hero_image || '',
        gallery: settings.gallery || [],
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        contact_address: settings.contact_address || '',
        amenities: settings.amenities || [],
        primary_color: settings.primary_color || '#3498db',
        secondary_color: settings.secondary_color || '#2ecc71',
        accent_color: settings.accent_color || '#e74c3c',
        background_color: settings.background_color || '#ffffff',
        button_color: settings.button_color || '#3498db',
        theme_mode: settings.theme_mode || 'light',
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddGalleryImage = () => {
    if (newGalleryUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, newGalleryUrl.trim()]
      }));
      setNewGalleryUrl('');
      setHasChanges(true);
    }
  };

  const handleRemoveGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
      setHasChanges(true);
    }
  };

  const handleRemoveAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await updateHotelPublicSettings(hotelSlug, formData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Settings saved successfully!');
      setHasChanges(false);
      if (onSettingsUpdate) {
        onSettingsUpdate(data);
      }
      queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Offcanvas 
      show={show} 
      onHide={onHide} 
      placement="end" 
      style={{ width: '600px', maxWidth: '90vw' }}
      backdrop="static"
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>
          <i className="bi bi-pencil-square me-2"></i>
          Edit Public Settings
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Tabs defaultActiveKey="content" className="mb-3">
          {/* CONTENT TAB */}
          <Tab eventKey="content" title={<><i className="bi bi-file-text me-1"></i> Content</>}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Welcome Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="A warm welcome message for guests..."
                  value={formData.welcome_message}
                  onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Displayed prominently on the hero section
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Brief description of your hotel..."
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Long Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Detailed information about your hotel, facilities, and services..."
                  value={formData.long_description}
                  onChange={(e) => handleInputChange('long_description', e.target.value)}
                />
              </Form.Group>
            </Form>
          </Tab>

          {/* IMAGES TAB */}
          <Tab eventKey="images" title={<><i className="bi bi-images me-1"></i> Images</>}>
            <Form>
              <Form.Group className="mb-4">
                <Form.Label>Hero Image URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/hero-image.jpg"
                  value={formData.hero_image}
                  onChange={(e) => handleInputChange('hero_image', e.target.value)}
                />
                {formData.hero_image && (
                  <div className="mt-2">
                    <img 
                      src={formData.hero_image} 
                      alt="Hero preview" 
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Gallery Images ({formData.gallery.length})</Form.Label>
                <InputGroup className="mb-2">
                  <Form.Control
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGalleryImage())}
                  />
                  <Button variant="primary" onClick={handleAddGalleryImage}>
                    <i className="bi bi-plus-lg"></i> Add
                  </Button>
                </InputGroup>
                
                <ListGroup className="mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {formData.gallery.map((url, index) => (
                    <ListGroup.Item key={index} className="d-flex align-items-center gap-2 p-2">
                      <img 
                        src={url} 
                        alt={`Gallery ${index + 1}`}
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%23ddd" width="60" height="60"/%3E%3C/svg%3E'}
                      />
                      <small className="flex-grow-1 text-truncate">{url}</small>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleRemoveGalleryImage(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </ListGroup.Item>
                  ))}
                  {formData.gallery.length === 0 && (
                    <ListGroup.Item className="text-center text-muted">
                      No gallery images yet
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Form.Group>
            </Form>
          </Tab>

          {/* CONTACT TAB */}
          <Tab eventKey="contact" title={<><i className="bi bi-telephone me-1"></i> Contact</>}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Contact Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="contact@hotel.com"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contact Phone</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contact Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="123 Main Street, City, Country"
                  value={formData.contact_address}
                  onChange={(e) => handleInputChange('contact_address', e.target.value)}
                />
              </Form.Group>
            </Form>
          </Tab>

          {/* AMENITIES TAB */}
          <Tab eventKey="amenities" title={<><i className="bi bi-star me-1"></i> Amenities</>}>
            <Form.Group className="mb-3">
              <Form.Label>Hotel Amenities ({formData.amenities.length})</Form.Label>
              <InputGroup className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="e.g., Free WiFi, Pool, Gym"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
                />
                <Button variant="primary" onClick={handleAddAmenity}>
                  <i className="bi bi-plus-lg"></i> Add
                </Button>
              </InputGroup>

              <div className="d-flex flex-wrap gap-2 mt-3">
                {formData.amenities.map((amenity, index) => (
                  <Badge 
                    key={index} 
                    bg="primary" 
                    className="d-flex align-items-center gap-2 py-2 px-3"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {amenity}
                    <i 
                      className="bi bi-x-circle" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveAmenity(index)}
                    ></i>
                  </Badge>
                ))}
                {formData.amenities.length === 0 && (
                  <p className="text-muted">No amenities added yet</p>
                )}
              </div>
            </Form.Group>
          </Tab>

          {/* BRANDING TAB */}
          <Tab eventKey="branding" title={<><i className="bi bi-palette me-1"></i> Branding</>}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Primary Color</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    style={{ width: '60px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Secondary Color</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    style={{ width: '60px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Accent Color</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    style={{ width: '60px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Background Color</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => handleInputChange('background_color', e.target.value)}
                    style={{ width: '60px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => handleInputChange('background_color', e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Button Color</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="color"
                    value={formData.button_color}
                    onChange={(e) => handleInputChange('button_color', e.target.value)}
                    style={{ width: '60px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData.button_color}
                    onChange={(e) => handleInputChange('button_color', e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Theme Mode</Form.Label>
                <Form.Select
                  value={formData.theme_mode}
                  onChange={(e) => handleInputChange('theme_mode', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="custom">Custom</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Tab>
        </Tabs>

        {/* Save Button - Fixed at bottom */}
        <div className="position-sticky bottom-0 bg-white pt-3 pb-2 border-top mt-4">
          <div className="d-flex gap-2 align-items-center">
            <Button 
              variant="success" 
              className="flex-grow-1"
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2"></i>
                  Save Changes
                </>
              )}
            </Button>
            {hasChanges && !saveMutation.isPending && (
              <Badge bg="warning" text="dark">Unsaved</Badge>
            )}
          </div>
          <small className="text-muted mt-2 d-block">
            Changes will be reflected on the public hotel page
          </small>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default HotelSettingsEditorPanel;
