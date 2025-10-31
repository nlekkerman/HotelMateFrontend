import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="display-1 text-success mb-3">✓</div>
                <h2 className="text-success">Registration Successful!</h2>
              </div>

              {userData && (
                <div className="alert alert-info mb-4">
                  <h5 className="alert-heading">
                    <i className="fas fa-info-circle me-2"></i>Welcome, {userData.username}!
                  </h5>
                  <hr />
                  <p className="mb-2">
                    <strong>Hotel:</strong> {userData.hotel_name || 'Not assigned yet'}
                  </p>
                  <p className="mb-2">
                    <strong>Registration Code:</strong> {userData.registration_code}
                  </p>
                  <p className="mb-0">
                    <strong>Status:</strong>{' '}
                    <span className="text-warning">
                      Waiting for Manager to Create Profile
                    </span>
                  </p>
                </div>
              )}

              <div className="alert alert-warning" role="alert">
                <h5 className="alert-heading">
                  <i className="fas fa-clock me-2"></i>Next Steps
                </h5>
                <hr />
                <p>Your user account has been created, but your manager needs to complete your staff profile before you can access the system.</p>
                <p className="mb-2"><strong>What happens next:</strong></p>
                <ol className="mb-0">
                  <li>Your hotel manager will see you in the "Pending Registrations" list</li>
                  <li>Manager will create your staff profile with:
                    <ul>
                      <li>Your full name and contact details</li>
                      <li>Department and role assignment</li>
                      <li>Access level and permissions</li>
                    </ul>
                  </li>
                  <li>Once your staff profile is created, you can log in with full access</li>
                </ol>
              </div>

              <div className="alert alert-success" role="alert">
                <p className="mb-0">
                  <i className="fas fa-check-circle me-2"></i>
                  You will be notified once your account has been activated by the manager.
                </p>
              </div>

              <div className="d-grid gap-2 mt-4">
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleGoToLogin}
                >
                  Go to Login
                </button>
              </div>

              <div className="text-center mt-3 text-muted small">
                <p className="mb-0">If you have any questions, please contact your hotel manager.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
