import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { format } from "date-fns";

export default function StockMovements({ stock, hotelSlug, categorySlug }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stock) return;

    const fetchMovements = async () => {
      try {
        const res = await api.get(
          `/stock_tracker/${hotelSlug}/movements/?stock=${stock.id}`
        );
        setMovements(res.data.results);
        console.log("Fetched movements:", res.data.results);
      } catch (err) {
        setError(err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [stock, hotelSlug]);

  if (loading) return <p>Loading stock movements…</p>;
  if (error)
    return <p className="text-danger">Error: {JSON.stringify(error)}</p>;

  if (movements.length === 0) return <p>No stock movements found.</p>;

  return (
    <div>
      <h4>Stock Movements</h4>
      <ul className="list-group">
        {movements.map((m) => {
          const isIn = m.direction === "in";
          // Use bg-success and bg-warning for background colors
          const bgClass = isIn ? "bg-success" : "bg-warning";
          // Optional: text color for contrast
          const textColorStyle = { color: isIn ? "orange" : "green" };

          return (
            <li
              key={m.id}
              className={`list-group-item d-flex justify-content-between ${bgClass}`}
            >
              <div>
                <strong style={textColorStyle}>{isIn ? "In" : "Out"}</strong>{" "}
                <span className="border p-1 bg-danger text-white" style={textColorStyle}>{m.quantity} items</span>{" "}
                <span className="text-white">{m.item.name}</span>
              </div>
              <div className="text-muted small text-end">
                <div className="text-white text-capitalize">Action by {m.staff_name}</div>
                <div>{format(new Date(m.timestamp), "yyyy-MM-dd HH:mm")}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
