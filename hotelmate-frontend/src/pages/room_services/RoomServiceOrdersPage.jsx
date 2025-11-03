import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useOrderCount } from '@/hooks/useOrderCount.jsx';
import { useTheme } from '@/context/ThemeContext';
import { useRoomServiceNotifications } from '@/context/RoomServiceNotificationContext';
import { toast } from 'react-toastify';

export default function RoomServiceOrdersPage() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const { refreshAll: refreshCount } = useOrderCount(hotelSlug);
  const { hasNewRoomService, markRoomServiceRead } = useRoomServiceNotifications();
  const { mainColor } = useTheme();

  // Tab state: 'active' or 'history'
  const [activeTab, setActiveTab] = useState('active');
  
  // Active orders state
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activePagination, setActivePagination] = useState({});
  const [activeStatusBreakdown, setActiveStatusBreakdown] = useState([]);
  
  // Historical orders state
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({});
  
  // Filters
  const [activeFilters, setActiveFilters] = useState({
    room_number: '',
    status: '',
    page: 1,
    page_size: 20
  });

  const [historyFilters, setHistoryFilters] = useState({
    room_number: '',
    page: 1,
    page_size: 20
  });

  const [error, setError] = useState(null);

  // Fetch active orders (pending, accepted)
  const fetchActiveOrders = async () => {
    if (!hotelSlug) {
      setError('No hotel identifier found.');
      return;
    }

    setActiveLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', activeFilters.page);
      params.append('page_size', activeFilters.page_size);
      
      // Exclude completed orders
      params.append('exclude_status', 'completed');
      
      if (activeFilters.room_number) {
        params.append('room_number', activeFilters.room_number);
      }
      if (activeFilters.status) {
        params.append('status', activeFilters.status);
      }

      const response = await api.get(
        `/room_services/${hotelSlug}/orders/all-orders-summary/?${params}`
      );

      setActiveOrders(response.data.orders || []);
      setActivePagination(response.data.pagination || {});
      setActiveStatusBreakdown(response.data.status_breakdown || []);

      // Mark notifications as read when viewing the page
      if (hasNewRoomService) {
        markRoomServiceRead();
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
      setError('Error fetching active orders.');
      toast.error('Failed to load active orders');
    } finally {
      setActiveLoading(false);
    }
  };

  // Fetch historical orders (completed)
  const fetchHistoryOrders = async () => {
    if (!hotelSlug) {
      setError('No hotel identifier found.');
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', historyFilters.page);
      params.append('page_size', historyFilters.page_size);
      params.append('status', 'completed');
      
      if (historyFilters.room_number) {
        params.append('room_number', historyFilters.room_number);
      }

      const response = await api.get(
        `/room_services/${hotelSlug}/orders/all-orders-summary/?${params}`
      );

      setHistoryOrders(response.data.orders || []);
      setHistoryPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Error fetching history orders:', err);
      setError('Error fetching order history.');
      toast.error('Failed to load order history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveOrders();
    } else {
      fetchHistoryOrders();
    }
  }, [hotelSlug, activeTab, activeFilters, historyFilters]);

  // Refresh active orders when new notification arrives
  useEffect(() => {
    if (hasNewRoomService && activeTab === 'active') {
      fetchActiveOrders();
    }
  }, [hasNewRoomService]);

  // Handle status change for active orders
  const handleStatusChange = async (order, newStatus) => {
    const prevStatus = order.status;

    // Optimistically update UI
    setActiveOrders((all) =>
      newStatus === 'completed'
        ? all.filter((o) => o.id !== order.id)
        : all.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );

    try {
      await api.patch(`/room_services/${hotelSlug}/orders/${order.id}/`, {
        status: newStatus,
      });
      
      refreshCount();
      toast.success(`Order #${order.id} status updated to ${newStatus}`);
      
      // If order completed, refresh active orders to remove it
      if (newStatus === 'completed') {
        fetchActiveOrders();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      
      // Revert on error
      setActiveOrders((all) =>
        all.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o))
      );
      
      setError('Error updating status.');
      toast.error('Failed to update order status');
    }
  };

  // Handle filter changes for active orders
  const handleActiveFilterChange = (key, value) => {
    setActiveFilters({
      ...activeFilters,
      [key]: value,
      page: key === 'page' ? value : 1
    });
  };

  // Handle filter changes for history orders
  const handleHistoryFilterChange = (key, value) => {
    setHistoryFilters({
      ...historyFilters,
      [key]: value,
      page: key === 'page' ? value : 1
    });
  };

  // Clear filters
  const clearActiveFilters = () => {
    setActiveFilters({
      room_number: '',
      status: '',
      page: 1,
      page_size: 20
    });
  };

  const clearHistoryFilters = () => {
    setHistoryFilters({
      room_number: '',
      page: 1,
      page_size: 20
    });
  };

  // Get badge class for status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'accepted':
        return 'bg-info text-dark';
      case 'completed':
        return 'bg-success text-white';
      default:
        return 'bg-secondary';
    }
  };

  // Render items list
  const renderItemsList = (order) => {
    const items = order.items || [];
    if (!items.length) return <p className="text-muted">No items</p>;

    return (
      <ul className="list-group list-group-flush">
        {items.map((item) => (
          <li
            key={item.id}
            className="list-group-item d-flex justify-content-between px-0"
          >
            <div>
              <strong>{item.item.name}</strong> × {item.quantity}
              {item.notes && (
                <small className="d-block text-muted fst-italic">
                  Note: {item.notes}
                </small>
              )}
            </div>
            <span className="text-muted">
              €{(Number(item.item_price) * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  // Calculate total with tray charge
  const calculateTotal = (order) => {
    const base = Number(order.total_price || 0);
    return base + 5; // Including €5 tray charge
  };

  // Render pagination controls
  const renderPagination = (pagination, onPageChange) => {
    if (!pagination || pagination.total_pages <= 1) return null;

    return (
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">
              Page {pagination.page} of {pagination.total_pages} 
              ({pagination.total_orders} total orders)
            </span>
            <div className="btn-group">
              <button
                className="btn btn-outline-primary"
                disabled={!pagination.has_previous}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                <i className="bi bi-chevron-left"></i> Previous
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={!pagination.has_next}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Next <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render active orders tab content
  const renderActiveOrders = () => (
    <>
      {/* Status Breakdown */}
      {activeStatusBreakdown.length > 0 && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">
              <i className="bi bi-bar-chart me-2"></i>
              Status Breakdown
            </h5>
            <div className="row g-3">
              {activeStatusBreakdown.map((item) => (
                <div key={item.status} className="col-md-2 col-sm-4 col-6">
                  <div className={`badge ${getStatusBadgeClass(item.status)} w-100 p-3`}>
                    <div className="fs-6">{item.status.toUpperCase()}</div>
                    <div className="fs-4 fw-bold">{item.count}</div>
                  </div>
                </div>
              ))}
              <div className="col-md-2 col-sm-4 col-6">
                <div className="badge bg-dark w-100 p-3">
                  <div className="fs-6">TOTAL</div>
                  <div className="fs-4 fw-bold">{activePagination.total_orders || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-funnel me-2"></i>
            Filters
          </h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Room Number</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 101"
                value={activeFilters.room_number}
                onChange={(e) => handleActiveFilterChange('room_number', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={activeFilters.status}
                onChange={(e) => handleActiveFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Orders per Page</label>
              <select
                className="form-select"
                value={activeFilters.page_size}
                onChange={(e) => handleActiveFilterChange('page_size', parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearActiveFilters}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {activeLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading active orders...</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          No active orders found.
        </div>
      ) : (
        <>
          <div className="row g-3">
            {activeOrders.map((order) => (
              <div key={order.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-dark">
                  <div className="card-header d-flex justify-content-between align-items-center bg-light">
                    <span>
                      <strong>Order #{order.id}</strong>
                    </span>
                    <span className={`badge main-bg ${mainColor ? '' : 'bg-dark'}`}>
                      ROOM: {order.room_number}
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <div className="mb-3">
                      <strong>Items:</strong>
                      {renderItemsList(order)}
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong>
                      <select
                        className={`form-select mt-1 border-${
                          order.status === 'completed'
                            ? 'success'
                            : order.status === 'pending'
                            ? 'warning'
                            : 'primary'
                        }`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                      >
                        {['pending', 'accepted', 'completed'].map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-2">
                      <strong>Total:</strong>{' '}
                      <span className="text-success fw-bold">
                        €{calculateTotal(order).toFixed(2)}
                      </span>
                      <small className="ms-1 text-muted">(incl. €5 tray)</small>
                    </div>
                    <div className="mb-2">
                      <strong>Ordered:</strong>{' '}
                      <span className="text-muted">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    {order.updated_at && order.updated_at !== order.created_at && (
                      <div>
                        <strong>Updated:</strong>{' '}
                        <span className="text-muted">
                          {new Date(order.updated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {renderPagination(activePagination, (page) => handleActiveFilterChange('page', page))}
        </>
      )}
    </>
  );

  // Render history orders tab content
  const renderHistoryOrders = () => (
    <>
      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-funnel me-2"></i>
            Filters
          </h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Room Number</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 101"
                value={historyFilters.room_number}
                onChange={(e) => handleHistoryFilterChange('room_number', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Orders per Page</label>
              <select
                className="form-select"
                value={historyFilters.page_size}
                onChange={(e) => handleHistoryFilterChange('page_size', parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearHistoryFilters}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {historyLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading order history...</p>
        </div>
      ) : historyOrders.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          No completed orders found.
        </div>
      ) : (
        <>
          <div className="row g-3">
            {historyOrders.map((order) => (
              <div key={order.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-success">
                  <div className="card-header d-flex justify-content-between align-items-center bg-success text-white">
                    <span>
                      <strong>Order #{order.id}</strong>
                    </span>
                    <span className="badge bg-light text-dark">
                      ROOM: {order.room_number}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <strong>Items:</strong>
                      {renderItemsList(order)}
                    </div>
                    <div className="mb-2">
                      <span className={`badge ${getStatusBadgeClass('completed')} px-3 py-2`}>
                        COMPLETED ✓
                      </span>
                    </div>
                    <div className="mb-2">
                      <strong>Total:</strong>{' '}
                      <span className="text-success fw-bold">
                        €{calculateTotal(order).toFixed(2)}
                      </span>
                      <small className="ms-1 text-muted">(incl. €5 tray)</small>
                    </div>
                    <div className="mb-2">
                      <strong>Ordered:</strong>{' '}
                      <span className="text-muted">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <strong>Completed:</strong>{' '}
                      <span className="text-muted">
                        {new Date(order.updated_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {renderPagination(historyPagination, (page) => handleHistoryFilterChange('page', page))}
        </>
      )}
    </>
  );

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
          <h3 className="mb-0">
            <i className="bi bi-cart-check-fill me-2 text-primary" />
            Room Service Orders
          </h3>
          <button
            className="btn btn-primary"
            onClick={() => activeTab === 'active' ? fetchActiveOrders() : fetchHistoryOrders()}
            disabled={activeLoading || historyLoading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            {activeLoading || historyLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
                type="button"
              >
                <i className="bi bi-clock-history me-2"></i>
                Active Orders
                {activePagination.total_orders > 0 && (
                  <span className="badge bg-primary ms-2">
                    {activePagination.total_orders}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
                type="button"
              >
                <i className="bi bi-archive me-2"></i>
                Order History
                {historyPagination.total_orders > 0 && (
                  <span className="badge bg-secondary ms-2">
                    {historyPagination.total_orders}
                  </span>
                )}
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'active' ? renderActiveOrders() : renderHistoryOrders()}
          </div>
        </div>
      </div>
    </div>
  );
}
