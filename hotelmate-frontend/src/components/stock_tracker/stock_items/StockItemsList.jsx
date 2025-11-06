import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStockItems } from "../hooks/useStockItems";
import StockItemDetail from "./StockItemDetail";

export const StockItemsList = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { items, categories, loading, error, createItem, updateItem, deleteItem } = useStockItems(hotel_slug);
  
  // Debug: Log the first item to see what data we're getting
  React.useEffect(() => {
    if (items.length > 0) {
      console.log('📊 First stock item data:', items[0]);
      console.log('📊 serving_size value:', items[0].serving_size, '(type:', typeof items[0].serving_size, ')');
      console.log('📊 gp_percentage value:', items[0].gp_percentage, '(type:', typeof items[0].gp_percentage, ')');
      console.log('📊 All item keys:', Object.keys(items[0]));
      
      // Check for null/undefined values in first item
      const nullFields = [];
      Object.entries(items[0]).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          nullFields.push(`${key}=${value}`);
        }
      });
      if (nullFields.length > 0) {
        console.log('⚠️ Null/undefined/empty fields in first item:', nullFields);
      }
      
      // Log all items with their serving_size and gp_percentage
      console.log('📊 All items overview:');
      items.slice(0, 10).forEach((item, index) => {
        console.log(`  Item ${index + 1} [${item.sku}]: serving_size=${item.serving_size} (${typeof item.serving_size}), gp_percentage=${item.gp_percentage} (${typeof item.gp_percentage})`);
      });
      
      if (items.length > 10) {
        console.log(`  ... and ${items.length - 10} more items`);
      }
    }
  }, [items]);
  
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
    const matchesCategory = selectedCategory === "all" || item.category === parseInt(selectedCategory);
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
                    <th>Size Value</th>
                    <th>Size Unit</th>
                    <th>Serving Size</th>
                    <th>Base Unit</th>
                    <th>Unit Cost</th>
                    <th>Current Qty</th>
                    <th>Par Level</th>
                    <th>Bin/Location</th>
                    <th>GP %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="text-center text-muted py-4">
                        No items found. Click on an item to view details.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr 
                        key={item.id} 
                        className={item.is_below_par ? 'table-warning' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(item)}
                      >
                        <td><code className="text-primary">{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.category_name || 'N/A'}</td>
                        <td>{item.product_type}
                          {item.subtype && <><br/><small className="text-muted">{item.subtype}</small></>}
                        </td>
                        <td>{item.size}</td>
                        <td>{item.size_value || 'N/A'}</td>
                        <td>{item.size_unit || 'N/A'}</td>
                        <td>
                          {/* Bottled Beer, Cider, Soft Drinks, RTDs, Mixers - show 1 unit = 1 serving */}
                          {((item.product_type === 'Beer' || 
                             item.product_type?.toLowerCase() === 'cider' ||
                             item.product_type === 'Soft Drink' || 
                             item.product_type?.toLowerCase() === 'soft drinks' ||
                             item.product_type?.toLowerCase() === 'mineral' ||
                             item.product_type?.toLowerCase() === 'minerals' ||
                             item.product_type?.toLowerCase() === 'rtd' ||
                             item.product_type?.toLowerCase() === 'rtds' ||
                             item.product_type === 'Mixer' ||
                             item.category_name?.toLowerCase() === 'cider' ||
                             item.category_name?.toLowerCase() === 'ciders' ||
                             item.category_name?.toLowerCase() === 'soft drinks' ||
                             item.category_name?.toLowerCase() === 'minerals' ||
                             item.category_name?.toLowerCase() === 'rtd' ||
                             item.category_name?.toLowerCase() === 'rtds' ||
                             item.category_name?.toLowerCase() === 'mixers') && 
                           !item.size?.toLowerCase().includes('keg')) ? (
                            <>
                              <strong>1 unit</strong>
                              <br/><small className="text-muted">(1 serving)</small>
                            </>
                          ) : item.serving_size !== null && item.serving_size !== undefined && item.serving_size > 0 ? (
                            <>
                              <strong>{item.serving_size}{item.base_unit || 'ml'}</strong>
                              {item.product_type === 'Draught' && item.serving_size === 568 && (
                                <><br/><small className="text-muted">(pint)</small></>
                              )}
                              {item.product_type === 'Draught' && item.serving_size === 284 && (
                                <><br/><small className="text-muted">(half-pint)</small></>
                              )}
                              {(item.product_type === 'Vodka' || item.product_type === 'Gin' || item.product_type === 'Rum' || 
                                item.product_type === 'Whiskey' || item.product_type === 'Tequila' || 
                                item.product_type === 'Brandy' || item.product_type === 'Spirit' || 
                                item.category_name === 'Spirits' || item.category_name === 'Liqueurs') && (
                                <><br/><small className="text-muted">(shot)</small></>
                              )}
                            </>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>{item.base_unit || 'N/A'}</td>
                        <td>€{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${item.is_below_par ? 'bg-danger' : 'bg-success'}`}>
                            {parseFloat(item.current_qty || 0).toFixed(2)} {item.base_unit}
                          </span>
                          {item.is_below_par && <span className="ms-1">⚠️</span>}
                        </td>
                        <td>{parseFloat(item.par_level || 0).toFixed(2)}</td>
                        <td>{item.bin_name || item.bin || 'N/A'}</td>
                        <td>{item.gp_percentage ? `${parseFloat(item.gp_percentage).toFixed(1)}%` : 'N/A'}</td>
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
