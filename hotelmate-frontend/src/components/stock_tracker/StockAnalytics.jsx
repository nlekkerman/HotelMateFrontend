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
    const useChangedOnly =
      overrideChangedOnly !== null ? overrideChangedOnly : changedOnly;

    try {
      const res = await api.get(
        `/stock_tracker/${hotelSlug}/analytics/stock/`,
        {
          params: {
            start_date: startDate,
            end_date: endDate,
            changed_only: useChangedOnly,
          },
        }
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch stock analytics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid my-4 p-4 main-bg text-white rounded shadow-sm">
      <h2 className="text-center mb-4">Stock Analytics</h2>

      {/* Filters */}
      <div className="row g-2 mb-3 align-items-end justify-content-center">
        <div className="col-12 col-sm-6 col-md-3">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-4 d-flex flex-wrap gap-2 mt-2 mt-md-0">
          <button
            className="btn btn-primary flex-grow-1"
            onClick={() => fetchAnalytics()}
            disabled={loading}
          >
            Load Analytics
          </button>
          <button
            className="btn btn-secondary flex-grow-1"
            onClick={() => fetchAnalytics(false)}
            disabled={loading}
          >
            Load All Items
          </button>
          <button
            className="btn btn-success flex-grow-1"
            onClick={() =>
              generateAnalyticsPdf(data, startDate, endDate, hotelSlug)
            }
            disabled={data.length === 0}
          >
            Download PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-2">Loading analytics...</p>
        </div>
      )}
      {error && <p className="text-center text-danger">{error}</p>}
      {!loading && !error && data.length === 0 && (
        <p className="text-center text-white">
          No stock movements found for this period.
        </p>
      )}

      {/* Analytics Table */}
      {data.length > 0 && (
        <div className="table-responsive mt-4">
          <table className="table table-striped table-hover table-bordered">
            <thead className="table-white">
              <tr>
                <th>Item</th>
                <th>Opening</th>
                <th>Added</th>
                <th>Removed</th>
                <th>Closing</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.item_id} className="table-dark">
                  <td>{item.item_name}</td>
                  <td>
                    {Number(item.opening_stock) % 1 === 0
                      ? Number(item.opening_stock)
                      : Number(item.opening_stock)
                          .toFixed(2)
                          .replace(/\.?0+$/, "")}
                  </td>
                  <td>
                    {Number(item.added) % 1 === 0
                      ? Number(item.added)
                      : Number(item.added)
                          .toFixed(2)
                          .replace(/\.?0+$/, "")}
                  </td>
                  <td>
                    {Number(item.removed) % 1 === 0
                      ? Number(item.removed)
                      : Number(item.removed)
                          .toFixed(2)
                          .replace(/\.?0+$/, "")}
                  </td>
                  <td>
                    {Number(item.closing_stock) % 1 === 0
                      ? Number(item.closing_stock)
                      : Number(item.closing_stock)
                          .toFixed(2)
                          .replace(/\.?0+$/, "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
