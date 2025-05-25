import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { useNavigate, useParams  } from 'react-router-dom';

const StaffCreate = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [staffData, setStaffData] = useState({
    first_name: '',
    last_name: '',
    department: '',
    role: '',
    position: '',
    phone_number: '',
    is_active: true,
    is_staff: false,
    is_superuser: false,
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('staff/users/');
        setUsers(response.data.results || response.data);
      } catch (err) {
        setError('Failed to fetch users');
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const openModal = (user) => {
    console.log('Selected user ID:', user.id);
    setSelectedUser(user);
    setStaffData({
      first_name: '',
      last_name: '',
      department: '',
      role: '',
      position: '',
      phone_number: '',
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
  };

  const closeModal = () => {
    setSelectedUser(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStaffData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedUser) return;

  try {
    const response = await api.post('staff/register/', {
      user_id: selectedUser.id,

      ...staffData,
    });
console.log("DEBUG: Full response from staff/register:", response.data);

    const staffId = response.data.staff_id; 
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaStaff created successfully:', staffId);
    closeModal();
    navigate(`/staff/${staffId}`);
  } catch (err) {
    setError('Failed to create staff');
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
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}
        >
          <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 5, minWidth: 300 }}>
            <h3>Create Staff for {selectedUser.username}</h3>
            <form onSubmit={handleSubmit}>

              <div>
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={staffData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={staffData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Department</label>
                <select
                  name="department"
                  value={staffData.department}
                  onChange={handleChange}
                  required
                >
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
                <select
                  name="role"
                  value={staffData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="porter">Porter</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="waiter">Waiter</option>
                  <option value="chef">Chef</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="housekeeping_attendant">Housekeeping Attendant</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Technician</option>
                </select>
              </div>

              <div>
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={staffData.position}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={staffData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={staffData.is_active}
                    onChange={handleChange}
                  /> Active
                </label>
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="is_staff"
                    checked={staffData.is_staff}
                    onChange={handleChange}
                  /> Is Admin
                </label>
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="is_superuser"
                    checked={staffData.is_superuser}
                    onChange={handleChange}
                  /> Is Superuser
                </label>
              </div>

              <button type="submit">Create Staff</button>
              <button type="button" onClick={closeModal} style={{ marginLeft: 10 }}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCreate;
