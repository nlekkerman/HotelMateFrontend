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
        console.log("Fetched orders:", data);
        if (!Array.isArray(data)) {
          console.warn("Unexpected orders response:", data);
          data = [];
        }
        setOrders(data);
      })
      .catch((err) => {
        console.error(`Failed to fetch ${view} orders:`, err);
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
      console.error(`Failed to update status for order ${order.id}:`, err);
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
    <ul style={{ margin: 0, paddingLeft: "1rem" }}>
      {items.map(({ id, item, quantity, item_price, notes }) => {
        // For breakfast there’s no item_price
        const line = view === "breakfast"
          ? `${item.name} × ${quantity}`
          : `${item.name} × ${quantity} @ €${Number(item_price).toFixed(2)}`;

        return (
          <li key={id}>
            <strong>{line}</strong>
            {notes && (
              <span style={{ fontStyle: "italic", marginLeft: 8 }}>
                ({notes})
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};


  const calculateTotal = (order) => {
    // use backend-provided total_price + tray charge for room service
    const base = Number(order.total_price || 0);
    return view === "roomService" ? base + 5 : base;
  };

  const renderOrderRow = (order) => {
    const statusOptions =
      view === "breakfast" ? ["pending", "completed"] : ["pending", "accepted", "completed"];
    const total = calculateTotal(order);

    return (
      <tr key={order.id}>
        <td>{order.id}</td>
        <td>{order.room_number}</td>
        {view === "breakfast" && <td>{order.delivery_time}</td>}
        <td>{renderItemsCell(order)}</td>
        <td>
          <select
            className="form-select"
            value={order.status}
            onChange={(e) => handleStatusChange(order, e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </td>
        <td>
          €{total.toFixed(2)}
          {view === "roomService" && (
            <small style={{ marginLeft: 6, fontStyle: "italic" }}>
              (incl. €5 tray)
            </small>
          )}
        </td>
        <td>{new Date(order.created_at).toLocaleString()}</td>
      </tr>
    );
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Orders</h2>
      <div className="btn-group mb-3" role="group">
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

      {loading ? (
        <p>Loading orders…</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : orders.length === 0 ? (
        <p>No {view === "breakfast" ? "breakfast" : "room service"} orders found.</p>
      ) : (
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Room</th>
              {view === "breakfast" && <th>Delivery Time</th>}
              <th>Items</th>
              <th>Status</th>
              <th>Total (€)</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>{orders.map(renderOrderRow)}</tbody>
        </table>
      )}
    </div>
  );
}
