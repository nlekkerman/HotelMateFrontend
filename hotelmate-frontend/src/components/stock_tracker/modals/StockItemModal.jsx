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

  const handleSubmit = (e) => {
    e.preventDefault();
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
                    <option value="Wine">Wine</option>
                    <option value="Beer">Beer</option>
                    <option value="Spirit">Spirit</option>
                    <option value="Liqueur">Liqueur</option>
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
                  <input
                    type="text"
                    className="form-control"
                    name="size_unit"
                    value={formData.size_unit}
                    onChange={handleChange}
                    placeholder="ml, L, g, kg"
                  />
                </div>

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
