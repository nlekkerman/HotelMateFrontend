import React from 'react';
import { Badge } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

const StockItemCard = ({ item, onClick }) => {
  const isLowStock = parseFloat(item.current_full_units || 0) <= 2;

  return (
    <div 
      className="p-3 mb-2 bg-white rounded shadow-sm"
      style={{ 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: isLowStock ? '2px solid #ffc107' : 'none',
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
        <div className="d-flex align-items-center gap-2">
          {isLowStock && (
            <FaExclamationTriangle className="text-warning" title="Low Stock" />
          )}
          <h6 className="mb-0 fw-bold">{item.name}</h6>
        </div>
        <small className="text-muted ms-2">
          <span className="text-muted">SKU:</span> {item.sku}
        </small>
      </div>

      {/* Badges for Category, Size, Unit Cost, and UOM */}
      <div className="mb-2 d-flex flex-wrap gap-1" style={{ fontSize: '0.75rem' }}>
        <Badge bg="dark">
          {item.category} - {item.category_name || 'N/A'}
        </Badge>
        {item.size && (
          <Badge bg="secondary">
            Size: {item.size}
          </Badge>
        )}
        <Badge bg="success">
          Unit Cost: €{parseFloat(item.unit_cost || 0).toFixed(2)}
        </Badge>
        {item.uom && (
          <Badge bg="info">
            UOM: {parseFloat(item.uom).toFixed(2)}
          </Badge>
        )}
      </div>

      {/* Card Body - Stock Levels */}
      <div className="row g-2 small">
        {/* Display logic for "Doz" items (cases + bottles) */}
        {item.size && item.size.includes('Doz') ? (
          <>
            <div className="col-4">
              <div className="text-muted">Cases</div>
              <div className="fw-bold">
                {parseFloat(item.display_full_units || 0).toFixed(0)}
              </div>
            </div>
            <div className="col-4">
              <div className="text-muted">Loose Bottles</div>
              <div className="fw-bold">
                {parseFloat(item.display_partial_units || 0).toFixed(0)}
              </div>
            </div>
            <div className="col-4">
              <div className="text-muted">Total Bottles</div>
              <div className="fw-bold text-primary">
                {parseFloat(item.total_stock_in_servings || 0).toFixed(0)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="col-4">
              <div className="text-muted">Full Units</div>
              <div className="fw-bold">
                {parseFloat(item.current_full_units || 0).toFixed(0)}
              </div>
            </div>
            <div className="col-4">
              <div className="text-muted">Partial</div>
              <div className="fw-bold">
                {parseFloat(item.current_partial_units || 0).toFixed(2)}
              </div>
            </div>
            <div className="col-4">
              <div className="text-muted">Total Servings</div>
              <div className="fw-bold text-primary">
                {parseFloat(item.total_stock_in_servings || 0).toFixed(2)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stock Value and GP */}
      <div className="row g-2 small mt-2">
        <div className="col-6">
          <div className="text-muted">Stock Value</div>
          <div className="fw-bold text-success">
            €{parseFloat(item.total_stock_value || 0).toFixed(2)}
          </div>
        </div>
        {item.gross_profit_percentage && (
          <div className="col-6">
            <div className="text-muted">GP %</div>
            <div className="fw-bold">
              <span className={`badge ${
                item.gross_profit_percentage >= 70 ? 'bg-success' :
                item.gross_profit_percentage >= 60 ? 'bg-info' :
                item.gross_profit_percentage >= 50 ? 'bg-warning' :
                'bg-danger'
              }`}>
                {parseFloat(item.gross_profit_percentage).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockItemCard;
