// src/pages/staff/RoomsHub.jsx
// Canonical entry for the Rooms module.
// Consolidates room list, room management (CRUD inventory), and guest list.
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import RoomList from '@/components/rooms/RoomList';
import RoomTypesTab from './room-management/RoomTypesTab';
import RoomsTab from './room-management/RoomsTab';
import GuestList from '@/components/guests/GuestList';
import './RoomManagement.css';

const TABS = [
  { key: 'list', label: 'Rooms', icon: 'bi-door-closed' },
  { key: 'management', label: 'Management', icon: 'bi-layers' },
  { key: 'guests', label: 'Guests', icon: 'bi-people-fill' },
];

export default function RoomsHub() {
  const { hotelSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'list';
  // RoomManagementPage originally had its own sub-tab for room-types vs rooms;
  // keep that same behaviour inside the management tab via a secondary query param.
  const managementSubTab = searchParams.get('mgmt') || 'room-types';

  const selectTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'list') next.delete('tab');
    else next.set('tab', key);
    next.delete('mgmt');
    setSearchParams(next, { replace: true });
  };

  const selectManagementSub = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'management');
    if (key === 'room-types') next.delete('mgmt');
    else next.set('mgmt', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="rooms-hub room-management-page">
      <div className="room-management-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h1 className="h3 mb-1">Rooms</h1>
              <p className="text-muted mb-0">Room inventory, live status and in-house guests</p>
            </div>
          </div>

          <ul className="nav nav-tabs room-management-tabs border-0" role="tablist">
            {TABS.map((t) => (
              <li className="nav-item" key={t.key}>
                <button
                  type="button"
                  className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => selectTab(t.key)}
                  role="tab"
                >
                  <i className={`bi ${t.icon} me-2`} />
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="room-management-content">
        <div className="container-fluid">
          {activeTab === 'list' && <RoomList />}
          {activeTab === 'management' && (
            <div>
              <ul className="nav nav-pills mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${managementSubTab === 'room-types' ? 'active' : ''}`}
                    onClick={() => selectManagementSub('room-types')}
                  >
                    Room Types
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${managementSubTab === 'rooms' ? 'active' : ''}`}
                    onClick={() => selectManagementSub('rooms')}
                  >
                    Rooms
                  </button>
                </li>
              </ul>
              {managementSubTab === 'room-types' && <RoomTypesTab hotelSlug={hotelSlug} />}
              {managementSubTab === 'rooms' && <RoomsTab hotelSlug={hotelSlug} />}
            </div>
          )}
          {activeTab === 'guests' && <GuestList />}
        </div>
      </div>
    </div>
  );
}
