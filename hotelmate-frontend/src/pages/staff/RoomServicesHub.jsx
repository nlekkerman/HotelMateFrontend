// src/pages/staff/RoomServicesHub.jsx
// Canonical entry for the Room Services module.
// Consolidates /orders, /orders-management, /orders-summary, /breakfast-orders.
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomServiceOrders from '@/components/room_service/RoomServiceOrders';
import RoomServiceOrdersManagement from '@/components/room_service/RoomServiceOrdersManagement';
import OrdersSummary from '@/components/room_service/OrdersSummary';
import BreakfastRoomService from '@/components/room_service/BreakfastRoomService';

const TABS = [
  { key: 'orders', label: 'Active Orders', icon: 'bi-receipt-cutoff' },
  { key: 'management', label: 'Management', icon: 'bi-clipboard-data' },
  { key: 'summary', label: 'History / Summary', icon: 'bi-graph-up' },
  { key: 'breakfast', label: 'Breakfast', icon: 'bi-egg-fried' },
];

export default function RoomServicesHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';

  const selectTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'orders') next.delete('tab');
    else next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="room-services-hub">
      <div className="container-fluid pt-3">
        <div className="d-flex justify-content-between align-items-center py-2">
          <div>
            <h1 className="h3 mb-1">Room Services</h1>
            <p className="text-muted mb-0">Orders, management and breakfast delivery</p>
          </div>
        </div>
        <ul className="nav nav-tabs" role="tablist">
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

      <div className="room-services-hub-body">
        {activeTab === 'orders' && <RoomServiceOrders />}
        {activeTab === 'management' && <RoomServiceOrdersManagement />}
        {activeTab === 'summary' && <OrdersSummary />}
        {activeTab === 'breakfast' && <BreakfastRoomService />}
      </div>
    </div>
  );
}
