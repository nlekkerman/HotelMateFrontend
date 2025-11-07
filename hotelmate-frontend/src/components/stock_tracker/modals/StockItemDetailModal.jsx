import React from "react";
import { Badge, Button } from 'react-bootstrap';
import { FaEdit } from 'react-icons/fa';

export const StockItemDetailModal = ({ isOpen, onClose, item, onEdit, categories }) => {
  if (!isOpen || !item) return null;

  const handleEdit = () => {
    onEdit(item);
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <div className="d-flex align-items-start justify-content-between w-100">
              <div>
                <h5 className="modal-title mb-1">{item.name}</h5>
                <small className="text-white-50">SKU: {item.sku}</small>
              </div>
              <Badge bg="secondary">{item.category} - {item.category_name}</Badge>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {/* Main Details Grid */}
            <div className="row g-3">
              {/* Size Information */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-light">
                    <strong>Size Information</strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Size:</small>
                      <div><strong>{item.size || 'N/A'}</strong></div>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Size Value:</small>
                      <div><strong>{item.size_value ? `${item.size_value}${item.size_unit || ''}` : 'N/A'}</strong></div>
                    </div>
                    <div>
                      <small className="text-muted">UOM:</small>
                      <div><strong>{item.uom ? parseFloat(item.uom).toFixed(2) : 'N/A'}</strong></div>
                      <small className="text-muted">
                        {item.category === 'D' && 'pints per keg'}
                        {item.category === 'S' && 'shots per bottle'}
                        {item.category === 'B' && 'bottles per case'}
                        {item.category === 'W' && 'servings per bottle'}
                        {item.category === 'M' && 'units per case'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Levels */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-light">
                    <strong>Stock Levels</strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Full Units:</small>
                      <div>
                        <strong className="fs-5">{parseFloat(item.current_full_units || 0).toFixed(0)}</strong>
                        <small className="text-muted ms-1">
                          ({item.category === 'D' ? 'kegs' : item.category === 'B' || item.category === 'M' ? 'cases' : 'bottles'})
                        </small>
                      </div>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Partial Units:</small>
                      <div>
                        <strong className="fs-5">{parseFloat(item.current_partial_units || 0).toFixed(2)}</strong>
                        <small className="text-muted ms-1">
                          ({item.category === 'D' ? 'pints' : item.category === 'S' ? 'shots' : 'individual'})
                        </small>
                      </div>
                    </div>
                    <div>
                      <small className="text-muted">Total Units:</small>
                      <div>
                        <strong className="fs-4 text-primary">{parseFloat(item.total_units || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-light">
                    <strong>Pricing</strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Unit Cost:</small>
                      <div><strong className="text-success">€{parseFloat(item.unit_cost || 0).toFixed(2)}</strong></div>
                    </div>
                    {item.menu_price && (
                      <div className="mb-2">
                        <small className="text-muted">Menu Price:</small>
                        <div><strong className="text-primary">€{parseFloat(item.menu_price).toFixed(2)}</strong></div>
                      </div>
                    )}
                    <div>
                      <small className="text-muted">Stock Value:</small>
                      <div><strong className="text-success fs-5">€{parseFloat(item.total_stock_value || 0).toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profitability */}
              {item.menu_price && (
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header bg-light">
                      <strong>Profitability</strong>
                    </div>
                    <div className="card-body">
                      <div className="mb-2">
                        <small className="text-muted">Cost per Serving:</small>
                        <div><strong>€{parseFloat(item.cost_per_serving || 0).toFixed(2)}</strong></div>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted">Gross Profit per Serving:</small>
                        <div><strong>€{parseFloat(item.gross_profit_per_serving || 0).toFixed(2)}</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-4">
                          <small className="text-muted">GP%:</small>
                          <div>
                            <Badge bg={
                              item.gross_profit_percentage >= 70 ? 'success' :
                              item.gross_profit_percentage >= 60 ? 'info' :
                              item.gross_profit_percentage >= 50 ? 'warning' : 'danger'
                            }>
                              {parseFloat(item.gross_profit_percentage || 0).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="col-4">
                          <small className="text-muted">Markup%:</small>
                          <div><strong>{parseFloat(item.markup_percentage || 0).toFixed(1)}%</strong></div>
                        </div>
                        <div className="col-4">
                          <small className="text-muted">Pour Cost%:</small>
                          <div><strong>{parseFloat(item.pour_cost_percentage || 0).toFixed(1)}%</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={handleEdit}>
              <FaEdit className="me-2" />
              Edit Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
