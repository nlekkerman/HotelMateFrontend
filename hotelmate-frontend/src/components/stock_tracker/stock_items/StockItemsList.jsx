import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStockItems } from "../hooks/useStockItems";
import StockItemDetail from "./StockItemDetail";
import { FaExclamationTriangle } from 'react-icons/fa';

export const StockItemsList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { items, categories, loading, error, createItem, updateItem, deleteItem } = useStockItems(hotel_slug);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleBackToList = () => {
    setSelectedItem(null);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = !showLowStock || parseFloat(item.current_full_units || 0) <= 2;
    return matchesCategory && matchesSearch && matchesLowStock;
  });

  // If an item is selected, show the detail view
  if (selectedItem) {
    return (
      <StockItemDetail
        item={selectedItem}
        categories={categories}
        onBack={handleBackToList}
        onUpdate={updateItem}
        onDelete={deleteItem}
      />
    );
  }

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
          <h2 className="d-inline">Stock Items</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Category</label>
              <select 
                className="form-select" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label d-block">&nbsp;</label>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="lowStockFilter"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="lowStockFilter">
                  <FaExclamationTriangle className="text-warning me-1" />
                  Low Stock Only
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>SKU</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Name</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Category</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Size</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>UOM</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Unit Cost</th>
                    <th colSpan="4" className="text-center bg-info text-white">Previously Closed Period Stock Data</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Menu Price</th>
                  </tr>
                  <tr>
                    <th className="bg-info-subtle">Full Units</th>
                    <th className="bg-info-subtle">Partial Units</th>
                    <th className="bg-info-subtle">Total Servings</th>
                    <th className="bg-info-subtle">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center text-muted py-4">
                        No items found. Click on an item to view details.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isLowStock = parseFloat(item.current_full_units || 0) <= 2;
                      return (
                      <tr 
                        key={item.id} 
                        style={{ cursor: 'pointer', backgroundColor: isLowStock ? '#fff3cd' : 'transparent' }}
                        onClick={() => handleRowClick(item)}
                      >
                        <td>
                          {isLowStock && <FaExclamationTriangle className="text-warning me-1" />}
                          <code className="text-primary">{item.sku}</code>
                        </td>
                        <td><strong>{item.name}</strong></td>
                        <td>
                          <span className="badge bg-secondary">{item.category}</span>
                          <br/>
                          <small className="text-muted">{item.category_name || 'N/A'}</small>
                        </td>
                        <td>{item.size || 'N/A'}</td>
                        <td>{item.uom ? parseFloat(item.uom).toFixed(2) : 'N/A'}</td>
                        <td>€{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                        {/* Display logic for "Doz" items (cases + bottles) */}
                        {item.size && item.size.includes('Doz') ? (
                          <>
                            <td className="bg-info-subtle">
                              <span className="badge bg-info">
                                {parseFloat(item.display_full_units || 0).toFixed(0)} cases
                              </span>
                            </td>
                            <td className="bg-info-subtle">
                              <span className="badge bg-light text-dark">
                                {parseFloat(item.display_partial_units || 0).toFixed(0)} bottles
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="bg-info-subtle">
                              <span className="badge bg-info">
                                {parseFloat(item.current_full_units || 0).toFixed(0)}
                              </span>
                            </td>
                            <td className="bg-info-subtle">
                              <span className="badge bg-light text-dark">
                                {parseFloat(item.current_partial_units || 0).toFixed(2)}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="bg-info-subtle">
                          <strong>
                            {item.size && item.size.includes('Doz') 
                              ? parseFloat(item.total_stock_in_servings || 0).toFixed(0) + ' bottles'
                              : parseFloat(item.total_stock_in_servings || 0).toFixed(2)
                            }
                          </strong>
                        </td>
                        <td className="bg-info-subtle">
                          <strong className="text-success">
                            €{parseFloat(item.total_stock_value || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          {item.menu_price ? `€${parseFloat(item.menu_price).toFixed(2)}` : 'N/A'}
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-muted">
              Showing {filteredItems.length} of {items.length} items
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
