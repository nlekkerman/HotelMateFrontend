import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";
import { useRoomServiceState, useRoomServiceDispatch } from "@/realtime/stores/roomServiceStore";
import { roomServiceActions } from "@/realtime/stores/roomServiceStore";

export default function RoomServiceOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hotelSlug = user?.hotel_slug;
  const { refreshAll: refreshCount } = useOrderCount(hotelSlug);
  const { hasNewRoomService, markRoomServiceRead } = useRoomServiceNotifications();
  const roomServiceState = useRoomServiceState();
  const dispatch = useRoomServiceDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { mainColor } = useTheme();

  // Get room service orders from store (excluding breakfast)
  const orders = Object.values(roomServiceState.ordersById)
    .filter(order => order.type !== 'breakfast' && !order.breakfast_order)
    .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));

  const fetchOrders = () => {
    if (!hotelSlug) {
      setError("No hotel identifier found.");
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get(`/room_services/${hotelSlug}/orders/`)
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) data = data.results;
        
        // Initialize store with fetched data
        roomServiceActions.initFromAPI(Array.isArray(data) ? data : []);
        
        // Mark notifications as read when viewing the page
        if (hasNewRoomService) {
          markRoomServiceRead();
        }
      })
      .catch(() => {
        setError("Error fetching room service orders.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [hotelSlug]);

  // Refresh orders when new room service notification arrives
  useEffect(() => {
    if (hasNewRoomService) {
      fetchOrders();
    }
  }, [hasNewRoomService]);

  // Use WebSocket for first order only, for example
  const firstOrderId = orders.length > 0 ? orders[0].id : null;

 

  const handleStatusChange = (order, newStatus) => {
    const prev = order.status;

    // Validate status transition workflow: pending → accepted → completed
    const isValidTransition = 
      (prev === "pending" && (newStatus === "accepted" || newStatus === "pending")) ||
      (prev === "accepted" && (newStatus === "completed" || newStatus === "accepted")) ||
      (prev === "completed" && newStatus === "completed");

    if (!isValidTransition) {
      const workflowMessage = prev === "pending" 
        ? "Orders must be accepted before they can be completed."
        : prev === "accepted"
        ? "Accepted orders can only be marked as completed."
        : "Completed orders cannot be changed.";
      
      setError(`Invalid status transition: ${workflowMessage}`);
      toast.error(`Cannot change status from "${prev}" to "${newStatus}". ${workflowMessage}`);
      return;
    }

    // Optimistically update UI
    setOrders((all) =>
      newStatus === "completed"
        ? all.filter((o) => o.id !== order.id)
        : all.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );

    api
      .patch(`/room_services/${hotelSlug}/orders/${order.id}/`, {
        status: newStatus,
      })
      .then(() => {
        refreshCount();
        toast.success(`Order #${order.id} status updated to ${newStatus}`);
        setError(null);
      })
      .catch((err) => {
        // Revert optimistic update on error
        setOrders((all) =>
          all.map((o) => (o.id === order.id ? { ...o, status: prev } : o))
        );
        
        const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Error updating status.";
        setError(errorMsg);
        toast.error(`Failed to update status: ${errorMsg}`);
        console.error("Failed to update status:", err.response?.data || err);
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
    <div className="container my-4">
      {/* Mobile Quick Actions - Same style as desktop */}
      <div 
        className="d-lg-none position-fixed start-0 end-0"
        style={{
          top: "60px",
          zIndex: 1045,
          background: "transparent",
        }}
      >
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
            <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/orders`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-receipt-cutoff" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>All Orders</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/breakfast-orders`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-egg-fried" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Breakfast</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/orders-management`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-clipboard-data" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Management</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/orders-summary`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-graph-up" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Summary</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
          <h3 className="mb-0">
            <i className="bi bi-cart-check-fill me-2 text-primary" />
            Room Service Orders
          </h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <span className="ms-2">Loading room service orders…</span>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : orders.length === 0 ? (
            <div className="alert alert-info">No room service orders found.</div>
          ) : (
            <div className="row g-3">
              {orders.map((order) => (
                <div key={order.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-dark">
                    <div className="card-header d-flex justify-content-between align-items-center bg-light">
                      <span>
                        <strong>Order #{order.id}</strong>
                      </span>
                      <span
                        className={`badge main-bg ${mainColor ? "" : "bg-dark"}`}
                      >
                        ROOM: {order.room_number}
                      </span>
                    </div>
                    <div className="card-body d-flex flex-column">
                      <div className="mb-2">
                        <strong>Items:</strong>
                        {renderItemsCell(order)}
                      </div>
                      <div className="mb-2">
                        <strong>Status:</strong>
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
                      </div>
                      <div className="mb-2">
                        <strong>Total:</strong>{" "}
                        <span className="text-success fw-bold">
                          €{calculateTotal(order).toFixed(2)}
                        </span>
                        <small className="ms-1 text-muted">(incl. €5 tray)</small>
                      </div>
                      <div>
                        <strong>Ordered:</strong>{" "}
                        <span className="text-muted">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
