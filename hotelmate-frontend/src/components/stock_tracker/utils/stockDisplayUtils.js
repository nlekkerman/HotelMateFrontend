/**
 * Stock Tracker Display Utilities
 * Helper functions for displaying stock data according to category rules
 */

/**
 * Get the unit labels for displaying stock based on item category and size
 * 
 * @param {Object} item - Stock item with category and size
 * @returns {Object} - { full: string, partial: string }
 * 
 * Rules:
 * - Bottled Beer (B, Doz): cases + bottles (whole numbers 0-11)
 * - Draught Beer (D): kegs + pints (2 decimals)
 * - Spirits (S): bottles + fractional (2 decimals)
 * - Wine (W): bottles + fractional (2 decimals)
 * - Mixers (M, Doz): cases + bottles (whole numbers 0-11)
 * - Mixers (M, other): bottles + fractional (2 decimals)
 */
export const getUnitLabels = (item) => {
  if (!item) return { full: 'units', partial: 'partial' };
  
  const category = item.category;
  const size = item.size;
  
  // Bottled Beer (Category B, Size "Doz")
  if (category === 'B' && size === 'Doz') {
    return { full: 'cases', partial: 'bottles' };
  }
  
  // Mixers with Doz size (Category M, Size "Doz")
  if (category === 'M' && size === 'Doz') {
    return { full: 'cases', partial: 'bottles' };
  }
  
  // Draught Beer (Category D)
  if (category === 'D') {
    return { full: 'kegs', partial: 'pints' };
  }
  
  // Spirits (Category S)
  if (category === 'S') {
    return { full: 'bottles', partial: '' };
  }
  
  // Wine (Category W)
  if (category === 'W') {
    return { full: 'bottles', partial: '' };
  }
  
  // Mixers (other sizes)
  if (category === 'M') {
    return { full: 'bottles', partial: '' };
  }
  
  // Default fallback
  return { full: 'units', partial: '' };
};

/**
 * Format the display value for partial units based on category
 * 
 * @param {string|number} value - The partial units value
 * @param {Object} item - Stock item with category and size
 * @returns {string} - Formatted value
 */
export const formatPartialUnits = (value, item) => {
  if (!value || value === '0' || value === 0) return '0';
  
  const numValue = parseFloat(value);
  const category = item?.category;
  const size = item?.size;
  
  // Bottled Beer and Mixers (Doz) - whole numbers only (0-11)
  if ((category === 'B' || category === 'M') && size === 'Doz') {
    return Math.round(numValue).toString();
  }
  
  // Draught Beer, Spirits, Wine - 2 decimals
  return numValue.toFixed(2);
};

/**
 * Format full display of stock (full units + partial units)
 * 
 * @param {Object} snapshot - Snapshot data with display fields
 * @param {string} type - 'opening' or 'closing'
 * @returns {string} - Formatted display string
 */
export const formatStockDisplay = (snapshot, type = 'closing') => {
  if (!snapshot || !snapshot.item) return 'N/A';
  
  const fullField = type === 'opening' ? 'opening_display_full_units' : 'closing_display_full_units';
  const partialField = type === 'opening' ? 'opening_display_partial_units' : 'closing_display_partial_units';
  
  const fullUnits = snapshot[fullField] || '0';
  const partialUnits = snapshot[partialField] || '0';
  
  const labels = getUnitLabels(snapshot.item);
  const formattedPartial = formatPartialUnits(partialUnits, snapshot.item);
  
  // If no partial units label (spirits, wine with fractional), show differently
  if (!labels.partial) {
    const partial = parseFloat(formattedPartial);
    if (partial > 0) {
      return `${fullUnits} ${labels.full} + ${formattedPartial}`;
    }
    return `${fullUnits} ${labels.full}`;
  }
  
  // Show both full and partial with labels
  if (parseFloat(formattedPartial) > 0) {
    return `${fullUnits} ${labels.full} + ${formattedPartial} ${labels.partial}`;
  }
  
  return `${fullUnits} ${labels.full}`;
};

/**
 * Get category display name with icon
 * 
 * @param {string} categoryCode - Category code (B/D/S/W/M)
 * @returns {Object} - { name: string, icon: string }
 */
export const getCategoryDisplay = (categoryCode) => {
  const categories = {
    'B': { name: 'Bottled Beer', icon: '🍺' },
    'D': { name: 'Draught Beer', icon: '🍻' },
    'S': { name: 'Spirits', icon: '🥃' },
    'W': { name: 'Wine', icon: '🍷' },
    'M': { name: 'Mixers', icon: '🥤' }
  };
  
  return categories[categoryCode] || { name: 'Other', icon: '📦' };
};

/**
 * Format currency value
 * 
 * @param {string|number} value - Value to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '€0.00';
  const numValue = parseFloat(value);
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(numValue);
};

/**
 * Get badge variant based on GP percentage
 * 
 * @param {string|number} gpPercentage - Gross profit percentage
 * @returns {string} - Bootstrap badge variant
 */
export const getGPBadgeVariant = (gpPercentage) => {
  const gp = parseFloat(gpPercentage);
  if (gp >= 70) return 'success';
  if (gp >= 60) return 'info';
  if (gp >= 50) return 'warning';
  return 'danger';
};

/**
 * Format stocktake display fields (opening, expected, counted)
 * Uses pre-calculated display fields from the API
 * 
 * @param {Object} line - Stocktake line with display fields
 * @param {string} type - 'opening', 'expected', or 'counted'
 * @param {Object} labels - Unit labels from getCountingLabels()
 * @returns {Object} - { fullUnits, partialUnits, value, rawQty }
 * 
 * Example API fields:
 * - opening_display_full_units, opening_display_partial_units, opening_qty
 * - expected_display_full_units, expected_display_partial_units, expected_value, expected_qty
 * - counted_display_full_units, counted_display_partial_units, counted_value, counted_qty
 */
export const formatStocktakeDisplay = (line, type, labels) => {
  if (!line) {
    return {
      fullUnits: '0',
      partialUnits: '0',
      value: null,
      rawQty: 0
    };
  }

  const fullField = `${type}_display_full_units`;
  const partialField = `${type}_display_partial_units`;
  const valueField = `${type}_value`;
  const qtyField = `${type}_qty`;

  return {
    fullUnits: line[fullField] || '0',
    partialUnits: line[partialField] || '0',
    value: line[valueField],
    rawQty: parseFloat(line[qtyField] || 0)
  };
};

/**
 * Format variance display with color coding and significance highlighting
 * 
 * @param {Object} line - Stocktake line with variance fields
 * @param {Object} labels - Unit labels from getCountingLabels()
 * @returns {Object} - Formatted variance data with styling
 * 
 * Returns:
 * {
 *   fullUnits: string,
 *   partialUnits: string,
 *   value: number,
 *   isShortage: boolean,
 *   isSurplus: boolean,
 *   isSignificant: boolean,
 *   bgClass: string,
 *   textClass: string,
 *   strongClass: string
 * }
 */
export const formatVarianceDisplay = (line, labels) => {
  if (!line) {
    return {
      fullUnits: '0',
      partialUnits: '0',
      value: 0,
      isShortage: false,
      isSurplus: false,
      isSignificant: false,
      bgClass: '',
      textClass: 'text-muted',
      strongClass: ''
    };
  }

  const varianceValue = parseFloat(line.variance_value || 0);
  const isSignificant = Math.abs(varianceValue) > 10;
  const isShortage = varianceValue < 0;
  const isSurplus = varianceValue > 0;

  // Color coding: red for shortage, green for surplus, muted for zero
  const bgClass = isShortage ? 'bg-danger-subtle' : isSurplus ? 'bg-success-subtle' : '';
  const textClass = isShortage ? 'text-danger' : isSurplus ? 'text-success' : 'text-muted';
  const strongClass = isSignificant ? 'fw-bold' : '';

  return {
    fullUnits: line.variance_display_full_units || '0',
    partialUnits: line.variance_display_partial_units || '0',
    value: varianceValue,
    rawQty: parseFloat(line.variance_qty || 0),
    isShortage,
    isSurplus,
    isSignificant,
    bgClass,
    textClass,
    strongClass
  };
};

/**
 * Format movement data for display
 * 
 * @param {Object} line - Stocktake line with movement fields
 * @returns {Object} - Formatted movement data
 * 
 * Returns movement values with proper formatting:
 * {
 *   purchases: number,
 *   waste: number,
 *   transfersIn: number,
 *   transfersOut: number,
 *   adjustments: number
 * }
 */
export const formatMovementDisplay = (line) => {
  if (!line) {
    return {
      purchases: 0,
      waste: 0,
      transfersIn: 0,
      transfersOut: 0,
      adjustments: 0
    };
  }

  return {
    purchases: parseFloat(line.purchases || 0),
    waste: parseFloat(line.waste || 0),
    transfersIn: parseFloat(line.transfers_in || 0),
    transfersOut: parseFloat(line.transfers_out || 0),
    adjustments: parseFloat(line.adjustments || 0)
  };
};

/**
 * Get badge properties for movement display
 * 
 * @param {number} value - Movement value
 * @param {string} type - Movement type ('purchases', 'waste', 'transfers_in', 'transfers_out', 'adjustments')
 * @returns {Object} - { bg: string, text: string, prefix: string }
 */
export const getMovementBadgeProps = (value, type) => {
  const hasValue = value > 0 || (type === 'adjustments' && value !== 0);
  
  const typeConfig = {
    purchases: { 
      bg: hasValue ? 'success' : 'light', 
      text: hasValue ? 'light' : 'muted', 
      prefix: '+' 
    },
    waste: { 
      bg: hasValue ? 'danger' : 'light', 
      text: hasValue ? 'light' : 'muted', 
      prefix: '-' 
    },
    transfers_in: { 
      bg: hasValue ? 'info' : 'light', 
      text: hasValue ? 'light' : 'muted', 
      prefix: '+' 
    },
    transfers_out: { 
      bg: hasValue ? 'warning' : 'light', 
      text: hasValue ? 'dark' : 'muted', 
      prefix: '-' 
    },
    adjustments: { 
      bg: hasValue ? 'secondary' : 'light', 
      text: hasValue ? 'light' : 'muted', 
      prefix: value > 0 ? '+' : '' 
    }
  };

  return typeConfig[type] || { bg: 'light', text: 'muted', prefix: '' };
};
