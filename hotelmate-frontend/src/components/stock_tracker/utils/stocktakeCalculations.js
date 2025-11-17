/**
 * Stocktake Calculations Utility
 * 
 * These functions implement the exact formulas used by the backend.
 * See FRONTEND_STOCKTAKE_CALCULATIONS.md for detailed explanations.
 * 
 * CRITICAL: All backend decimal fields come as strings and must be parsed!
 */

/**
 * Calculate counted quantity in base units (servings)
 * Formula: counted_qty = (full_units × uom) + partial_units
 * 
 * @param {object} line - StocktakeLine object or inputs
 * @returns {number} Total counted quantity in servings
 */
export function calculateCountedQty(line) {
  const fullUnits = parseFloat(line.counted_full_units) || 0;
  const partialUnits = parseFloat(line.counted_partial_units) || 0;
  const uom = parseFloat(line.item_uom || line.uom || line.item?.uom) || 1;
  
  // counted_qty = (full_units × uom) + partial_units
  return (fullUnits * uom) + partialUnits;
}

/**
 * Calculate expected quantity in base units (servings)
 * Formula: expected_qty = opening + purchases - waste
 * 
 * NOTE: Sales are tracked separately in Sale model, not in this formula!
 * 
 * @param {object} line - StocktakeLine object with movement data
 * @returns {number} Expected quantity in servings
 */
export function calculateExpectedQty(line) {
  const opening = parseFloat(line.opening_qty) || 0;
  const purchases = parseFloat(line.purchases) || 0;
  const waste = parseFloat(line.waste) || 0;
  
  // Expected = Opening + Purchases - Waste
  return opening + purchases - waste;
}

/**
 * Calculate variance quantity
 * Formula: variance_qty = counted - expected
 * 
 * Positive = Surplus (we have more than expected)
 * Negative = Shortage (we have less than expected)
 * 
 * @param {object} line - StocktakeLine object
 * @returns {number} Variance in servings
 */
export function calculateVariance(line) {
  const counted = calculateCountedQty(line);
  const expected = calculateExpectedQty(line);
  
  return counted - expected;
}

/**
 * Calculate value amounts (in currency)
 * 
 * @param {object} line - StocktakeLine object
 * @returns {object} Expected, counted, and variance values
 */
export function calculateValues(line) {
  const counted = calculateCountedQty(line);
  const expected = calculateExpectedQty(line);
  const cost = parseFloat(line.valuation_cost) || 0;
  
  return {
    expectedValue: expected * cost,
    countedValue: counted * cost,
    varianceValue: (counted - expected) * cost
  };
}

/**
 * Convert servings to display units (full + partial)
 * Applies category-specific rounding rules
 * 
 * @param {number} servings - Total servings (base units)
 * @param {object} item - Item object with uom and category info
 * @returns {object} { full, partial, decimals }
 */
export function convertToDisplayUnits(servings, item) {
  const qty = parseFloat(servings) || 0;
  const uom = parseFloat(item.item_uom || item.uom) || 1;
  const categoryCode = item.category_code || item.category?.code;
  const size = item.item_size || item.size || '';
  
  // Full units (kegs/cases/bottles)
  const fullUnits = Math.floor(qty / uom);
  
  // Partial units (pints/bottles/servings)
  const partialUnits = qty % uom;
  
  // Apply category-specific rounding
  if (categoryCode === 'B' || (categoryCode === 'M' && size?.includes('Doz'))) {
    // Bottled beer and dozen minerals - NO decimals (whole numbers only)
    return {
      full: fullUnits,
      partial: Math.round(partialUnits),
      decimals: 0
    };
  } else if (categoryCode === 'D') {
    // Draught beer - 2 decimals for pints
    return {
      full: fullUnits,
      partial: parseFloat(partialUnits.toFixed(2)),
      decimals: 2
    };
  } else {
    // Spirits, Wine, other Minerals - 2 decimals
    return {
      full: fullUnits,
      partial: parseFloat(partialUnits.toFixed(2)),
      decimals: 2
    };
  }
}

/**
 * Validate partial units based on category rules
 * 
 * @param {number} value - The partial units value
 * @param {string} categoryCode - Category code (B, D, S, W, M)
 * @param {string} itemSize - Item size (to detect 'Doz')
 * @returns {number} Validated and rounded value
 */
export function validatePartialUnits(value, categoryCode, itemSize) {
  const num = parseFloat(value) || 0;
  
  // Category B (Bottled Beer) - whole numbers only
  if (categoryCode === 'B') {
    return Math.round(num);
  }
  
  // Category M (Minerals) with Doz - whole numbers only
  if (categoryCode === 'M' && itemSize?.includes('Doz')) {
    return Math.round(num);
  }
  
  // Categories D, S, W, M (non-dozen) - max 2 decimals
  return parseFloat(num.toFixed(2));
}

/**
 * Format user input for display based on category
 * 
 * @param {string|number} value - Input value
 * @param {string} categoryCode - Category code
 * @param {string} itemSize - Item size
 * @returns {string} Formatted value
 */
export function formatUserInput(value, categoryCode, itemSize) {
  const num = parseFloat(value) || 0;
  
  // Bottled beer and dozen minerals - whole numbers
  if (categoryCode === 'B' || (categoryCode === 'M' && itemSize?.includes('Doz'))) {
    return Math.round(num).toString();
  }
  
  // All others - max 2 decimals
  return num.toFixed(2);
}

/**
 * Get input field configuration based on category
 * 
 * @param {object} item - Item object
 * @returns {object} Input configuration { step, decimals, pattern, example }
 */
export function getInputConfig(item) {
  const categoryCode = item.category_code || item.category?.code;
  const size = item.item_size || item.size || '';
  const subcategory = item.subcategory;
  
  if (categoryCode === 'B' || (categoryCode === 'M' && size?.includes('Doz'))) {
    return {
      step: 1,
      decimals: 0,
      pattern: '[0-9]*',
      example: '12',
      type: 'number'
    };
  }
  
  // ✅ SYRUPS: Single field for total bottles (3 decimal places)
  if (categoryCode === 'M' && subcategory === 'SYRUPS') {
    return {
      step: 0.001,
      decimals: 3,
      pattern: '[0-9]+(\\.[0-9]{0,3})?',
      example: '10.5',
      type: 'number'
    };
  }
  
  // ✅ JUICES: Allow 3 decimal places for ml tracking (e.g., 8.008 = 8 bottles + 8ml)
  if (categoryCode === 'M' && subcategory === 'JUICES') {
    return {
      step: 0.001,
      decimals: 3,
      pattern: '[0-9]+(\\.[0-9]{0,3})?',
      example: '8.008',
      type: 'number'
    };
  }
  
  // D, S, W, M (non-dozen, non-JUICES)
  return {
    step: 0.01,
    decimals: 2,
    pattern: '[0-9]+(\\.[0-9]{0,2})?',
    example: '45.50',
    type: 'number'
  };
}

/**
 * Optimistically update a line after adding a movement
 * Uses the same formulas as backend for consistency
 * 
 * @param {object} line - Original line
 * @param {string} movementType - 'PURCHASE' or 'WASTE'
 * @param {number} quantity - Movement quantity in servings
 * @returns {object} Updated line object
 */
export function optimisticUpdateMovement(line, movementType, quantity) {
  const updated = { ...line };
  
  // Update the appropriate movement total
  if (movementType === 'PURCHASE') {
    updated.purchases = (parseFloat(line.purchases) + quantity).toFixed(4);
  } else if (movementType === 'WASTE') {
    updated.waste = (parseFloat(line.waste) + quantity).toFixed(4);
  }
  
  // Recalculate expected using backend formula
  const opening = parseFloat(updated.opening_qty);
  const purchases = parseFloat(updated.purchases);
  const waste = parseFloat(updated.waste);
  
  updated.expected_qty = (opening + purchases - waste).toFixed(4);
  
  // Recalculate variance
  const counted = calculateCountedQty(updated);
  updated.variance_qty = (counted - parseFloat(updated.expected_qty)).toFixed(4);
  
  // Recalculate values
  const cost = parseFloat(updated.valuation_cost) || 0;
  updated.expected_value = (parseFloat(updated.expected_qty) * cost).toFixed(2);
  updated.variance_value = (parseFloat(updated.variance_qty) * cost).toFixed(2);
  
  return updated;
}

/**
 * Optimistically update a line after changing counted quantities
 * 
 * @param {object} line - Original line
 * @param {number} fullUnits - Counted full units
 * @param {number} partialUnits - Counted partial units
 * @returns {object} Updated line object
 */
export function optimisticUpdateCount(line, fullUnits, partialUnits) {
  const updated = {
    ...line,
    counted_full_units: fullUnits,
    counted_partial_units: partialUnits
  };
  
  // Calculate counted qty
  const countedQty = calculateCountedQty(updated);
  updated.counted_qty = countedQty.toFixed(4);
  
  // Expected stays the same (not affected by count)
  const expectedQty = calculateExpectedQty(updated);
  
  // Recalculate variance
  updated.variance_qty = (countedQty - expectedQty).toFixed(4);
  
  // Recalculate values
  const cost = parseFloat(updated.valuation_cost) || 0;
  updated.counted_value = (countedQty * cost).toFixed(2);
  updated.variance_value = ((countedQty - expectedQty) * cost).toFixed(2);
  
  return updated;
}

/**
 * Test calculations against backend response
 * Logs any discrepancies for debugging
 * 
 * @param {object} frontendLine - Line calculated by frontend
 * @param {object} backendLine - Line returned from backend
 * @returns {object} Comparison results
 */
export function testCalculations(frontendLine, backendLine) {
  const frontendExpected = calculateExpectedQty(frontendLine);
  const backendExpected = parseFloat(backendLine.expected_qty);
  
  const frontendCounted = calculateCountedQty(frontendLine);
  const backendCounted = parseFloat(backendLine.counted_qty);
  
  const frontendVariance = calculateVariance(frontendLine);
  const backendVariance = parseFloat(backendLine.variance_qty);
  
  const tolerance = 0.0001; // Allow tiny floating-point differences
  
  const results = {
    expected: {
      frontend: frontendExpected,
      backend: backendExpected,
      match: Math.abs(frontendExpected - backendExpected) < tolerance,
      difference: frontendExpected - backendExpected
    },
    counted: {
      frontend: frontendCounted,
      backend: backendCounted,
      match: Math.abs(frontendCounted - backendCounted) < tolerance,
      difference: frontendCounted - backendCounted
    },
    variance: {
      frontend: frontendVariance,
      backend: backendVariance,
      match: Math.abs(frontendVariance - backendVariance) < tolerance,
      difference: frontendVariance - backendVariance
    }
  };
  
  // Log if any mismatches found
  if (!results.expected.match || !results.counted.match || !results.variance.match) {
    console.warn('⚠️ Calculation mismatch detected:', results);
  } else {
    console.log('✅ Frontend calculations match backend');
  }
  
  return results;
}
