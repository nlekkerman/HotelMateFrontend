import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";

export default function BreakfastRoomService() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const { refreshAll } = useOrderCount(hotelSlug);
  const { hasNewBreakfast, markBreakfastRead } = useRoomServiceNotifications();
  const [orders, setOrders] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { mainColor } = useTheme();

  const fetchPendingCount = () => {
    if (!hotelSlug) return;

    api
      .get(`/room_services/${hotelSlug}/breakfast-orders/breakfast-pending-count/`)
      .then((res) => {
        setPendingCount(res.data.count || 0);
      })
      .catch((err) => {
        console.error("Error fetching pending count:", err);
      });
  };

  const fetchOrders = () => {
    if (!hotelSlug) {
      setError("No hotel identifier found.");
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get(`/room_services/${hotelSlug}/breakfast-orders/`)
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) data = data.results;
        setOrders(Array.isArray(data) ? data : []);
        
        // Mark notifications as read when viewing the page
        if (hasNewBreakfast) {
          markBreakfastRead();
        }

        // Fetch pending count
        fetchPendingCount();
      })
      .catch((err) => {
        setError("Error fetching breakfast orders.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [hotelSlug]);

  // Refresh orders when new breakfast notification arrives
  useEffect(() => {
    if (hasNewBreakfast) {
      fetchOrders();
    }
  }, [hasNewBreakfast]);

  const handleStatusChange = (order, newStatus) => {
    const prev = order.status;

    // Validate status transition workflow: pending → accepted → completed
    const isValidTransition = 
      (prev === "pending" && (newStatus === "accepted" || newStatus === "pending")) ||
      (prev === "accepted" && (newStatus === "completed" || newStatus === "accepted"));

    if (!isValidTransition) {
      const workflowMessage = prev === "pending" 
        ? "Orders must be accepted before they can be completed."
        : prev === "accepted"
        ? "Accepted orders can only be marked as completed."
        : "Completed orders cannot be changed.";
      
      setError(`Invalid status transition: ${workflowMessage}`);
      alert(`Cannot change status from "${prev}" to "${newStatus}".\n\n${workflowMessage}`);
      return;
    }

    // Optimistically update UI
    setOrders((all) =>
      newStatus === "completed"
        ? all.filter((o) => o.id !== order.id)
        : all.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );

    api
      .patch(`/room_services/${hotelSlug}/breakfast-orders/${order.id}/`, {
        status: newStatus,
      })
      .then(() => {
        refreshAll();
        fetchPendingCount(); // Update pending count
        setError(null); // Clear any previous errors
      })
      .catch((err) => {
        // Revert optimistic update
        setOrders((all) =>
          all.map((o) => (o.id === order.id ? { ...o, status: prev } : o))
        );
        
        // Handle specific error messages from backend
        const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Error updating status.";
        setError(errorMsg);
        alert(`Failed to update status: ${errorMsg}`);
        console.error("Failed to update status:", err.response?.data || err);
      });
  };

  const renderItemsCell = (order) => {
    const items = order.items || [];
    if (!items.length) return "—";

    return (
      <ol style={{ margin: 0, paddingLeft: "1rem" }}>
        {items.map(({ id, item, quantity, notes }, idx) => (
          <li key={id || idx}>
            <strong>{`${item.name} × ${quantity}`}</strong>
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

  return (
    <div className="container my-4">
      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
          <h3 className="mb-0">
            <i className="bi bi-egg-fried me-2 text-warning" />
            Breakfast Orders
          </h3>
          {pendingCount > 0 && (
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${mainColor ? 'main-bg' : 'bg-warning'} text-dark fs-6`}>
                <i className="bi bi-clock-history me-1"></i>
                {pendingCount} Pending
              </span>
            </div>
          )}
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status" />
              <span className="ms-2">Loading breakfast orders…</span>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : orders.length === 0 ? (
            <div className="alert alert-info">No breakfast orders found.</div>
          ) : (
            <div className="row g-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="col-12 col-sm-12 col-lg-6 col-xl-4"
                >
                  <div className="card h-100 shadow-sm border-dark">
                    <div className="card-header d-flex justify-content-between align-items-center bg-light">
                      <span>
                        <strong>Order #{order.id}</strong>
                      </span>
                      <span
                        className={`badge main-bg ${
                          mainColor ? "" : "bg-dark"
                        }`}
                      >
                        ROOM: {order.room_number}
                      </span>
                    </div>
                    <div className="card-body d-flex flex-column">
                      <div className="mb-2">
                        <strong>Delivery Time:</strong>{" "}
                        <span className="text-info">{order.delivery_time}</span>
                      </div>
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
                              : order.status === "accepted"
                              ? "primary"
                              : "warning"
                          }`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                        >
                          {/* Show current status */}
                          {order.status === "pending" && (
                            <>
                              <option value="pending">Pending</option>
                              <option value="accepted">Accept Order</option>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <>
                              <option value="accepted">Accepted</option>
                              <option value="completed">Mark Completed</option>
                            </>
                          )}
                          {order.status === "completed" && (
                            <option value="completed">Completed</option>
                          )}
                        </select>
                        {order.status === "pending" && (
                          <small className="text-muted d-block mt-1">
                            <i className="bi bi-info-circle me-1"></i>
                            Must accept before completing
                          </small>
                        )}
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
