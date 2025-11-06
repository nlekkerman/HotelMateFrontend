import React, { useState, useEffect } from "react";

export const StockItemModal = ({ isOpen, onClose, onSave, item, categories }) => {
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    product_type: "Wine",
    subtype: "",
    size: "",
    size_value: "",
    size_unit: "",
    serving_size: "",
    uom: "",
    unit_cost: "",
    selling_price: "",
    base_unit: "",
    par_level: "",
    category: ""
  });

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || "",
        name: item.name || "",
        product_type: item.product_type || "Wine",
        subtype: item.subtype || "",
        size: item.size || "",
        size_value: item.size_value || "",
        size_unit: item.size_unit || "",
        serving_size: item.serving_size || "",
        uom: item.uom || "",
        unit_cost: item.unit_cost || "",
        selling_price: item.selling_price || "",
        base_unit: item.base_unit || "",
        par_level: item.par_level || "",
        category: item.category || ""
      });
    } else {
      setFormData({
        sku: "",
        name: "",
        product_type: "Wine",
        subtype: "",
        size: "",
        size_value: "",
        size_unit: "",
        serving_size: "",
        uom: "",
        unit_cost: "",
        selling_price: "",
        base_unit: "",
        par_level: "",
        category: categories[0]?.id || ""
      });
    }
  }, [item, categories, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Helper to get serving size placeholder/help text based on product type
  const getServingSizeHelp = () => {
    switch (formData.product_type) {
      case 'Draught':
        return 'Pint = 568ml, Half-pint = 284ml';
      case 'Spirit':
      case 'Liqueur':
        return 'Standard shot = 25ml or 35ml';
      case 'Beer':
        return 'Full bottle (e.g., 330ml)';
      case 'Wine':
        return 'Glass size (e.g., 175ml, 250ml)';
      default:
        return 'Serving size in ml';
    }
  };
  
  // Calculate yield preview
  const getYieldPreview = () => {
    const sizeValue = parseFloat(formData.size_value);
    const servingSize = parseFloat(formData.serving_size);
    
    if (!sizeValue || !servingSize) return null;
    
    // Convert size to ml
    let sizeInMl = sizeValue;
    if (formData.size_unit === 'cl' || formData.size_unit === 'CL') {
      sizeInMl = sizeValue * 10;
    } else if (formData.size_unit === 'L' || formData.size_unit === 'l') {
      sizeInMl = sizeValue * 1000;
    }
    
    const servings = (sizeInMl / servingSize).toFixed(1);
    
    if (formData.product_type === 'Draught') {
      if (servingSize === 568) {
        const halfPints = (servings * 2).toFixed(1);
        return `${servings} pints (${halfPints} half-pints)`;
      }
      return `${servings} servings`;
    } else if (formData.product_type === 'Spirit' || formData.product_type === 'Liqueur') {
      return `${Math.floor(servings)} shots per bottle`;
    } else {
      return `${servings} servings`;
    }
  };
  
  const yieldPreview = getYieldPreview();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Modal handleSubmit called');
    console.log('Form data being saved:', formData);
    console.log('Is editing item:', !!item);
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              {item ? "Edit Stock Item" : "Add New Stock Item"}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">SKU *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    placeholder="e.g., WIN001"
                  />
                </div>
                
                <div className="col-md-4">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Product Type *</label>
                  <select
                    className="form-select"
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="Draught">Draught Beer (Keg)</option>
                    <option value="Beer">Bottled Beer</option>
                    <option value="Spirit">Spirit</option>
                    <option value="Liqueur">Liqueur</option>
                    <option value="Wine">Wine</option>
                    <option value="Soft Drink">Soft Drink</option>
                    <option value="Mixer">Mixer</option>
                    <option value="Garnish">Garnish</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Pinot Grigio"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Subtype</label>
                  <input
                    type="text"
                    className="form-control"
                    name="subtype"
                    value={formData.subtype}
                    onChange={handleChange}
                    placeholder="e.g., White Wine, IPA"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Size *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 70cl, 30Lt"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Size Value</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="size_value"
                    value={formData.size_value}
                    onChange={handleChange}
                    placeholder="e.g., 700"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Size Unit</label>
                  <select
                    className="form-select"
                    name="size_unit"
                    value={formData.size_unit}
                    onChange={handleChange}
                  >
                    <option value="">Select unit</option>
                    <option value="ml">ml (milliliters)</option>
                    <option value="cl">cl (centiliters)</option>
                    <option value="L">L (liters)</option>
                    <option value="g">g (grams)</option>
                    <option value="kg">kg (kilograms)</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Serving Size</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="serving_size"
                    value={formData.serving_size}
                    onChange={handleChange}
                    placeholder={
                      formData.product_type === 'Draught' ? '568 (pint)' :
                      (formData.product_type === 'Spirit' || formData.product_type === 'Liqueur') ? '25 (shot)' :
                      formData.product_type === 'Beer' ? '330 (bottle)' :
                      'e.g., 175'
                    }
                  />
                  <small className="form-text text-muted">{getServingSizeHelp()}</small>
                </div>
                
                {/* Yield Preview */}
                {yieldPreview && (
                  <div className="col-12">
                    <div className="alert alert-info mb-0 py-2">
                      <strong>📊 Yield Preview:</strong> {yieldPreview}
                    </div>
                  </div>
                )}

                <div className="col-md-4">
                  <label className="form-label">UOM *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="uom"
                    value={formData.uom}
                    onChange={handleChange}
                    required
                    placeholder="Units per case"
                  />
                  <small className="form-text text-muted">Units of measure (e.g., 12 bottles per case)</small>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Base Unit *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="base_unit"
                    value={formData.base_unit}
                    onChange={handleChange}
                    required
                    placeholder="ml, bottles, g"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Par Level</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="par_level"
                    value={formData.par_level}
                    onChange={handleChange}
                    placeholder="Minimum stock level"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Unit Cost (€) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">Cost per full unit</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Selling Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">Price per serving</small>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {item ? "Update Item" : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
