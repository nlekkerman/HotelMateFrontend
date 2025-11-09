import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMovements } from "../hooks/useMovements";
import { useStockItems } from "../hooks/useStockItems";
import { MovementModal } from "../modals/MovementModal";

export const MovementsList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { movements, loading, error, createMovement } = useMovements(hotel_slug);
  const { items } = useStockItems(hotel_slug);
  
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    movementType: "",
    dateFrom: "",
    dateTo: ""
  });

  const handleCreateMovement = async (movementData) => {
    try {
      console.log('User from localStorage:', user);
      // Add hotel and staff fields from localStorage
      const dataWithHotel = {
        ...movementData,
        hotel: user?.hotel_id,
        staff: user?.id,
        staff_name: user?.username || 'Unknown'
      };
      console.log('Creating movement with data:', dataWithHotel);
      await createMovement(dataWithHotel);
      setModalOpen(false);
    } catch (err) {
      alert("Failed to create movement");
    }
  };

  const getMovementBadge = (type) => {
    const badges = {
      PURCHASE: { color: "success", icon: "📦", text: "Purchase" },
      SALE: { color: "primary", icon: "💰", text: "Sale" },
      WASTE: { color: "danger", icon: "🗑️", text: "Waste" },
      TRANSFER_IN: { color: "info", icon: "⬅️", text: "Transfer In" },
      TRANSFER_OUT: { color: "warning", icon: "➡️", text: "Transfer Out" },
      ADJUSTMENT: { color: "secondary", icon: "⚙️", text: "Adjustment" }
    };
    return badges[type] || { color: "secondary", icon: "❓", text: type };
  };

  const filteredMovements = movements.filter(movement => {
    if (filters.movementType && movement.movement_type !== filters.movementType) return false;
    if (filters.dateFrom && movement.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && movement.timestamp > filters.dateTo) return false;
    return true;
  });

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
          <h2 className="d-inline">Stock Movements</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="bi bi-plus-circle me-2"></i>Record Movement
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Movement Type</label>
              <select 
                className="form-select" 
                value={filters.movementType}
                onChange={(e) => setFilters({...filters, movementType: e.target.value})}
              >
                <option value="">All Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE">Sale</option>
                <option value="WASTE">Waste</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Movements List */}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Total Value</th>
                    <th>Staff</th>
                    <th>Reference</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-4">
                        No movements found. Click "Record Movement" to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map(movement => {
                      const badge = getMovementBadge(movement.movement_type);
                      const item = items.find(i => i.id === movement.item);
                      return (
                        <tr key={movement.id}>
                          <td>{new Date(movement.timestamp).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge bg-${badge.color}`}>
                              {badge.icon} {badge.text}
                            </span>
                          </td>
                          <td>
                            <strong>{item?.sku || item?.code || '-'}</strong><br />
                            <small className="text-muted">{item?.name || item?.description || '-'}</small>
                          </td>
                          <td>{parseFloat(movement.quantity).toString().replace(/\.0+$/, '')}</td>
                          <td>€{parseFloat(movement.unit_cost || 0).toFixed(2)}</td>
                          <td>€{(parseFloat(movement.quantity) * parseFloat(movement.unit_cost || 0)).toFixed(2)}</td>
                          <td><span>{movement.staff_name || 'Unknown'}</span></td>
                          <td>{movement.reference || "-"}</td>
                          <td><small>{movement.notes || "-"}</small></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-muted">
              Showing {filteredMovements.length} of {movements.length} movements
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <MovementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreateMovement}
        items={items}
      />
    </div>
  );
};
