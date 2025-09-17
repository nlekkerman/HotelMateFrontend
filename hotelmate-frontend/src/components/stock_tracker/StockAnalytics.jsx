import React, { useState } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { useAnalyticsPdfExporter } from "@/components/stock_tracker/hooks/useAnalyticsPdfExporter";
import StockConsumption from "./StockConsumption";

export default function StockAnalytics({ hotelSlug }) {
  const [periodType, setPeriodType] = useState("month"); // default to current month
  const [referenceDate, setReferenceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [changedOnly, setChangedOnly] = useState(true);
  const [showConsumption, setShowConsumption] = useState(false);
  const [showCalculate, setShowCalculate] = useState(false);

  const { generateAnalyticsPdf } = useAnalyticsPdfExporter();

  const fetchAnalytics = async (overrideChangedOnly = null) => {
    if (!hotelSlug) return;

    setShowCalculate(true);
    setLoading(true);
    setError(null);

    const useChangedOnly = overrideChangedOnly !== null ? overrideChangedOnly : changedOnly;

    try {
      const res = await api.get(`/stock_tracker/${hotelSlug}/analytics/stock/`, {
        params: {
          period_type: periodType,
          reference_date: referenceDate,
          changed_only: useChangedOnly,
        },
        timeout: 60000,
      });

      const mappedData = res.data.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        opening_storage: item.opening_storage,
        opening_bar: item.opening_bar,
        added: item.added,
        moved_to_bar: item.moved_to_bar,
        sales: item.sales,
        waste: item.waste,
        closing_storage: item.closing_storage,
        closing_bar: item.closing_bar,
        total_closing_stock: item.total_closing_stock,
      }));

      setData(mappedData);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to fetch stock analytics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid my-4 p-4 main-bg text-white rounded shadow-sm">
      <h2 className="text-center mb-4">Stock Analytics</h2>

      {/* Filters */}
      <div className="row g-2 mb-3 align-items-center justify-content-evenly bg-dark py-5">
        <h4 className="text-center title-container">Filters</h4>
        <div className="d-flex text-center mb-2 py-1 flex-wrap gap-1 justify-content-center">
          <div className="col-12 col-sm-6 col-md-3">
            <label className="form-label">Period Type</label>
            <select
              className="form-select"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="half_year">Half-Year</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <label className="form-label">Reference Date</label>
            <input
              type="date"
              className="form-control"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
            />
          </div>
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
              generateAnalyticsPdf(data, referenceDate, referenceDate, hotelSlug)
            }
            disabled={data.length === 0}
          >
            Download PDF
          </button>
          {showCalculate && (
            <button
              className="btn btn-warning flex-grow-1"
              onClick={() => setShowConsumption(true)}
              disabled={loading || data.length === 0}
            >
              Calculate Stock Consumption
            </button>
          )}
        </div>
      </div>

      {showConsumption && (
        <StockConsumption
          data={data}
          hotelSlug={hotelSlug}
          startDate={referenceDate}
          endDate={referenceDate}
          onClose={() => setShowConsumption(false)}
        />
      )}

      {loading && <p className="text-center">Loading analytics...</p>}
      {error && <p className="text-center text-danger">{error}</p>}
      {!loading && !error && data.length === 0 && (
        <p className="text-center text-white">No stock movements found for this period.</p>
      )}

      {/* Analytics Table */}
      {data.length > 0 && (
        <div className="table-responsive mt-4">
          <table className="table table-hover table-bordered">
            <thead className="table-white">
              <tr>
                <th>Item</th>
                <th>Opening</th>
                <th>Added</th>
                <th>Moved to Bar</th>
                <th>Closing</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.item_id} className="table-dark">
                  <td>{item.item_name}</td>
                  <td>{item.opening_storage}</td>
                  <td>{item.added}</td>
                  <td>{item.moved_to_bar}</td>
                  <td>{item.closing_storage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
