import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAxiosPost from '@/hooks/useAxiosPost';

const Register = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    registrationCode: '', // <-- added field
    qrToken: '', // <-- QR token from URL
    hotelSlug: '', // <-- hotel slug from URL
  });

  const [error, setError] = useState(null);
  const [isQRRegistration, setIsQRRegistration] = useState(false);
  const navigate = useNavigate();
  const { postData, loading, error: requestError } = useAxiosPost('/staff/register/');

  // Extract QR token and hotel slug from URL on component mount
  useEffect(() => {
    const token = searchParams.get('token');
    const hotel = searchParams.get('hotel');
    
    if (token && hotel) {
      console.log('🔐 QR Registration detected:', { token: token.substring(0, 10) + '...', hotel });
      setIsQRRegistration(true);
      setFormData(prev => ({
        ...prev,
        qrToken: token,
        hotelSlug: hotel,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (requestError) setError(requestError);
  }, [requestError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const payload = {
      username: formData.username,
      password: formData.password,
      registration_code: formData.registrationCode,
    };

    // Add QR token if this is a QR-based registration
    if (formData.qrToken) {
      payload.qr_token = formData.qrToken;
      console.log('🔐 Including QR token in registration');
    }

    console.log('🚀 Sending registration request:', {
      endpoint: '/staff/register/',
      payload: { ...payload, password: '[HIDDEN]', qr_token: payload.qr_token ? '[PRESENT]' : '[NONE]' }
    });

    try {
      const response = await postData(payload);
      
      console.log('✅ Registration response:', response);
      
      // Store registration data from backend response
      // Note: No staff_id or is_active yet - manager creates staff profile later
      if (response && response.token) {
        const userToStore = {
          token: response.token,
          username: response.username,
          user_id: response.user_id,
          hotel_slug: response.hotel_slug,
          hotel_name: response.hotel_name,
          registration_code: response.registration_code,
          message: response.message,
        };
        console.log('💾 Storing user data:', userToStore);
        localStorage.setItem('user', JSON.stringify(userToStore));
      }
      
      navigate('/registration-success');
    } catch (err) {
      console.error('❌ Registration error:', err);
      console.error('❌ Error response:', err.response?.data);
      
      // Handle backend error responses
      let errorMessage = 'Registration failed';
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        
        // Handle error object with 'error' key (backend standard format)
        if (errorData.error) {
          errorMessage = errorData.error;
        } 
        // Handle validation errors
        else if (typeof errorData === 'object') {
          errorMessage = Object.values(errorData).flat().join('. ');
        }
        // Handle string errors
        else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Register New Staff Account</h2>
              
              {isQRRegistration && (
                <div className="alert alert-success mb-4">
                  <i className="fas fa-qrcode me-2"></i>
                  <strong>QR Code Detected!</strong> Registration for <strong>{formData.hotelSlug}</strong>
                  <br />
                  <small>Please enter your details and the registration code from your package.</small>
                </div>
              )}
              
              <div className="alert alert-info mb-4">
                <h6 className="alert-heading">
                  <i className="fas fa-info-circle me-2"></i>Registration Process
                </h6>
                <small>
                  <p className="mb-1">1. Enter your username and password</p>
                  <p className="mb-1">2. Provide the registration code from your hotel manager</p>
                  <p className="mb-0">3. Wait for manager approval to activate your account</p>
                </small>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Username <span className="text-danger">*</span>
                  </label>
                  <input 
                    name="username" 
                    type="text" 
                    value={formData.username} 
                    onChange={handleChange} 
                    required 
                    className="form-control" 
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                  <small className="form-text text-muted">
                    Choose a unique username (cannot be changed later)
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Password <span className="text-danger">*</span>
                  </label>
                  <input 
                    name="password" 
                    type="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    className="form-control" 
                    placeholder="Enter a secure password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <input 
                    name="confirmPassword" 
                    type="password" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                    className="form-control" 
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Registration Code <span className="text-danger">*</span>
                  </label>
                  <input 
                    name="registrationCode" 
                    type="text" 
                    value={formData.registrationCode} 
                    onChange={handleChange} 
                    required 
                    className="form-control" 
                    placeholder="Enter the code from your manager"
                    autoComplete="off"
                  />
                  <small className="form-text text-muted">
                    This code was provided by your hotel manager and can only be used once
                  </small>
                </div>

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Registering...
                      </>
                    ) : (
                      'Register'
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center mt-3">
                <small className="text-muted">
                  Already have an account? <a href="/login">Login here</a>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
