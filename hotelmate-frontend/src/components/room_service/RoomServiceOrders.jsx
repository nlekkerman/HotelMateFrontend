import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";

export default function RoomServiceOrders() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const { refreshAll: refreshCount } = useOrderCount(hotelSlug);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { mainColor } = useTheme();

  useEffect(() => {
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
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError("Error fetching room service orders.");
      })
      .finally(() => setLoading(false));
  }, [hotelSlug]);

  // Use WebSocket for first order only, for example
  const firstOrderId = orders.length > 0 ? orders[0].id : null;

 

  const handleStatusChange = (order, newStatus) => {
    const prev = order.status;

    setOrders((all) =>
      newStatus === "completed"
        ? all.filter((o) => o.id !== order.id)
        : all.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );

    api
      .patch(`/room_services/${hotelSlug}/orders/${order.id}/`, {
        status: newStatus,
      })
      .then(() => refreshCount())
      .catch(() => {
        setOrders((all) =>
          all.map((o) => (o.id === order.id ? { ...o, status: prev } : o))
        );
        setError("Error updating status.");
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
