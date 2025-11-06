import React from 'react';
import { Badge } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

const StockItemCard = ({ item, onClick }) => {
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
      style={{ 
        borderLeft: item.is_below_par ? '4px solid #ffc107' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => onClick(item)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Header Row - Name and SKU side by side */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 fw-bold">{item.name}</h6>
        <small className="text-muted ms-2">
          <span className="text-muted">SKU:</span> {item.sku}
        </small>
      </div>

      {/* Badges for Category, Size, and Unit Cost */}
      <div className="mb-2 d-flex flex-wrap gap-1" style={{ fontSize: '0.75rem' }}>
        {item.category_name && (
          <Badge bg="dark">
            Cat: {item.category_name}
          </Badge>
        )}
        {item.size_value && item.size_unit && (
          <Badge bg="secondary">
            Size: {item.size_value}{item.size_unit}
          </Badge>
        )}
        <Badge bg="success">
          Unit Cost: €{parseFloat(item.unit_cost || 0).toFixed(2)}
        </Badge>
      </div>

      {/* Card Body - Current Qty and Par Level */}
      <div className="row g-2 small">
        <div className="col-6">
          <div className="text-muted">Current Qty</div>
          <div className="fw-bold">
            {bottleQty ? (
              <>
                {bottleQty.fullBottles} btl
                {bottleQty.remainingMl > 0 && <small className="text-muted d-block"> +{bottleQty.remainingMl.toFixed(0)}ml</small>}
              </>
            ) : (
              <>{parseFloat(item.current_qty || 0).toFixed(2)}</>
            )}
            {item.is_below_par && <FaExclamationTriangle className="text-warning ms-1" />}
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Par Level</div>
          <div className="fw-bold">
            {bottleQty ? (
              `${Math.floor(item.par_level / bottleQty.bottleSizeInMl)} btl`
            ) : (
              `${parseFloat(item.par_level || 0).toFixed(2)}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockItemCard;
