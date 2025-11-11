// src/services/stockAnalytics.js
import api from './api';

/**
 * Stock Analytics API Service
 * Centralized service for all stock analytics and comparison endpoints
 */

// ============================================================================
// NEW COMPARISON ENDPOINTS (Multi-Period Analytics)
// ============================================================================

/**
 * Get sales analysis combining stock items + cocktail sales
 * NEW ENDPOINT - Comprehensive sales breakdown for reporting
 * 
 * @param {string} hotelSlug - Hotel identifier (slug)
 * @param {number} periodId - Period ID to analyze
 * @param {object} options - Optional parameters:
 *   - includeCocktails: boolean (default: true) - Include cocktail sales data
 *   - includeCategoryBreakdown: boolean (default: true) - Include D/B/S/W/M/COCKTAILS breakdown
 * 
 * @returns {Promise} API response with sales analysis:
 *   - period_id, period_name, period_start, period_end, period_is_closed
 *   - general_sales: {revenue, cost, count, profit, gp_percentage} - Stock items only
 *   - cocktail_sales: {revenue, cost, count, profit, gp_percentage} - Cocktails only
 *   - combined_sales: {total_revenue, total_cost, total_count, profit, gp_percentage}
 *   - breakdown_percentages: {stock_revenue_percentage, cocktail_revenue_percentage, ...}
 *   - category_breakdown: [{category_code, category_name, revenue, cost, count, profit, gp_percentage}, ...]
 * 
 * @example
 * // Get full analysis with cocktails
 * getSalesAnalysis('carlton-hotel', 10, { includeCocktails: true })
 * 
 * // Get stock items only
 * getSalesAnalysis('carlton-hotel', 10, { includeCocktails: false })
 * 
 * // Get without category breakdown
 * getSalesAnalysis('carlton-hotel', 10, { includeCategoryBreakdown: false })
 */
export const getSalesAnalysis = async (hotelSlug, periodId, options = {}) => {
  try {
    const params = {
      include_cocktails: options.includeCocktails !== undefined ? options.includeCocktails : true,
      include_category_breakdown: options.includeCategoryBreakdown !== undefined ? options.includeCategoryBreakdown : true
    };
    
    const response = await api.get(
      `stock_tracker/${hotelSlug}/periods/${periodId}/sales-analysis/`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching sales analysis:', error);
    
    // If 404, provide helpful error message
    if (error.response?.status === 404) {
      const helpfulError = new Error(
        '🚧 Sales Analysis endpoint not yet implemented on backend. ' +
        'Backend team needs to add /periods/<id>/sales-analysis/ endpoint. ' +
        'See COMPLETE_SALES_ANALYSIS_API_GUIDE.md for implementation details.'
      );
      helpfulError.response = error.response;
      throw helpfulError;
    }
    
    throw error;
  }
};

/**
 * Get comprehensive KPI summary across multiple periods
 * Backend calculates ALL metrics - frontend just displays them
 * 
 * Supports 3 flexible period selection methods:
 * 1. By year/month (RECOMMENDED - consistent across environments)
 * 2. By period IDs (works but varies per environment)
 * 3. By date range
 * 
 * @param {string} hotelSlug - Hotel identifier (slug)
 * @param {object} options - Period selection options:
 *   - periodIds: Array of period IDs [1, 2, 3, ...] OR
 *   - year: Year (e.g., 2024) with optional month (1-12) OR
 *   - startDate: Start date (YYYY-MM-DD) with endDate (YYYY-MM-DD)
 *   - includeCocktails: boolean (default: false) - Include cocktail metrics in separate section
 * 
 * @returns {Promise} API response with complete KPI data:
 *   - stock_value_metrics: total value, trends, historical values
 *   - profitability_metrics: GP%, pour cost, trends
 *   - category_performance: top categories, distribution
 *   - inventory_health: low stock, out of stock, overstocked, dead stock, health score
 *   - period_comparison: top movers, variance (if 2+ periods)
 *   - performance_score: overall score, rating, breakdown (5 scores), improvements, strengths
 *   - additional_metrics: item counts, averages, purchase activity
 *   - cocktail_sales_metrics: (ONLY if includeCocktails=true) {total_revenue, total_cost, total_profit, gp_percentage, count, avg_price_per_cocktail}
 * 
 * @example
 * // Recommended: By year/month
 * getKPISummary('carlton-hotel', { year: 2024, month: 10 })
 * getKPISummary('carlton-hotel', { year: 2024 }) // Entire year
 * 
 * // Alternative: By period IDs
 * getKPISummary('carlton-hotel', { periodIds: [1, 2, 3] })
 * 
 * // Alternative: By date range
 * getKPISummary('carlton-hotel', { startDate: '2024-09-01', endDate: '2024-11-30' })
 * 
 * // Include cocktail metrics
 * getKPISummary('carlton-hotel', { year: 2024, month: 10, includeCocktails: true })
 */
export const getKPISummary = async (hotelSlug, options = {}) => {
  try {
    let params = {};
    
    // Method 1: Year/Month (RECOMMENDED - consistent across environments)
    if (options.year) {
      params.year = options.year;
      if (options.month) params.month = options.month;
    }
    // Method 2: Date Range
    else if (options.startDate && options.endDate) {
      params.start_date = options.startDate;
      params.end_date = options.endDate;
    }
    // Method 3: Period IDs (fallback)
    else if (options.periodIds) {
      const periods = Array.isArray(options.periodIds) 
        ? options.periodIds.join(',') 
        : options.periodIds;
      params.period_ids = periods;
    }
    // Legacy support: if passed as direct array (backward compatibility)
    else if (Array.isArray(options)) {
      params.period_ids = options.join(',');
    }
    
    // NEW: Include cocktails parameter
    if (options.includeCocktails !== undefined) {
      params.include_cocktails = options.includeCocktails;
    }
    
    const response = await api.get(`stock_tracker/${hotelSlug}/kpi-summary/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    throw error;
  }
};

/**
 * Compare category data across multiple periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {array} periodIds - Array of period IDs [1, 2, 3, ...]
 * @returns {Promise} API response with categories comparison data
 */
export const getCompareCategories = async (hotelSlug, periodIds) => {
  try {
    const periods = Array.isArray(periodIds) ? periodIds.join(',') : periodIds;
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/categories/`, {
      params: { periods }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching compare categories:', error);
    throw error;
  }
};

/**
 * Get top movers (biggest increases/decreases) between two periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} period1Id - First period ID
 * @param {number} period2Id - Second period ID
 * @param {number} limit - Number of results to return (default: 10)
 * @returns {Promise} API response with top movers data
 */
export const getTopMovers = async (hotelSlug, period1Id, period2Id, limit = 10) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/top-movers/`, {
      params: { period1: period1Id, period2: period2Id, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching top movers:', error);
    throw error;
  }
};

/**
 * Get detailed cost analysis between two periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} period1Id - First period ID
 * @param {number} period2Id - Second period ID
 * @returns {Promise} API response with cost analysis and waterfall data
 */
export const getCostAnalysis = async (hotelSlug, period1Id, period2Id) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/cost-analysis/`, {
      params: { period1: period1Id, period2: period2Id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching cost analysis:', error);
    throw error;
  }
};

/**
 * Get trend analysis across multiple periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {array} periodIds - Array of period IDs
 * @param {string} category - Optional category code filter (e.g., 'S', 'W', 'B')
 * @param {array} itemIds - Optional array of specific item IDs
 * @returns {Promise} API response with trend analysis data
 */
export const getTrendAnalysis = async (hotelSlug, periodIds, category = null, itemIds = null) => {
  try {
    const periods = Array.isArray(periodIds) ? periodIds.join(',') : periodIds;
    const params = { periods };
    
    if (category) params.category = category;
    if (itemIds && Array.isArray(itemIds)) params.items = itemIds.join(',');
    
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/trend-analysis/`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    throw error;
  }
};

/**
 * Get variance heatmap data across multiple periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {array} periodIds - Array of period IDs (minimum 2)
 * @returns {Promise} API response with heatmap data
 */
export const getVarianceHeatmap = async (hotelSlug, periodIds) => {
  try {
    const periods = Array.isArray(periodIds) ? periodIds.join(',') : periodIds;
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/variance-heatmap/`, {
      params: { periods }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching variance heatmap:', error);
    throw error;
  }
};

/**
 * Get performance scorecard comparison between two periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} period1Id - First period ID
 * @param {number} period2Id - Second period ID
 * @returns {Promise} API response with performance scorecard and radar chart data
 */
export const getPerformanceScorecard = async (hotelSlug, period1Id, period2Id) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/compare/performance-scorecard/`, {
      params: { period1: period1Id, period2: period2Id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching performance scorecard:', error);
    throw error;
  }
};

// ============================================================================
// SALES ENDPOINTS (Individual Sale Records)
// ============================================================================

/**
 * Get individual sales records for a stocktake
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {object} filters - Optional filters:
 *   - category: Category code (D, B, S, W, M)
 *   - item: Item ID
 *   - date_from: Start date (YYYY-MM-DD)
 *   - date_to: End date (YYYY-MM-DD)
 * @returns {Promise} API response with sales records
 * 
 * @example
 * // Get all sales for a stocktake
 * getSales('carlton-hotel', 42)
 * 
 * // Get sales filtered by category
 * getSales('carlton-hotel', 42, { category: 'S' })
 */
export const getSales = async (hotelSlug, stocktakeId = null, filters = {}) => {
  try {
    // If stocktakeId is provided, filter by it; otherwise get all sales
    const params = stocktakeId ? { stocktake: stocktakeId, ...filters } : { ...filters };
    const response = await api.get(`stock_tracker/${hotelSlug}/sales/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
};

/**
 * Get ALL sales records (independent + linked)
 * @param {string} hotelSlug - Hotel identifier
 * @param {object} filters - Optional filters (category, date range, etc.)
 * @returns {Promise} API response with all sales
 */
export const getAllSales = async (hotelSlug, filters = {}) => {
  return getSales(hotelSlug, null, filters);
};

/**
 * Get sales filtered by category (convenience method)
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {string} categoryCode - Category code (D, B, S, W, M)
 * @returns {Promise} API response with filtered sales
 */
export const getSalesByCategory = async (hotelSlug, stocktakeId, categoryCode) => {
  return getSales(hotelSlug, stocktakeId, { category: categoryCode });
};

/**
 * Bulk create sales records
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {Array} salesData - Array of sale objects:
 *   - item: Item ID (required)
 *   - quantity: Quantity sold (required)
 *   - sale_date: Sale date (optional, defaults to today)
 *   - unit_cost: Unit cost (optional, auto-populated from item)
 *   - unit_price: Unit price (optional, auto-populated from item)
 * @returns {Promise} API response with result
 * 
 * @example
 * bulkCreateSales('carlton-hotel', 42, [
 *   { item: 10, quantity: 5, sale_date: '2025-11-10' },
 *   { item: 15, quantity: 3 }
 * ])
 */
export const bulkCreateSales = async (hotelSlug, stocktakeId, salesData) => {
  try {
    const response = await api.post(`stock_tracker/${hotelSlug}/sales/bulk-create/`, {
      stocktake_id: stocktakeId,
      sales: salesData
    });
    return response.data;
  } catch (error) {
    console.error('Error creating sales:', error);
    throw error;
  }
};

/**
 * Get a single sale record by ID
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @returns {Promise} API response with sale details
 */
export const getSaleById = async (hotelSlug, saleId) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/sales/${saleId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sale:', error);
    throw error;
  }
};

/**
 * Update a sale record
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @param {object} updateData - Fields to update
 * @returns {Promise} API response with updated sale
 */
export const updateSale = async (hotelSlug, saleId, updateData) => {
  try {
    const response = await api.patch(`stock_tracker/${hotelSlug}/sales/${saleId}/`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};

/**
 * Delete a sale record
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @returns {Promise} API response
 */
export const deleteSale = async (hotelSlug, saleId) => {
  try {
    const response = await api.delete(`stock_tracker/${hotelSlug}/sales/${saleId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
};

// ============================================================================
// LEGACY/EXISTING ENDPOINTS (Keep for backwards compatibility)
// ============================================================================

/**
 * Get profitability data for items
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} category - Optional category filter
 * @returns {Promise} API response with profitability data
 */
export const getProfitabilityData = async (hotelSlug, category = 'all') => {
  try {
    const endpoint = category === 'all' 
      ? `stock_tracker/${hotelSlug}/items/profitability/`
      : `stock_tracker/${hotelSlug}/items/profitability/?category=${category}`;
    
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error fetching profitability data:', error);
    throw error;
  }
};

/**
 * Get simple period comparison (LEGACY - use getTopMovers and getCostAnalysis instead)
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} period1Id - First period ID
 * @param {number} period2Id - Second period ID
 * @returns {Promise} API response with comparison data
 */
export const getPeriodsComparison = async (hotelSlug, period1Id, period2Id) => {
  try {
    const response = await api.get(
      `stock_tracker/${hotelSlug}/periods/compare/`, {
        params: { period1: period1Id, period2: period2Id }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching periods comparison:', error);
    throw error;
  }
};

/**
 * Get stock value report for a specific period
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID
 * @returns {Promise} API response with stock value report
 */
export const getStockValueReport = async (hotelSlug, periodId) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/reports/stock-value/`, {
      params: { period: periodId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock value report:', error);
    throw error;
  }
};

/**
 * Get list of all periods
 * @param {string} hotelSlug - Hotel identifier
 * @param {boolean} closedOnly - Filter for closed periods only (default: false)
 * @returns {Promise} API response with periods list
 */
export const getPeriodsList = async (hotelSlug, closedOnly = false) => {
  try {
    const params = closedOnly ? { is_closed: true } : {};
    console.log('🔍 [getPeriodsList] Fetching periods:', { hotelSlug, closedOnly, params });
    
    const response = await api.get(`stock_tracker/${hotelSlug}/periods/`, { params });
    const data = response.data.results || response.data;
    
    console.log('📋 [getPeriodsList] Raw API response:', {
      totalReceived: Array.isArray(data) ? data.length : 'not array',
      firstFew: Array.isArray(data) ? data.slice(0, 3).map(p => ({
        id: p.id,
        name: p.period_name,
        closed: p.is_closed,
        start: p.start_date,
        end: p.end_date
      })) : data
    });
    
    if (closedOnly && Array.isArray(data)) {
      const closedPeriods = data.filter(p => p.is_closed === true);
      console.log(`🔒 [getPeriodsList] Filtering closed only: ${closedPeriods.length} out of ${data.length} periods`);
      return closedPeriods;
    }
    
    return data;
  } catch (error) {
    console.error('❌ [getPeriodsList] Error fetching periods list:', error);
    throw error;
  }
};

/**
 * Get period snapshot details
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID
 * @returns {Promise} API response with period snapshot data
 */
export const getPeriodSnapshot = async (hotelSlug, periodId) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/periods/${periodId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching period snapshot:', error);
    throw error;
  }
};

/**
 * Get low stock items
 * @param {string} hotelSlug - Hotel identifier
 * @returns {Promise} API response with low stock items
 */
/**
 * Get low stock items (items below threshold in servings)
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} threshold - Minimum servings threshold (default: 50)
 * @returns {Promise} API response with low stock items
 */
export const getLowStockItems = async (hotelSlug, threshold = 50) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/items/low-stock/`, {
      params: { threshold }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

/**
 * Get movements summary for a period
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID
 * @param {string} movementType - Optional movement type filter (PURCHASE, WASTE, TRANSFER, etc.)
 * @returns {Promise} API response with movements data
 */
export const getMovementsSummary = async (hotelSlug, periodId, movementType = null) => {
  try {
    const params = { period: periodId };
    if (movementType) params.movement_type = movementType;
    
    const response = await api.get(`stock_tracker/${hotelSlug}/movements/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching movements summary:', error);
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency symbol (default: '€')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = '€') => {
  if (value === null || value === undefined) return `${currency}0.00`;
  return `${currency}${parseFloat(value).toFixed(2)}`;
};

/**
 * Calculate percentage change
 * @param {number} oldValue - Previous value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
export const calculatePercentageChange = (oldValue, newValue) => {
  if (!oldValue || oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Get color for variance value
 * @param {number} variance - Variance percentage
 * @returns {string} Color code
 */
export const getVarianceColor = (variance) => {
  const absVariance = Math.abs(variance);
  if (absVariance < 15) return '#90EE90'; // low - green
  if (absVariance < 30) return '#FFD700'; // medium - yellow
  return '#FF6347'; // high - red
};
