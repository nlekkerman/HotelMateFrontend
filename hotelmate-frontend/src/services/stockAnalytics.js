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
    const response = await api.get(`stock_tracker/${hotelSlug}/periods/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching periods list:', error);
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
export const getLowStockItems = async (hotelSlug) => {
  try {
    const response = await api.get(`stock_tracker/${hotelSlug}/items/`, {
      params: { lowStock: true }
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
