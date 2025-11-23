import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import useLogin from '@/hooks/useLogin';

/**
 * StaffLoginPage - Staff authentication page
 * Integrates with backend API for real JWT authentication
 */
const StaffLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { loginUser, loading, error: loginError } = useLogin();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    try {
      // Validation
      if (!formData.username || !formData.password) {
        setLocalError('Please enter both username and password');
        return;
      }

      console.log('[StaffLogin] Attempting login for:', formData.username);

      // Call real login API
      const response = await loginUser(formData.username, formData.password);

      console.log('[StaffLogin] Login successful:', response);

      // Get hotel slug from response or user context
      const hotelSlug = response.hotel_slug || response.user?.hotel_slug;
      
      // Get redirect path from location state or default to staff feed with hotel slug
      const from = location.state?.from?.pathname || (hotelSlug ? `/staff/${hotelSlug}/feed` : '/staff/login');
      
      // Redirect to staff feed or original destination
      navigate(from, { replace: true });

    } catch (err) {
      console.error('[StaffLogin] Login error:', err);
      setLocalError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.');
    }
  };

  // Combine errors
  const error = localError || loginError;

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
