// src/components/staff/StaffDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';

function StaffDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get(`staff/${id}/`);
        setStaff(response.data);
      } catch (err) {
        setError('Failed to fetch staff details');
        console.error(err);
      }
    };

    fetchStaff();
  }, [id]);

  const formatDepartment = (dept) => {
    if (!dept) return 'N/A';
    return dept
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!staff) return <div className="text-muted mt-3">Loading staff details...</div>;

  return (
    <div className="container mt-4 mb-5 p-4 bg-white rounded shadow-sm">
      <h2 className="mb-4 text-primary">👤 Staff Details</h2>
      
      <div className="row mb-3">
        <div className="col-md-6">
          <p><strong>ID:</strong> {staff.id}</p>
          <p><strong>Username:</strong> {staff.user?.username || '—'}</p>
          <p><strong>Email:</strong> {staff.user?.email || '—'}</p>
          <p><strong>First Name:</strong> {staff.first_name}</p>
          <p><strong>Last Name:</strong> {staff.last_name}</p>
          <p><strong>Phone Number:</strong> {staff.phone_number || '—'}</p>
        </div>
        <div className="col-md-6">
          <p><strong>Department:</strong> {formatDepartment(staff.department)}</p>
          <p><strong>Role:</strong> {staff.role || '—'}</p>
          <p><strong>Position:</strong> {staff.position || '—'}</p>
          <p><strong>Active:</strong> 
            <span className={`ms-2 badge ${staff.is_active ? 'bg-success' : 'bg-secondary'}`}>
              {staff.is_active ? 'Yes' : 'No'}
            </span>
          </p>
        </div>
      </div>

      {staff.user?.staff_profile?.hotel && (
        <>
          <h4 className="mt-4 text-secondary">🏨 Hotel Info</h4>
          <div className="row">
            <div className="col-md-6">
              <p><strong>Hotel Name:</strong> {staff.user.staff_profile.hotel.name}</p>
            </div>
          </div>
        </>
      )}

      <div className="mt-4">
        <button
          onClick={() => navigate('/staff')}
          className="btn btn-outline-secondary"
        >
          ← Back to Staff List
        </button>
      </div>
    </div>
  );
}

export default StaffDetails;
