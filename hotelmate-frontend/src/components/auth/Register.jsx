import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPost from '@/hooks/useAxiosPost';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { postData, loading, error: requestError } = useAxiosPost('staff/signup/');

  useEffect(() => {
    setError(requestError);
  }, [requestError]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation for password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const { confirmPassword, ...payload } = formData; // exclude confirmPassword before sending
      const data = await postData(payload);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Register</h2>
      {error && <div className="alert alert-danger">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
      <form onSubmit={handleSubmit} className="w-75">
        <div className="mb-3">
          <label>Username</label>
          <input
            type="text"
            name="username"
            className="form-control"
            value={formData.username}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            className="form-control"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label>Email</label>
          <input
            type="email"
            name="email"
            className="form-control"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>First Name</label>
          <input
            type="text"
            name="first_name"
            className="form-control"
            value={formData.first_name}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Last Name</label>
          <input
            type="text"
            name="last_name"
            className="form-control"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
