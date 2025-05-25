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
        console.log('Fetching staff detail for id:', id);
        const response = await api.get(`staff/${id}/`); 
        console.log('Staff creation response:', response.data);

        setStaff(response.data);
      } catch (err) {
        setError('Failed to fetch staff details');
        console.error(err);
      }
    };

    fetchStaff();
  }, [id]);

  if (error) return <div>Error: {error}</div>;
  if (!staff) return <div>Loading...</div>;

  return (
    <div>
      <h2>Staff Details</h2>
      <p><strong>ID:</strong> {staff.id}</p>
      <p><strong>Username:</strong> {staff.user?.username}</p>
      <p><strong>Email:</strong> {staff.user?.email}</p>
      <p><strong>First Name:</strong> {staff.first_name}</p>
      <p><strong>Last Name:</strong> {staff.last_name}</p>
      <p><strong>Department:</strong> {staff.department}</p>
      <p><strong>Role:</strong> {staff.role}</p>
      <p><strong>Position:</strong> {staff.position}</p>
      <p><strong>Phone Number:</strong> {staff.phone_number}</p>
      <p><strong>Active:</strong> {staff.is_active ? 'Yes' : 'No'}</p>

      <button onClick={() => navigate('/staff')} className="btn btn-secondary mt-3">
        Back to Staff List
      </button>
    </div>
  );
}

export default StaffDetails;
