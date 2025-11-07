import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStockItems } from "../hooks/useStockItems";
import StockItemDetail from "./StockItemDetail";

export const StockItemsList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { items, categories, loading, error, createItem, updateItem, deleteItem } = useStockItems(hotel_slug);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    return matchesCategory && matchesSearch;
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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h2 className="d-inline">Stock Items</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
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
            <div className="col-md-8">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Size</th>
                    <th>UOM</th>
                    <th>Unit Cost</th>
                    <th>Full Units</th>
                    <th>Partial Units</th>
                    <th>Total Units</th>
                    <th>Stock Value</th>
                    <th>Menu Price</th>
                    <th>GP %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="text-center text-muted py-4">
                        No items found. Click on an item to view details.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr 
                        key={item.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(item)}
                      >
                        <td><code className="text-primary">{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>
                          <span className="badge bg-secondary">{item.category}</span>
                          <br/>
                          <small className="text-muted">{item.category_name || 'N/A'}</small>
                        </td>
                        <td>{item.size || 'N/A'}</td>
                        <td>{item.uom ? parseFloat(item.uom).toFixed(2) : 'N/A'}</td>
                        <td>€{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                        <td>
                          <span className="badge bg-info">
                            {parseFloat(item.current_full_units || 0).toFixed(0)}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {parseFloat(item.current_partial_units || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <strong>{parseFloat(item.total_units || 0).toFixed(2)}</strong>
                        </td>
                        <td>
                          <strong className="text-success">
                            €{parseFloat(item.total_stock_value || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          {item.menu_price ? `€${parseFloat(item.menu_price).toFixed(2)}` : 'N/A'}
                        </td>
                        <td>
                          {item.gross_profit_percentage ? (
                            <span className={`badge ${
                              item.gross_profit_percentage >= 70 ? 'bg-success' :
                              item.gross_profit_percentage >= 60 ? 'bg-info' :
                              item.gross_profit_percentage >= 50 ? 'bg-warning' :
                              'bg-danger'
                            }`}>
                              {parseFloat(item.gross_profit_percentage).toFixed(1)}%
                            </span>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))
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
