// src/pages/staff/RoomBookingsHub.jsx
// Canonical entry for the Room Bookings module.
// Replaces /bookings and /staff/hotel/:hotelSlug/booking-management.
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import BookingList from '@/components/staff/bookings/BookingList';
import BookingManagementDashboard from '@/components/bookings/BookingManagementDashboard';
import './BookingManagement.css';

const TABS = [
  { key: 'list', label: 'Bookings', icon: 'bi-calendar-check' },
  { key: 'settings', label: 'Booking Settings', icon: 'bi-gear' },
];

export default function RoomBookingsHub() {
  const { hotelSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'list';

  const selectTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'list') next.delete('tab');
    else next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="booking-management-page">
      <div className="booking-management-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h1 className="h3 mb-1">Room Bookings</h1>
              <p className="text-muted mb-0">Manage reservations, guest stays, and booking policies</p>
            </div>
          </div>

          <ul className="nav nav-tabs border-0" role="tablist">
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

      <div className="booking-management-content">
        {activeTab === 'list' && <BookingList hotelSlug={hotelSlug} />}
        {activeTab === 'settings' && <BookingManagementDashboard hotelSlug={hotelSlug} />}
      </div>
    </div>
  );
}
