import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';

/**
 * StaffLoginPage - Staff authentication page
 * Currently implements fake auth for development
 * Will be replaced with real JWT/session auth in Phase 2
 */
const StaffLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsStaff } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get redirect path from location state
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.username || !formData.password) {
        throw new Error('Please enter both username and password');
      }

      // TODO: Replace with real API call to backend auth endpoint
      // For now, simulate successful login
      console.log('[StaffLogin] Simulating login for:', formData.username);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fake staff user data
      // In production, this will come from the backend API response
      const fakeStaffUser = {
        id: 1,
        staff_id: 1,
        username: formData.username,
        is_staff: true,
        is_superuser: false,
        access_level: 'manager',
        department: 'Reception',
        role: 'Manager',
        allowed_navs: [
          'home',
          'reception',
          'rooms',
          'guests',
          'bookings',
          'restaurants',
          'room_service',
          'breakfast',
          'hotel_info',
          'staff',
          'roster',
          'maintenance',
          'chat',
          'stock_tracker',
          'games'
        ],
        hotel_id: 1,
        hotel_name: 'Hotel Killarney',
        hotel_slug: 'hotel-killarney',
        token: 'fake-jwt-token-' + Date.now()
      };

      // Call loginAsStaff from AuthContext
      loginAsStaff(fakeStaffUser);

      // Redirect to original destination or home
      navigate(from, { replace: true });

    } catch (err) {
      console.error('[StaffLogin] Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary mb-2">
                    <i className="bi bi-person-badge me-2"></i>
                    Staff Login
                  </h2>
                  <p className="text-muted">
                    Sign in to access the staff portal
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </Alert>
                )}

                {/* Login Form */}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="username">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      autoFocus
                      disabled={loading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 py-2 fw-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>
                </Form>

                {/* Development Notice */}
                <Alert variant="info" className="mt-4 mb-0 small">
                  <strong>Development Mode:</strong> Enter any username and password to simulate login.
                  Real authentication will be implemented in Phase 2.
                </Alert>
              </Card.Body>
            </Card>

            {/* Back to Hotels Link */}
            <div className="text-center mt-4">
              <Link to="/" className="text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i>
                Back to Hotels
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default StaffLoginPage;
