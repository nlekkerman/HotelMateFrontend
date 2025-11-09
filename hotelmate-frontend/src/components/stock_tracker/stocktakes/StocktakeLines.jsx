/**
 * StocktakeLines Component
 * 
 * Displays and manages stocktake line items with counting, purchases, and waste tracking.
 * 
 * IMPORTANT: This component implements the exact calculations used by the backend.
 * See FRONTEND_STOCKTAKE_CALCULATIONS.md for detailed documentation.
 * 
 * Key Features:
 * - Category-specific validation (B and M-Doz use whole numbers, others allow 2 decimals)
 * - Correct API endpoints: /api/stock_tracker/{hotel}/stocktake-lines/...
 * - Proper calculation formulas: expected = opening + purchases - waste
 * - Optimistic updates with backend validation
 * - Real-time variance preview with accurate calculations
 * 
 * Calculation Functions (from stocktakeCalculations.js):
 * - calculateCountedQty: (full_units × uom) + partial_units
 * - calculateExpectedQty: opening + purchases - waste
 * - calculateVariance: counted - expected
 * 
 * Notes:
 * - All backend numeric fields come as strings and must be parseFloat'd
 * - Sales are tracked separately, not in expected calculation
 * - Variance: positive = surplus, negative = shortage
 */
import React, { useState } from 'react';
import { Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import { getCountingLabels } from '../utils/categoryHelpers';
import { CategoryTotalsRow } from './CategoryTotalsRow';
import { useCategoryTotals } from '../hooks/useCategoryTotals';
import { MovementsList } from './MovementsList';
import api from '@/services/api';
import {
  calculateCountedQty,
  calculateExpectedQty,
  calculateVariance,
  calculateValues,
  convertToDisplayUnits,
  validatePartialUnits,
  formatUserInput,
  getInputConfig,
  optimisticUpdateCount
} from '../utils/stocktakeCalculations';

export const StocktakeLines = ({ lines = [], isLocked, onUpdateLine, onLineUpdated, hotelSlug, stocktakeId }) => {
  const [lineInputs, setLineInputs] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [showPurchases, setShowPurchases] = useState({});
  const [showWaste, setShowWaste] = useState({});

  const { categoryTotals, loading: totalsLoading, refetch: refetchTotals } =
    useCategoryTotals(hotelSlug, stocktakeId);

  // Group lines by category name
  const groupedLines = lines.reduce((acc, line) => {
    const cat = line.category_name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(line);
    return acc;
  }, {});

  const getLineInputs = (lineId, line) => {
    if (lineInputs[lineId]) return lineInputs[lineId];
    return {
      fullUnits:
        line.counted_full_units !== null && line.counted_full_units !== undefined
          ? line.counted_full_units
          : '',
      partialUnits:
        line.counted_partial_units !== null && line.counted_partial_units !== undefined
          ? line.counted_partial_units
          : '',
      wasteQuantity: '',
      purchasesQty: '',
    };
  };

  const updateLineInput = (lineId, field, value) => {
    setLineInputs((prev) => {
      const current = prev[lineId] || {
        fullUnits: '',
        partialUnits: '',
        wasteQuantity: '',
        purchasesQty: '',
      };
      return {
        ...prev,
        [lineId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const validateInputs = (line, inputs) => {
    const errors = {};
    const categoryCode = line.category_code;
    const size = line.item_size;
    const uom = parseFloat(line.item_uom || line.uom || 1);
    
    // Get input config for this category
    const config = getInputConfig({ category_code: categoryCode, item_size: size });
    
    // Validate counted full units (always whole numbers)
    if (inputs.fullUnits !== '') {
      const full = parseInt(inputs.fullUnits, 10);
      if (isNaN(full)) {
        errors.fullUnits = 'Please enter a valid whole number.';
      } else if (full < 0) {
        errors.fullUnits = 'Must be 0 or greater';
      }
    }
    
    // Validate counted partial units (category-specific decimal rules)
    if (inputs.partialUnits !== '') {
      const partial = parseFloat(inputs.partialUnits);
      
      if (isNaN(partial)) {
        errors.partialUnits = 'Please enter a valid number.';
      } else if (partial < 0) {
        errors.partialUnits = 'Must be 0 or greater';
      } else {
        // Category-specific validation
        if (categoryCode === 'B') {
          // Bottled Beer - whole numbers only, max = uom - 1
          if (partial !== Math.round(partial)) {
            errors.partialUnits = 'Bottled beer must be whole bottles (no decimals)';
          } else if (partial >= uom) {
            errors.partialUnits = `Must be 0–${uom - 1} bottles`;
          }
        } else if (categoryCode === 'M' && size?.includes('Doz')) {
          // Dozen minerals - whole numbers only, max 11
          if (partial !== Math.round(partial)) {
            errors.partialUnits = 'Dozen items must be whole numbers (no decimals)';
          } else if (partial > 11) {
            errors.partialUnits = 'Must be 0–11 bottles';
          }
        } else {
          // D, S, W, M (non-dozen) - max 2 decimals
          const rounded = parseFloat(partial.toFixed(2));
          if (Math.abs(partial - rounded) > 0.001) {
            errors.partialUnits = 'Maximum 2 decimal places allowed';
          }
          if (partial >= uom) {
            errors.partialUnits = `Must be less than ${uom}`;
          }
        }
      }
    }
    
    // Validate waste (always allows 2 decimals)
    if (inputs.wasteQuantity !== '' && isNaN(parseFloat(inputs.wasteQuantity))) {
      errors.wasteQuantity = 'Please enter a valid number.';
    } else {
      const waste = inputs.wasteQuantity !== '' ? parseFloat(inputs.wasteQuantity) : null;
      if (waste !== null && waste < 0) errors.wasteQuantity = 'Must be 0 or greater';
    }
    
    // Validate purchases (always allows 2 decimals)
    if (inputs.purchasesQty !== '' && isNaN(parseFloat(inputs.purchasesQty))) {
      errors.purchasesQty = 'Please enter a valid number.';
    } else {
      const purchase = inputs.purchasesQty !== '' ? parseFloat(inputs.purchasesQty) : null;
      if (purchase !== null && purchase < 0) errors.purchasesQty = 'Must be 0 or greater';
    }
    
    return errors;
  };

  const handleClear = (lineId, line) => {
    setLineInputs((prev) => ({
      ...prev,
      [lineId]: {
        fullUnits:
          line.counted_full_units !== null && line.counted_full_units !== undefined
            ? line.counted_full_units
            : '',
        partialUnits:
          line.counted_partial_units !== null && line.counted_partial_units !== undefined
            ? line.counted_partial_units
            : '',
        wasteQuantity: '',
        purchasesQty: '',
      },
    }));
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });
    setShowPurchases((p) => ({ ...p, [lineId]: false }));
    setShowWaste((p) => ({ ...p, [lineId]: false }));
  };

  /**
   * Handles saving counted quantities (cases and bottles).
   * Backend expects: { counted_full_units, counted_partial_units }
   * NO optimistic updates - update from backend response only
   */
  const handleSaveCount = async (lineId, line) => {
    console.log('💾 SAVE COUNT - Line:', lineId);
    const inputs = getLineInputs(lineId, line);
    const errors = validateInputs(line, inputs);
    
    if (Object.keys(errors).length) {
      setValidationErrors({ [lineId]: errors });
      return;
    }
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    // Parse inputs with category-specific validation
    let fullUnits = parseInt(inputs.fullUnits, 10);
    if (isNaN(fullUnits) || fullUnits < 0) fullUnits = 0;
    
    let partialUnits = parseFloat(inputs.partialUnits);
    if (isNaN(partialUnits) || partialUnits < 0) partialUnits = 0;
    
    // Apply category-specific rounding
    partialUnits = validatePartialUnits(partialUnits, line.category_code, line.item_size);

    try {
      const payload = {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits,
      };
      
      console.log('🧮 Count Payload:', payload);

      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/
      const response = await api.patch(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/`,
        payload
      );

      console.log('✅ Count saved - Updating UI from backend:', {
        counted_full_units: response.data?.counted_full_units,
        counted_partial_units: response.data?.counted_partial_units,
        counted_qty: response.data?.counted_qty,
        variance_qty: response.data?.variance_qty
      });

      // Update with authoritative backend data (no optimistic update)
      if (response.data && typeof onLineUpdated === 'function') {
        onLineUpdated(response.data);
      }
      
      // Refetch totals to update category summaries
      refetchTotals?.();
    } catch (err) {
      console.error('❌ Save count failed:', err);
      console.error('Error details:', err.response?.data);
      
      setValidationErrors({
        [lineId]: { general: `Failed to save count: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  /**
   * Handles saving purchases.
   * Backend expects: { movement_type: 'PURCHASE', quantity, notes }
   */
  const handleSavePurchases = async (lineId, line) => {
    console.log('💾 SAVE PURCHASES - Line:', lineId);
    const inputs = getLineInputs(lineId, line);
    
    if (!inputs.purchasesQty || inputs.purchasesQty === '') {
      setValidationErrors({ [lineId]: { purchasesQty: 'Please enter a purchases quantity' } });
      return;
    }

    const purchasesQty = parseFloat(inputs.purchasesQty);
    if (isNaN(purchasesQty) || purchasesQty <= 0) {
      setValidationErrors({ [lineId]: { purchasesQty: 'Must be a valid number greater than 0' } });
      return;
    }

    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const payload = {
        movement_type: 'PURCHASE',
        quantity: purchasesQty,
        notes: 'Added via stocktake',
      };
      
      console.log('🧮 Purchases Payload:', payload);

      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/add-movement/
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
        payload
      );

      // Backend returns updated line in response.data.line
      const updatedLine = response.data.line || response.data;
      
      console.log('✅ Purchases saved - Full backend response:', response.data);
      console.log('✅ Updated line from backend:', {
        id: updatedLine?.id,
        purchases: updatedLine?.purchases,
        expected_qty: updatedLine?.expected_qty,
        variance_qty: updatedLine?.variance_qty,
        all_line_keys: Object.keys(updatedLine || {}),
        full_line: updatedLine
      });
      
      // Update UI silently with backend data (no optimistic update)
      if (updatedLine && typeof onLineUpdated === 'function') {
        console.log('🔄 Calling onLineUpdated with updated line');
        onLineUpdated(updatedLine);
      } else {
        console.warn('⚠️ No updatedLine or onLineUpdated callback missing');
      }

      // Clear input after successful save
      setLineInputs((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          purchasesQty: '',
        },
      }));
      
      // Refetch totals to update category summaries
      refetchTotals?.();
    } catch (err) {
      console.error('❌ Save purchases failed:', err);
      console.error('Error details:', err.response?.data);
      
      setValidationErrors({
        [lineId]: { purchasesQty: `Failed to save: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  /**
   * Handles saving waste.
   * Backend expects: { movement_type: 'WASTE', quantity, notes }
   */
  const handleSaveWaste = async (lineId, line) => {
    console.log('💾 SAVE WASTE - Line:', lineId);
    const inputs = getLineInputs(lineId, line);
    
    if (!inputs.wasteQuantity || inputs.wasteQuantity === '') {
      setValidationErrors({ [lineId]: { wasteQuantity: 'Please enter a waste quantity' } });
      return;
    }

    const wasteQty = parseFloat(inputs.wasteQuantity);
    if (isNaN(wasteQty) || wasteQty <= 0) {
      setValidationErrors({ [lineId]: { wasteQuantity: 'Must be a valid number greater than 0' } });
      return;
    }

    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const payload = {
        movement_type: 'WASTE',
        quantity: wasteQty,
        notes: 'Added via stocktake',
      };
      
      console.log('🧮 Waste Payload:', payload);

      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/add-movement/
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
        payload
      );

      // Backend returns updated line in response.data.line
      const updatedLine = response.data.line || response.data;
      
      console.log('✅ Waste saved - Updating UI from backend:', {
        waste: updatedLine?.waste,
        expected_qty: updatedLine?.expected_qty,
        variance_qty: updatedLine?.variance_qty
      });
      
      // Update UI silently with backend data (no optimistic update)
      if (updatedLine && typeof onLineUpdated === 'function') {
        onLineUpdated(updatedLine);
      }

      // Clear input after successful save
      setLineInputs((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          wasteQuantity: '',
        },
      }));
      
      // Refetch totals to update category summaries
      refetchTotals?.();
    } catch (err) {
      console.error('❌ Save waste failed:', err);
      console.error('Error details:', err.response?.data);
      
      setValidationErrors({
        [lineId]: { wasteQuantity: `Failed to save: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  const renderLineRow = (line) => {
    const labels = getCountingLabels(line.category_code, line.item_size);
    const uom = parseFloat(line.item_uom || line.uom || 1);
    const inputs = getLineInputs(line.id, line);
    const lineErrors = validationErrors[line.id] || {};
    const cumulativePurchases = parseFloat(line.purchases || 0);
    const cumulativeWaste = parseFloat(line.waste || 0);
    
    // Get input configuration for this category
    const inputConfig = getInputConfig({ category_code: line.category_code, item_size: line.item_size });

    // NO OPTIMISTIC UPDATES - Only use backend values for variance display
    // Use the saved values from backend, not input values
    const varianceQty = parseFloat(line.variance_qty) || 0;
    const varianceValue = parseFloat(line.variance_value) || 0;
    
    // Convert to display units for saved variance
    const varianceDisplay = convertToDisplayUnits(Math.abs(varianceQty), line);
    
    const isShortage = varianceValue < 0;
    const isSurplus = varianceValue > 0;
    const isSignificant = Math.abs(varianceValue) > 10;
    const bgClass = isShortage ? 'bg-danger-subtle' : isSurplus ? 'bg-success-subtle' : '';
    const textClass = isShortage ? 'text-danger' : isSurplus ? 'text-success' : 'text-muted';
    const strongClass = isSignificant ? 'fw-bold' : '';

    return (
      <tr key={line.id}>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <code className="small">{line.item_sku}</code>
        </td>
        <td style={{ borderRight: '1px solid #dee2e6' }}>
          <strong>{line.item_name}</strong>
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="secondary" className="small">
            {line.category_name || 'Uncategorized'}
          </Badge>
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          {line.item_size ? (
            <small className="text-muted">{line.item_size}</small>
          ) : (
            <small className="text-muted">-</small>
          )}
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="light" text="dark" className="small">
            {uom.toFixed(0)}
          </Badge>
        </td>

        {/* Opening */}
        <td className="text-center bg-info-subtle" style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-1">
            <div>
              <strong className="text-primary">{line.opening_display_full_units || '0'}</strong>
              <small className="text-muted ms-1">{labels.unit}</small>
            </div>
            <div>
              <strong className="text-info">{line.opening_display_partial_units || '0'}</strong>
              <small className="text-muted ms-1">{labels.servingUnit}</small>
            </div>
            <small className="text-muted">
              {parseFloat(line.opening_qty || 0).toFixed(2)} servings
            </small>
          </div>
        </td>

        {/* Purchases */}
        <td className="text-center bg-white" style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ maxWidth: 180 }}
            >
              <div className="d-flex align-items-center justify-content-center w-100">
                <div
                  className={`fw-bold ${
                    cumulativePurchases > 0 ? 'text-success' : 'text-muted'
                  }`}
                  style={{ fontSize: '0.95rem', minWidth: 50, textAlign: 'center' }}
                  title="Total purchases"
                >
                  {cumulativePurchases.toFixed(2)}
                </div>
              </div>
              
              {/* Movement History Button */}
              <div className="mb-1" style={{ width: '100%' }}>
                <MovementsList
                  lineId={line.id}
                  hotelSlug={hotelSlug}
                  isLocked={isLocked}
                  onMovementDeleted={onLineUpdated}
                  itemName={line.item_name}
                  itemSku={line.item_sku}
                />
              </div>
              
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                Add Purchase ({labels.servingUnit})
              </small>
              <Form.Control
                type="number"
                step="0.01"
                size="sm"
                value={inputs.purchasesQty}
                onChange={(e) => updateLineInput(line.id, 'purchasesQty', e.target.value)}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  if (e.target.value === '') updateLineInput(line.id, 'purchasesQty', '0');
                }}
                className="bg-light text-center mb-2"
                style={{ width: '100%' }}
                placeholder="0.00"
                isInvalid={!!lineErrors.purchasesQty}
                disabled={isLocked}
              />
              {lineErrors.purchasesQty && (
                <small className="text-danger d-block mb-1">{lineErrors.purchasesQty}</small>
              )}
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSavePurchases(line.id, line)}
                title="Save Purchases"
                style={{ fontSize: '0.8rem', padding: '2px 10px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
            </div>
          </div>
        </td>

        {/* Waste */}
        <td className="text-center" style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ maxWidth: 180 }}
            >
              <div className="text-center">
                <div
                  className={`fw-bold ${cumulativeWaste > 0 ? 'text-danger' : 'text-muted'}`}
                  style={{ fontSize: '0.95rem' }}
                  title="Total waste"
                >
                  {cumulativeWaste.toFixed(2)}
                </div>
              </div>
              
              {/* Movement History Button */}
              <div className="mb-1" style={{ width: '100%' }}>
                <MovementsList
                  lineId={line.id}
                  hotelSlug={hotelSlug}
                  isLocked={isLocked}
                  onMovementDeleted={onLineUpdated}
                  itemName={line.item_name}
                  itemSku={line.item_sku}
                />
              </div>
              
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                Add Waste ({labels.servingUnit})
              </small>
              <Form.Control
                type="number"
                step="0.01"
                size="sm"
                value={inputs.wasteQuantity}
                onChange={(e) => updateLineInput(line.id, 'wasteQuantity', e.target.value)}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  if (e.target.value === '') updateLineInput(line.id, 'wasteQuantity', '0');
                }}
                className="bg-light text-center mb-2"
                style={{ width: '100%' }}
                placeholder="0.00"
                isInvalid={!!lineErrors.wasteQuantity}
                disabled={isLocked}
              />
              {lineErrors.wasteQuantity && (
                <small className="text-danger d-block mb-1">{lineErrors.wasteQuantity}</small>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleSaveWaste(line.id, line)}
                title="Save Waste"
                style={{ fontSize: '0.8rem', padding: '2px 10px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
            </div>
          </div>
        </td>

        {/* Expected */}
        <td className="text-center bg-warning-subtle" style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-1">
            <div>
              <strong className="text-warning">{line.expected_display_full_units || '0'}</strong>
              <small className="text-muted ms-1">{labels.unit}</small>
            </div>
            <div>
              <strong className="text-warning">{line.expected_display_partial_units || '0'}</strong>
              <small className="text-muted ms-1">{labels.servingUnit}</small>
            </div>
            <small className="text-muted">€{parseFloat(line.expected_value || 0).toFixed(2)}</small>
          </div>
        </td>

        {/* Cases (full units) */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ maxWidth: 120 }}
            >
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>Counted {labels.unit}</small>
              <Form.Control
                type="number"
                step="1"
                min="0"
                size="sm"
                value={inputs.fullUnits}
                onChange={(e) => {
                  // Only allow integers for cases - block decimal input
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    updateLineInput(line.id, 'fullUnits', value);
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent decimal point, comma, and minus sign
                  if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  // Clear the input field visually - store original value
                  e.target.dataset.originalValue = e.target.value;
                  e.target.value = '';
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  // If field is empty (user didn't type anything), restore original value
                  if (e.target.value === '') {
                    const originalValue = e.target.dataset.originalValue || '0';
                    updateLineInput(line.id, 'fullUnits', originalValue);
                  }
                }}
                className="bg-light text-center"
                style={{ width: '100%' }}
                placeholder={labels.unit}
                isInvalid={!!lineErrors.fullUnits}
                disabled={isLocked}
              />
              {lineErrors.fullUnits && (
                <small className="text-danger d-block">{lineErrors.fullUnits}</small>
              )}
            </div>
          </div>
        </td>

        {/* Bottles (partial units) - category-specific formatting */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ maxWidth: 120 }}
            >
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>Counted {labels.servingUnit}</small>
              <Form.Control
                type="number"
                step={inputConfig.step}
                min="0"
                size="sm"
                value={inputs.partialUnits}
                onChange={(e) => updateLineInput(line.id, 'partialUnits', e.target.value)}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  // Clear the input field visually - store original value
                  e.target.dataset.originalValue = e.target.value;
                  e.target.value = '';
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  // If field is empty (user didn't type anything), restore original value
                  if (e.target.value === '') {
                    const originalValue = e.target.dataset.originalValue || '0';
                    updateLineInput(line.id, 'partialUnits', originalValue);
                  } else {
                    // Format based on category when user leaves field
                    const formatted = formatUserInput(e.target.value, line.category_code, line.item_size);
                    updateLineInput(line.id, 'partialUnits', formatted);
                  }
                }}
                className="bg-light text-center"
                style={{ width: '100%' }}
                placeholder={labels.servingUnit}
                isInvalid={!!lineErrors.partialUnits}
                disabled={isLocked}
              />
              {lineErrors.partialUnits && (
                <small className="text-danger d-block">{lineErrors.partialUnits}</small>
              )}
            </div>
          </div>
        </td>

        {/* Variance - Backend values only, NO optimistic preview */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          {!line.counted_full_units && !line.counted_partial_units ? (
            <div className="d-flex flex-column align-items-center gap-1 p-2">
              <span className="text-muted">-</span>
            </div>
          ) : (
            <div className={`d-flex flex-column align-items-center gap-1 p-2 rounded ${bgClass}`}>
              <div>
                <strong className={`${textClass} ${strongClass}`}>
                  {isShortage ? '-' : '+'}
                  {Math.abs(varianceDisplay.full)}
                </strong>
                <small className="text-muted ms-1">{labels.unit}</small>
              </div>
              <div>
                <strong className={`${textClass} ${strongClass}`}>
                  {isShortage ? '-' : '+'}
                  {varianceDisplay.partial.toFixed(varianceDisplay.decimals)}
                </strong>
                <small className="text-muted ms-1">{labels.servingUnit}</small>
              </div>
              <small className={`${textClass} ${strongClass}`}>
                {varianceValue >= 0 ? '+' : ''}€{varianceValue.toFixed(2)}
                {isSignificant && <span className="ms-1">⚠️</span>}
              </small>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                ({varianceQty >= 0 ? '+' : ''}{varianceQty.toFixed(2)} servings)
              </small>
            </div>
          )}
        </td>

        {/* Actions */}
        {!isLocked && (
          <td>
            <div className="btn-group btn-group-sm">
              <Button variant="success" size="sm" onClick={() => handleSaveCount(line.id, line)} title="Save Count">
                <FaCheck />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleClear(line.id, line)} title="Clear">
                Clear
              </Button>
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <>
      {Object.entries(groupedLines).map(([categoryName, catLines]) => {
        const categoryCode = catLines[0]?.category_code || '';
        const totals = categoryTotals?.[categoryCode] || null;

        return (
          <Card key={categoryName} className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{categoryName}</strong>{' '}
                <Badge bg="light" text="dark">
                  {catLines.length} items
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ borderRight: '1px solid #dee2e6' }}>SKU</th>
                      <th style={{ borderRight: '1px solid #dee2e6' }}>Name</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Cat</th>
                      <th style={{ borderRight: '1px solid #dee2e6' }}>Size</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>UOM</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Opening</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Purchases</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Waste</th>
                      <th className="text-end" style={{ borderRight: '1px solid #dee2e6' }}>Expected</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Counted Cases</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Counted Bottles</th>
                      <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Variance</th>
                      {!isLocked && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>{catLines.map((line) => renderLineRow(line))}</tbody>

                  <tfoot>
                    {totalsLoading ? (
                      <tr>
                        <td colSpan={!isLocked ? 12 : 11} className="text-center text-muted py-3">
                          <small>Loading category totals...</small>
                        </td>
                      </tr>
                    ) : totals ? (
                      <CategoryTotalsRow
                        categoryCode={categoryCode}
                        categoryName={categoryName}
                        totals={totals}
                        isLocked={isLocked}
                        onSaveManualValues={() => {}}
                      />
                    ) : null}
                  </tfoot>
                </Table>
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </>
  );
};
