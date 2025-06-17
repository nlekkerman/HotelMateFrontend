import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

export default function RoomServiceOrders() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;

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

    api.patch(endpoint, { status: newStatus }).catch((err) => {
      setOrders((all) =>
        all.map((o) =>
          o.id === order.id ? { ...o, status: prev } : o
        )
      );
      setError("Error updating status.");
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

  const renderOrderRow = (order) => {
    const statusOptions =
      view === "breakfast" ? ["pending", "completed"] : ["pending", "accepted", "completed"];
    const total = calculateTotal(order);

    // Bootstrap badges for statuses
    const statusBadge = (status) => {
      const map = {
        pending: "warning",
        accepted: "primary",
        completed: "success"
      };
      return <span className={`badge bg-${map[status] || "secondary"}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    };

    return (
      <tr key={order.id}>
        <td className="text-center">{order.id}</td>
        <td className="text-center">{order.room_number}</td>
        {view === "breakfast" && <td className="text-center">{order.delivery_time}</td>}
        <td>{renderItemsCell(order)}</td>
        <td>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={order.status}
              onChange={(e) => handleStatusChange(order, e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            {statusBadge(order.status)}
          </div>
        </td>
        <td>
          €{total.toFixed(2)}
          {view === "roomService" && (
            <small className="ms-1 fst-italic text-muted">
              (incl. €5 tray)
            </small>
          )}
        </td>
        <td className="text-nowrap">{new Date(order.created_at).toLocaleString()}</td>
      </tr>
    );
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
