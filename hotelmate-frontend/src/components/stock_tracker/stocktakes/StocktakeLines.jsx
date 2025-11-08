import React, { useState } from 'react';
import { Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import { getCountingLabels, displayStockUnits } from '../utils/categoryHelpers';
import { 
  formatStocktakeDisplay, 
  formatVarianceDisplay, 
  formatMovementDisplay,
  getMovementBadgeProps 
} from '../utils/stockDisplayUtils';

export const StocktakeLines = ({ lines, isLocked, onUpdateLine }) => {
  // Store input values for each line separately
  const [lineInputs, setLineInputs] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // DEBUG: Log stocktake line data to see API response
  React.useEffect(() => {
    if (lines && lines.length > 0) {
      // Find a line with ACTUAL stock data (not zero)
      const lineWithData = lines.find(line => 
        parseFloat(line.opening_qty || 0) > 0 ||
        parseFloat(line.expected_qty || 0) > 0 ||
        parseFloat(line.counted_qty || 0) > 0
      );
      
      if (!lineWithData) {
        console.log('⚠️ STOCKTAKE: All lines have zero stock!');
        return;
      }
      
      console.log('=== STOCKTAKE LINES DATA ===');
      console.log('Total lines:', lines.length);
      console.log('✅ Sample line WITH STOCK:', lineWithData.item_name, '(SKU:', lineWithData.item_sku + ')');
      console.log('Item info:', {
        sku: lineWithData?.item_sku,
        name: lineWithData?.item_name,
        category: lineWithData?.category_code,
        category_name: lineWithData?.category_name,
        size: lineWithData?.item_size,
        uom: lineWithData?.uom || lineWithData?.item_uom
      });
      console.log('\n--- OPENING STOCK ---');
      console.log('opening_qty (raw servings):', lineWithData?.opening_qty);
      console.log('opening_display_full_units:', lineWithData?.opening_display_full_units);
      console.log('opening_display_partial_units:', lineWithData?.opening_display_partial_units);
      
      console.log('\n--- MOVEMENTS ---');
      console.log('purchases:', lineWithData?.purchases);
      console.log('sales:', lineWithData?.sales);
      console.log('waste:', lineWithData?.waste);
      console.log('transfers_in:', lineWithData?.transfers_in);
      console.log('transfers_out:', lineWithData?.transfers_out);
      console.log('adjustments:', lineWithData?.adjustments);
      
      console.log('\n--- EXPECTED CLOSING ---');
      console.log('expected_qty (raw servings):', lineWithData?.expected_qty);
      console.log('expected_display_full_units:', lineWithData?.expected_display_full_units);
      console.log('expected_display_partial_units:', lineWithData?.expected_display_partial_units);
      console.log('expected_value:', lineWithData?.expected_value);
      
      console.log('\n--- COUNTED CLOSING ---');
      console.log('counted_full_units (input):', lineWithData?.counted_full_units);
      console.log('counted_partial_units (input):', lineWithData?.counted_partial_units);
      console.log('counted_qty (raw servings):', lineWithData?.counted_qty);
      console.log('counted_display_full_units:', lineWithData?.counted_display_full_units);
      console.log('counted_display_partial_units:', lineWithData?.counted_display_partial_units);
      console.log('counted_value:', lineWithData?.counted_value);
      
      console.log('\n--- VARIANCE ---');
      console.log('variance_qty (raw servings):', lineWithData.variance_qty);
      console.log('variance_display_full_units:', lineWithData.variance_display_full_units);
      console.log('variance_display_partial_units:', lineWithData.variance_display_partial_units);
      console.log('variance_value:', lineWithData.variance_value);
      
      console.log('\n========================================');
      console.log('🎯 WHAT SHOULD BE DISPLAYED ON PAGE:');
      console.log('========================================');
      const labels = getCountingLabels(lineWithData.category_code, lineWithData.item_size);
      
      console.log('\n📦 OPENING STOCK Column:');
      console.log(`  Line 1: ${lineWithData.opening_display_full_units || '0'} ${labels.unit}`);
      console.log(`  Line 2: ${lineWithData.opening_display_partial_units || '0'} ${labels.servingUnit}`);
      console.log(`  Line 3: ${parseFloat(lineWithData.opening_qty || 0).toFixed(2)} servings`);
      
      console.log('\n✅ EXPECTED STOCK (should show but MISSING):');
      console.log(`  Full: ${lineWithData.expected_display_full_units || '0'} ${labels.unit}`);
      console.log(`  Partial: ${lineWithData.expected_display_partial_units || '0'} ${labels.servingUnit}`);
      console.log(`  Value: €${parseFloat(lineWithData.expected_value || 0).toFixed(2)}`);
      
      console.log('\n🔢 COUNTED STOCK Column (what staff enters):');
      console.log(`  Full: ${lineWithData.counted_display_full_units || '0'} ${labels.unit}`);
      console.log(`  Partial: ${lineWithData.counted_display_partial_units || '0'} ${labels.servingUnit}`);
      console.log(`  Value: €${parseFloat(lineWithData.counted_value || 0).toFixed(2)}`);
      
      console.log('\n⚠️ VARIANCE (should show but MISSING):');
      console.log(`  Full: ${lineWithData.variance_display_full_units || '0'} ${labels.unit}`);
      console.log(`  Partial: ${lineWithData.variance_display_partial_units || '0'} ${labels.servingUnit}`);
      console.log(`  Value: €${parseFloat(lineWithData.variance_value || 0).toFixed(2)}`);
      
      console.log('\n📊 MOVEMENTS (should show but MISSING):');
      console.log(`  Purchases: ${parseFloat(lineWithData.purchases || 0).toFixed(2)}`);
      console.log(`  Sales: ${parseFloat(lineWithData.sales || 0).toFixed(2)}`);
      console.log(`  Waste: ${parseFloat(lineWithData.waste || 0).toFixed(2)}`);
      console.log(`  Transfers In: ${parseFloat(lineWithData.transfers_in || 0).toFixed(2)}`);
      console.log(`  Transfers Out: ${parseFloat(lineWithData.transfers_out || 0).toFixed(2)}`);
      console.log('========================================\n');
    }
  }, [lines]);

  // Group lines by category
  const groupedLines = lines.reduce((acc, line) => {
    const cat = line.category_name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(line);
    return acc;
  }, {});

  // Get or initialize input values for a specific line
  const getLineInputs = (lineId, line) => {
    // If we have local state, use it (user has started editing)
    if (lineInputs[lineId]) {
      return lineInputs[lineId];
    }
    
    // Otherwise, initialize from line data (not yet edited)
    return {
      fullUnits: line.counted_full_units !== null && line.counted_full_units !== undefined ? line.counted_full_units : '',
      partialUnits: line.counted_partial_units !== null && line.counted_partial_units !== undefined ? line.counted_partial_units : '',
      salesQuantity: line.sales_quantity !== null && line.sales_quantity !== undefined ? line.sales_quantity : ''
    };
  };

  // Update input value for a specific line
  const updateLineInput = (lineId, field, value) => {
    setLineInputs(prev => {
      const current = prev[lineId] || {};
      return {
        ...prev,
        [lineId]: {
          fullUnits: current.fullUnits || '',
          partialUnits: current.partialUnits || '',
          salesQuantity: current.salesQuantity || '',
          [field]: value
        }
      };
    });
  };

  const validateInputs = (line, inputs) => {
    const errors = {};
    const full = parseFloat(inputs.fullUnits) || 0;
    const partial = parseFloat(inputs.partialUnits) || 0;
    const sales = inputs.salesQuantity ? parseFloat(inputs.salesQuantity) : null;
    const categoryCode = line.category_code;
    const size = line.item_size;
    const uom = parseFloat(line.item_uom || line.uom || 1);

    // Validate full_units >= 0
    if (full < 0) {
      errors.fullUnits = 'Must be 0 or greater';
    }

    // Category-specific partial units validation
    if (partial < 0) {
      errors.partialUnits = 'Must be 0 or greater';
    } else {
      // Bottled Beer (B) with Doz size: partial units must be whole numbers 0-11
      if (categoryCode === 'B' && size === 'Doz') {
        if (!Number.isInteger(partial)) {
          errors.partialUnits = 'Must be a whole number (0-11 bottles)';
        } else if (partial > 11) {
          errors.partialUnits = 'Must be 0-11 (bottles in a case of 12)';
        }
      }
      
      // Mixers (M) with Doz size: partial units must be whole numbers 0-11
      else if (categoryCode === 'M' && size === 'Doz') {
        if (!Number.isInteger(partial)) {
          errors.partialUnits = 'Must be a whole number (0-11 bottles)';
        } else if (partial > 11) {
          errors.partialUnits = 'Must be 0-11 (bottles in a dozen)';
        }
      }
      
      // Draught Beer (D): partial units must be 0 to (UOM - 0.01) with 2 decimals
      else if (categoryCode === 'D') {
        const maxPartial = uom - 0.01;
        if (partial >= uom) {
          errors.partialUnits = `Must be less than ${uom.toFixed(0)} (0-${maxPartial.toFixed(2)} pints)`;
        }
        // Check if it has more than 2 decimal places
        const decimalPlaces = (partial.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.partialUnits = 'Maximum 2 decimal places for pints';
        }
      }
      
      // Spirits (S) and Wine (W): partial units must be 0.00-0.99 with 2 decimals
      else if (categoryCode === 'S' || categoryCode === 'W') {
        if (partial >= 1.0) {
          errors.partialUnits = 'Must be less than 1.0 (0.00-0.99 fractional)';
        }
        // Check if it has more than 2 decimal places
        const decimalPlaces = (partial.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.partialUnits = 'Maximum 2 decimal places';
        }
      }
      
      // Mixers (M) without Doz size: same as spirits/wine (0.00-0.99)
      else if (categoryCode === 'M') {
        if (partial >= 1.0) {
          errors.partialUnits = 'Must be less than 1.0 (0.00-0.99 fractional)';
        }
        const decimalPlaces = (partial.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.partialUnits = 'Maximum 2 decimal places';
        }
      }
    }

    // Validate sales_quantity >= 0 or null
    if (sales !== null && sales < 0) {
      errors.salesQuantity = 'Must be 0 or greater';
    }

    return errors;
  };

  const handleSave = (lineId, line) => {
    const inputs = getLineInputs(lineId, line);
    const errors = validateInputs(line, inputs);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors({ [lineId]: errors });
      return;
    }

    const full = parseFloat(inputs.fullUnits) || 0;
    const partial = parseFloat(inputs.partialUnits) || 0;
    const sales = inputs.salesQuantity ? parseFloat(inputs.salesQuantity) : null;

    onUpdateLine(lineId, full, partial, sales);
    
    // Clear validation errors for this line
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated[lineId];
      return updated;
    });
  };

  const handleClear = (lineId) => {
    setLineInputs(prev => {
      const updated = { ...prev };
      delete updated[lineId];
      return updated;
    });
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated[lineId];
      return updated;
    });
  };

  return (
    <>
      {Object.entries(groupedLines).map(([categoryName, categoryLines]) => (
        <Card key={categoryName} className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">{categoryName}</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th rowSpan="2">SKU</th>
                    <th rowSpan="2">Name</th>
                    <th rowSpan="2">Category</th>
                    <th rowSpan="2">Size</th>
                    <th rowSpan="2" className="text-center">UOM</th>
                    <th rowSpan="2" className="text-center bg-info-subtle">
                      Opening Stock<br />
                      <small>(Previous Period)</small>
                    </th>
                    <th colSpan="6" className="text-center bg-light">
                      <strong>Movements</strong><br />
                      <small className="text-muted">(Period Activity)</small>
                    </th>
                    <th rowSpan="2" className="text-center bg-warning-subtle">
                      Expected Stock<br />
                      <small>(After Movements)</small>
                    </th>
                    <th rowSpan="2" className="text-start bg-success-subtle"><small>Counted<br />Full</small></th>
                    <th rowSpan="2" className="text-start bg-success-subtle"><small>Counted<br />Partial</small></th>
                    <th rowSpan="2" className="text-start bg-success-subtle"><small>Sales<br />Qty</small></th>
                    <th rowSpan="2" className="text-center bg-info-subtle">
                      <small>Expected<br />Sales<br />(€)</small>
                    </th>
                    <th rowSpan="2" className="text-center bg-danger-subtle">
                      Variance<br />
                      <small>(Counted - Expected)</small>
                    </th>
                    {!isLocked && <th rowSpan="2">Actions</th>}
                  </tr>
                  <tr>
                    <th className="text-center bg-success-subtle">
                      <small>Purchases</small>
                    </th>
                    <th className="text-center bg-danger-subtle">
                      <small>Sales</small>
                    </th>
                    <th className="text-center bg-danger-subtle">
                      <small>Waste</small>
                    </th>
                    <th className="text-center bg-info-subtle">
                      <small>Transfer In</small>
                    </th>
                    <th className="text-center bg-warning-subtle">
                      <small>Transfer Out</small>
                    </th>
                    <th className="text-center bg-secondary-subtle">
                      <small>Adjustments</small>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryLines.map(line => {
                    // UOM might be in the item object or directly on the line
                    const uom = parseFloat(line.item_uom || line.uom || 1);
                    
                    return (
                      <tr key={line.id}>
                        <td><code className="small">{line.item_sku}</code></td>
                        <td>
                          <strong>{line.item_name}</strong>
                        </td>
                        <td>
                          <Badge bg="secondary" className="small">{categoryName}</Badge>
                        </td>
                        <td>
                          {line.item_size ? (
                            <small className="text-muted">{line.item_size}</small>
                          ) : (
                            <small className="text-muted">-</small>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg="light" text="dark" className="small">
                            {uom.toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Opening Stock Section - Using API display fields */}
                        <td className="text-end bg-info-subtle">
                          <div className="d-flex flex-column align-items-end gap-1">
                            {/* Full Units */}
                            <div>
                              <strong className="text-primary">
                                {line.opening_display_full_units || '0'}
                              </strong>
                              <small className="text-muted ms-1">
                                {(() => {
                                  const labels = getCountingLabels(line.category_code, line.item_size);
                                  return labels.unit;
                                })()}
                              </small>
                            </div>
                            {/* Partial Units */}
                            <div>
                              <strong className="text-info">
                                {line.opening_display_partial_units || '0'}
                              </strong>
                              <small className="text-muted ms-1">
                                {(() => {
                                  const labels = getCountingLabels(line.category_code, line.item_size);
                                  return labels.servingUnit;
                                })()}
                              </small>
                            </div>
                            {/* Raw Servings */}
                            <small className="text-muted">
                              {parseFloat(line.opening_qty || 0).toFixed(2)} servings
                            </small>
                          </div>
                        </td>
                        
                        {/* Movement Columns */}
                        {/* Purchases */}
                        <td className="text-center bg-success-subtle">
                          <Badge bg={parseFloat(line.purchases || 0) > 0 ? "success" : "light"} text={parseFloat(line.purchases || 0) > 0 ? "light" : "muted"}>
                            +{parseFloat(line.purchases || 0).toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Sales */}
                        <td className="text-center bg-danger-subtle">
                          <Badge bg={parseFloat(line.sales || 0) > 0 ? "danger" : "light"} text={parseFloat(line.sales || 0) > 0 ? "light" : "muted"}>
                            -{parseFloat(line.sales || 0).toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Waste */}
                        <td className="text-center bg-danger-subtle">
                          <Badge bg={parseFloat(line.waste || 0) > 0 ? "danger" : "light"} text={parseFloat(line.waste || 0) > 0 ? "light" : "muted"}>
                            -{parseFloat(line.waste || 0).toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Transfers In */}
                        <td className="text-center bg-info-subtle">
                          <Badge bg={parseFloat(line.transfers_in || 0) > 0 ? "info" : "light"} text={parseFloat(line.transfers_in || 0) > 0 ? "light" : "muted"}>
                            +{parseFloat(line.transfers_in || 0).toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Transfers Out */}
                        <td className="text-center bg-warning-subtle">
                          <Badge bg={parseFloat(line.transfers_out || 0) > 0 ? "warning" : "light"} text={parseFloat(line.transfers_out || 0) > 0 ? "dark" : "muted"}>
                            -{parseFloat(line.transfers_out || 0).toFixed(0)}
                          </Badge>
                        </td>
                        
                        {/* Adjustments */}
                        <td className="text-center bg-secondary-subtle">
                          {(() => {
                            const adj = parseFloat(line.adjustments || 0);
                            const isPositive = adj > 0;
                            const isNegative = adj < 0;
                            return (
                              <Badge 
                                bg={adj !== 0 ? "secondary" : "light"} 
                                text={adj !== 0 ? "light" : "muted"}
                              >
                                {isPositive ? '+' : ''}{adj.toFixed(0)}
                              </Badge>
                            );
                          })()}
                        </td>
                        
                        {/* Expected Stock Section - Using API display fields */}
                        <td className="text-end bg-warning-subtle">
                          <div className="d-flex flex-column align-items-end gap-1">
                            {/* Full Units */}
                            <div>
                              <strong className="text-warning">
                                {line.expected_display_full_units || '0'}
                              </strong>
                              <small className="text-muted ms-1">
                                {(() => {
                                  const labels = getCountingLabels(line.category_code, line.item_size);
                                  return labels.unit;
                                })()}
                              </small>
                            </div>
                            {/* Partial Units */}
                            <div>
                              <strong className="text-warning">
                                {line.expected_display_partial_units || '0'}
                              </strong>
                              <small className="text-muted ms-1">
                                {(() => {
                                  const labels = getCountingLabels(line.category_code, line.item_size);
                                  return labels.servingUnit;
                                })()}
                              </small>
                            </div>
                            {/* Expected Value */}
                            <small className="text-muted">
                              €{parseFloat(line.expected_value || 0).toFixed(2)}
                            </small>
                          </div>
                        </td>
                        
                        {/* Counted Stock Section */}
                        <td className="text-start">
                          {(() => {
                            const labels = getCountingLabels(line.category_code, line.item_size);
                            const inputs = getLineInputs(line.id, line);
                            const lineErrors = validationErrors[line.id] || {};
                            
                            return (
                              <div>
                                <Form.Control
                                  type={labels.fullInputType}
                                  step={labels.fullStep}
                                  size="sm"
                                  value={inputs.fullUnits}
                                  onChange={(e) => updateLineInput(line.id, 'fullUnits', e.target.value)}
                                  onFocus={(e) => {
                                    e.target.classList.add('bg-info-subtle');
                                    if (e.target.value === '0') e.target.value = '';
                                  }}
                                  onBlur={(e) => {
                                    e.target.classList.remove('bg-info-subtle');
                                    if (e.target.value === '') updateLineInput(line.id, 'fullUnits', '0');
                                  }}
                                  className="bg-light"
                                  style={{ width: '80px' }}
                                  placeholder="0.00"
                                  isInvalid={!!lineErrors.fullUnits}
                                  disabled={isLocked}
                                />
                                {lineErrors.fullUnits && (
                                  <small className="text-danger d-block">{lineErrors.fullUnits}</small>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="text-start">
                          {(() => {
                            const labels = getCountingLabels(line.category_code, line.item_size);
                            const inputs = getLineInputs(line.id, line);
                            const lineErrors = validationErrors[line.id] || {};
                            
                            return (
                              <div>
                                <Form.Control
                                  type={labels.partialInputType}
                                  step={labels.partialStep}
                                  size="sm"
                                  value={inputs.partialUnits}
                                  onChange={(e) => updateLineInput(line.id, 'partialUnits', e.target.value)}
                                  onFocus={(e) => {
                                    e.target.classList.add('bg-info-subtle');
                                    if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                                  }}
                                  onBlur={(e) => {
                                    e.target.classList.remove('bg-info-subtle');
                                    if (e.target.value === '') updateLineInput(line.id, 'partialUnits', '0');
                                  }}
                                  className="bg-light"
                                  style={{ width: '80px' }}
                                  placeholder="0.00"
                                  isInvalid={!!lineErrors.partialUnits}
                                  disabled={isLocked}
                                />
                                {lineErrors.partialUnits && (
                                  <small className="text-danger d-block">{lineErrors.partialUnits}</small>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="text-start">
                          {(() => {
                            const inputs = getLineInputs(line.id, line);
                            const lineErrors = validationErrors[line.id] || {};
                            
                            return (
                              <div>
                                <Form.Control
                                  type="number"
                                  step="0.01"
                                  size="sm"
                                  value={inputs.salesQuantity}
                                  onChange={(e) => updateLineInput(line.id, 'salesQuantity', e.target.value)}
                                  onFocus={(e) => {
                                    e.target.classList.add('bg-info-subtle');
                                    if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                                  }}
                                  onBlur={(e) => {
                                    e.target.classList.remove('bg-info-subtle');
                                    if (e.target.value === '') updateLineInput(line.id, 'salesQuantity', '0');
                                  }}
                                  className="bg-light"
                                  style={{ width: '80px' }}
                                  placeholder="0.00"
                                  isInvalid={!!lineErrors.salesQuantity}
                                  disabled={isLocked}
                                />
                                {lineErrors.salesQuantity && (
                                  <small className="text-danger d-block">{lineErrors.salesQuantity}</small>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        
                        {/* Expected Sales Column */}
                        <td className="text-center bg-info-subtle">
                          <small className="text-muted">
                            €{parseFloat(line.sales || 0).toFixed(2)}
                          </small>
                        </td>
                        
                        {/* Variance Section - Calculated optimistically from inputs */}
                        <td className="text-end">
                          {(() => {
                            const inputs = getLineInputs(line.id, line);
                            const labels = getCountingLabels(line.category_code, line.item_size);
                            
                            // Check if user has entered any counting values
                            const hasInput = inputs.fullUnits !== '' || inputs.partialUnits !== '' || inputs.salesQuantity !== '';
                            
                            if (!hasInput) {
                              return (
                                <div className="d-flex flex-column align-items-end gap-1 p-2">
                                  <span className="text-muted">-</span>
                                </div>
                              );
                            }
                            
                            // Calculate variance optimistically: Counted - Expected
                            const countedFull = parseFloat(inputs.fullUnits) || 0;
                            const countedPartial = parseFloat(inputs.partialUnits) || 0;
                            const expectedFull = parseFloat(line.expected_display_full_units) || 0;
                            const expectedPartial = parseFloat(line.expected_display_partial_units) || 0;
                            
                            // Calculate variance in full and partial units
                            const varianceFull = countedFull - expectedFull;
                            const variancePartial = countedPartial - expectedPartial;
                            
                            // Use API variance value if available, otherwise estimate from counted vs expected
                            const varianceValue = line.variance_value ? parseFloat(line.variance_value) : 
                                                 (parseFloat(line.counted_value || 0) - parseFloat(line.expected_value || 0));
                            
                            const isSignificant = Math.abs(varianceValue) > 10;
                            const isShortage = varianceValue < 0 || varianceFull < 0;
                            const isSurplus = varianceValue > 0 || varianceFull > 0;
                            
                            // Color coding: red for shortage, green for surplus, muted for zero
                            const bgClass = isShortage ? 'bg-danger-subtle' : isSurplus ? 'bg-success-subtle' : '';
                            const textClass = isShortage ? 'text-danger' : isSurplus ? 'text-success' : 'text-muted';
                            const strongClass = isSignificant ? 'fw-bold' : '';
                            
                            return (
                              <div className={`d-flex flex-column align-items-end gap-1 p-2 rounded ${bgClass}`}>
                                {/* Full Units Variance */}
                                <div>
                                  <strong className={`${textClass} ${strongClass}`}>
                                    {varianceFull > 0 ? '+' : ''}{varianceFull.toFixed(0)}
                                  </strong>
                                  <small className="text-muted ms-1">
                                    {labels.unit}
                                  </small>
                                </div>
                                {/* Partial Units Variance */}
                                <div>
                                  <strong className={`${textClass} ${strongClass}`}>
                                    {variancePartial > 0 ? '+' : ''}{variancePartial.toFixed(2)}
                                  </strong>
                                  <small className="text-muted ms-1">
                                    {labels.servingUnit}
                                  </small>
                                </div>
                                {/* Variance Value */}
                                <small className={`${textClass} ${strongClass}`}>
                                  {varianceValue >= 0 ? '+' : '-'}€{Math.abs(varianceValue).toFixed(2)}
                                  {isSignificant && <span className="ms-1">⚠️</span>}
                                </small>
                              </div>
                            );
                          })()}
                        </td>
                        
                        {!isLocked && (
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Button 
                                variant="success" 
                                size="sm" 
                                onClick={() => handleSave(line.id, line)}
                                title="Save"
                              >
                                <FaCheck />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => handleClear(line.id)}
                                title="Clear"
                              >
                                ×
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td colSpan="5" className="text-end">Category Summary:</td>
                    <td className="text-end">
                      <Badge bg="info">
                        {categoryLines.length} Items
                      </Badge>
                    </td>
                    <td colSpan="2" className="text-end">
                      <Badge bg="success">
                        Counted: {categoryLines.filter(l => l.counted_qty && l.counted_qty !== '0.00').length}/{categoryLines.length}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <Badge bg="primary">
                        Sales: {categoryLines.reduce((sum, l) => sum + parseFloat(l.sales_quantity || 0), 0).toFixed(0)}
                      </Badge>
                    </td>
                    {!isLocked && <td></td>}
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card.Body>
        </Card>
      ))}
    </>
  );
};
