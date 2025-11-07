import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

export const PeriodSnapshotDetail = () => {
  const { hotel_slug, id } = useParams();
  const navigate = useNavigate();
  
  const [periodData, setPeriodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (id) {
      fetchPeriod();
    }
  }, [id, hotel_slug]);

  const fetchPeriod = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/${id}/`);
      setPeriodData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching period:', err);
      setError(err.response?.data?.detail || "Failed to fetch period data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container mt-4"><div className="text-center"><div className="spinner-border" /></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!periodData) return <div className="container mt-4"><div className="alert alert-warning">Period not found</div></div>;

  const snapshots = periodData.snapshots || [];
  const filteredSnapshots = selectedCategory === "all" 
    ? snapshots 
    : snapshots.filter(snap => snap.item.category === selectedCategory);

  // Group snapshots by category
  const groupedSnapshots = filteredSnapshots.reduce((acc, snap) => {
    const catName = snap.item.category_display || "Uncategorized";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(snap);
    return acc;
  }, {});

  // Calculate totals
  const totalValue = snapshots.reduce((sum, snap) => sum + parseFloat(snap.closing_stock_value || 0), 0);
  const categoryTotals = Object.entries(groupedSnapshots).map(([categoryName, items]) => ({
    categoryName,
    totalValue: items.reduce((sum, item) => sum + parseFloat(item.closing_stock_value || 0), 0),
    itemCount: items.length
  }));

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}/periods`)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h2 className="d-inline">Period Snapshot: {periodData.period_name}</h2>
          {periodData.is_closed ? (
            <span className="badge bg-secondary ms-2">Closed</span>
          ) : (
            <span className="badge bg-success ms-2">Current Period</span>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row">
                <div className="col-6 col-md-3">
                  <strong>Period:</strong><br />
                  {new Date(periodData.start_date).toLocaleDateString()} -{" "}
                  {new Date(periodData.end_date).toLocaleDateString()}
                </div>
                <div className="col-6 col-md-2">
                  <strong>Year:</strong><br />
                  {periodData.year}
                </div>
                <div className="col-6 col-md-2">
                  <strong>Month:</strong><br />
                  {periodData.month}
                </div>
                <div className="col-6 col-md-2">
                  <strong>Items:</strong><br />
                  <span className="badge bg-primary">{snapshots.length}</span>
                </div>
                <div className="col-12 col-md-3">
                  <strong>Total Value:</strong><br />
                  <span className="text-success fs-5">€{totalValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      {categoryTotals.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Category Summary</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-end d-none d-md-table-cell">Items</th>
                    <th className="text-end">Closing Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map((cat, idx) => (
                    <tr key={idx}>
                      <td><strong>{cat.categoryName}</strong></td>
                      <td className="text-end d-none d-md-table-cell">{cat.itemCount}</td>
                      <td className="text-end">€{cat.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="table-light">
                    <td><strong>Total</strong></td>
                    <td className="text-end d-none d-md-table-cell"><strong>{snapshots.length}</strong></td>
                    <td className="text-end"><strong>€{totalValue.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-12 col-md-4">
              <label className="form-label">Filter by Category</label>
              <select 
                className="form-select" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {Object.keys(groupedSnapshots).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Items */}
      {snapshots.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No items in this period snapshot</h5>
        </div>
      ) : (
        <>
          {Object.entries(groupedSnapshots).map(([categoryName, categorySnapshots]) => (
            <div key={categoryName} className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">{categoryName}</h5>
              </div>
              <div className="card-body p-0">
                {/* Desktop Table */}
                <div className="table-responsive d-none d-md-block">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "10%" }}>SKU</th>
                        <th style={{ width: "25%" }}>Item</th>
                        <th className="text-center">Full Units</th>
                        <th className="text-center">Partial</th>
                        <th className="text-end">Total Qty</th>
                        <th className="text-end">Value €</th>
                        <th className="text-end">GP %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorySnapshots.map(snap => (
                        <tr key={snap.id}>
                          <td><strong>{snap.item.sku}</strong></td>
                          <td>
                            <strong>{snap.item.name}</strong>
                            {snap.item.size && (
                              <><br /><small className="text-muted">{snap.item.size}</small></>
                            )}
                          </td>
                          <td className="text-center">{parseFloat(snap.closing_full_units || 0).toFixed(2)}</td>
                          <td className="text-center">{parseFloat(snap.closing_partial_units || 0).toFixed(2)}</td>
                          <td className="text-end">
                            <span className="badge bg-info">{parseFloat(snap.total_quantity || 0).toFixed(2)}</span>
                          </td>
                          <td className="text-end">
                            <strong>€{parseFloat(snap.closing_stock_value || 0).toFixed(2)}</strong>
                          </td>
                          <td className="text-end">
                            <span className="badge bg-success">{parseFloat(snap.gp_percentage || 0).toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="d-md-none">
                  {categorySnapshots.map(snap => (
                    <div key={snap.id} className="border-bottom p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{snap.item.name}</strong><br />
                          <small className="text-muted">SKU: {snap.item.sku}</small>
                          {snap.item.size && <small className="text-muted"> • {snap.item.size}</small>}
                        </div>
                        <span className="badge bg-success">{parseFloat(snap.gp_percentage || 0).toFixed(1)}%</span>
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <small className="text-muted">Full Units:</small><br />
                          <strong>{parseFloat(snap.closing_full_units || 0).toFixed(2)}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Partial:</small><br />
                          <strong>{parseFloat(snap.closing_partial_units || 0).toFixed(2)}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Total Qty:</small><br />
                          <span className="badge bg-info">{parseFloat(snap.total_quantity || 0).toFixed(2)}</span>
                        </div>
                        <div className="col-6">
                          <small className="text-muted">Value:</small><br />
                          <strong className="text-success">€{parseFloat(snap.closing_stock_value || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
