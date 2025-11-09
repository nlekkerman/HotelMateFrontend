import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Badge, Alert, Spinner } from "react-bootstrap";
import api from "@/services/api";

export const StocktakesList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [stocktakes, setStocktakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStocktakes();
  }, [hotel_slug]);

  const fetchStocktakes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/stocktakes/`);
      setStocktakes(response.data.results || response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stocktakes:', err);
      setError(err.response?.data?.detail || "Failed to fetch stocktakes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setCreating(true);
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const response = await api.post(`/stock_tracker/${hotel_slug}/stocktakes/`, {
        period_start: firstDay.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0],
        notes: `Stocktake created on ${today.toLocaleDateString()}`
      });
      
      // Navigate to the new stocktake detail
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${response.data.id}`);
    } catch (err) {
      console.error('Error creating stocktake:', err);
      setError(err.response?.data?.detail || "Failed to create stocktake");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (stocktake) => {
    return stocktake.status === 'APPROVED'
      ? <Badge bg="secondary">Approved</Badge>
      : <Badge bg="warning">Draft</Badge>;
  };

  const filteredStocktakes = stocktakes.filter(st => {
    if (statusFilter === "all") return true;
    if (statusFilter === "draft") return st.status === 'DRAFT';
    if (statusFilter === "approved") return st.status === 'APPROVED';
    return true;
  });

  const handleStocktakeClick = (stocktakeId) => {
    navigate(`/stock_tracker/${hotel_slug}/stocktakes/${stocktakeId}`);
  };

  return (
    <div className="container mt-4">
      {/* Sticky Back Button - Top Left */}
      <button 
        className="btn btn-outline-secondary shadow"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
        style={{
          position: 'fixed',
          top: '80px',
          left: '120px',
          zIndex: 1050,
          borderRadius: '8px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
          e.currentTarget.style.color = '';
        }}
        title="Back to Stock Tracker"
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="d-inline">Stocktakes</h2>
        </div>
        <Button 
          variant="primary" 
          onClick={handleCreateNew}
          disabled={creating}
        >
          {creating ? 'Creating...' : '+ New Stocktake'}
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

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
                <option value="draft">Draft (In Progress)</option>
                <option value="approved">Approved (Locked)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stocktakes List */}
      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status" />
        </div>
      )}
      
      {!loading && !error && (
        <div className="row g-3">
          {filteredStocktakes.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                <h5>No stocktakes found</h5>
                <p>Click "New Stocktake" to create one</p>
              </div>
            </div>
          ) : (
            filteredStocktakes.map(stocktake => (
              <div key={stocktake.id} className="col-12 col-md-6 col-lg-4">
                <div 
                  className="card h-100 shadow-sm hover-shadow" 
                  style={{ cursor: "pointer" }}
                  onClick={() => handleStocktakeClick(stocktake.id)}
                >
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>Stocktake #{stocktake.id}</strong>
                    {getStatusBadge(stocktake)}
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Period:</small><br />
                      <strong>{new Date(stocktake.period_start).toLocaleDateString()}</strong> to{" "}
                      <strong>{new Date(stocktake.period_end).toLocaleDateString()}</strong>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Created:</small>{" "}
                      <strong>{new Date(stocktake.created_at).toLocaleDateString()}</strong>
                    </div>
                    {stocktake.approved_at && (
                      <div className="mb-2">
                        <small className="text-muted">Approved:</small>{" "}
                        <strong>{new Date(stocktake.approved_at).toLocaleDateString()}</strong>
                      </div>
                    )}
                    <div className="mb-2">
                      <small className="text-muted">Lines:</small>{" "}
                      <span className="badge bg-primary">{stocktake.total_lines || 0}</span>
                    </div>
                    {stocktake.notes && (
                      <div className="mt-2">
                        <small className="text-muted">{stocktake.notes}</small>
                      </div>
                    )}
                  </div>
                  <div className="card-footer bg-transparent">
                    <button className="btn btn-sm btn-outline-primary w-100">
                      {stocktake.status === 'DRAFT' ? 'Continue Counting' : 'View Results'}
                      {' '}<i className="bi bi-arrow-right ms-1"></i>
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
