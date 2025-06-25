import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

const StaffCreate = () => {
  const [users, setUsers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [staffData, setStaffData] = useState({
    first_name: '',
    last_name: '',
    department: '',
    role: '',
    access_level: 'regular_staff',
    email: '',
    phone_number: '',
    is_active: true,
    is_on_duty: false,
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      try {
        const response = await api.get('staff/users/');
        setUsers(response.data.results || response.data);
      } catch (err) {
        setError('Failed to fetch users');
        console.error(err);
      }
    };
    // Fetch hotels
    const fetchHotels = async () => {
      try {
        const response = await api.get('hotel/hotels/');
        setHotels(response.data.results || response.data);
      } catch (err) {
        setError('Failed to fetch hotels');
        console.error(err);
      }
    };

    fetchUsers();
    fetchHotels();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    setStaffData({
      first_name: '',
      last_name: '',
      department: '',
      role: '',
      access_level: 'regular_staff',
      email: '',
      phone_number: '',
      is_active: true,
      is_on_duty: false,
    });
    setSelectedHotelId(''); // reset hotel selection
  };

  const closeModal = () => {
    setSelectedUser(null);
    setError(null);
    setSelectedHotelId('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStaffData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleHotelChange = (e) => {
    setSelectedHotelId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    if (!selectedHotelId) {
      setError('Please select a hotel');
      return;
    }

    try {
      const payload = {
        user_id: selectedUser.id,
        ...staffData,
      };

      const response = await api.post('staff/register/', payload, {
        headers: {
          'X-Hotel-ID': selectedHotelId,
        }
      });

      console.log("Staff created:", response.data);
      closeModal();
      navigate(`/staff/${response.data.staff_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff');
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Create New Staff</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <h3>Select User</h3>
      <ul style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ccc', padding: 10 }}>
        {users.map(user => (
          <li
            key={user.id}
            onClick={() => openModal(user)}
            style={{ cursor: 'pointer', padding: 5, borderBottom: '1px solid #eee' }}
          >
            {user.username} ({user.email})
          </li>
        ))}
      </ul>

      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 5, minWidth: 320 }}>
            <h3>Create Staff for {selectedUser.username}</h3>

            <form onSubmit={handleSubmit}>
              <div>
                <label>Hotel</label>
                <select value={selectedHotelId} onChange={handleHotelChange} required>
                  <option value="">Select Hotel</option>
                  {hotels.map(hotel => (
                    <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>First Name</label>
                <input type="text" name="first_name" value={staffData.first_name} onChange={handleChange} required />
              </div>

              <div>
                <label>Last Name</label>
                <input type="text" name="last_name" value={staffData.last_name} onChange={handleChange} required />
              </div>

              <div>
                <label>Department</label>
                <select name="department" value={staffData.department} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  <option value="front_office">Front Office</option>
                  <option value="front_house">Front House</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="leisure">Leisure</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="management">Management</option>
                </select>
              </div>

              <div>
                <label>Role</label>
                <select name="role" value={staffData.role} onChange={handleChange}>
                  <option value="">Select Role</option>
                  <option value="porter">Porter</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="waiter">Waiter</option>
                  <option value="chef">Chef</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="housekeeping_attendant">Housekeeping Attendant</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Technician</option>
                  <option value="security">Security</option>
                  <option value="concierge">Concierge</option>
                  <option value="leisure_staff">Leisure Staff</option>
                  <option value="maintenance_staff">Maintenance Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>

             

              <div>
                <label>Email</label>
                <input type="email" name="email" value={staffData.email} onChange={handleChange} />
              </div>

              <div>
                <label>Phone Number</label>
                <input type="text" name="phone_number" value={staffData.phone_number} onChange={handleChange} />
              </div>

              <div>
                <label>Access Level</label>
                <select name="access_level" value={staffData.access_level} onChange={handleChange} required>
                  <option value="regular_staff">Regular Staff</option>
                  <option value="staff_admin">Staff Admin</option>
                  <option value="super_staff_admin">Super Staff Admin</option>
                </select>
              </div>

              <div>
                <label>
                  <input type="checkbox" name="is_active" checked={staffData.is_active} onChange={handleChange} />
                  Active
                </label>
              </div>

              <div>
                <label>
                  <input type="checkbox" name="is_on_duty" checked={staffData.is_on_duty} onChange={handleChange} />
                  On Duty
                </label>
              </div>

              <button type="submit">Create Staff</button>
              <button type="button" onClick={closeModal} style={{ marginLeft: 10 }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCreate;
