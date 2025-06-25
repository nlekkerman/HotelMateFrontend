import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { usePdfExporter } from "@/hooks/usePdfExporter";

export default function StockMovements({ stock, hotelSlug }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [direction, setDirection] = useState("");
  const [date, setDate] = useState("");
  const [staff, setStaff] = useState("");
  const [itemName, setItemName] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  // PDF Export
  const { generateStockMovementsPdf } = usePdfExporter();

  useEffect(() => {
    if (!stock) return;

    const fetchMovements = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("stock", stock.id);
        params.append("page", page);
        if (direction) params.append("direction", direction);
        if (date) params.append("start_date", date);
        if (staff) params.append("staff", staff);
        if (itemName) params.append("item_name", itemName);

        const res = await api.get(
          `/stock_tracker/${hotelSlug}/movements/?${params.toString()}`
        );

        setMovements(res.data.results || []);
        setCount(res.data.count || 0);
        setError(null);
      } catch (err) {
        setError(err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [stock, hotelSlug, direction, date, staff, page, itemName]);

  const totalPages = Math.ceil(count / 10); // 10 = PAGE_SIZE

  return (
    <div>
      <h4>Stock Movements</h4>

      {/* Filters */}
      <div className="mb-3 d-flex gap-3 flex-wrap align-items-end">
        <div className="form-group">
          <label className="form-label">Movement Direction</label>
          <select
            className="form-select"
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value);
              setPage(1); // Reset page on filter change
            }}
          >
            <option value="">All</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Staff Username</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter username"
            value={staff}
            onChange={(e) => {
              setStaff(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Item Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter item name"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading && <p>Loading stock movements…</p>}
      {error && <p className="text-danger">Error: {JSON.stringify(error)}</p>}
      {!loading && movements.length === 0 && <p>No stock movements found.</p>}
      <button
        className="btn btn-outline-primary mb-3"
        onClick={() => generateStockMovementsPdf(movements)}
      >
        Download PDF
      </button>
      {/* New Print Button */}
      <button
        className="btn btn-outline-secondary"
        onClick={() => window.print()}
      >
        Print
      </button>
      <ul className="list-group">
        {movements.map((m) => {
          const isIn = m.direction === "in";
          const bgClass = isIn ? "bg-white" : "bg-light";
          const textColor = { color: isIn ? "green" : "red" };

          return (
            <li
              key={m.id}
              className={`list-group-item d-flex justify-content-between ${bgClass}`}
            >
              <div className="d-flex align-items-center gap-3 p-2">
                <span className="text-black">{m.item.name}</span>
                <strong style={textColor}>{isIn ? "In" : "Out"}</strong>
                <span
                  className="border p-1 bg-gray-200 text-black"
                  style={textColor}
                >
                  {m.quantity} items
                </span>
              </div>
              <div className="text-muted small text-end">
                <div className="text-muted text-capitalize">{m.staff_name}</div>
                <div>{format(new Date(m.timestamp), "dd/MM/yy HH:mm")}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
