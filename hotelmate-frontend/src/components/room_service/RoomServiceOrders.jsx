import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";

export default function RoomServiceOrders() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const { refresh: refreshCount } = useOrderCount(hotelSlug);
  const [view, setView] = useState("roomService"); // "roomService" or "breakfast"
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug) {
      setError("No hotel identifier found.");
      return;
    }
    setLoading(true);
    setError(null);

    const basePath = `/room_services/${hotelSlug}`;
    const endpoint =
      view === "breakfast"
        ? `${basePath}/breakfast-orders/`
        : `${basePath}/orders/`;

    api
      .get(endpoint)
      .then((res) => {
        let data = res.data;
        if (data && Array.isArray(data.results)) data = data.results;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError("Error fetching orders.");
      })
      .finally(() => setLoading(false));
  }, [view, hotelSlug]);

  const handleStatusChange = (order, newStatus) => {
    const basePath = `/room_services/${hotelSlug}`;
    const endpoint =
      view === "breakfast"
        ? `${basePath}/breakfast-orders/${order.id}/`
        : `${basePath}/orders/${order.id}/`;

    const prev = order.status;
    setOrders((all) =>
      all.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );

    api
  .patch(endpoint, { status: newStatus })
  .then(() => {
    // 1) Refresh the navbar badge count
    refreshCount();
  })
  .catch((err) => {
    // 2) Roll back the optimistic UI update
    setOrders((all) =>
      all.map((o) =>
        o.id === order.id ? { ...o, status: prev } : o
      )
    );
    // 3) Surface the error
    setError("Error updating status.");
    console.error("Failed to update order status:", err);
  });

  };

  const renderItemsCell = (order) => {
  const items = order.items || [];
  if (!items.length) return "—";

  return (
    <ol style={{ margin: 0, paddingLeft: "1rem" }}>
      {items.map(({ id, item, quantity, item_price, notes }, idx) => {
        // For breakfast there’s no item_price
        const line =
          view === "breakfast"
            ? `${item.name} × ${quantity}`
            : `${item.name} × ${quantity} @ €${Number(item_price).toFixed(2)}`;

        return (
          <li key={id || idx}>
            <strong>{line}</strong>
            {notes && (
              <span style={{ fontStyle: "italic", marginLeft: 8 }}>
                ({notes})
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};


  const calculateTotal = (order) => {
    const base = Number(order.total_price || 0);
    return view === "roomService" ? base + 5 : base;
  };


return (
  <div className="container my-4">
    <div className="card shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
        <h3 className="mb-0">
          <i className="bi bi-cart-check-fill me-2 text-primary" />
          Orders
        </h3>
        <div className="btn-group mt-2 mt-md-0" role="group">
          <button
            type="button"
            className={`btn btn-${view === "roomService" ? "primary" : "outline-primary"}`}
            onClick={() => setView("roomService")}
          >
            Room Service
          </button>
          <button
            type="button"
            className={`btn btn-${view === "breakfast" ? "primary" : "outline-primary"}`}
            onClick={() => setView("breakfast")}
          >
            Breakfast
          </button>
        </div>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <span className="ms-2">Loading orders…</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : orders.length === 0 ? (
          <div className="alert alert-info">
            No {view === "breakfast" ? "breakfast" : "room service"} orders found.
          </div>
        ) : (
          <div className="row g-3">
            {orders.map(order => (
              <div key={order.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm d-flex flex-column">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <span>
                      <strong>Order #{order.id}</strong>
                    </span>
                    <span className="badge bg-secondary">{order.room_number}</span>
                  </div>
                  <div className="card-body d-flex flex-column">
                    {view === "breakfast" && (
                      <div className="mb-2">
                        <strong>Delivery Time:</strong>{" "}
                        <span>{order.delivery_time}</span>
                      </div>
                    )}
                    <div className="mb-2">
                      <strong>Items:</strong>
                      {renderItemsCell(order)}
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong>
                      <select
                        className="form-select mt-1"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                      >
                        {(view === "breakfast"
                          ? ["pending", "completed"]
                          : ["pending", "accepted", "completed"]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-2">
                      <strong>Total:</strong>{" "}
                      <span>
                        €{calculateTotal(order).toFixed(2)}
                        {view === "roomService" && (
                          <small className="ms-1 text-muted">(incl. €5 tray)</small>
                        )}
                      </span>
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      <span className="text-muted">{new Date(order.created_at).toLocaleString()}</span>
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
