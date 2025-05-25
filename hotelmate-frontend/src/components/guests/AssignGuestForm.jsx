import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api'; // axios instance with base URL

function AssignGuestForm() {
  const { roomNumber } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    id_pin: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await api.get(`/rooms/${roomNumber}/`);
        setRoom(res.data);
        setFormData((prev) => ({ ...prev, id_pin: res.data.guest_id_pin || '' }));
      } catch (error) {
        console.error('Failed to fetch room:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, [roomNumber]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setErrors({});

  // Split full_name into first and last names (basic split by space)
  const names = formData.full_name.trim().split(' ');
  const first_name = names.shift() || '';
  const last_name = names.join(' ') || ''; // all remaining parts

  if (!first_name || !last_name) {
    setErrors({ full_name: 'Please enter both first and last name' });
    return;
  }

  const payload = {
    first_name,
    last_name,
    email: formData.email,
    phone_number: formData.phone_number,
    id_pin: formData.id_pin,
  };

  try {
    await api.post(`/rooms/${roomNumber}/add_guest/`, payload);
    navigate('/rooms');
  } catch (error) {
    if (error.response?.data) {
      setErrors(error.response.data);
    } else {
      console.error('Submission error:', error);
    }
  }
};


  if (loading) return <p>Loading room data...</p>;
  if (!room) return <p>Room not found</p>;

  return (
    <div className="container py-5">
      <h2>Assign Guest to Room {room.room_number}</h2>
      <form onSubmit={handleSubmit} noValidate>
        {[
          { label: 'Full Name', name: 'full_name', type: 'text' },
          { label: 'Email', name: 'email', type: 'email' },
          { label: 'Phone Number', name: 'phone_number', type: 'text' },
          { label: 'Guest ID PIN', name: 'id_pin', type: 'text', disabled: true },
        ].map(({ label, name, type, disabled }) => (
          <div className="mb-3" key={name}>
            <label htmlFor={name} className="form-label">{label}</label>
            <input
              type={type}
              className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
              id={name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              disabled={disabled}
            />
            {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
          </div>
        ))}
        <button type="submit" className="btn btn-primary">Assign Guest</button>
        <button
          type="button"
          className="btn btn-secondary ms-2"
          onClick={() => navigate('/rooms')}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

export default AssignGuestForm;
