import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPost from '@/hooks/useAxiosPost';
import api from '@/services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    email: '',
    hotel: '',
    department: '',
    role: '',
    position: '',
    phone_number: '',
    is_active: true,
    is_on_duty: false,
  });
  const [error, setError] = useState(null);
  const [hotels, setHotels] = useState([]);
  const navigate = useNavigate();

  const { postData, loading, error: requestError } = useAxiosPost('staff/register/');

  useEffect(() => {
    if (requestError) setError(requestError);
  }, [requestError]);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await api.get('hotel/hotels/');
        setHotels(res.data.results);
      } catch (err) {
        console.error('Failed to load hotels', err);
      }
    };
    fetchHotels();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Build nested payload according to backend StaffSerializer
    const payload = {
      user: {
        username: formData.username,
        password: formData.password,
        email: formData.email,
      },
      first_name: formData.first_name,
      last_name: formData.last_name,
      department: formData.department,
      role: formData.role,
      position: formData.position,
      email: formData.email,
      phone_number: formData.phone_number,
      is_active: formData.is_active,
      is_on_duty: formData.is_on_duty,
      hotel: formData.hotel,
    };

    try {
      await postData(payload);
      navigate('/reception');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Register Staff</h2>
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

        <div className="mb-3">
          <label>Email (optional)</label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" />
        </div>

        <div className="mb-3">
          <label>First Name</label>
          <input name="first_name" type="text" value={formData.first_name} onChange={handleChange} required className="form-control" />
        </div>

        <div className="mb-3">
          <label>Last Name</label>
          <input name="last_name" type="text" value={formData.last_name} onChange={handleChange} required className="form-control" />
        </div>

        <div className="mb-3">
          <label>Department</label>
          <input name="department" type="text" value={formData.department} onChange={handleChange} required className="form-control" />
        </div>

        <div className="mb-3">
          <label>Role</label>
          <input name="role" type="text" value={formData.role} onChange={handleChange} className="form-control" />
        </div>

        <div className="mb-3">
          <label>Position</label>
          <input name="position" type="text" value={formData.position} onChange={handleChange} className="form-control" />
        </div>

        <div className="mb-3">
          <label>Phone Number</label>
          <input name="phone_number" type="text" value={formData.phone_number} onChange={handleChange} className="form-control" />
        </div>

        <div className="mb-3">
          <label>Hotel</label>
          <select name="hotel" value={formData.hotel} onChange={handleChange} className="form-control" required>
            <option value="">Select a hotel</option>
            {hotels.map(hotel => (
              <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
            ))}
          </select>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="is_active">Active</label>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="is_on_duty"
            name="is_on_duty"
            checked={formData.is_on_duty}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="is_on_duty">On Duty</label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
