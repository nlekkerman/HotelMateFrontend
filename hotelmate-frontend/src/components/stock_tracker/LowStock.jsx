import React, { useEffect, useState } from "react";
import api from "@/services/api";

export default function LowStock({ hotelSlug, refresh }) {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`stock_tracker/${hotelSlug}/items/low_stock/`)
      .then((res) => setLowStockItems(res.data))
      .catch(() => setLowStockItems([]))
      .finally(() => setLoading(false));
  }, [hotelSlug, refresh]);

  if (loading) return <p>Loading low stock items…</p>;

  return (
    <div className="mb-4">
      <h4>Low Stock Items</h4>
      <ul className="list-group">
        {lowStockItems.length === 0 && (
          <li className="list-group-item">All good, no low stock!</li>
        )}
        {lowStockItems.map((item) => (
          <li key={item.id} className="list-group-item d-flex justify-content-between  alpha-5 text-danger">
            <span>{item.name}</span>
            <span className="p-1 rounded text-bold bg-white text-dark">{item.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
