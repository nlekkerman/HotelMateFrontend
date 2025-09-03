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

  if (loading) return null; // Optional: or return a loader
  if (lowStockItems.length === 0) return null; // Hides component if no low stock

  return (
    <div className="mb-4 bg-danger p-1">
      <h4 className="bg-warning p-2">
        Attention: The following items are running low in stock
      </h4>{" "}
      <ul className="list-group gap-1">
        {lowStockItems.map((item) => (
          <li
            key={item.id}
            className="list-group-item d-flex justify-content-between alpha-5 text-danger"
          >
            <span>{item.name}</span>
            <span className="p-1 text-bold bg-white text-dark">
              {item.quantity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
