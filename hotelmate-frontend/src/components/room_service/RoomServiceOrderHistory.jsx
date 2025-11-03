import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "react-toastify";

export default function RoomServiceOrderHistory({ hotelSlug }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  // Filters for history
  const [filters, setFilters] = useState({
    room_number: '',
    date_from: '',
    date_to: '',
    page: 1,
    page_size: 20
  });

  const fetchOrderHistory = async () => {
    if (!hotelSlug) {
      setError("No hotel identifier found.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', filters.page);
      params.append('page_size', filters.page_size);
      
      if (filters.room_number) {
        params.append('room_number', filters.room_number);
      }
      if (filters.date_from) {
        params.append('date_from', filters.date_from);
      }
      if (filters.date_to) {
        params.append('date_to', filters.date_to);
      }

      // Fetch order history (completed orders only)
      const response = await api.get(
        `/room_services/${hotelSlug}/orders/order-history/?${params}`
      );

      const data = response.data;
      setOrders(data.orders || []);
      setPagination(data.pagination || {});
      
    } catch (err) {
      console.error('Error fetching order history:', err);
      setError("Error fetching order history.");
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, [hotelSlug, filters]);

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when changing filters
    });
  };

  const clearFilters = () => {
    setFilters({
      room_number: '',
      date_from: '',
      date_to: '',
      page: 1,
      page_size: 20
    });
  };

  const renderItemsCell = (order) => {
    const items = order.items || [];
    if (!items.length) return "—";

    return (
      <ol style={{ margin: 0, paddingLeft: "1rem" }}>
        {items.map(({ id, item, quantity, item_price, notes }, idx) => (
          <li key={id || idx}>
            <strong>
              {item.name} × {quantity} @ €{Number(item_price).toFixed(2)}
            </strong>
            {notes && (
              <span style={{ fontStyle: "italic", marginLeft: 8 }}>
                ({notes})
              </span>
            )}
          </li>
        ))}
      </ol>
    );
  };

  const calculateTotal = (order) => {
    const base = Number(order.total_price || 0);
    return base + 5; // Including tray charge
  };

  return (
    <div>
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
              <label className="form-label">Date From</label>
              <input
                type="date"
                className="form-control"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Date To</label>
              <input
                type="date"
                className="form-control"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Display */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <span className="ms-2">Loading order history…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          No completed orders found.
        </div>
      ) : (
        <>
          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button
                className="btn btn-outline-primary"
                disabled={!pagination.has_previous}
                onClick={() => handleFilterChange('page', filters.page - 1)}
              >
                <i className="bi bi-chevron-left me-2"></i>
                Previous
              </button>
              
              <span className="text-muted">
                Page {pagination.page} of {pagination.total_pages} 
                <span className="ms-2">({pagination.total_orders} total orders)</span>
              </span>
              
              <button
                className="btn btn-outline-primary"
                disabled={!pagination.has_next}
                onClick={() => handleFilterChange('page', filters.page + 1)}
              >
                Next
                <i className="bi bi-chevron-right ms-2"></i>
              </button>
            </div>
          )}

          {/* Orders Grid */}
          <div className="row g-3">
            {orders.map((order) => (
              <div key={order.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-success">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <span>
                      <strong>Order #{order.id}</strong>
                    </span>
                    <span className="badge bg-light text-dark">
                      ROOM: {order.room_number}
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <div className="mb-2">
                      <strong>Items:</strong>
                      {renderItemsCell(order)}
                    </div>
                    
                    {/* Status display */}
                    <div className="mb-2">
                      <strong>Status:</strong>
                      <div className="mt-1">
                        <span className="badge bg-success px-3 py-2">
                          COMPLETED ✓
                        </span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <strong>Total:</strong>{" "}
                      <span className="text-success fw-bold">
                        €{calculateTotal(order).toFixed(2)}
                      </span>
                      <small className="ms-1 text-muted">(incl. €5 tray)</small>
                    </div>
                    
                    <div className="mb-2">
                      <strong>Ordered:</strong>{" "}
                      <span className="text-muted">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {order.updated_at && (
                      <div>
                        <strong>Completed:</strong>{" "}
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
        </>
      )}
    </div>
  );
}
