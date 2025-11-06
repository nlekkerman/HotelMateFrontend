import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaSave, FaTrash, FaPencilAlt } from 'react-icons/fa';

const StockItemDetail = ({ item, categories, onBack, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    sku: item.sku || '',
    category: item.category || '',
    category_name: item.category_name || '',
    product_type: item.product_type || '',
    subtype: item.subtype || '',
    size: item.size || '',
    size_value: item.size_value || '',
    size_unit: item.size_unit || '',
    base_unit: item.base_unit || '',
    unit_cost: item.unit_cost || '',
    current_qty: item.current_qty || '',
    par_level: item.par_level || '',
    bin: item.bin || '',
    bin_name: item.bin_name || '',
    serving_size: item.serving_size || '',
    gp_percentage: item.gp_percentage || '',
    servings_per_unit: item.servings_per_unit || '',
    shots_per_bottle: item.shots_per_bottle || '',
    pints_per_keg: item.pints_per_keg || '',
    half_pints_per_keg: item.half_pints_per_keg || '',
    uom: item.uom || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFieldSave = async (field) => {
    setSaving(true);
    setError(null);
    try {
      const updatedData = {
        ...item,
        [field]: formData[field]
      };
      await onUpdate(item.id, updatedData);
      setEditingField(null);
    } catch (err) {
      setError(`Error updating ${field}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await onDelete(item.id);
        onBack();
      } catch (err) {
        setError('Error deleting item: ' + err.message);
      }
    }
  };

  // Helper functions to determine what fields to show based on product type
  const isDraught = () => {
    const productType = (formData.product_type || '').toLowerCase();
    const size = (formData.size || '').toLowerCase();
    const name = (formData.name || '').toLowerCase();
    
    // Check if it's draught beer based on size containing "keg" or name containing "(draught)"
    return productType === 'draught' || 
           productType === 'keg' || 
           size.includes('keg') || 
           name.includes('(draught)');
  };

  const isSpirit = () => {
    // Check product_type (case-insensitive)
    const productType = (formData.product_type || '').toLowerCase();
    const spiritTypes = ['spirit', 'vodka', 'gin', 'rum', 'whiskey', 'whisky', 'tequila', 'brandy', 'liqueur', 'cognac', 'bourbon', 'vermouth'];
    
    // Check category_name (case-insensitive)
    const categoryName = (formData.category_name || '').toLowerCase();
    const spiritCategories = ['spirits', 'liqueurs', 'liqueur', 'aperitif', 'fortified'];
    
    return spiritTypes.includes(productType) || spiritCategories.includes(categoryName);
  };

  const isBeer = () => {
    return formData.product_type === 'Beer' || formData.product_type === 'beer';
  };

  const isWine = () => {
    return formData.product_type === 'Wine' || formData.product_type === 'wine';
  };

  const isSoftDrink = () => {
    const productType = (formData.product_type || '').toLowerCase();
    const categoryName = (formData.category_name || '').toLowerCase();
    return productType === 'soft drink' || 
           productType === 'soft drinks' || 
           productType === 'mineral' ||
           productType === 'minerals' ||
           productType === 'rtd' ||
           productType === 'rtds' ||
           categoryName === 'soft drinks' ||
           categoryName === 'minerals' ||
           categoryName === 'rtd' ||
           categoryName === 'rtds';
  };

  const isMixer = () => {
    const productType = (formData.product_type || '').toLowerCase();
    const categoryName = (formData.category_name || '').toLowerCase();
    return productType === 'mixer' || 
           productType === 'mixers' ||
           categoryName === 'mixers';
  };

  const isCider = () => {
    const productType = (formData.product_type || '').toLowerCase();
    const categoryName = (formData.category_name || '').toLowerCase();
    const name = (formData.name || '').toLowerCase();
    return productType === 'cider' || 
           categoryName === 'cider' ||
           categoryName === 'ciders' ||
           name.includes('cider');
  };

  const isGarnish = () => {
    return formData.product_type === 'Garnish' || formData.product_type === 'garnish';
  };

  const isOther = () => {
    return formData.product_type === 'Other' || formData.product_type === 'other';
  };

  const needsServingsPerUnit = () => {
    // Wine, Garnish, and optionally Soft Drinks, Mixers, and Other
    return isWine() || isGarnish() || isSoftDrink() || isMixer() || isOther();
  };

  // Calculate shots per bottle locally for display
  const calculateShotsPerBottle = () => {
    if (!formData.size_value || !formData.serving_size) return null;
    
    // Convert size to ml
    let sizeInMl = parseFloat(formData.size_value);
    const sizeUnit = (formData.size_unit || '').toLowerCase();
    
    if (sizeUnit === 'cl') {
      sizeInMl = sizeInMl * 10;
    } else if (sizeUnit === 'l') {
      sizeInMl = sizeInMl * 1000;
    }
    
    const servingSize = parseFloat(formData.serving_size);
    const shots = sizeInMl / servingSize;
    
    return shots.toFixed(1);
  };

  // Calculate pints per keg locally for display
  const calculatePintsPerKeg = () => {
    if (!formData.size_value) return null;
    
    // Convert size to ml
    let sizeInMl = parseFloat(formData.size_value);
    const sizeUnit = (formData.size_unit || '').toLowerCase();
    
    if (sizeUnit === 'l' || sizeUnit === 'litres' || sizeUnit === 'liters') {
      sizeInMl = sizeInMl * 1000;
    }
    
    const pints = sizeInMl / 568; // UK pint
    return pints.toFixed(1);
  };

  // Calculate half pints per keg locally for display
  const calculateHalfPintsPerKeg = () => {
    const pints = calculatePintsPerKeg();
    if (!pints) return null;
    
    const halfPints = parseFloat(pints) * 2;
    return halfPints.toFixed(1);
  };

  // Calculate servings per unit for wine
  const calculateServingsPerUnit = () => {
    if (!formData.size_value || !formData.serving_size) return null;
    
    // Convert size to ml
    let sizeInMl = parseFloat(formData.size_value);
    const sizeUnit = (formData.size_unit || '').toLowerCase();
    
    if (sizeUnit === 'cl') {
      sizeInMl = sizeInMl * 10;
    } else if (sizeUnit === 'l') {
      sizeInMl = sizeInMl * 1000;
    }
    
    const servingSize = parseFloat(formData.serving_size);
    const servings = sizeInMl / servingSize;
    
    return servings.toFixed(1);
  };

  const EditableField = ({ label, field, type = 'text', options = null }) => {
    const isEditing = editingField === field;
    const selectRef = React.useRef(null);
    
    const handleEditClick = () => {
      setEditingField(field);
      if (options && selectRef.current) {
        // Small delay to ensure the select is enabled before focusing
        setTimeout(() => {
          selectRef.current.focus();
          selectRef.current.click();
        }, 50);
      }
    };
    
    return (
      <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
        <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>{label}</div>
        <div className="d-flex gap-1 flex-grow-1">
          {options ? (
            <Form.Select
              ref={selectRef}
              value={formData[field]}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              disabled={!isEditing}
              size="sm"
              className="flex-grow-1"
              style={{
                appearance: 'none',
                backgroundImage: 'none',
                paddingRight: '0.75rem'
              }}
            >
              <option value="">Select...</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          ) : (
            <Form.Control
              type={type}
              value={formData[field]}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              disabled={!isEditing}
              size="sm"
              className="flex-grow-1"
            />
          )}
          {isEditing ? (
            <Button
              variant="success"
              size="sm"
              onClick={() => handleFieldSave(field)}
              disabled={saving}
              style={{ padding: '2px 8px' }}
            >
              <FaSave size={12} />
            </Button>
          ) : (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleEditClick}
              style={{ padding: '2px 8px' }}
            >
              <FaPencilAlt size={10} />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Container fluid className="py-3 px-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={onBack}
          >
            <FaArrowLeft />
          </Button>
          <h4 className="mb-0">Item Details</h4>
        </div>
        <Button 
          variant="outline-danger" 
          size="sm"
          onClick={handleDelete}
        >
          <FaTrash /> Delete
        </Button>
      </div>

      {/* Item Name Display */}
      <div className="bg-primary text-white p-2 rounded mb-3 text-center">
        <small className="text-uppercase" style={{ fontSize: '0.7rem', opacity: 0.9 }}>Editing</small>
        <h5 className="mb-0 fw-bold">{item.name}</h5>
        <small style={{ fontSize: '0.85rem', opacity: 0.9 }}>SKU: {item.sku}</small>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {saving && (
        <Alert variant="info">
          <Spinner animation="border" size="sm" className="me-2" />
          Saving changes...
        </Alert>
      )}

      {/* Basic Information */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">Basic Information</h6>
        
        <EditableField label="Name" field="name" />
        <EditableField label="SKU" field="sku" />
        <EditableField 
          label="Category" 
          field="category" 
          options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
        />
        <EditableField label="Product Type" field="product_type" />
        <EditableField label="Subtype" field="subtype" />
      </div>

      {/* Size & Measurement */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">Size & Measurement</h6>
        
        <EditableField label="Size" field="size" />
        <EditableField label="Size Value" field="size_value" type="number" />
        <EditableField label="Size Unit" field="size_unit" />
        <EditableField label="Base Unit" field="base_unit" />
      </div>

      {/* Pricing & Stock */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">Pricing & Stock</h6>
        
        <EditableField label="Unit Cost (€)" field="unit_cost" type="number" />
        <EditableField label="Current Quantity" field="current_qty" type="number" />
        <EditableField label="Par Level" field="par_level" type="number" />
        <EditableField label="GP Percentage (%)" field="gp_percentage" type="number" />
      </div>

      {/* Serving Information */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">
          Serving Information
          <small className="text-muted ms-2" style={{ fontSize: '0.7rem' }}>
            (Fields shown based on product type: {formData.product_type || 'N/A'})
          </small>
        </h6>
        
        {/* Bottled Beer, Cider, Soft Drinks, RTDs, Mixers - Show message that bottle IS the serving */}
        {((isBeer() && !isDraught()) || isCider() || isSoftDrink() || isMixer()) && (
          <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
            <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>Servings per Unit</div>
            <div className="flex-grow-1">
              <div className="bg-light px-2 py-1 rounded">
                <strong>1</strong>
                <small className="text-muted ms-1">bottle/can = 1 serving</small>
              </div>
            </div>
          </div>
        )}
        
        {/* For products that need serving size (Spirits, Wine, Draught, Garnish, Other) */}
        {!((isBeer() && !isDraught()) || isCider() || isSoftDrink() || isMixer()) && (
          <EditableField 
            label={isGarnish() ? "Serving Size (pieces)" : isDraught() ? "Serving Size (568=pint, 284=half)" : "Serving Size (ml)"} 
            field="serving_size" 
            type="number" 
          />
        )}
        
        {/* Draught - show Pints and Half Pints Per Keg (CALCULATED LOCALLY) */}
        {isDraught() && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
              <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>Pints per Keg</div>
              <div className="flex-grow-1">
                <div className="bg-light px-2 py-1 rounded">
                  <strong>{calculatePintsPerKeg() || formData.pints_per_keg || item.pints_per_keg || 'N/A'}</strong>
                  <small className="text-muted ms-1">pints/keg</small>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
              <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>Half Pints per Keg</div>
              <div className="flex-grow-1">
                <div className="bg-light px-2 py-1 rounded">
                  <strong>{calculateHalfPintsPerKeg() || formData.half_pints_per_keg || item.half_pints_per_keg || 'N/A'}</strong>
                  <small className="text-muted ms-1">glasses/keg</small>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Spirits/Liqueurs - show Shots Per Bottle (CALCULATED LOCALLY) */}
        {isSpirit() && (
          <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
            <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>Shots per Bottle</div>
            <div className="flex-grow-1">
              <div className="bg-light px-2 py-1 rounded">
                <strong>{calculateShotsPerBottle() || formData.shots_per_bottle || item.shots_per_bottle || 'N/A'}</strong>
                <small className="text-muted ms-1">shots/bottle</small>
              </div>
            </div>
          </div>
        )}
        
        {/* Wine - show Servings Per Unit (CALCULATED LOCALLY) */}
        {isWine() && (
          <div className="d-flex align-items-center justify-content-between mb-2 py-1" style={{ fontSize: '0.9rem' }}>
            <div className="text-muted" style={{ minWidth: '140px', maxWidth: '140px' }}>Glasses per Bottle</div>
            <div className="flex-grow-1">
              <div className="bg-light px-2 py-1 rounded">
                <strong>{calculateServingsPerUnit() || formData.servings_per_unit || item.servings_per_unit || 'N/A'}</strong>
                <small className="text-muted ms-1">glasses/bottle</small>
              </div>
            </div>
          </div>
        )}
        
        {/* Garnish - show Servings Per Unit (pieces per package) */}
        {isGarnish() && (
          <EditableField label="Servings Per Unit (pieces)" field="servings_per_unit" type="number" />
        )}
        
        {/* Other - optionally show Servings Per Unit */}
        {isOther() && (
          <EditableField label="Servings Per Unit (optional)" field="servings_per_unit" type="number" />
        )}
        
        {/* Bottled Beer, Soft Drinks, Mixers - no additional fields, already shown above */}
      </div>

      {/* Location */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">Location</h6>
        
        <EditableField label="Bin/Location Code" field="bin" />
        <EditableField label="Bin/Location Name" field="bin_name" />
      </div>

      {/* Status Info */}
      <div className="bg-white p-2 rounded shadow-sm mb-2">
        <h6 className="mb-2 text-primary px-1">Status</h6>
        
        <div className="d-flex justify-content-between align-items-center px-1 py-1 bg-light rounded mb-2" style={{ fontSize: '0.9rem' }}>
          <span className="text-muted">Below Par Level</span>
          <span className={`fw-bold ${item.is_below_par ? 'text-warning' : 'text-success'}`}>
            {item.is_below_par ? 'Yes ⚠️' : 'No ✓'}
          </span>
        </div>
        
        {item.last_updated && (
          <div className="d-flex justify-content-between align-items-center px-1 py-1 bg-light rounded" style={{ fontSize: '0.9rem' }}>
            <span className="text-muted">Last Updated</span>
            <span className="fw-bold">
              {new Date(item.last_updated).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </Container>
  );
};

export default StockItemDetail;
