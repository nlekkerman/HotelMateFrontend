import React, { useState } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { useAnalyticsPdfExporter } from "@/components/stock_tracker/hooks/useAnalyticsPdfExporter";
import StockConsumption from "./StockConsumption";
export default function StockAnalytics({ hotelSlug }) {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [changedOnly, setChangedOnly] = useState(true);
  const [showConsumption, setShowConsumption] = useState(false);
  const { generateAnalyticsPdf } = useAnalyticsPdfExporter();

  const fetchAnalytics = async (overrideChangedOnly = null) => {
    if (!hotelSlug) return;

    setLoading(true);
    setError(null);
    const useChangedOnly =
      overrideChangedOnly !== null ? overrideChangedOnly : changedOnly;

    console.log("Fetching analytics for:", {
      hotelSlug,
      startDate,
      endDate,
      useChangedOnly,
    });

    try {
      const res = await api.get(
        `/stock_tracker/${hotelSlug}/analytics/stock/`,
        {
          params: {
            start_date: startDate,
            end_date: endDate,
            changed_only: useChangedOnly,
          },
          timeout: 60000, // increase timeout temporarily
        }
      );

      console.log("Raw analytics response:", res.data); // 🔍 log full response

      if (!res.data || res.data.length === 0) {
        console.warn("Analytics returned empty array");
      }

      // ✅ normalize response
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

      console.log("Mapped table data:", mappedData);

      setData(mappedData); // ✅ use mappedData, not raw res.data
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
      <div className="row g-2 mb-3 align-items-end justify-content-center bg-dark pb-5">
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
          <button
            className="btn btn-warning flex-grow-1"
            onClick={() => setShowConsumption(true)}
          >
            Calculate Stock Consumption
          </button>
        </div>
      </div>
      {/* show modal if enabled */}
      {showConsumption && (
        <StockConsumption
          data={data}
          onClose={() => setShowConsumption(false)}
        />
      )}
      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-white mt-2">Loading analytics...</p>
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
              {data.map((item) => {
                const formatNumber = (num) =>
                  num !== null && num !== undefined && !isNaN(num)
                    ? Number(num) % 1 === 0
                      ? Number(num)
                      : Number(num)
                          .toFixed(2)
                          .replace(/\.?0+$/, "")
                    : 0;

                const opening_storage = item.opening_storage ?? 0;
                const added = item.added ?? 0;
                const moved_to_bar = item.moved_to_bar ?? 0;
                const closing_storage = item.closing_storage ?? 0;

                const getTextColor = (value, column) => {
                  if (column === "closing" && value < 0) return "red";
                  if (
                    (column === "added" || column === "moved_to_bar") &&
                    value < 0
                  )
                    return "red";
                  return "inherit";
                };

                const getBgColor = (value, column) => {
                  if (value === 0) return "#333";
                  if (column === "added" && value !== 0) return "#207a07ff";
                  if (column === "moved_to_bar" && value !== 0)
                    return "#ae0a0a8a";
                  return "transparent";
                };

                const getColorForBg = (value, column) =>
                  getBgColor(value, column) !== "transparent"
                    ? "white"
                    : getTextColor(value, column);

                return (
                  <tr key={item.item_id} className="table-dark">
                    <td>{item.item_name}</td>
                    <td
                      style={{
                        color: getTextColor(opening_storage, "opening"),
                      }}
                    >
                      {formatNumber(opening_storage)}
                    </td>
                    <td
                      style={{
                        backgroundColor: getBgColor(added, "added"),
                        color: getColorForBg(added, "added"),
                      }}
                    >
                      {formatNumber(added)}
                    </td>
                    <td
                      style={{
                        backgroundColor: getBgColor(
                          moved_to_bar,
                          "moved_to_bar"
                        ),
                        color: getColorForBg(moved_to_bar, "moved_to_bar"),
                      }}
                    >
                      {formatNumber(moved_to_bar)}
                    </td>
                    <td
                      style={{
                        color: getTextColor(closing_storage, "closing"),
                      }}
                    >
                      {formatNumber(closing_storage)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
