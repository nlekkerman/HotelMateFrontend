import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const SuperUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateHotel, setShowCreateHotel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [hotelData, setHotelData] = useState({
    name: '',
    slug: '',
    subdomain: '',
    city: '',
    country: '',
    short_description: '',
    tagline: '',
    long_description: '',
    address_line_1: '',
    address_line_2: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    latitude: '',
    longitude: '',
    is_active: true,
    sort_order: 0
  });

  // Redirect if not super user
  if (!user?.is_superuser) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="danger" className="text-center">
          <i className="bi bi-shield-exclamation me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">Access Denied</h4>
          <p>You don't have permission to access this page.</p>
          <Button variant="primary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2"></i>
            Go Back
          </Button>
        </Alert>
      </Container>
    );
  }

  // Auto-generate slug and subdomain from name
  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setHotelData(prev => ({
      ...prev,
      name,
      slug,
      subdomain: slug
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHotelData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validation function
  const validateHotelData = (data) => {
    const errors = {};

    // Required fields
    if (!data.name?.trim()) {
      errors.name = 'Hotel name is required';
    }

    if (!data.slug?.trim()) {
      errors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!data.subdomain?.trim()) {
      errors.subdomain = 'Subdomain is required';
    } else if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
      errors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    }

    // Optional field validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (data.website && !/^https?:\/\/.+/.test(data.website)) {
      errors.website = 'Website must be a valid URL starting with http:// or https://';
    }

    if (data.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (data.latitude && (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90)) {
      errors.latitude = 'Latitude must be a number between -90 and 90';
    }

    if (data.longitude && (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180)) {
      errors.longitude = 'Longitude must be a number between -180 and 180';
    }

    return errors;
  };

  // Post-creation setup functions
  const bootstrapHotelPage = async (hotelSlug) => {
    try {
      // Try the public page bootstrap endpoint
      await api.post(`/public/hotel/${hotelSlug}/bootstrap/`);
    } catch (error) {
      console.warn('Public bootstrap failed, trying staff endpoint:', error);
      try {
        // Fallback to staff endpoint
        await api.post(`/staff/hotel/${hotelSlug}/public-page-bootstrap/`);
      } catch (staffError) {
        console.error('Both bootstrap methods failed:', staffError);
        throw new Error('Failed to create public page');
      }
    }
  };

  const createDefaultRoomTypes = async (hotelSlug) => {
    const defaultRoomTypes = [
      {
        name: 'Standard Single',
        code: 'STD_SGL',
        capacity: 1,
        base_price: '75.00',
      },
      {
        name: 'Standard Double',
        code: 'STD_DBL',
        capacity: 2,
        base_price: '120.00',
      },
      {
        name: 'Superior Room',
        code: 'SUP_ROOM',
        capacity: 2,
        base_price: '160.00',
      },
    ];

    for (const roomType of defaultRoomTypes) {
      try {
        await api.post(`/staff/hotel/${hotelSlug}/room-types/`, roomType);
      } catch (error) {
        console.error('Failed to create room type:', roomType.name, error);
      }
    }
  };

  const createDefaultNavigationItems = async (hotelSlug) => {
    const defaultNavItems = [
      { name: 'Home', slug: 'home', path: `/staff/${hotelSlug}/feed`, icon: 'house', sort_order: 1, is_active: true },
      { name: 'Chat', slug: 'chat', path: `/hotel/${hotelSlug}/chat`, icon: 'chat-dots', sort_order: 2, is_active: true },
      { name: 'Reception', slug: 'reception', path: '/reception', icon: 'bell', sort_order: 3, is_active: true },
      { name: 'Rooms', slug: 'rooms', path: '/rooms', icon: 'door-closed', sort_order: 4, is_active: true },
      { name: 'Housekeeping', slug: 'housekeeping', path: `/staff/hotel/${hotelSlug}/housekeeping`, icon: 'house-gear', sort_order: 5, is_active: true },
      { name: 'Room Bookings', slug: 'room-bookings', path: `/staff/hotel/${hotelSlug}/room-bookings`, icon: 'calendar-check', sort_order: 6, is_active: true },
      { name: 'Staff', slug: 'staff', path: `/${hotelSlug}/staff`, icon: 'people', sort_order: 7, is_active: true },
      { name: 'Room Service', slug: 'room_service', path: `/room_service/${hotelSlug}`, icon: 'cart3', sort_order: 8, is_active: true },
      { name: 'Breakfast', slug: 'breakfast', path: `/breakfast/${hotelSlug}`, icon: 'cup-hot', sort_order: 9, is_active: true },
      { name: 'Menus', slug: 'menus', path: `/menus/${hotelSlug}`, icon: 'menu-button-wide', sort_order: 10, is_active: true },
      { name: 'Bookings', slug: 'bookings', path: `/staff/hotel/${hotelSlug}/bookings`, icon: 'calendar3', sort_order: 11, is_active: true },
      { name: 'Guests', slug: 'guests', path: `/${hotelSlug}/guests`, icon: 'person-check', sort_order: 12, is_active: true },
      { name: 'Stock Tracker', slug: 'stock_tracker', path: `/stock_tracker/${hotelSlug}`, icon: 'boxes', sort_order: 13, is_active: true },
      { name: 'Attendance', slug: 'attendance', path: `/staff/hotel/${hotelSlug}/attendance`, icon: 'clock-history', sort_order: 14, is_active: true },
      { name: 'Settings', slug: 'settings', path: `/staff/${hotelSlug}/settings`, icon: 'gear', sort_order: 15, is_active: true },
    ];

    let createdCount = 0;
    for (const navItem of defaultNavItems) {
      try {
        await api.post(`/staff/hotel/${hotelSlug}/navigation-items/`, navItem);
        createdCount++;
      } catch (error) {
        console.error('Failed to create navigation item:', navItem.name, error);
        // Try alternative endpoint
        try {
          await api.post(`/staff/navigation-items/`, { ...navItem, hotel_slug: hotelSlug });
          createdCount++;
        } catch (altError) {
          console.error('Alternative navigation endpoint also failed:', navItem.name, altError);
        }
      }
    }
    console.log(`Created ${createdCount} navigation items for ${hotelSlug}`);
    return createdCount;
  };

  // Manual bootstrap function for existing hotels
  const handleManualBootstrap = async (hotelSlug) => {
    if (!hotelSlug) {
      setMessage({ type: 'danger', text: 'Please enter a hotel slug to bootstrap' });
      return;
    }

    setLoading(true);
    try {
      await bootstrapHotelPage(hotelSlug);
      setMessage({ 
        type: 'success', 
        text: `Successfully bootstrapped public page for hotel: ${hotelSlug}` 
      });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: `Failed to bootstrap public page for ${hotelSlug}: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // Manual navigation setup for existing hotels
  const handleNavigationSetup = async (hotelSlug) => {
    if (!hotelSlug) {
      setMessage({ type: 'danger', text: 'Please enter a hotel slug to setup navigation' });
      return;
    }

    setLoading(true);
    try {
      const createdCount = await createDefaultNavigationItems(hotelSlug);
      setMessage({ 
        type: 'success', 
        text: `Successfully created ${createdCount} navigation items for hotel: ${hotelSlug}` 
      });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: `Failed to setup navigation for ${hotelSlug}: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate form data
    const validationErrors = validateHotelData(hotelData);
    if (Object.keys(validationErrors).length > 0) {
      setMessage({ 
        type: 'danger', 
        text: 'Please fix the validation errors below.' 
      });
      setLoading(false);
      return;
    }

    try {
      // Prepare data for API (remove empty strings for optional fields)
      const cleanedData = Object.entries(hotelData).reduce((acc, [key, value]) => {
        if (value !== '' || ['name', 'slug', 'subdomain'].includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Convert numeric fields
      if (cleanedData.latitude) cleanedData.latitude = parseFloat(cleanedData.latitude);
      if (cleanedData.longitude) cleanedData.longitude = parseFloat(cleanedData.longitude);
      cleanedData.sort_order = parseInt(cleanedData.sort_order) || 0;

      const response = await api.post('/hotel/hotels/', cleanedData);
      
      setMessage({ 
        type: 'success', 
        text: `Hotel "${response.data.name}" created successfully! Setting up defaults...` 
      });

      // Post-creation setup
      try {
        await Promise.all([
          bootstrapHotelPage(response.data.slug),
          createDefaultRoomTypes(response.data.slug),
          createDefaultNavigationItems(response.data.slug)
        ]);
        
        setMessage({ 
          type: 'success', 
          text: `Hotel "${response.data.name}" created and configured successfully with all navigation items!` 
        });
      } catch (setupError) {
        setMessage({ 
          type: 'warning', 
          text: `Hotel created successfully, but some default setup failed. You may need to configure navigation manually.` 
        });
      }

      // Reset form
      setHotelData({
        name: '',
        slug: '',
        subdomain: '',
        city: '',
        country: '',
        short_description: '',
        tagline: '',
        long_description: '',
        address_line_1: '',
        address_line_2: '',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
        latitude: '',
        longitude: '',
        is_active: true,
        sort_order: 0
      });
      setShowCreateHotel(false);

      // Scroll to top to show success message
      window.scrollTo(0, 0);

    } catch (error) {
      console.error('Hotel creation error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Failed to create hotel. Please try again.';
      setMessage({ 
        type: 'danger', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col lg={10} className="mx-auto">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h1 className="mb-1">
                <i className="bi bi-shield-check text-warning me-3"></i>
                Super User Panel
              </h1>
              <p className="text-muted">Administrative tools and hotel management</p>
            </div>
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back
            </Button>
          </div>

          {message.text && (
            <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}

          <Row>
            <Col md={12} className="mb-4">
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-building text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">Hotel Management</h5>
                  </div>
                  <p className="text-muted mb-3">
                    Create and manage hotels in the system
                  </p>
                  
                  {!showCreateHotel ? (
                    <Button 
                      variant="primary" 
                      onClick={() => setShowCreateHotel(true)}
                      className="w-100"
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Create New Hotel
                    </Button>
                  ) : (
                    <div>
                      <Form onSubmit={handleCreateHotel}>
                        {/* Basic Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Basic Information
                          </h6>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Hotel Name *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="name"
                                  value={hotelData.name}
                                  onChange={(e) => handleNameChange(e.target.value)}
                                  placeholder="Enter hotel name"
                                  required
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>URL Slug *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="slug"
                                  value={hotelData.slug}
                                  onChange={handleInputChange}
                                  placeholder="hotel-slug"
                                  pattern="^[a-z0-9-]+$"
                                  title="Only lowercase letters, numbers, and hyphens allowed"
                                  required
                                />
                                <Form.Text className="text-muted">
                                  Used in URLs: /hotels/{hotelData.slug}
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Subdomain *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="subdomain"
                                  value={hotelData.subdomain}
                                  onChange={handleInputChange}
                                  placeholder="hotel-subdomain"
                                  pattern="^[a-z0-9-]+$"
                                  title="Only lowercase letters, numbers, and hyphens allowed"
                                  required
                                />
                                <Form.Text className="text-muted">
                                  Subdomain: {hotelData.subdomain || 'hotel'}.hotelmate.com
                                </Form.Text>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Sort Order</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="sort_order"
                                  value={hotelData.sort_order}
                                  onChange={handleInputChange}
                                  min="0"
                                />
                                <Form.Text className="text-muted">
                                  Lower numbers appear first in listings
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              name="is_active"
                              checked={hotelData.is_active}
                              onChange={handleInputChange}
                              label="Active (visible to public)"
                            />
                          </Form.Group>
                        </div>

                        {/* Location Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-geo-alt me-2"></i>
                            Location Information
                          </h6>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>City</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="city"
                                  value={hotelData.city}
                                  onChange={handleInputChange}
                                  placeholder="Enter city"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Country</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="country"
                                  value={hotelData.country}
                                  onChange={handleInputChange}
                                  placeholder="Enter country"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Address Line 1</Form.Label>
                            <Form.Control
                              type="text"
                              name="address_line_1"
                              value={hotelData.address_line_1}
                              onChange={handleInputChange}
                              placeholder="Enter primary address"
                            />
                          </Form.Group>

                          <Row>
                            <Col md={8}>
                              <Form.Group className="mb-3">
                                <Form.Label>Address Line 2</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="address_line_2"
                                  value={hotelData.address_line_2}
                                  onChange={handleInputChange}
                                  placeholder="Enter secondary address (optional)"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Postal Code</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="postal_code"
                                  value={hotelData.postal_code}
                                  onChange={handleInputChange}
                                  placeholder="Postal/ZIP code"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Latitude</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="any"
                                  name="latitude"
                                  value={hotelData.latitude}
                                  onChange={handleInputChange}
                                  placeholder="e.g., 53.3498"
                                  min="-90"
                                  max="90"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Longitude</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="any"
                                  name="longitude"
                                  value={hotelData.longitude}
                                  onChange={handleInputChange}
                                  placeholder="e.g., -6.2603"
                                  min="-180"
                                  max="180"
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>

                        {/* Contact Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-telephone me-2"></i>
                            Contact Information
                          </h6>
                          
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Phone</Form.Label>
                                <Form.Control
                                  type="tel"
                                  name="phone"
                                  value={hotelData.phone}
                                  onChange={handleInputChange}
                                  placeholder="e.g., +353 1 234 5678"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                  type="email"
                                  name="email"
                                  value={hotelData.email}
                                  onChange={handleInputChange}
                                  placeholder="info@hotel.com"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Website</Form.Label>
                            <Form.Control
                              type="url"
                              name="website"
                              value={hotelData.website}
                              onChange={handleInputChange}
                              placeholder="https://www.hotel.com"
                            />
                          </Form.Group>
                        </div>

                        {/* Marketing Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-megaphone me-2"></i>
                            Marketing Information
                          </h6>
                          
                          <Form.Group className="mb-3">
                            <Form.Label>Tagline</Form.Label>
                            <Form.Control
                              type="text"
                              name="tagline"
                              value={hotelData.tagline}
                              onChange={handleInputChange}
                              placeholder="e.g., Experience Dublin's finest hospitality"
                              maxLength="200"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Short Description</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="short_description"
                              value={hotelData.short_description}
                              onChange={handleInputChange}
                              placeholder="Brief marketing description for the hotel (used in listings)"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Long Description</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              name="long_description"
                              value={hotelData.long_description}
                              onChange={handleInputChange}
                              placeholder="Detailed description of the hotel (used on hotel page)"
                            />
                          </Form.Group>
                        </div>

                        <div className="d-flex gap-2">
                          <Button 
                            type="submit" 
                            variant="success" 
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                                Creating Hotel...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-2"></i>
                                Create Hotel
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline-secondary" 
                            onClick={() => {
                              setShowCreateHotel(false);
                              setHotelData({
                                name: '',
                                slug: '',
                                subdomain: '',
                                city: '',
                                country: '',
                                short_description: '',
                                tagline: '',
                                long_description: '',
                                address_line_1: '',
                                address_line_2: '',
                                postal_code: '',
                                phone: '',
                                email: '',
                                website: '',
                                latitude: '',
                                longitude: '',
                                is_active: true,
                                sort_order: 0
                              });
                            }}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-tools text-warning me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">Hotel Maintenance</h5>
                  </div>
                  <p className="text-muted mb-3">
                    Fix issues with existing hotels (missing public pages, navigation icons)
                  </p>
                  
                  <div className="mb-3">
                    <Form.Label>Hotel Slug</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., no-way-hotel"
                      id="maintenance-slug"
                    />
                    <Form.Text className="text-muted">
                      Enter the slug of a hotel that needs fixing
                    </Form.Text>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button 
                      variant="warning" 
                      onClick={() => {
                        const slug = document.getElementById('maintenance-slug').value;
                        handleManualBootstrap(slug);
                      }}
                      disabled={loading}
                      size="sm"
                    >
                      <i className="bi bi-wrench me-2"></i>
                      Bootstrap Public Page
                    </Button>
                    
                    <Button 
                      variant="info" 
                      onClick={() => {
                        const slug = document.getElementById('maintenance-slug').value;
                        handleNavigationSetup(slug);
                      }}
                      disabled={loading}
                      size="sm"
                    >
                      <i className="bi bi-list-ul me-2"></i>
                      Setup Navigation Icons
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-gear text-secondary me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">System Administration</h5>
                  </div>
                  <p className="text-muted mb-3">
                    Access Django admin panel and system settings
                  </p>
                  
                  <Button 
                    variant="outline-primary" 
                    href="/admin/" 
                    target="_blank"
                    className="w-100 mb-2"
                  >
                    <i className="bi bi-box-arrow-up-right me-2"></i>
                    Django Admin Panel
                  </Button>
                  
                  <Button 
                    variant="outline-info" 
                    onClick={() => navigate('/system-logs')}
                    className="w-100"
                    disabled
                  >
                    <i className="bi bi-journal-text me-2"></i>
                    System Logs (Coming Soon)
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-info-circle text-info me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">User Information</h5>
                  </div>
                  <div className="text-muted">
                    <p className="mb-1"><strong>Username:</strong> {user?.username}</p>
                    <p className="mb-1"><strong>Email:</strong> {user?.email}</p>
                    <p className="mb-0"><strong>Super User Status:</strong> <span className="text-success">Active</span></p>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-exclamation-triangle text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">Common Issues</h5>
                  </div>
                  <div className="text-muted small">
                    <p className="mb-2"><strong>Hotel has no public_page error:</strong></p>
                    <p className="mb-2">If you see this error when accessing a hotel, use the "Bootstrap Public Page" tool above.</p>
                    <p className="mb-2"><strong>Missing navigation icons/links:</strong></p>
                    <p className="mb-2">Use "Setup Navigation Icons" to create all default navigation items for the hotel.</p>
                    <p className="mb-2"><strong>Navigation not loading:</strong></p>
                    <p className="mb-0">Usually caused by missing public page or navigation items. Use both tools above to fix.</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default SuperUser;