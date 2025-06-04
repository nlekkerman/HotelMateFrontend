import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '@/services/api';

function AssignGuestForm() {
  const { roomNumber } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [hotelSlug, setHotelSlug] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    id_pin: '',
    check_in_date: null,
    check_out_date: null,
    days_booked: 1,
    hotel_name: '',
    room_number: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await api.get(`/rooms/rooms/${roomNumber}/`);
        const roomData = res.data;
        setRoom(roomData);
        setHotelSlug(roomData.hotel_slug);

        setFormData((prev) => ({
          ...prev,
          id_pin: roomData.guest_id_pin || '',
          hotel_name: roomData.hotel_name || roomData.hotel_slug,
          room_number: roomData.room_number,
        }));
      } catch (err) {
        console.error('Failed to fetch room details:', err);
        setErrors({ fetch: 'Failed to load room data.' });
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomNumber]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (field, date) => {
    const updatedForm = { ...formData, [field]: date };

    if (field === 'check_in_date' && updatedForm.days_booked) {
      const checkOut = new Date(date);
      checkOut.setDate(checkOut.getDate() + parseInt(updatedForm.days_booked));
      updatedForm.check_out_date = checkOut;
    }

    if (field === 'check_out_date' && updatedForm.check_in_date) {
      const diffTime = date.getTime() - updatedForm.check_in_date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      updatedForm.days_booked = diffDays > 0 ? diffDays : 1;
    }

    setFormData(updatedForm);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const names = formData.full_name.trim().split(' ');
    const first_name = names.shift() || '';
    const last_name = names.join(' ') || '';

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
      check_in_date: formatDate(formData.check_in_date),
      check_out_date: formatDate(formData.check_out_date),
      days_booked: formData.days_booked,
      room_number: formData.room_number,
      hotel_slug: hotelSlug,
    };

    try {
      await api.post(`/rooms/${hotelSlug}/rooms/${roomNumber}/add-guest/`, payload);
      navigate('/rooms/');
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        console.error('Submission error:', error);
        setErrors({ submit: 'Failed to assign guest.' });
      }
    }
  };

  if (loading) return <p>Loading room data...</p>;
  if (!room) return <p>{errors.fetch || 'Room not found.'}</p>;

  return (
    <div className="container py-5">
      <h2>Assign Guest</h2>
      <form onSubmit={handleSubmit} noValidate>
        {/* Hotel Name (Read-only) */}
        <div className="mb-3">
          <label className="form-label">Hotel</label>
          <input
            type="text"
            className="form-control"
            name="hotel_name"
            value={formData.hotel_name}
            disabled
          />
        </div>

        {/* Room Number (Read-only) */}
        <div className="mb-3">
          <label className="form-label">Room Number</label>
          <input
            type="text"
            className="form-control"
            name="room_number"
            value={formData.room_number}
            disabled
          />
        </div>

        {/* Guest Info */}
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
          />
          {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Phone Number</label>
          <input
            type="text"
            className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
          />
          {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
        </div>

        {/* Dates */}
        <div className="mb-3">
          <label className="form-label">Check-in Date</label>
          <DatePicker
            selected={formData.check_in_date}
            onChange={(date) => handleDateChange('check_in_date', date)}
            className="form-control"
            dateFormat="yyyy-MM-dd"
            placeholderText="Select check-in date"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Check-out Date</label>
          <DatePicker
            selected={formData.check_out_date}
            onChange={(date) => handleDateChange('check_out_date', date)}
            className="form-control"
            dateFormat="yyyy-MM-dd"
            placeholderText="Select check-out date"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Days Booked</label>
          <input
            type="number"
            className="form-control"
            name="days_booked"
            value={formData.days_booked}
            onChange={handleChange}
            readOnly
          />
        </div>


        {/* ID PIN */}
        <div className="mb-3">
          <label className="form-label">Guest ID PIN</label>
          <input
            type="text"
            className="form-control"
            name="id_pin"
            value={formData.id_pin}
            disabled
          />
        </div>

        {errors.submit && <div className="text-danger mb-3">{errors.submit}</div>}

        <button type="submit" className="btn btn-primary">Assign Guest</button>
        <button
          type="button"
          className="btn btn-secondary ms-2"
          onClick={() => navigate('/rooms/rooms')}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

export default AssignGuestForm;
