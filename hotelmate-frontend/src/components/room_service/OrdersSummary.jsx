import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { setHotelIdentifier } from '@/services/apiWithHotel';
import { toast } from 'react-toastify';

export default function OrdersSummary() {
  const { hotelIdentifier } = useParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [ordersByRoom, setOrdersByRoom] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    room_number: '',
    status: '',
    page: 1,
    page_size: 20
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      setHotelIdentifier(hotelIdentifier);
      
      const params = new URLSearchParams();
      params.append('page', filters.page);
      params.append('page_size', filters.page_size);
      
      if (filters.room_number) {
        params.append('room_number', filters.room_number);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const response = await api.get(
        `/room_services/${hotelIdentifier}/orders/all-orders-summary/?${params}`
      );

      setOrders(response.data.orders);
      setPagination(response.data.pagination);
      setStatusBreakdown(response.data.status_breakdown);
      setOrdersByRoom(response.data.orders_by_room || []);
      
      console.log('📊 Orders summary loaded:', {
        total: response.data.pagination.total_orders,
        page: response.data.pagination.page,
        statuses: response.data.status_breakdown
      });
    } catch (error) {
      console.error('Failed to fetch orders summary:', error);
      toast.error('Failed to load orders summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelIdentifier) {
      fetchOrders();
    }
  }, [hotelIdentifier, filters]);

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
      page: 1 // Reset to page 1 when filters change
    });
  };

  const handlePageChange = (newPage) => {
    setFilters({
      ...filters,
      page: newPage
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'accepted':
        return 'bg-info text-dark';
      case 'preparing':
        return 'bg-primary text-white';
      case 'ready':
        return 'bg-success text-white';
      case 'delivered':
        return 'bg-success text-white';
      case 'completed':
        return 'bg-secondary text-white';
      case 'cancelled':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-clipboard-data me-2"></i>
          All Orders Summary
        </h2>
        <button 
          className="btn btn-primary"
          onClick={fetchOrders}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Status Breakdown */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <i className="bi bi-bar-chart me-2"></i>
                Status Breakdown
              </h5>
              <div className="row g-3">
                {statusBreakdown.map((item) => (
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
                    <div className="fs-4 fw-bold">{pagination.total_orders || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                value={filters.room_number}
                onChange={(e) => handleFilterChange('room_number', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Orders per Page</label>
              <select
                className="form-select"
                value={filters.page_size}
                onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
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
                onClick={() => setFilters({
                  room_number: '',
                  status: '',
                  page: 1,
                  page_size: 20
                })}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          No orders found matching the current filters.
        </div>
      ) : (
        <>
          <div className="row">
            {orders.map((order) => (
              <div key={order.id} className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title mb-1">Order #{order.id}</h5>
                        <p className="text-muted mb-0">
                          <i className="bi bi-door-closed me-1"></i>
                          Room {order.room_number}
                        </p>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(order.status)} px-3 py-2`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {new Date(order.created_at).toLocaleString()}
                      </small>
                    </div>

                    <ul className="list-group list-group-flush mb-3">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="list-group-item d-flex justify-content-between px-0"
                        >
                          <span>
                            {item.item.name} × {item.quantity}
                            {item.notes && (
                              <small className="d-block text-muted">
                                Note: {item.notes}
                              </small>
                            )}
                          </span>
                          <span className="text-muted">
                            €{(Number(item.item_price) * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="d-flex justify-content-between pt-2 border-top">
                      <strong>Total</strong>
                      <strong className="text-primary">
                        €{Number(order.total_price).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted">
                      Page {pagination.page} of {pagination.total_pages} 
                      ({pagination.total_orders} total orders)
                    </span>
                  </div>
                  <div className="btn-group">
                    <button
                      className="btn btn-outline-primary"
                      disabled={!pagination.has_previous}
                      onClick={() => handlePageChange(filters.page - 1)}
                    >
                      <i className="bi bi-chevron-left"></i> Previous
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      disabled={!pagination.has_next}
                      onClick={() => handlePageChange(filters.page + 1)}
                    >
                      Next <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
