import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";
import { useRoomServiceState, useRoomServiceDispatch } from "@/realtime/stores/roomServiceStore";
import { roomServiceActions } from "@/realtime/stores/roomServiceStore";
import { toast } from "react-toastify";

export default function RoomServiceOrdersManagement() {
  const { hotelIdentifier } = useParams();
  const { user } = useAuth();
  const hotelSlug = hotelIdentifier || user?.hotel_slug;
  const { refreshAll: refreshCount } = useOrderCount(hotelSlug);
  const { hasNewRoomService, markRoomServiceRead } = useRoomServiceNotifications();
  const roomServiceState = useRoomServiceState();
  const dispatch = useRoomServiceDispatch();
  const { mainColor } = useTheme();

  // View mode: 'active' or 'history'
  const [viewMode, setViewMode] = useState('active');
  
  const [historyOrders, setHistoryOrders] = useState([]); // For history view only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination and stats
  const [pagination, setPagination] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  
  // Filters for history only
  const [historyFilters, setHistoryFilters] = useState({
    room_number: '',
    date_from: '',
    date_to: '',
    page: 1,
    page_size: 20
  });

  // Get active orders from store, history orders from local state (since they're filtered/paginated)
  const activeOrders = Object.values(roomServiceState.ordersById)
    .filter(order => order.status !== 'completed' && order.status !== 'cancelled')
    .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
  
  const displayOrders = viewMode === 'active' ? activeOrders : historyOrders;

  const fetchActiveOrders = async () => {
    if (!hotelSlug) {
      setError("No hotel identifier found.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch active orders (pending + accepted only)
      const response = await api.get(
        `/room_services/${hotelSlug}/orders/`
      );

      let activeOrders = response.data;
      if (Array.isArray(activeOrders.results)) {
        activeOrders = activeOrders.results;
      }
      
      // Initialize store with active orders
      roomServiceActions.initFromAPI(activeOrders);
      
      // Calculate status breakdown for active orders
      const breakdown = [
        { status: 'pending', count: activeOrders.filter(o => o.status === 'pending').length },
        { status: 'accepted', count: activeOrders.filter(o => o.status === 'accepted').length }
      ];
      setStatusBreakdown(breakdown);
      
      setPagination({
        total_orders: activeOrders.length,
        page: 1,
        page_size: activeOrders.length,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });
      
      // Mark notifications as read when viewing the page
      if (hasNewRoomService) {
        markRoomServiceRead();
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
      setError("Error fetching active orders.");
      toast.error("Failed to load active orders");
    } finally {
      setLoading(false);
    }
  };

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
      params.append('page', historyFilters.page);
      params.append('page_size', historyFilters.page_size);
      
      if (historyFilters.room_number) {
        params.append('room_number', historyFilters.room_number);
      }
      if (historyFilters.date_from) {
        params.append('date_from', historyFilters.date_from);
      }
      if (historyFilters.date_to) {
        params.append('date_to', historyFilters.date_to);
      }

      // Fetch order history (completed orders only)
      const response = await api.get(
        `/room_services/${hotelSlug}/orders/order-history/?${params}`
      );

      const data = response.data;
      setHistoryOrders(data.orders || []);
      setPagination(data.pagination || {});
      
    } catch (err) {
      console.error('Error fetching order history:', err);
      setError("Error fetching order history. Endpoint may not be available yet.");
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'active') {
      fetchActiveOrders();
    } else {
      fetchOrderHistory();
    }
  }, [hotelSlug, viewMode, historyFilters]);

  // Refresh active orders when new room service notification arrives
  useEffect(() => {
    if (hasNewRoomService && viewMode === 'active') {
      fetchActiveOrders();
    }
  }, [hasNewRoomService]);

  const handleStatusChange = (order, newStatus) => {
    const prev = order.status;

    // Get current orders based on view mode
    const currentOrders = viewMode === 'active' ? activeOrders : historyOrders;
    
    // Optimistically update UI
    const updatedOrders = newStatus === "completed"
      ? currentOrders.filter((o) => o.id !== order.id)
      : currentOrders.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o));
    
    // Update the appropriate state based on view mode
    if (viewMode === 'active') {
      // For active orders, update the store
      dispatch({
        type: 'ORDER_STATUS_CHANGED',
        payload: { order: { ...order, status: newStatus }, orderId: order.id }
      });
    } else {
      // For history orders, update local state
      setHistoryOrders(updatedOrders);
    }
    
    // Update status breakdown for active orders
    if (viewMode === 'active') {
      const breakdown = [
        { status: 'pending', count: updatedOrders.filter(o => o.status === 'pending').length },
        { status: 'accepted', count: updatedOrders.filter(o => o.status === 'accepted').length }
      ];
      setStatusBreakdown(breakdown);
      
      setPagination({
        ...pagination,
        total_orders: updatedOrders.length
      });
    }

    api
      .patch(`/room_services/${hotelSlug}/orders/${order.id}/`, {
        status: newStatus,
      })
      .then(() => {
        refreshCount();
        toast.success(`Order #${order.id} status updated to ${newStatus}`);
        
        // If completed, refresh to ensure sync with backend
        if (newStatus === 'completed' && viewMode === 'active') {
          fetchActiveOrders();
        }
      })
      .catch(() => {
        // Revert on error - restore original order status
        if (viewMode === 'active') {
          // Revert the store update
          dispatch({
            type: 'ORDER_STATUS_CHANGED',
            payload: { order: { ...order, status: prev }, orderId: order.id }
          });
          
          // Revert status breakdown to original values
          const originalBreakdown = [
            { status: 'pending', count: activeOrders.filter(o => o.status === 'pending').length },
            { status: 'accepted', count: activeOrders.filter(o => o.status === 'accepted').length }
          ];
          setStatusBreakdown(originalBreakdown);
        } else {
          // Revert history orders
          setHistoryOrders(currentOrders);
        }
          
        if (viewMode === 'active') {
          setPagination({
            ...pagination,
            total_orders: activeOrders.length
          });
        }
        
        setError("Error updating status.");
        toast.error("Failed to update order status");
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

  const handleHistoryFilterChange = (key, value) => {
    setHistoryFilters({
      ...historyFilters,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when changing filters
    });
  };
  
  const clearHistoryFilters = () => {
    setHistoryFilters({
      room_number: '',
      date_from: '',
      date_to: '',
      page: 1,
      page_size: 20
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'accepted':
        return 'bg-info text-white';
      case 'completed':
        return 'bg-success text-white';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="container my-4">
      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
          <h3 className="mb-0">
            <i className="bi bi-cart-check-fill me-2 text-primary" />
            Room Service Orders
          </h3>
          
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${viewMode === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('active')}
            >
              <i className="bi bi-clock-history me-2"></i>
              Active Orders
              {viewMode === 'active' && pagination.total_orders > 0 && (
                <span className="badge bg-light text-dark ms-2">
                  {pagination.total_orders}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'history' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewMode('history')}
            >
              <i className="bi bi-archive me-2"></i>
              Order History
              {viewMode === 'history' && pagination.total_orders > 0 && (
                <span className="badge bg-light text-dark ms-2">
                  {pagination.total_orders}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Status Breakdown - Only show for active orders */}
          {viewMode === 'active' && statusBreakdown.length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <i className="bi bi-bar-chart me-2"></i>
                  Status Breakdown
                </h5>
                <div className="row g-3">
                  {statusBreakdown.map((item) => (
                    <div key={item.status} className="col-md-3 col-sm-4 col-6">
                      <div className={`badge ${getStatusBadgeClass(item.status)} w-100 p-3`}>
                        <div className="fs-6">{item.status.toUpperCase()}</div>
                        <div className="fs-4 fw-bold">{item.count}</div>
                      </div>
                    </div>
                  ))}
                  <div className="col-md-3 col-sm-4 col-6">
                    <div className="badge bg-dark w-100 p-3">
                      <div className="fs-6">TOTAL</div>
                      <div className="fs-4 fw-bold">{pagination.total_orders || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters - Only show for Order History */}
          {viewMode === 'history' && (
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
                      value={historyFilters.room_number}
                      onChange={(e) => handleHistoryFilterChange('room_number', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-md-3">
                    <label className="form-label">Date From</label>
                    <input
                      type="date"
                      className="form-control"
                      value={historyFilters.date_from}
                      onChange={(e) => handleHistoryFilterChange('date_from', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-md-3">
                    <label className="form-label">Date To</label>
                    <input
                      type="date"
                      className="form-control"
                      value={historyFilters.date_to}
                      onChange={(e) => handleHistoryFilterChange('date_to', e.target.value)}
                    />
                  </div>

                  <div className="col-md-3 d-flex align-items-end">
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
          )}

          {/* Orders Display */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <span className="ms-2">Loading orders…</span>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : displayOrders.length === 0 ? (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              No {viewMode === 'active' ? 'active' : 'completed'} orders found.
            </div>
          ) : (
            <>
              {/* Pagination for History */}
              {viewMode === 'history' && pagination.total_pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <button
                    className="btn btn-outline-primary"
                    disabled={!pagination.has_previous}
                    onClick={() => handleHistoryFilterChange('page', historyFilters.page - 1)}
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
                    onClick={() => handleHistoryFilterChange('page', historyFilters.page + 1)}
                  >
                    Next
                    <i className="bi bi-chevron-right ms-2"></i>
                  </button>
                </div>
              )}

              <div className="row g-3">
                {displayOrders.map((order) => (
                  <div key={order.id} className="col-12 col-md-6 col-lg-4">
                    <div className={`card h-100 shadow-sm ${viewMode === 'history' ? 'border-success' : 'border-dark'}`}>
                      <div className={`card-header d-flex justify-content-between align-items-center ${viewMode === 'history' ? 'bg-success text-white' : 'bg-light'}`}>
                        <span>
                          <strong>Order #{order.id}</strong>
                        </span>
                        <span
                          className={`badge ${viewMode === 'history' ? 'bg-light text-dark' : mainColor ? 'main-bg' : 'bg-dark'}`}
                        >
                          ROOM: {order.room_number}
                        </span>
                      </div>
                      <div className="card-body d-flex flex-column">
                        <div className="mb-2">
                          <strong>Items:</strong>
                          {renderItemsCell(order)}
                        </div>
                        
                        {/* Status display/control */}
                        <div className="mb-2">
                          <strong>Status:</strong>
                          {viewMode === 'active' ? (
                            <select
                              className={`form-select mt-1 border-${
                                order.status === "completed"
                                  ? "success"
                                  : order.status === "pending"
                                  ? "warning"
                                  : "primary"
                              }`}
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(order, e.target.value)
                              }
                            >
                              {["pending", "accepted", "completed"].map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-1">
                              <span className={`badge ${getStatusBadgeClass('completed')} px-3 py-2`}>
                                COMPLETED ✓
                              </span>
                            </div>
                          )}
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
                        
                        {viewMode === 'history' && order.updated_at && (
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
      </div>
    </div>
  );
}