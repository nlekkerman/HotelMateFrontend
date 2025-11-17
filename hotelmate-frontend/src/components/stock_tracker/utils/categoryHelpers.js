/**
 * Category Helpers for Stock Tracker
 * Provides labels, validation, and display logic for different stock categories
 */

/**
 * Get counting labels and input rules for a specific category
 * @param {string} categoryCode - Category code (D, S, W, B, M)
 * @param {string} size - Item size (optional, for special cases like Doz, LT)
 * @param {object} inputFields - Optional API-provided input_fields object
 * @param {string} subcategory - Subcategory (for Minerals: SOFT_DRINKS, SYRUPS, JUICES, CORDIALS, BIB)
 * @returns {object} Labels and rules for counting inputs
 */
export function getCountingLabels(categoryCode, size = '', inputFields = null, subcategory = null) {
  // ✅ PRIORITY: SYRUPS and JUICES subcategory overrides - must check BEFORE input_fields
  // SYRUPS: Single decimal field for TOTAL bottles (not split into full+partial)
  if (categoryCode === 'M' && subcategory === 'SYRUPS') {
    return {
      fullLabel: null, // No full units field for SYRUPS
      fullPlaceholder: null,
      fullStep: null,
      fullInputType: null,
      partialLabel: 'Total Bottles',
      partialPlaceholder: 'e.g., 10.5 or 100.5',
      partialStep: '0.001',
      partialInputType: 'number',
      unit: null, // No full units
      servingUnit: 'bottles',
      helpText: 'Enter total bottles as decimal (e.g., 10.5 = 10 bottles + 500ml)',
      example: 'Example: 100.5 bottles = 2,871.43 servings',
      showPartial: true,
      showFull: false, // Hide full units field
      allowDecimalFull: false,
      allowDecimalPartial: true,
      partialOptional: false
    };
  }
  
  // ✅ NEW: JUICES-specific handling for 3-level tracking (cases + bottles + ml)
  if (categoryCode === 'M' && subcategory === 'JUICES') {
    return {
      fullLabel: 'Full Cases',
      fullPlaceholder: 'e.g., 59',
      fullStep: '1',
      fullInputType: 'number',
      partialLabel: 'Bottles (decimal)',
      partialPlaceholder: 'e.g., 8.008',
      partialStep: '0.001',
      partialInputType: 'number',
      unit: 'cases',
      servingUnit: 'bottles',
      helpText: 'Enter full cases, then bottles with decimal for ml (e.g., 8.008 = 8 bottles + 8ml)',
      example: 'Example: 59 cases + 8.008 bottles = 3,580.04 servings',
      showPartial: true,
      showFull: true,
      allowDecimalFull: false,
      allowDecimalPartial: true,
      partialOptional: false
    };
  }
  
  // ✅ NEW: BULK_JUICES - Lemonade/juice bottles tracked individually (not on menu)
  if (categoryCode === 'M' && subcategory === 'BULK_JUICES') {
    return {
      fullLabel: 'Bottles',
      fullPlaceholder: 'e.g., 138',
      fullStep: '1',
      fullInputType: 'number',
      partialLabel: 'Partial',
      partialPlaceholder: '0.5 for half bottle',
      partialStep: '0.5',
      partialInputType: 'number',
      unit: 'bottles',
      servingUnit: 'partial',
      helpText: 'Enter whole bottles and fractional (0.5 = half bottle)',
      example: 'Example: 138 bottles or 43 bottles + 0.5 partial',
      showPartial: true,
      showFull: true,
      allowDecimalFull: false,
      allowDecimalPartial: true,
      partialOptional: true,
      partialMax: 0.99
    };
  }
  
  // ⚠️ FALLBACK: If no input_fields from API, use legacy hardcoded logic
  const sizeUpper = size?.toUpperCase() || '';
  
  // Check for special size cases
  const isDozSize = sizeUpper.includes('DOZ');
  const isLiterSize = sizeUpper.includes('LT') || sizeUpper.includes('LITER');
  
  switch (categoryCode) {
    case 'D': // Draught Beer
      return {
        fullLabel: 'Full Kegs',
        fullPlaceholder: 'e.g., 2',
        fullStep: '1',
        fullInputType: 'number',
        partialLabel: 'Remaining Pints',
        partialPlaceholder: 'e.g., 44',
        partialStep: '0.01',
        partialInputType: 'number',
        unit: 'kegs',
        servingUnit: 'pints',
        helpText: 'Enter number of full kegs, then remaining pints in partial keg',
        example: 'Example: 2 kegs + 44 pints = 220 pints total',
        showPartial: true,
        allowDecimalFull: false
      };
      
    case 'S': // Spirits
      return {
        fullLabel: 'Full Bottles',
        fullPlaceholder: 'e.g., 10',
        fullStep: '1',
        fullInputType: 'number',
        partialLabel: 'Remaining Shots',
        partialPlaceholder: 'e.g., 14',
        partialStep: '0.01',
        partialInputType: 'number',
        unit: 'bottles',
        servingUnit: 'shots',
        helpText: 'Enter number of full bottles, then shots remaining in opened bottle',
        example: 'Example: 10 bottles + 14 shots = 214 shots total',
        showPartial: true,
        allowDecimalFull: false
      };
      
    case 'W': // Wine
      return {
        fullLabel: 'Bottles (decimals allowed)',
        fullPlaceholder: 'e.g., 10.8',
        fullStep: '0.1',
        fullInputType: 'number',
        partialLabel: 'Remaining Glasses (optional)',
        partialPlaceholder: 'e.g., 3',
        partialStep: '0.01',
        partialInputType: 'number',
        unit: 'bottles',
        servingUnit: 'glasses',
        helpText: 'Use decimals for wine (e.g., 10.8 bottles). Partial field rarely needed.',
        example: 'Example: 10.8 bottles = 64.8 glasses',
        showPartial: true, // Show but mark as optional
        allowDecimalFull: true,
        partialOptional: true
      };
      
    case 'B': // Bottled Beer
      if (isDozSize) {
        return {
          fullLabel: 'Full Cases (Dozen)',
          fullPlaceholder: 'e.g., 12',
          fullStep: '1',
          fullInputType: 'number',
          partialLabel: 'Loose Bottles',
          partialPlaceholder: 'e.g., 6',
          partialStep: '1',
          partialInputType: 'number',
          unit: 'cases',
          servingUnit: 'bottles',
          helpText: 'Enter full cases (dozen), then loose bottles not in a case',
          example: 'Example: 12 cases + 6 bottles = 150 bottles total',
          showPartial: true,
          allowDecimalFull: false
        };
      }
      return {
        fullLabel: 'Full Cases',
        fullPlaceholder: 'e.g., 12',
        fullStep: '1',
        fullInputType: 'number',
        partialLabel: 'Loose Bottles',
        partialPlaceholder: 'e.g., 6',
        partialStep: '1',
        partialInputType: 'number',
        unit: 'cases',
        servingUnit: 'bottles',
        helpText: 'Enter full cases, then loose bottles',
        example: 'Example: 12 cases + 6 bottles = 150 bottles total',
        showPartial: true,
        allowDecimalFull: false
      };
      
    case 'M': // Minerals & Syrups
      if (isLiterSize) {
        return {
          fullLabel: 'Full Containers (BIB)',
          fullPlaceholder: 'e.g., 5',
          fullStep: '1',
          fullInputType: 'number',
          partialLabel: 'Remaining Serves',
          partialPlaceholder: 'e.g., 20',
          partialStep: '0.01',
          partialInputType: 'number',
          unit: 'containers',
          servingUnit: 'serves',
          helpText: 'Enter full BIB containers, then remaining serves',
          example: 'Example: 5 containers + 20 serves',
          showPartial: true,
          allowDecimalFull: false
        };
      }
      return {
        fullLabel: 'Full Units',
        fullPlaceholder: 'e.g., 10',
        fullStep: '1',
        fullInputType: 'number',
        partialLabel: 'Remaining Serves',
        partialPlaceholder: 'e.g., 5',
        partialStep: '0.01',
        partialInputType: 'number',
        unit: 'units',
        servingUnit: 'serves',
        helpText: 'Enter full units, then remaining serves',
        example: 'Example: 10 units + 5 serves',
        showPartial: true,
        allowDecimalFull: false
      };
      
    default:
      return {
        fullLabel: 'Full Units',
        fullPlaceholder: 'e.g., 10',
        fullStep: '0.01',
        fullInputType: 'number',
        partialLabel: 'Partial Units',
        partialPlaceholder: 'e.g., 5',
        partialStep: '0.01',
        partialInputType: 'number',
        unit: 'units',
        servingUnit: 'servings',
        helpText: 'Enter counted units',
        example: 'Enter your count',
        showPartial: true,
        allowDecimalFull: true
      };
  }
}

/**
 * Display opening stock in human-readable format
 * @param {object} item - Stock item with opening_qty and uom
 * @returns {string} Formatted display string
 */
export function displayStockUnits(item) {
  const openingQty = parseFloat(item.opening_qty || 0);
  const uom = parseFloat(item.uom || 1);
  const categoryCode = item.category_code || item.category;
  const size = item.item_size || item.size || '';
  
  if (openingQty === 0) return '0';
  
  // Get labels for this category
  const labels = getCountingLabels(categoryCode, size);
  
  // Calculate containers and remaining servings
  const fullUnits = Math.floor(openingQty / uom);
  const partialUnits = openingQty % uom;
  
  // Format based on category
  if (fullUnits > 0 && partialUnits > 0) {
    return `${fullUnits} ${labels.unit} + ${partialUnits.toFixed(2)} ${labels.servingUnit}`;
  } else if (fullUnits > 0) {
    return `${fullUnits} ${labels.unit}`;
  } else {
    return `${partialUnits.toFixed(2)} ${labels.servingUnit}`;
  }
}

/**
 * Format counted quantity for display
 * @param {number} countedQty - Total counted quantity in servings
 * @param {object} item - Stock item
 * @returns {string} Formatted display string
 */
export function displayCountedQty(countedQty, item) {
  const qty = parseFloat(countedQty || 0);
  const categoryCode = item.category_code || item.category;
  const labels = getCountingLabels(categoryCode, item.size);
  
  return `${qty.toFixed(2)} ${labels.servingUnit}`;
}

/**
 * Get variance badge color based on percentage
 * @param {number} varianceQty - Variance quantity
 * @param {number} expectedQty - Expected quantity
 * @returns {string} Bootstrap badge color class
 */
export function getVarianceBadgeColor(varianceQty, expectedQty) {
  if (expectedQty === 0) return 'secondary';
  
  const variancePercent = Math.abs((varianceQty / expectedQty) * 100);
  
  if (varianceQty < 0) {
    // Shortage
    if (variancePercent >= 10) return 'danger';
    if (variancePercent >= 5) return 'warning';
    return 'info';
  } else if (varianceQty > 0) {
    // Surplus
    if (variancePercent >= 10) return 'success';
    if (variancePercent >= 5) return 'success';
    return 'info';
  }
  
  return 'secondary';
}

/**
 * Format variance for display
 * @param {number} varianceQty - Variance quantity
 * @param {number} expectedQty - Expected quantity
 * @returns {object} Formatted variance with color and percentage
 */
export function formatVariance(varianceQty, expectedQty) {
  const variance = parseFloat(varianceQty || 0);
  const expected = parseFloat(expectedQty || 0);
  
  const variancePercent = expected !== 0 ? (variance / expected) * 100 : 0;
  const color = getVarianceBadgeColor(variance, expected);
  
  return {
    value: variance.toFixed(2),
    percentage: variancePercent.toFixed(1),
    color: color,
    sign: variance >= 0 ? '+' : '',
    isShortage: variance < 0,
    isSurplus: variance > 0
  };
}

/**
 * Convert total bottles to cases + bottles
 * Used for SOFT_DRINKS auto-calculation
 * 
 * @param {number} totalBottles - Total number of bottles
 * @param {number} bottlesPerCase - Bottles per case (default 12)
 * @returns {object} { cases, bottles }
 * 
 * @example
 * bottlesToCasesAndBottles(145, 12) => { cases: 12, bottles: 1 }
 * bottlesToCasesAndBottles(10, 12) => { cases: 0, bottles: 10 }
 */
export function bottlesToCasesAndBottles(totalBottles, bottlesPerCase = 12) {
  const total = parseFloat(totalBottles) || 0;
  const perCase = parseFloat(bottlesPerCase) || 12;
  
  const cases = Math.floor(total / perCase);
  const bottles = total % perCase;
  
  return { cases, bottles };
}
