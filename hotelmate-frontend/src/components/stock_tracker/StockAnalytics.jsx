import React, { useState } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { useAnalyticsPdfExporter } from "@/components/stock_tracker/hooks/useAnalyticsPdfExporter";

export default function StockAnalytics({ hotelSlug }) {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [changedOnly, setChangedOnly] = useState(true);

  const { generateAnalyticsPdf } = useAnalyticsPdfExporter();

  const fetchAnalytics = async (overrideChangedOnly = null) => {
    if (!hotelSlug) return;
    setLoading(true);
    setError(null);

    const useChangedOnly = overrideChangedOnly !== null ? overrideChangedOnly : changedOnly;

    try {
      const res = await api.get(`/stock_tracker/${hotelSlug}/analytics/stock/`, {
        params: {
          start_date: startDate,
          end_date: endDate,
          changed_only: useChangedOnly,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch stock analytics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-analytics container mt-4 p-4 bg-light rounded shadow-sm">
      <h2 className="mb-3 text-center">Stock Analytics 📊</h2>

      {/* Date range picker */}
      <div className="d-flex gap-2 justify-content-center mb-3 flex-wrap">
        <div>
          <label>Start Date:</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>End Date:</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2 flex-column flex-md-row align-items-center">
          <button className="btn btn-primary" onClick={() => fetchAnalytics()} disabled={loading}>
            Load Analytics
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fetchAnalytics(false)}
            disabled={loading}
          >
            Load All Items
          </button>
          <button
  className="btn btn-success"
  onClick={() => generateAnalyticsPdf(data, startDate, endDate, hotelSlug)}
  disabled={data.length === 0}
>
  Download PDF
</button>

        </div>
      </div>

      {loading && <p className="text-center">Loading analytics...</p>}
      {error && <p className="text-danger text-center">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="text-center">No stock movements found for this period.</p>
      )}

      {!loading && data.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Item</th>
                <th>Opening Stock</th>
                <th>Added</th>
                <th>Removed</th>
                <th>Closing Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.item_id}>
                  <td>{item.item_name}</td>
                  <td>{item.opening_stock}</td>
                  <td>{item.added}</td>
                  <td>{item.removed}</td>
                  <td>{item.closing_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
