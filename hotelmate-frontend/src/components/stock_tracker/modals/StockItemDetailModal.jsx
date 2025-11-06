import React, { useState, useEffect } from "react";
import { Badge, Button } from 'react-bootstrap';
import { FaEdit, FaExclamationTriangle } from 'react-icons/fa';

export const StockItemDetailModal = ({ isOpen, onClose, item, onEdit, categories }) => {
  if (!isOpen || !item) return null;

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
              {item.is_below_par && (
                <Badge bg="warning" text="dark">
                  <FaExclamationTriangle className="me-1" />
                  Below Par
                </Badge>
              )}
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {/* Category and Type Badges */}
            <div className="mb-3">
              {item.category_name && (
                <Badge bg="dark" className="me-2">
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
                    {item.serving_size && (
                      <div>
                        <small className="text-muted">Serving Size:</small>
                        <div>
                          <strong>{item.serving_size}{item.base_unit || 'ml'}</strong>
                          {item.product_type === 'Draught' && item.serving_size === 568 && (
                            <small className="text-muted"> (pint)</small>
                          )}
                          {item.product_type === 'Draught' && item.serving_size === 284 && (
                            <small className="text-muted"> (half-pint)</small>
                          )}
                          {(item.product_type === 'Spirit' || item.product_type === 'Liqueur') && (
                            <small className="text-muted"> (shot)</small>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Yield/UOM */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-light">
                    <strong>Yield & Measurement</strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <small className="text-muted">Yield/UOM:</small>
                      <div>
                        {item.product_type === 'Draught' && item.pints_per_keg ? (
                          <>
                            <strong>{parseFloat(item.pints_per_keg).toFixed(1)} pints</strong>
                            <br/>
                            <small className="text-muted">
                              ({parseFloat(item.half_pints_per_keg || 0).toFixed(1)} half-pints)
                            </small>
                          </>
                        ) : (item.product_type === 'Spirit' || item.product_type === 'Liqueur') && item.shots_per_bottle ? (
                          <strong>{parseFloat(item.shots_per_bottle).toFixed(0)} shots/bottle</strong>
                        ) : item.servings_per_unit ? (
                          <strong>{parseFloat(item.servings_per_unit).toFixed(0)} servings</strong>
                        ) : (
                          <strong>{item.uom || item.base_unit || 'N/A'}</strong>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Base Unit:</small>
                      <div><strong>{item.base_unit || 'N/A'}</strong></div>
                    </div>
                    <div>
                      <small className="text-muted">UOM:</small>
                      <div><strong>{item.uom || 'N/A'}</strong></div>
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
                      <small className="text-muted">Current Quantity:</small>
                      <div>
                        {bottleQty ? (
                          <>
                            <strong className="fs-5">{bottleQty.fullBottles} bottles</strong>
                            {bottleQty.remainingMl > 0 && (
                              <small className="text-muted d-block">
                                + {bottleQty.remainingMl.toFixed(0)}ml partial
                              </small>
                            )}
                          </>
                        ) : (
                          <strong className="fs-5">
                            {parseFloat(item.current_qty || 0).toFixed(2)} {item.base_unit}
                          </strong>
                        )}
                        {item.is_below_par && (
                          <Badge bg="danger" className="ms-2">Below Par</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <small className="text-muted">Par Level:</small>
                      <div>
                        <strong>
                          {bottleQty ? (
                            `${Math.floor(item.par_level / bottleQty.bottleSizeInMl)} bottles`
                          ) : (
                            `${parseFloat(item.par_level || 0).toFixed(2)} ${item.base_unit}`
                          )}
                        </strong>
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
                    {item.selling_price && (
                      <div className="mb-2">
                        <small className="text-muted">Selling Price:</small>
                        <div><strong className="text-primary">€{parseFloat(item.selling_price).toFixed(2)}</strong></div>
                      </div>
                    )}
                    {item.gp_percentage && (
                      <div>
                        <small className="text-muted">GP Percentage:</small>
                        <div><strong>{parseFloat(item.gp_percentage).toFixed(1)}%</strong></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(item.bin || item.bin_name) && (
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-light">
                      <strong>Storage Location</strong>
                    </div>
                    <div className="card-body">
                      <div className="mb-2">
                        <small className="text-muted">Bin/Location:</small>
                        <div><strong>{item.bin_name || item.bin}</strong></div>
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
