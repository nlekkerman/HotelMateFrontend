import React, { useState, useEffect } from "react";

export const StockItemModal = ({ isOpen, onClose, onSave, item, categories }) => {
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    subcategory: "",
    size: "",
    size_value: "",
    size_unit: "",
    uom: "",
    unit_cost: "",
    current_full_units: 0,
    current_partial_units: 0,
    menu_price: ""
  });

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || "",
        name: item.name || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        size: item.size || "",
        size_value: item.size_value || "",
        size_unit: item.size_unit || "",
        uom: item.uom || "",
        unit_cost: item.unit_cost || "",
        current_full_units: item.current_full_units || 0,
        current_partial_units: item.current_partial_units || 0,
        menu_price: item.menu_price || ""
      });
    } else {
      setFormData({
        sku: "",
        name: "",
        category: categories[0]?.code || "",
        subcategory: "",
        size: "",
        size_value: "",
        size_unit: "",
        uom: "",
        unit_cost: "",
        current_full_units: 0,
        current_partial_units: 0,
        menu_price: ""
      });
    }
  }, [item, categories, isOpen]);
  
  // ✅ Determine step for partial units based on category and subcategory
  const getPartialUnitsStep = () => {
    if (formData.category === 'M' && formData.subcategory === 'JUICES') {
      return '0.001'; // 3 decimal places for JUICES
    }
    return '0.01'; // Default 2 decimal places
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
                <div className="col-md-6">
                  <label className="form-label">SKU *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    placeholder="e.g., D0005, B0001, S0380"
                  />
                </div>
                
                <div className="col-md-6">
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
                      <option key={cat.code} value={cat.code}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 50 Guinness, Jack Daniels, Pinot Grigio"
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
                    placeholder="e.g., 70cl, 50Lt, Doz"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Size Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="size_value"
                    value={formData.size_value}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 70, 50, 12"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Size Unit *</label>
                  <select
                    className="form-select"
                    name="size_unit"
                    value={formData.size_unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="ml">ml (milliliters)</option>
                    <option value="cl">cl (centiliters)</option>
                    <option value="L">L (liters)</option>
                    <option value="g">g (grams)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="unit">unit (pieces)</option>
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">UOM (Units of Measure) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="uom"
                    value={formData.uom}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 88.03 pints per keg, 28 shots per bottle, 12 bottles per case"
                  />
                  <small className="form-text text-muted">
                    For Draught: pints per keg | For Spirits: shots per bottle | For Beer: bottles per case
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Full Units</label>
                  <input
                    type="number"
                    step="1"
                    className="form-control"
                    name="current_full_units"
                    value={formData.current_full_units}
                    onChange={handleChange}
                    placeholder="0"
                  />
                  <small className="form-text text-muted">Full kegs/cases/bottles</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Partial Units</label>
                  <input
                    type="number"
                    step={getPartialUnitsStep()}
                    className="form-control"
                    name="current_partial_units"
                    value={formData.current_partial_units}
                    onChange={handleChange}
                    placeholder="0"
                  />
                  <small className="form-text text-muted">
                    {formData.category === 'M' && formData.subcategory === 'JUICES' 
                      ? 'Bottles (decimals allowed, e.g., 8.008)' 
                      : 'Pints/shots/individual bottles'}
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Unit Cost (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">Cost per full unit (keg/case/bottle)</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Menu Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="menu_price"
                    value={formData.menu_price}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">Price per serving (pint/shot/glass)</small>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="hm-btn hm-btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="hm-btn hm-btn-confirm">
                {item ? "Update Item" : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
