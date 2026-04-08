import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import RoomTypesTab from './room-management/RoomTypesTab';
import RoomsTab from './room-management/RoomsTab';
import './RoomManagement.css';

const TABS = [
  { key: 'room-types', label: 'Room Types', icon: 'bi-layers' },
  { key: 'rooms', label: 'Rooms', icon: 'bi-door-open' },
];

const RoomManagementPage = () => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('room-types');

  if (!user) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          Please log in to access room management.
        </div>
      </div>
    );
  }

  return (
    <div className="room-management-page">
      <div className="room-management-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h1 className="h3 mb-1">Room Management</h1>
              <p className="text-muted mb-0">Manage room types and inventory</p>
            </div>
          </div>

          <ul className="nav nav-tabs room-management-tabs border-0" role="tablist">
            {TABS.map((tab) => (
              <li className="nav-item" key={tab.key} role="presentation">
                <button
                  className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  role="tab"
                >
                  <i className={`bi ${tab.icon} me-2`}></i>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="room-management-content">
        <div className="container-fluid">
          {activeTab === 'room-types' && <RoomTypesTab hotelSlug={hotelSlug} />}
          {activeTab === 'rooms' && <RoomsTab hotelSlug={hotelSlug} />}
        </div>
      </div>
    </div>
  );
};

export default RoomManagementPage;
