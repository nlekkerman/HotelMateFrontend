import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, ListGroup, Badge } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { provisionHotel } from '@/services/hotelProvisioningApi';

const SuperUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateHotel, setShowCreateHotel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [provisionResult, setProvisionResult] = useState(null);

  const initialHotelData = {
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
    sort_order: 0,
    timezone: '',
  };

  const initialAdminData = {
    first_name: '',
    last_name: '',
    email: '',
  };

  const [hotelData, setHotelData] = useState(initialHotelData);
  const [adminData, setAdminData] = useState(initialAdminData);
  const [generateCount, setGenerateCount] = useState(0);

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
  const validateProvisionData = (hotel, admin, pkgCount) => {
    const errors = {};

    // Required hotel fields
    if (!hotel.name?.trim()) {
      errors['hotel.name'] = 'Hotel name is required';
    }

    if (!hotel.slug?.trim()) {
      errors['hotel.slug'] = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(hotel.slug)) {
      errors['hotel.slug'] = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!hotel.subdomain?.trim()) {
      errors['hotel.subdomain'] = 'Subdomain is required';
    } else if (!/^[a-z0-9-]+$/.test(hotel.subdomain)) {
      errors['hotel.subdomain'] = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    }

    // Required admin fields
    if (!admin.first_name?.trim()) {
      errors['admin.first_name'] = 'Primary admin first name is required';
    }

    if (!admin.last_name?.trim()) {
      errors['admin.last_name'] = 'Primary admin last name is required';
    }

    if (!admin.email?.trim()) {
      errors['admin.email'] = 'Primary admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
      errors['admin.email'] = 'Please enter a valid email address';
    }

    // Optional hotel field validation
    if (hotel.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotel.email)) {
      errors['hotel.email'] = 'Please enter a valid hotel email address';
    }

    if (hotel.website && !/^https?:\/\/.+/.test(hotel.website)) {
      errors['hotel.website'] = 'Website must be a valid URL starting with http:// or https://';
    }

    if (hotel.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(hotel.phone)) {
      errors['hotel.phone'] = 'Please enter a valid phone number';
    }

    if (hotel.latitude && (isNaN(hotel.latitude) || hotel.latitude < -90 || hotel.latitude > 90)) {
      errors['hotel.latitude'] = 'Latitude must be between -90 and 90';
    }

    if (hotel.longitude && (isNaN(hotel.longitude) || hotel.longitude < -180 || hotel.longitude > 180)) {
      errors['hotel.longitude'] = 'Longitude must be between -180 and 180';
    }

    // Registration packages validation
    if (pkgCount !== '' && pkgCount !== undefined) {
      const count = Number(pkgCount);
      if (!Number.isInteger(count) || count < 0 || count > 10) {
        errors['generate_count'] = 'Registration package count must be an integer between 0 and 10';
      }
    }

    return errors;
  };

  // Manual bootstrap function for existing hotels (maintenance tool only)
  const handleManualBootstrap = async (hotelSlug) => {
    if (!hotelSlug) {
      setMessage({ type: 'danger', text: 'Please enter a hotel slug to bootstrap' });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/public/hotel/${hotelSlug}/bootstrap/`);
      setMessage({ 
        type: 'success', 
        text: `Successfully bootstrapped public page for hotel: ${hotelSlug}` 
      });
    } catch (error) {
      // Fallback to staff endpoint
      try {
        await api.post(`/staff/hotel/${hotelSlug}/public-page-bootstrap/`);
        setMessage({ 
          type: 'success', 
          text: `Successfully bootstrapped public page for hotel: ${hotelSlug}` 
        });
      } catch (fallbackError) {
        setMessage({ 
          type: 'danger', 
          text: `Failed to bootstrap public page for ${hotelSlug}: ${fallbackError.message}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual navigation setup for existing hotels (maintenance tool only)
  const handleNavigationSetup = async (hotelSlug) => {
    if (!hotelSlug) {
      setMessage({ type: 'danger', text: 'Please enter a hotel slug to setup navigation' });
      return;
    }

    setLoading(true);
    try {
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
        } catch {
          try {
            await api.post(`/staff/navigation-items/`, { ...navItem, hotel_slug: hotelSlug });
            createdCount++;
          } catch {
            // skip individual failures
          }
        }
      }
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

  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({ ...prev, [name]: value }));
  };

  const handleProvisionHotel = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setFieldErrors({});
    setProvisionResult(null);

    // Client-side validation
    const validationErrors = validateProvisionData(hotelData, adminData, generateCount);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setMessage({ 
        type: 'danger', 
        text: 'Please fix the validation errors below.' 
      });
      setLoading(false);
      return;
    }

    try {
      // Build hotel payload — strip empty optional fields
      const cleanedHotel = Object.entries(hotelData).reduce((acc, [key, value]) => {
        if (value !== '' || ['name', 'slug', 'subdomain'].includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Convert numeric fields
      if (cleanedHotel.latitude) cleanedHotel.latitude = parseFloat(cleanedHotel.latitude);
      if (cleanedHotel.longitude) cleanedHotel.longitude = parseFloat(cleanedHotel.longitude);
      cleanedHotel.sort_order = parseInt(cleanedHotel.sort_order) || 0;

      const payload = {
        hotel: cleanedHotel,
        primary_admin: {
          first_name: adminData.first_name.trim(),
          last_name: adminData.last_name.trim(),
          email: adminData.email.trim(),
        },
        registration_packages: {
          generate_count: parseInt(generateCount) || 0,
        },
      };

      const result = await provisionHotel(payload);

      // Normalize: if backend returns hotel data at root level instead of nested under 'hotel'
      const normalized = { ...result };
      if (!normalized.hotel) {
        // Backend may return { name, slug, subdomain, ... } at root instead of { hotel: {...} }
        const { primary_admin, registration_packages, warnings, ...hotelFields } = result;
        if (hotelFields.name || hotelFields.slug) {
          normalized.hotel = hotelFields;
        } else {
          // Ultimate fallback: use the submitted form data
          normalized.hotel = { name: hotelData.name, slug: hotelData.slug, subdomain: hotelData.subdomain };
        }
        if (!normalized.primary_admin && (primary_admin || adminData)) {
          normalized.primary_admin = primary_admin || adminData;
        }
        if (!normalized.registration_packages) {
          normalized.registration_packages = registration_packages;
        }
        if (!normalized.warnings) {
          normalized.warnings = warnings;
        }
      }
      // Ensure primary_admin fallback
      if (!normalized.primary_admin) {
        normalized.primary_admin = result.admin || result.user || adminData;
      }

      setProvisionResult(normalized);

      setMessage({ 
        type: 'success', 
        text: `Hotel "${normalized.hotel?.name || hotelData.name}" provisioned successfully!` 
      });

      // Reset form
      setHotelData({ ...initialHotelData });
      setAdminData({ ...initialAdminData });
      setGenerateCount(0);
      setShowCreateHotel(false);

      // Scroll to top to show success
      window.scrollTo(0, 0);

    } catch (error) {
      console.error('Hotel provisioning error:', error);

      const status = error.response?.status;
      const data = error.response?.data;

      // Handle 405 — stale code hitting wrong endpoint
      if (status === 405) {
        setMessage({
          type: 'danger',
          text: 'Hotel creation is only available through the provisioning endpoint. Please refresh the page.',
        });
        setLoading(false);
        return;
      }

      // Handle 409 — duplicate / uniqueness conflicts
      if (status === 409) {
        setMessage({
          type: 'danger',
          text: data?.detail || 'A hotel or admin with these details already exists.',
        });
        setLoading(false);
        return;
      }

      // Handle 400 — field-level validation errors from backend
      if (status === 400 && data && typeof data === 'object') {
        const backendFieldErrors = {};
        const flattenErrors = (obj, prefix = '') => {
          for (const [key, val] of Object.entries(obj)) {
            const fieldKey = prefix ? `${prefix}.${key}` : key;
            if (Array.isArray(val)) {
              backendFieldErrors[fieldKey] = val.join(' ');
            } else if (typeof val === 'object' && val !== null) {
              flattenErrors(val, fieldKey);
            } else {
              backendFieldErrors[fieldKey] = String(val);
            }
          }
        };
        flattenErrors(data);
        setFieldErrors(backendFieldErrors);
        setMessage({
          type: 'danger',
          text: data.detail || 'Please fix the validation errors below.',
        });
        setLoading(false);
        return;
      }

      const errorMessage = data?.detail || data?.message || 'Failed to provision hotel. Please try again.';
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Helper to display field error inline
  const FieldError = ({ field }) => {
    const err = fieldErrors[field];
    return err ? <Form.Text className="text-danger">{err}</Form.Text> : null;
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

          {/* Provisioning Success Summary */}
          {provisionResult && (
            <Card className="shadow-sm mb-4 border-success">
              <Card.Body>
                <h5 className="text-success mb-3">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Hotel Provisioned Successfully
                </h5>

                <Row>
                  <Col md={6}>
                    <h6>Hotel Summary</h6>
                    <ListGroup variant="flush" className="mb-3">
                      <ListGroup.Item><strong>Name:</strong> {provisionResult.hotel?.name}</ListGroup.Item>
                      <ListGroup.Item><strong>Slug:</strong> {provisionResult.hotel?.slug}</ListGroup.Item>
                      <ListGroup.Item><strong>Subdomain:</strong> {provisionResult.hotel?.subdomain}</ListGroup.Item>
                      {provisionResult.hotel?.city && (
                        <ListGroup.Item><strong>City:</strong> {provisionResult.hotel.city}</ListGroup.Item>
                      )}
                      {provisionResult.hotel?.country && (
                        <ListGroup.Item><strong>Country:</strong> {provisionResult.hotel.country}</ListGroup.Item>
                      )}
                    </ListGroup>
                  </Col>
                  <Col md={6}>
                    <h6>Primary Admin</h6>
                    <ListGroup variant="flush" className="mb-3">
                      <ListGroup.Item>
                        <strong>Name:</strong>{' '}
                        {provisionResult.primary_admin?.first_name} {provisionResult.primary_admin?.last_name}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Email:</strong> {provisionResult.primary_admin?.email}
                      </ListGroup.Item>
                    </ListGroup>
                  </Col>
                </Row>

                {provisionResult.registration_packages?.length > 0 && (
                  <div className="mb-3">
                    <h6>Registration Packages</h6>
                    <ListGroup variant="flush">
                      {provisionResult.registration_packages.map((pkg, idx) => (
                        <ListGroup.Item key={idx}>
                          <Badge bg="info" className="me-2">Package {idx + 1}</Badge>
                          {pkg.code || pkg.id || JSON.stringify(pkg)}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {provisionResult.warnings?.length > 0 && (
                  <Alert variant="warning" className="mt-3 mb-0">
                    <strong>Warnings:</strong>
                    <ul className="mb-0 mt-1">
                      {provisionResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Button
                  variant="outline-success"
                  size="sm"
                  className="mt-3"
                  onClick={() => setProvisionResult(null)}
                >
                  Dismiss
                </Button>
              </Card.Body>
            </Card>
          )}

          <Row>
            <Col md={12} className="mb-4">
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-building text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
                    <h5 className="mb-0">Provision New Hotel</h5>
                  </div>
                  <p className="text-muted mb-3">
                    Create a new hotel with its primary admin in a single step via <code>/api/hotels/provision/</code>
                  </p>
                  
                  {!showCreateHotel ? (
                    <Button 
                      variant="primary" 
                      onClick={() => setShowCreateHotel(true)}
                      className="w-100"
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Provision New Hotel
                    </Button>
                  ) : (
                    <div>
                      <Form onSubmit={handleProvisionHotel}>

                        {/* Primary Admin Information */}
                        <div className="mb-4 p-3 bg-light rounded border border-primary">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-person-badge me-2"></i>
                            Primary Admin *
                          </h6>
                          
                          <Row>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>First Name *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="first_name"
                                  value={adminData.first_name}
                                  onChange={handleAdminInputChange}
                                  placeholder="First name"
                                  isInvalid={!!fieldErrors['admin.first_name']}
                                  required
                                />
                                <FieldError field="admin.first_name" />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Last Name *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="last_name"
                                  value={adminData.last_name}
                                  onChange={handleAdminInputChange}
                                  placeholder="Last name"
                                  isInvalid={!!fieldErrors['admin.last_name']}
                                  required
                                />
                                <FieldError field="admin.last_name" />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Email *</Form.Label>
                                <Form.Control
                                  type="email"
                                  name="email"
                                  value={adminData.email}
                                  onChange={handleAdminInputChange}
                                  placeholder="admin@hotel.com"
                                  isInvalid={!!fieldErrors['admin.email']}
                                  required
                                />
                                <FieldError field="admin.email" />
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>

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
                                  isInvalid={!!fieldErrors['hotel.name']}
                                  required
                                />
                                <FieldError field="hotel.name" />
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
                                  isInvalid={!!fieldErrors['hotel.slug']}
                                  required
                                />
                                <Form.Text className="text-muted">
                                  Used in URLs: /hotels/{hotelData.slug}
                                </Form.Text>
                                <FieldError field="hotel.slug" />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={4}>
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
                                  isInvalid={!!fieldErrors['hotel.subdomain']}
                                  required
                                />
                                <Form.Text className="text-muted">
                                  Subdomain: {hotelData.subdomain || 'hotel'}.hotelmate.com
                                </Form.Text>
                                <FieldError field="hotel.subdomain" />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Timezone</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="timezone"
                                  value={hotelData.timezone}
                                  onChange={handleInputChange}
                                  placeholder="e.g., Europe/Dublin"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
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
                                  isInvalid={!!fieldErrors['hotel.latitude']}
                                />
                                <FieldError field="hotel.latitude" />
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
                                  isInvalid={!!fieldErrors['hotel.longitude']}
                                />
                                <FieldError field="hotel.longitude" />
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
                                  isInvalid={!!fieldErrors['hotel.phone']}
                                />
                                <FieldError field="hotel.phone" />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Hotel Email</Form.Label>
                                <Form.Control
                                  type="email"
                                  name="email"
                                  value={hotelData.email}
                                  onChange={handleInputChange}
                                  placeholder="info@hotel.com"
                                  isInvalid={!!fieldErrors['hotel.email']}
                                />
                                <FieldError field="hotel.email" />
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
                              isInvalid={!!fieldErrors['hotel.website']}
                            />
                            <FieldError field="hotel.website" />
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

                        {/* Registration Packages */}
                        <div className="mb-4 p-3 bg-light rounded">
                          <h6 className="text-primary mb-3">
                            <i className="bi bi-box-seam me-2"></i>
                            Registration Packages
                          </h6>
                          
                          <Form.Group className="mb-3">
                            <Form.Label>Generate Package Count</Form.Label>
                            <Form.Control
                              type="number"
                              value={generateCount}
                              onChange={(e) => setGenerateCount(e.target.value)}
                              min="0"
                              max="10"
                              step="1"
                              isInvalid={!!fieldErrors['generate_count']}
                            />
                            <Form.Text className="text-muted">
                              Number of registration packages to generate (0-10)
                            </Form.Text>
                            <FieldError field="generate_count" />
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
                                Provisioning Hotel...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-2"></i>
                                Provision Hotel
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline-secondary" 
                            onClick={() => {
                              setShowCreateHotel(false);
                              setHotelData({ ...initialHotelData });
                              setAdminData({ ...initialAdminData });
                              setGenerateCount(0);
                              setFieldErrors({});
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