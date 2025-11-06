import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStocktakes } from "../hooks/useStocktakes";
import { useAuth } from "@/context/AuthContext";

export const StocktakeDetail = () => {
  const { hotel_slug, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentStocktake, 
    loading, 
    error, 
    fetchStocktake, 
    populateStocktake, 
    updateLine, 
    getCategoryTotals,
    approveStocktake 
  } = useStocktakes(hotel_slug);
  
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [editingLine, setEditingLine] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (id) {
      fetchStocktake(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentStocktake && currentStocktake.id) {
      loadCategoryTotals();
    }
  }, [currentStocktake]);

  const loadCategoryTotals = async () => {
    try {
      const totals = await getCategoryTotals(currentStocktake.id);
      setCategoryTotals(totals);
    } catch (err) {
      console.error("Failed to load category totals");
    }
  };

  const handlePopulate = async () => {
    if (!window.confirm("This will populate the stocktake with all items. Continue?")) return;
    try {
      await populateStocktake(id);
      alert("Stocktake populated successfully!");
    } catch (err) {
      alert("Failed to populate stocktake");
    }
  };

  const handleUpdateLine = async (lineId, counts) => {
    try {
      await updateLine(lineId, counts);
      setEditingLine(null);
    } catch (err) {
      alert("Failed to update line");
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("This will finalize the stocktake and create adjustment movements. This action cannot be undone. Continue?")) {
      return;
    }
    try {
      await approveStocktake(id, user?.id);
      alert("Stocktake approved successfully!");
    } catch (err) {
      alert("Failed to approve stocktake");
    }
  };

  const getVarianceColor = (variance) => {
    const val = parseFloat(variance);
    if (val > 0) return "text-success";
    if (val < 0) return "text-danger";
    return "text-muted";
  };

  if (loading) return <div className="container mt-4"><div className="text-center"><div className="spinner-border" /></div></div>;
  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!currentStocktake) return <div className="container mt-4"><div className="alert alert-warning">Stocktake not found</div></div>;

  const isDraft = currentStocktake.status === "DRAFT";
  const lines = currentStocktake.lines || [];
  const filteredLines = selectedCategory === "all" 
    ? lines 
    : lines.filter(line => line.category === parseInt(selectedCategory));

  // Group lines by category
  const groupedLines = filteredLines.reduce((acc, line) => {
    const catName = line.category_name || "Uncategorized";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(line);
    return acc;
  }, {});

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h2 className="d-inline">Stocktake #{currentStocktake.id}</h2>
          {currentStocktake.status === "APPROVED" ? (
            <span className="badge bg-success ms-2">✓ Approved</span>
          ) : (
            <span className="badge bg-warning text-dark ms-2">📝 Draft</span>
          )}
        </div>
        <div>
          {isDraft && lines.length === 0 && (
            <button className="btn btn-success me-2" onClick={handlePopulate}>
              <i className="bi bi-list-check me-2"></i>Populate Items
            </button>
          )}
          {isDraft && lines.length > 0 && (
            <button className="btn btn-primary" onClick={handleApprove}>
              <i className="bi bi-check-circle me-2"></i>Approve & Finalize
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <strong>Period:</strong><br />
                  {new Date(currentStocktake.period_start).toLocaleDateString()} -{" "}
                  {new Date(currentStocktake.period_end).toLocaleDateString()}
                </div>
                <div className="col-md-3">
                  <strong>Created:</strong><br />
                  {new Date(currentStocktake.created_at).toLocaleString()}
                </div>
                {currentStocktake.approved_at && (
                  <div className="col-md-3">
                    <strong>Approved:</strong><br />
                    {new Date(currentStocktake.approved_at).toLocaleString()}
                  </div>
                )}
                {currentStocktake.notes && (
                  <div className="col-md-3">
                    <strong>Notes:</strong><br />
                    {currentStocktake.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Totals */}
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
                    <th className="text-end">Expected Value</th>
                    <th className="text-end">Counted Value</th>
                    <th className="text-end">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map((cat, idx) => (
                    <tr key={idx}>
                      <td><strong>{cat.category_name}</strong></td>
                      <td className="text-end">€{parseFloat(cat.expected_value || 0).toFixed(2)}</td>
                      <td className="text-end">€{parseFloat(cat.counted_value || 0).toFixed(2)}</td>
                      <td className={`text-end ${getVarianceColor(cat.variance_value)}`}>
                        <strong>€{parseFloat(cat.variance_value || 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                  <tr className="table-light">
                    <td><strong>Total</strong></td>
                    <td className="text-end"><strong>€{categoryTotals.reduce((sum, c) => sum + parseFloat(c.expected_value || 0), 0).toFixed(2)}</strong></td>
                    <td className="text-end"><strong>€{categoryTotals.reduce((sum, c) => sum + parseFloat(c.counted_value || 0), 0).toFixed(2)}</strong></td>
                    <td className={`text-end ${getVarianceColor(categoryTotals.reduce((sum, c) => sum + parseFloat(c.variance_value || 0), 0))}`}>
                      <strong>€{categoryTotals.reduce((sum, c) => sum + parseFloat(c.variance_value || 0), 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stocktake Lines */}
      {lines.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No items in this stocktake yet</h5>
          <p>Click "Populate Items" to add all stock items to this stocktake.</p>
        </div>
      ) : (
        <>
          {Object.entries(groupedLines).map(([categoryName, categoryLines]) => (
            <div key={categoryName} className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">{categoryName}</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "10%" }}>Code</th>
                        <th style={{ width: "20%" }}>Description</th>
                        <th className="text-end">Expected</th>
                        <th className="text-center">Full Units</th>
                        <th className="text-center">Partial</th>
                        <th className="text-end">Counted</th>
                        <th className="text-end">Variance</th>
                        <th className="text-end">Value €</th>
                        {isDraft && <th style={{ width: "100px" }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryLines.map(line => (
                        <tr key={line.id}>
                          <td><strong>{line.item_code}</strong></td>
                          <td><small>{line.item_description}</small></td>
                          <td className="text-end">{parseFloat(line.expected_qty || 0).toFixed(2)}</td>
                          <td className="text-center">
                            {editingLine === line.id && isDraft ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                step="0.01"
                                defaultValue={line.counted_full_units || 0}
                                id={`full-${line.id}`}
                                style={{ width: "80px", margin: "0 auto" }}
                              />
                            ) : (
                              parseFloat(line.counted_full_units || 0).toFixed(2)
                            )}
                          </td>
                          <td className="text-center">
                            {editingLine === line.id && isDraft ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                step="0.01"
                                defaultValue={line.counted_partial_units || 0}
                                id={`partial-${line.id}`}
                                style={{ width: "80px", margin: "0 auto" }}
                              />
                            ) : (
                              parseFloat(line.counted_partial_units || 0).toFixed(2)
                            )}
                          </td>
                          <td className="text-end">
                            <span className="badge bg-info">{parseFloat(line.counted_qty || 0).toFixed(2)}</span>
                          </td>
                          <td className={`text-end ${getVarianceColor(line.variance_qty)}`}>
                            <strong>{parseFloat(line.variance_qty || 0).toFixed(2)}</strong>
                          </td>
                          <td className={`text-end ${getVarianceColor(line.variance_value)}`}>
                            <strong>{parseFloat(line.variance_value || 0).toFixed(2)}</strong>
                          </td>
                          {isDraft && (
                            <td>
                              {editingLine === line.id ? (
                                <div className="btn-group btn-group-sm">
                                  <button 
                                    className="btn btn-success"
                                    onClick={() => {
                                      const full = document.getElementById(`full-${line.id}`).value;
                                      const partial = document.getElementById(`partial-${line.id}`).value;
                                      handleUpdateLine(line.id, {
                                        counted_full_units: full,
                                        counted_partial_units: partial
                                      });
                                    }}
                                  >
                                    <i className="bi bi-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-secondary"
                                    onClick={() => setEditingLine(null)}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => setEditingLine(line.id)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
