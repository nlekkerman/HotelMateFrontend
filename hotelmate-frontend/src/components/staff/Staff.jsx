// src/components/staff/Staff.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api'; // Adjust path if needed

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [hotels, setHotels] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch staff
    const fetchStaff = async () => {
      try {
        const response = await api.get('staff/');
        console.log('API staff response:', response.data);
        console.log('Making request to:', api.defaults.baseURL + 'staff/');
        const data = response.data;

        if (Array.isArray(data)) {
          setStaffList(data);
        } else if (Array.isArray(data.results)) {
          setStaffList(data.results);
        } else {
          setStaffList([]);
          console.error('Unexpected staff list format', data);
        }
      } catch (err) {
        setError(
          err.response?.status === 401
            ? 'Unauthorized: Please login'
            : 'Failed to fetch staff data'
        );
        console.error(err);
      }
    };

    // Fetch hotels into a map { [id]: hotelObj }
    const fetchHotels = async () => {
      try {
        const res = await api.get('hotel/hotel_list/');
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.results)
          ? res.data.results
          : [];
        const map = {};
        list.forEach(h => {
          map[h.id] = h;
        });
        setHotels(map);
      } catch (err) {
        console.error('Failed to fetch hotels', err);
      }
    };

    fetchStaff();
    fetchHotels();
  }, []);

  if (error) {
    return (
      <div className="alert alert-danger my-4" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <h2>Staff List</h2>
      <div className="button-wrapper">
        <button
          className="btn btn-primary mb-3"
          onClick={() => navigate('/staff/create')}
        >
          Create New Staff
        </button>
      </div>

      {staffList.length === 0 ? (
        <p>No staff available.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Position</th>
                <th>Phone Number</th>
                <th>Hotel</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr
                  key={staff.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/staff/${staff.id}`)}
                >
                  <td>{staff.id}</td>
                  <td>{staff.user?.username || 'N/A'}</td>
                  <td>{staff.user?.email || 'N/A'}</td>
                  <td>{staff.first_name || 'N/A'}</td>
                  <td>{staff.last_name || 'N/A'}</td>
                  <td>{staff.department || 'N/A'}</td>
                  <td>{staff.role || 'N/A'}</td>
                  <td>{staff.position || 'N/A'}</td>
                  <td>{staff.phone_number || 'N/A'}</td>
                  <td>{hotels[staff.hotel]?.name || '—'}</td>
                  <td>{staff.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
