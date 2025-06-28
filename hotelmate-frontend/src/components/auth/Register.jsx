import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPost from '@/hooks/useAxiosPost';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { postData, loading, error: requestError } = useAxiosPost('staff/register/');

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
    };

    try {
      await postData(payload);
      navigate('/registration-success');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Register User</h2>
      {error && <div className="alert alert-danger">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
      <form onSubmit={handleSubmit} className="w-75">
        <div className="mb-3">
          <label>Username</label>
          <input name="username" type="text" value={formData.username} onChange={handleChange} required className="form-control" />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input name="password" type="password" value={formData.password} onChange={handleChange} required className="form-control" />
        </div>

        <div className="mb-3">
          <label>Confirm Password</label>
          <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required className="form-control" />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
