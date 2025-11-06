import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export const MovementModal = ({ isOpen, onClose, onSave, items }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    item: "",
    movement_type: "PURCHASE",
    quantity: "",
    unit_cost: "",
    reference: "",
    notes: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-fill unit cost when item is selected
    if (name === "item" && value) {
      const selectedItem = items.find(i => i.id === parseInt(value));
      if (selectedItem && !formData.unit_cost) {
        setFormData(prev => ({ ...prev, unit_cost: selectedItem.unit_cost }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      staff: user?.id
    });
    setFormData({
      item: "",
      movement_type: "PURCHASE",
      quantity: "",
      unit_cost: "",
      reference: "",
      notes: ""
    });
  };

  if (!isOpen) return null;

  const movementTypes = [
    { value: "PURCHASE", label: "📦 Purchase", desc: "Stock received (increases qty)" },
    { value: "SALE", label: "💰 Sale", desc: "Stock sold/consumed (decreases qty)" },
    { value: "WASTE", label: "🗑️ Waste", desc: "Breakage/spoilage (decreases qty)" },
    { value: "TRANSFER_IN", label: "⬅️ Transfer In", desc: "Received from another location" },
    { value: "TRANSFER_OUT", label: "➡️ Transfer Out", desc: "Sent to another location" },
    { value: "ADJUSTMENT", label: "⚙️ Adjustment", desc: "Manual stock adjustment" }
  ];

  const selectedItem = items.find(i => i.id === parseInt(formData.item));
  
  // Filter items based on search term
  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const itemSku = (item.sku || item.code || '').toLowerCase();
    const itemName = (item.name || item.description || '').toLowerCase();
    return itemSku.includes(searchLower) || itemName.includes(searchLower);
  });

  const handleItemSelect = (itemId) => {
    setFormData(prev => ({ ...prev, item: itemId }));
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem && !formData.unit_cost) {
      setFormData(prev => ({ ...prev, unit_cost: selectedItem.unit_cost }));
    }
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">Record Stock Movement</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Movement Type *</label>
                  <select
                    className="form-select"
                    name="movement_type"
                    value={formData.movement_type}
                    onChange={handleChange}
                    required
                  >
                    {movementTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Item *</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name or SKU..."
                      value={selectedItem ? `${selectedItem.sku || selectedItem.code || 'N/A'} - ${selectedItem.name || selectedItem.description || 'Unnamed'}` : searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, item: "" }));
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      required
                    />
                    {isDropdownOpen && (
                      <div 
                        className="position-absolute w-100 bg-white border rounded shadow-lg mt-1" 
                        style={{ maxHeight: '300px', overflowY: 'auto', zIndex: 1000 }}
                      >
                        {filteredItems.length > 0 ? (
                          filteredItems.map(item => (
                            <div
                              key={item.id}
                              className="p-2 border-bottom cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              onMouseDown={() => handleItemSelect(item.id)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                              <strong>{item.sku || item.code || 'N/A'}</strong> - {item.name || item.description || 'Unnamed'}
                              {(item.size || item.base_unit) && (
                                <span className="text-muted"> ({item.size || item.base_unit})</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-muted text-center">
                            No items found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedItem && (
                    <small className="form-text text-muted">
                      Current stock: {parseFloat(selectedItem.current_qty || 0).toFixed(2)} {selectedItem.base_unit || ''}
                    </small>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">
                    Always positive (direction determined by type)
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Unit Cost (€)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    name="unit_cost"
                    value={formData.unit_cost}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                  <small className="form-text text-muted">
                    Optional (uses item's default if empty)
                  </small>
                </div>

                <div className="col-12">
                  <label className="form-label">Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder="e.g., Invoice number, PO number"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              {formData.item && formData.quantity && (
                <div className="alert alert-info mt-3">
                  <strong>Preview:</strong> This will {
                    ["PURCHASE", "TRANSFER_IN", "ADJUSTMENT"].includes(formData.movement_type) ? "increase" : "decrease"
                  } stock by {parseFloat(formData.quantity).toFixed(2)} units.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record Movement
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
