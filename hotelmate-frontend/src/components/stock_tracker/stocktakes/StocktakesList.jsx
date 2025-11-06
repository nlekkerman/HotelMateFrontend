import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStocktakes } from "../hooks/useStocktakes";

export const StocktakesList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { stocktakes, loading, error, createStocktake } = useStocktakes(hotel_slug);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    period_start: "",
    period_end: "",
    notes: ""
  });
  const [statusFilter, setStatusFilter] = useState("all");

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const result = await createStocktake(formData);
      setShowCreateModal(false);
      setFormData({ period_start: "", period_end: "", notes: "" });
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${result.id}`);
    } catch (err) {
      alert("Failed to create stocktake");
    }
  };

  const getStatusBadge = (status) => {
    return status === "APPROVED" 
      ? <span className="badge bg-success">✓ Approved</span>
      : <span className="badge bg-warning text-dark">📝 Draft</span>;
  };

  const filteredStocktakes = stocktakes.filter(st => 
    statusFilter === "all" || st.status === statusFilter
  );

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h2 className="d-inline">Stocktakes</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>New Stocktake
        </button>
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
                <option value="all">All Stocktakes</option>
                <option value="DRAFT">Draft Only</option>
                <option value="APPROVED">Approved Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stocktakes List */}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="row g-3">
          {filteredStocktakes.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No stocktakes found. Click "New Stocktake" to create one.
              </div>
            </div>
          ) : (
            filteredStocktakes.map(stocktake => (
              <div key={stocktake.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm hover-shadow" style={{ cursor: "pointer" }}
                     onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes/${stocktake.id}`)}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>Stocktake #{stocktake.id}</strong>
                    {getStatusBadge(stocktake.status)}
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Period:</small><br />
                      <strong>{new Date(stocktake.period_start).toLocaleDateString()}</strong> to{" "}
                      <strong>{new Date(stocktake.period_end).toLocaleDateString()}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Created:</small><br />
                      {new Date(stocktake.created_at).toLocaleDateString()}
                    </div>
                    {stocktake.approved_at && (
                      <div className="mb-2">
                        <small className="text-muted">Approved:</small><br />
                        {new Date(stocktake.approved_at).toLocaleDateString()}
                      </div>
                    )}
                    {stocktake.notes && (
                      <div>
                        <small className="text-muted">Notes:</small><br />
                        <small>{stocktake.notes}</small>
                      </div>
                    )}
                  </div>
                  <div className="card-footer bg-transparent">
                    <button className="btn btn-sm btn-outline-primary w-100">
                      View Details <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Create New Stocktake</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Period Start *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.period_start}
                      onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Period End *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.period_end}
                      onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows="3"
                      placeholder="e.g., Monthly stocktake November 2025"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Stocktake
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
