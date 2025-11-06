import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStockItems } from "../hooks/useStockItems";
import { StockItemModal } from "../modals/StockItemModal";

export const StockItemsList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { items, categories, loading, error, createItem, updateItem, deleteItem } = useStockItems(hotel_slug);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSaveItem = async (itemData) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
      } else {
        await createItem(itemData);
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      alert("Failed to save item");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem(itemId);
      } catch (err) {
        alert("Failed to delete item");
      }
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === parseInt(selectedCategory);
    const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setModalOpen(true); }}>
          <i className="bi bi-plus-circle me-2"></i>Add New Item
        </button>
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
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                    <th>Type</th>
                    <th>Size</th>
                    <th>UOM</th>
                    <th>Unit Cost</th>
                    <th>Current Qty</th>
                    <th>Par Level</th>
                    <th>GP %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center text-muted py-4">
                        No items found. Click "Add New Item" to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} className={item.is_below_par ? 'table-warning' : ''}>
                        <td><code className="text-primary">{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.category_name || 'N/A'}</td>
                        <td>
                          {item.product_type}
                          {item.subtype && <><br/><small className="text-muted">{item.subtype}</small></>}
                        </td>
                        <td>{item.size}</td>
                        <td>{item.uom}</td>
                        <td>€{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${item.is_below_par ? 'bg-danger' : 'bg-success'}`}>
                            {parseFloat(item.current_qty || 0).toFixed(2)} {item.base_unit}
                          </span>
                          {item.is_below_par && <span className="ms-1">⚠️</span>}
                        </td>
                        <td>{parseFloat(item.par_level || 0).toFixed(2)}</td>
                        <td>{item.gp_percentage ? `${parseFloat(item.gp_percentage).toFixed(1)}%` : 'N/A'}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => handleEdit(item)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(item.id)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
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

      {/* Modal */}
      <StockItemModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
      />
    </div>
  );
};
