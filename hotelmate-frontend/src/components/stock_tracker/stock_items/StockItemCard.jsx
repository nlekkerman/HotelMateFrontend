import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

const StockItemCard = ({ item, onEdit, onDelete }) => {
  // Calculate bottle quantity if applicable
  const getBottleQuantity = () => {
    if (!item.size_value || !item.size_unit) return null;
    
    let bottleSizeInMl;
    switch (item.size_unit.toLowerCase()) {
      case 'cl':
        bottleSizeInMl = item.size_value * 10;
        break;
      case 'l':
        bottleSizeInMl = item.size_value * 1000;
        break;
      case 'ml':
        bottleSizeInMl = item.size_value;
        break;
      default:
        return null;
    }
    
    const fullBottles = Math.floor(item.current_qty / bottleSizeInMl);
    const remainingMl = item.current_qty % bottleSizeInMl;
    
    return { fullBottles, remainingMl, bottleSizeInMl };
  };

  const bottleQty = getBottleQuantity();

  return (
    <div 
      className={`p-3 mb-2 bg-white rounded shadow-sm ${item.is_below_par ? 'border-start border-warning border-4' : ''}`}
      style={{ borderLeft: item.is_below_par ? '4px solid #ffc107' : 'none' }}
    >
      {/* Header Row */}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="flex-grow-1">
          <h6 className="mb-0 fw-bold">{item.name}</h6>
          <small className="text-muted">{item.sku}</small>
        </div>
        <div className="d-flex gap-1">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => onEdit(item)}
            style={{ padding: '4px 8px' }}
          >
            <FaEdit />
          </Button>
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={() => onDelete(item.id)}
            style={{ padding: '4px 8px' }}
          >
            <FaTrash />
          </Button>
        </div>
      </div>

      {/* Badges for Category and Type */}
      <div className="mb-2">
        {item.category_name && (
          <Badge bg="secondary" className="me-2">
            {item.category_name}
          </Badge>
        )}
        {item.product_type && (
          <Badge bg="info">
            {item.product_type}
            {item.subtype && ` - ${item.subtype}`}
          </Badge>
        )}
      </div>

      {/* Info Grid - Matching PC table columns */}
      <div className="row g-2 small">
        <div className="col-4">
          <div className="text-muted">Size</div>
          <div>{item.size}</div>
        </div>
        <div className="col-4">
          <div className="text-muted">UOM</div>
          <div>{item.uom}</div>
        </div>
        <div className="col-4">
          <div className="text-muted">Cost</div>
          <div>€{parseFloat(item.unit_cost || 0).toFixed(2)}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">GP %</div>
          <div className="fw-bold text-success">{item.gp_percentage ? `${parseFloat(item.gp_percentage).toFixed(1)}%` : 'N/A'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">Current Qty</div>
          <div>
            {bottleQty ? (
              <>
                <strong>{bottleQty.fullBottles} btl</strong>
                {bottleQty.remainingMl > 0 && <small className="text-muted"> +{bottleQty.remainingMl.toFixed(0)}ml</small>}
              </>
            ) : (
              <strong>{parseFloat(item.current_qty || 0).toFixed(2)} {item.base_unit}</strong>
            )}
            {item.is_below_par && <FaExclamationTriangle className="text-warning ms-1" />}
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Par Level</div>
          <div>
            {bottleQty ? (
              `${Math.floor(item.par_level / bottleQty.bottleSizeInMl)} btl`
            ) : (
              `${parseFloat(item.par_level || 0).toFixed(2)} ${item.base_unit}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockItemCard;
