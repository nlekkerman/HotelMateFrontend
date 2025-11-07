import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

export const PeriodSnapshots = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      setPeriods(response.data.results || response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError(err.response?.data?.detail || "Failed to fetch periods");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodBadge = (period) => {
    return period.is_closed
      ? <span className="badge bg-secondary">Closed</span>
      : <span className="badge bg-success">Current Period</span>;
  };

  const filteredPeriods = periods.filter(period => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return !period.is_closed;
    if (statusFilter === "closed") return period.is_closed;
    return true;
  });

  const handlePeriodClick = (periodId) => {
    navigate(`/stock_tracker/${hotel_slug}/periods/${periodId}`);
  };

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h2 className="d-inline">Period Snapshots</h2>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select 
                className="form-select" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Periods</option>
                <option value="open">Current Period</option>
                <option value="closed">Closed Periods</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Periods List */}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="row g-3">
          {filteredPeriods.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No periods found.
              </div>
            </div>
          ) : (
            filteredPeriods.map(period => (
              <div key={period.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm hover-shadow" style={{ cursor: "pointer" }}
                     onClick={() => handlePeriodClick(period.id)}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>{period.period_name}</strong>
                    {getPeriodBadge(period)}
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Period:</small><br />
                      <strong>{new Date(period.start_date).toLocaleDateString()}</strong> to{" "}
                      <strong>{new Date(period.end_date).toLocaleDateString()}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Year:</small> <strong>{period.year}</strong>
                      {" "}<small className="text-muted">Month:</small> <strong>{period.month}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Items:</small>{" "}
                      <span className="badge bg-primary">{period.snapshots?.length || 0}</span>
                    </div>
                  </div>
                  <div className="card-footer bg-transparent">
                    <button className="btn btn-sm btn-outline-primary w-100">
                      View Snapshot <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
