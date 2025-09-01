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
  const [fetchAll, setFetchAll] = useState(false);

  // PDF Export
  const { generateStockMovementsPdf } = usePdfExporter();

  useEffect(() => {
    if (!stock) return;

    const fetchMovements = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("stock", stock.id);

        if (fetchAll) {
          params.append("page_size", "33");
        } else {
          params.append("page", page);
        }
        if (direction) params.append("direction", direction);
        if (date) params.append("date", date);
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
  }, [stock, hotelSlug, direction, date, staff, page, itemName, fetchAll]);

  const totalPages = Math.ceil(count / 10);

  return (
    <div className="card main-bg text-white mb-4 shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Stock Movements</h5>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => generateStockMovementsPdf(movements)}
          >
            Download PDF
          </button>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => setFetchAll(!fetchAll)}
          >
            {fetchAll ? "Show Less" : "Load More"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-body">
        <div className="row g-3 mb-3">
          <div className="col-md-3 col-sm-6">
            <label className="form-label">Direction</label>
            <select
              className="form-select"
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
          </div>

          <div className="col-md-3 col-sm-6">
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

          <div className="col-md-3 col-sm-6">
            <label className="form-label">Staff</label>
            <input
              type="text"
              className="form-control"
              placeholder="Staff username"
              value={staff}
              onChange={(e) => {
                setStaff(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="col-md-3 col-sm-6">
            <label className="form-label">Item Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Item name"
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

        {/* Movements Table for Large Screens */}
<div className="d-none d-md-block">
  <table className="table table-dark table-striped table-hover">
    <thead>
      <tr>
        <th>Item</th>
        <th>Direction</th>
        <th>Quantity</th>
        <th>Staff</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {movements.map((m) => (
        <tr key={m.id}>
          <td>{m.item.name}</td>
          <td>
            <span
              className={`badge ${
                m.direction === "in" ? "bg-success" : "bg-danger"
              }`}
            >
              {m.direction.toUpperCase()}
            </span>
          </td>
          <td>{m.quantity}</td>
          <td className="text-capitalize">{m.staff_name}</td>
          <td>{format(new Date(m.timestamp), "dd/MM/yyyy HH:mm")}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Card Layout for Small Screens */}
<div className="d-md-none">
  {movements.map((m) => (
    <div
      key={m.id}
      className="card bg-dark text-white mb-2 shadow-sm"
    >
      <div className="card-body p-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <strong>{m.item.name}</strong>
          <span
            className={`badge ${
              m.direction === "in" ? "bg-success" : "bg-danger"
            }`}
          >
            {m.direction.toUpperCase()}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>Quantity: {m.quantity}</span>
          <span>Staff: {m.staff_name}</span>
        </div>
        <div className="text-muted small">
          {format(new Date(m.timestamp), "dd/MM/yyyy HH:mm")}
        </div>
      </div>
    </div>
  ))}
</div>


        {/* Pagination */}
        {!fetchAll && totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-light">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
