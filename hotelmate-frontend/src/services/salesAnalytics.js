// src/services/salesAnalytics.js
import api from './api';

/**
 * Sales & Cocktail Analytics API Service
 * Dedicated service for individual sales records and sales analysis
 * Extracted from stockAnalytics.js for better organization
 */

// ============================================================================
// SALES ANALYSIS ENDPOINTS (LEGACY - Period-Based, Deprecated)
// ============================================================================

/**
 * Get sales analysis combining stock items + cocktail sales for a period
 * 
 * ⚠️ LEGACY ENDPOINT - This uses period-based filtering which is being phased out
 * ⚠️ Sales should NOT be tied to periods - they are date-based by nature
 * ⚠️ Consider using getSalesSummary() with date/month filters instead
 * 
 * @param {string} hotelSlug - Hotel identifier (slug)
 * @param {number} periodId - Period ID to analyze (LEGACY - NOT RECOMMENDED)
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
 * @deprecated Use getSalesSummary() with month or date range filters instead
 * 
 * @example
 * // LEGACY (not recommended)
 * getSalesAnalysis('hotel-killarney', 10, { includeCocktails: true })
 * 
 * // RECOMMENDED instead:
 * getSalesSummary('hotel-killarney', { month: '2025-09' })
 */
export const getSalesAnalysis = async (hotelSlug, periodId, options = {}) => {
  try {
    const params = {
      include_cocktails: options.includeCocktails !== undefined ? options.includeCocktails : true,
      include_category_breakdown: options.includeCategoryBreakdown !== undefined ? options.includeCategoryBreakdown : true
    };
    
    const endpoint = `/stock_tracker/${hotelSlug}/periods/${periodId}/sales-analysis/`;
    
    console.log('📡 Sales Analysis Request:', { endpoint, periodId, params });
    
    const response = await api.get(endpoint, { params });
    
    console.log('✅ Sales Analysis Response:', {
      periodId,
      hasData: !!response.data,
      generalSalesCount: response.data?.general_sales?.count || 0,
      cocktailSalesCount: response.data?.cocktail_sales?.count || 0,
      totalRevenue: response.data?.combined_sales?.total_revenue || 0
    });
    
    if (response.data?.combined_sales?.total_revenue === 0) {
      console.warn('⚠️ Sales Analysis returned zero revenue - check if data is linked to period');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching sales analysis:', error);
    
    if (error.response?.status === 404) {
      throw new Error(
        'Sales Analysis endpoint not available. Check backend implementation.'
      );
    }
    
    throw error;
  }
};

// ============================================================================
// INDIVIDUAL SALES RECORDS ENDPOINTS
// ============================================================================

/**
 * Get individual sales records with flexible DATE-BASED or MONTH-BASED filtering
 * Sales are filtered by sale_date, NOT by period/stocktake
 * 
 * @param {string} hotelSlug - Hotel identifier
 * @param {object} filters - Optional filters:
 *   - month: Month (YYYY-MM) - NEW! Filter sales by month
 *   - start_date: Start date (YYYY-MM-DD) - sales FROM this date onwards
 *   - end_date: End date (YYYY-MM-DD) - sales UP TO this date
 *   - category: Category code (D, B, S, W, M)
 *   - item: Item ID
 *   - stocktake: Stocktake ID (optional - rarely used)
 * @returns {Promise} Array of sale records
 * 
 * @example
 * // Get all sales
 * getSales('hotel-killarney')
 * 
 * // Get sales by MONTH (NEW!)
 * getSales('hotel-killarney', { month: '2025-09' })
 * 
 * // Get sales by date range
 * getSales('hotel-killarney', { start_date: '2025-09-11', end_date: '2025-11-11' })
 * 
 * // Get sales from specific date onwards
 * getSales('hotel-killarney', { start_date: '2025-09-11' })
 * 
 * // Get sales by category in month
 * getSales('hotel-killarney', { category: 'D', month: '2025-09' })
 * 
 * // Get sales for specific item in date range
 * getSales('hotel-killarney', { item: 123, start_date: '2025-09-01', end_date: '2025-09-30' })
 */
export const getSales = async (hotelSlug, filters = {}) => {
  try {
    const params = {};
    
    // Add month filter (NEW - PRIMARY for month-based entry)
    if (filters.month) params.month = filters.month;
    
    // Add date filters (PRIMARY for date-based filtering)
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    
    // Add other filters
    if (filters.category) params.category = filters.category;
    if (filters.item) params.item = filters.item;
    if (filters.stocktake) params.stocktake = filters.stocktake;
    
    const endpoint = `/stock_tracker/${hotelSlug}/sales/`;
    
    console.log('📡 Fetching Sales:', { 
      endpoint, 
      filters: params
    });
    
    const response = await api.get(endpoint, { params });
    
    const salesArray = Array.isArray(response.data) ? response.data : response.data?.results || [];
    
    console.log('✅ Sales Retrieved:', { 
      count: salesArray.length,
      filter: filters.month 
        ? `MONTH: ${filters.month}`
        : filters.start_date || filters.end_date 
          ? `DATE RANGE: ${filters.start_date || 'ANY'} to ${filters.end_date || 'ANY'}`
          : 'ALL DATES'
    });
    
    if (salesArray.length === 0) {
      console.warn('⚠️ No sales found with current filters:', params);
    }
    
    return salesArray;
  } catch (error) {
    console.error('❌ Error fetching sales:', {
      status: error.response?.status,
      detail: error.response?.data?.detail
    });
    throw error;
  }
};

/**
 * Get ALL sales records (convenience method)
 * @param {string} hotelSlug - Hotel identifier
 * @param {object} filters - Optional filters (date range, category, etc.)
 * @returns {Promise} Array of all sales
 */
export const getAllSales = async (hotelSlug, filters = {}) => {
  return getSales(hotelSlug, filters);
};

/**
 * Get sales by date range (MAIN CONVENIENCE METHOD)
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {object} additionalFilters - Additional filters (category, item, etc.)
 * @returns {Promise} Array of sales in date range
 * 
 * @example
 * // Get all sales in October 2025
 * getSalesByDateRange('hotel-killarney', '2025-10-01', '2025-10-31')
 * 
 * // Get spirit sales in October 2025
 * getSalesByDateRange('hotel-killarney', '2025-10-01', '2025-10-31', { category: 'S' })
 */
export const getSalesByDateRange = async (hotelSlug, startDate, endDate, additionalFilters = {}) => {
  return getSales(hotelSlug, {
    start_date: startDate,
    end_date: endDate,
    ...additionalFilters
  });
};

/**
 * Get sales from a specific date onwards
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {object} additionalFilters - Additional filters
 * @returns {Promise} Array of sales from date onwards
 */
export const getSalesFromDate = async (hotelSlug, startDate, additionalFilters = {}) => {
  return getSales(hotelSlug, { start_date: startDate, ...additionalFilters });
};

/**
 * Get sales up to a specific date
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {object} additionalFilters - Additional filters
 * @returns {Promise} Array of sales up to date
 */
export const getSalesUpToDate = async (hotelSlug, endDate, additionalFilters = {}) => {
  return getSales(hotelSlug, { end_date: endDate, ...additionalFilters });
};

/**
 * Get sales by month (NEW - Month-based filtering)
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} month - Month in YYYY-MM format (e.g., '2025-09')
 * @param {object} additionalFilters - Additional filters (category, item, etc.)
 * @returns {Promise} Array of sales for the specified month
 * 
 * @example
 * // Get all sales for September 2025
 * getSalesByMonth('hotel-killarney', '2025-09')
 * 
 * // Get draught sales for September 2025
 * getSalesByMonth('hotel-killarney', '2025-09', { category: 'D' })
 */
export const getSalesByMonth = async (hotelSlug, month, additionalFilters = {}) => {
  return getSales(hotelSlug, { month, ...additionalFilters });
};

/**
 * Get sales filtered by category
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} categoryCode - Category code (D, B, S, W, M)
 * @param {object} additionalFilters - Additional filters (date range, item, etc.)
 * @returns {Promise} Array of filtered sales
 */
export const getSalesByCategory = async (hotelSlug, categoryCode, additionalFilters = {}) => {
  return getSales(hotelSlug, { category: categoryCode, ...additionalFilters });
};

/**
 * Get a single sale record by ID
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @returns {Promise} Sale details
 */
export const getSaleById = async (hotelSlug, saleId) => {
  try {
    const response = await api.get(`/stock_tracker/${hotelSlug}/sales/${saleId}/`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching sale:', error);
    throw error;
  }
};

// ============================================================================
// CREATE/UPDATE/DELETE SALES ENDPOINTS
// ============================================================================

/**
 * Create a single sale record
 * @param {string} hotelSlug - Hotel identifier
 * @param {object} saleData - Sale data:
 *   - item: Item ID (required)
 *   - quantity: Quantity sold (required)
 *   - month: Month (YYYY-MM) - NEW! Assign sale to month (backend sets sale_date to first day)
 *   - sale_date: Sale date (YYYY-MM-DD) - OR use specific date (backward compatible)
 *   - unit_cost: Unit cost (optional)
 *   - unit_price: Unit price (optional)
 *   - stocktake: Stocktake ID (optional)
 *   - notes: Additional notes (optional)
 * @returns {Promise} Created sale record
 * 
 * @example
 * // Create sale for September 2025 (NEW - month-based)
 * createSale('hotel-killarney', {
 *   item: 123,
 *   quantity: '100.0000',
 *   month: '2025-09',
 *   unit_cost: '2.12',
 *   unit_price: '6.30',
 *   notes: 'September sales'
 * })
 * 
 * // Create sale with specific date (backward compatible)
 * createSale('hotel-killarney', {
 *   item: 123,
 *   quantity: '50.0000',
 *   sale_date: '2025-09-15'
 * })
 */
export const createSale = async (hotelSlug, saleData) => {
  try {
    console.log('📡 Creating Sale:', {
      item: saleData.item,
      quantity: saleData.quantity,
      month: saleData.month || 'N/A',
      sale_date: saleData.sale_date || 'N/A'
    });
    
    const response = await api.post(`/stock_tracker/${hotelSlug}/sales/`, saleData);
    
    console.log('✅ Sale Created:', {
      id: response.data.id,
      sale_date: response.data.sale_date,
      revenue: response.data.total_revenue
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating sale:', error);
    throw error;
  }
};

/**
 * Bulk create sales records
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Optional stocktake ID to link sales to
 * @param {Array} salesData - Array of sale objects
 * @returns {Promise} Result with created count and sales
 * 
 * @example
 * bulkCreateSales('hotel-killarney', 42, [
 *   { item: 10, quantity: 5, sale_date: '2025-11-10' },
 *   { item: 15, quantity: 3, sale_date: '2025-11-10' }
 * ])
 */
export const bulkCreateSales = async (hotelSlug, stocktakeId, salesData) => {
  try {
    const response = await api.post(`/stock_tracker/${hotelSlug}/sales/bulk-create/`, {
      stocktake_id: stocktakeId,
      sales: salesData
    });
    
    console.log('✅ Bulk created sales:', response.data.created_count || salesData.length);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error bulk creating sales:', error);
    throw error;
  }
};

/**
 * Update a sale record
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @param {object} updateData - Fields to update
 * @returns {Promise} Updated sale record
 */
export const updateSale = async (hotelSlug, saleId, updateData) => {
  try {
    const response = await api.patch(`/stock_tracker/${hotelSlug}/sales/${saleId}/`, updateData);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating sale:', error);
    throw error;
  }
};

/**
 * Delete a sale record
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} saleId - Sale ID
 * @returns {Promise} Deletion confirmation
 */
export const deleteSale = async (hotelSlug, saleId) => {
  try {
    const response = await api.delete(`/stock_tracker/${hotelSlug}/sales/${saleId}/`);
    console.log('✅ Deleted sale:', saleId);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting sale:', error);
    throw error;
  }
};

// ============================================================================
// SALES SUMMARY & AGGREGATION ENDPOINTS
// ============================================================================

/**
 * Get sales summary by DATE RANGE or MONTH (grouped by category)
 * Returns aggregated sales data with totals by category
 * 
 * @param {string} hotelSlug - Hotel identifier
 * @param {object} filters - Filters:
 *   - month: Month (YYYY-MM) - NEW! Filter by month
 *   - start_date: Start date (YYYY-MM-DD) - REQUIRED for date range filtering
 *   - end_date: End date (YYYY-MM-DD) - REQUIRED for date range filtering
 *   - stocktake: Stocktake ID (optional - legacy support)
 * @returns {Promise} Summary with:
 *   - by_category: [{category_code, category_name, count, quantity, revenue, cost, profit, gp_percentage}, ...]
 *   - overall: {total_sales, total_quantity, total_revenue, total_cost, gross_profit, gp_percentage}
 * 
 * @example
 * // Get summary by MONTH (NEW - RECOMMENDED)
 * getSalesSummary('hotel-killarney', { month: '2025-09' })
 * 
 * // Get summary by date range
 * getSalesSummary('hotel-killarney', { start_date: '2025-09-11', end_date: '2025-11-11' })
 * 
 * // Legacy: Get summary by stocktake (rarely used)
 * getSalesSummary('hotel-killarney', { stocktake: 42 })
 */
export const getSalesSummary = async (hotelSlug, filters = {}) => {
  try {
    const params = {};
    
    // Month filtering (NEW - Convert month to date range for backend)
    if (filters.month) {
      // Convert YYYY-MM to date range (first day to last day of month)
      const [year, month] = filters.month.split('-');
      const startDate = `${year}-${month}-01`;
      
      // Get last day of month
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      
      params.start_date = startDate;
      params.end_date = endDate;
      
      console.log('📅 Month converted to date range:', { 
        month: filters.month, 
        start_date: startDate, 
        end_date: endDate 
      });
    }
    // Date range filtering (PRIMARY method)
    else if (filters.start_date && filters.end_date) {
      params.start_date = filters.start_date;
      params.end_date = filters.end_date;
    }
    else if (filters.start_date) {
      params.start_date = filters.start_date;
    }
    else if (filters.end_date) {
      params.end_date = filters.end_date;
    }
    // Stocktake filtering (legacy support)
    else if (filters.stocktake) {
      params.stocktake = filters.stocktake;
    }
    
    console.log('📡 Fetching Sales Summary:', { 
      endpoint: `/stock_tracker/${hotelSlug}/sales/summary/`,
      params
    });
    
    const response = await api.get(`/stock_tracker/${hotelSlug}/sales/summary/`, { params });
    
    console.log('✅ Sales Summary Retrieved:', {
      categoryCount: response.data?.by_category?.length || 0,
      totalSales: response.data?.overall?.total_sales || 0,
      totalRevenue: response.data?.overall?.total_revenue || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching sales summary:', error);
    
    // Check for backend UnboundLocalError (stocktake_id bug)
    if (error.response?.status === 500 && error.response?.data?.detail?.includes('stocktake_id')) {
      console.error('🔥 BACKEND BUG DETECTED: UnboundLocalError with stocktake_id');
      console.error('   Backend needs fix in stock_tracker/views.py line ~2549');
      console.error('   The summary view tries to access stocktake_id that is not defined');
      throw new Error('Backend error: Please contact the developer to fix the sales summary endpoint');
    }
    
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate totals from an array of sales
 * @param {Array} sales - Array of sale records
 * @returns {Object} Totals { revenue, cost, profit, quantity, gp }
 */
export const calculateSalesTotals = (sales) => {
  if (!Array.isArray(sales) || sales.length === 0) {
    return { revenue: 0, cost: 0, profit: 0, quantity: 0, gp: 0, count: 0 };
  }

  const totals = sales.reduce((acc, sale) => ({
    revenue: acc.revenue + parseFloat(sale.total_revenue || 0),
    cost: acc.cost + parseFloat(sale.total_cost || 0),
    profit: acc.profit + parseFloat(sale.gross_profit || (sale.total_revenue - sale.total_cost) || 0),
    quantity: acc.quantity + parseFloat(sale.quantity || 0)
  }), { revenue: 0, cost: 0, profit: 0, quantity: 0 });

  totals.gp = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(2) : 0;
  totals.count = sales.length;

  return totals;
};

/**
 * Group sales by month using sale_date
 * @param {Array} sales - Array of sale records
 * @returns {Array} Array of month groups with totals
 */
export const groupSalesByMonth = (sales) => {
  const grouped = {};
  
  sales.forEach(sale => {
    const saleDate = new Date(sale.sale_date);
    const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = saleDate.toLocaleDateString('en-IE', { year: 'numeric', month: 'long' });
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        monthKey,
        monthLabel,
        year: saleDate.getFullYear(),
        month: saleDate.getMonth() + 1,
        sales: [],
        totals: { revenue: 0, cost: 0, profit: 0, quantity: 0, count: 0 }
      };
    }
    
    grouped[monthKey].sales.push(sale);
    grouped[monthKey].totals.revenue += parseFloat(sale.total_revenue || 0);
    grouped[monthKey].totals.cost += parseFloat(sale.total_cost || 0);
    grouped[monthKey].totals.profit += parseFloat(sale.gross_profit || (sale.total_revenue - sale.total_cost) || 0);
    grouped[monthKey].totals.quantity += parseFloat(sale.quantity || 0);
    grouped[monthKey].totals.count += 1;
  });
  
  // Calculate GP for each month
  Object.values(grouped).forEach(month => {
    month.totals.gp = month.totals.revenue > 0 
      ? ((month.totals.profit / month.totals.revenue) * 100).toFixed(2)
      : 0;
  });
  
  // Sort by month (most recent first)
  return Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

/**
 * Group sales by category
 * @param {Array} sales - Array of sale records
 * @returns {Object} Sales grouped by category code
 */
export const groupSalesByCategory = (sales) => {
  const grouped = {};
  
  sales.forEach(sale => {
    const categoryCode = sale.category_code || sale.item?.category?.code || 'UNKNOWN';
    
    if (!grouped[categoryCode]) {
      grouped[categoryCode] = {
        categoryCode,
        categoryName: sale.category_name || sale.item?.category?.name || categoryCode,
        sales: [],
        totals: { revenue: 0, cost: 0, profit: 0, quantity: 0, count: 0 }
      };
    }
    
    grouped[categoryCode].sales.push(sale);
    grouped[categoryCode].totals.revenue += parseFloat(sale.total_revenue || 0);
    grouped[categoryCode].totals.cost += parseFloat(sale.total_cost || 0);
    grouped[categoryCode].totals.profit += parseFloat(sale.gross_profit || (sale.total_revenue - sale.total_cost) || 0);
    grouped[categoryCode].totals.quantity += parseFloat(sale.quantity || 0);
    grouped[categoryCode].totals.count += 1;
  });
  
  // Calculate GP for each category
  Object.values(grouped).forEach(category => {
    category.totals.gp = category.totals.revenue > 0 
      ? ((category.totals.profit / category.totals.revenue) * 100).toFixed(2)
      : 0;
  });
  
  return grouped;
};

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
 * Format date to readable string
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @param {string} locale - Locale code (default: 'en-IE')
 * @returns {string} Formatted date string
 */
export const formatSaleDate = (dateString, locale = 'en-IE') => {
  return new Date(dateString).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Get sales summary by date range (convenience method)
 * @param {string} hotelSlug - Hotel identifier
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise} Sales summary with category breakdown
 * 
 * @example
 * getSalesSummaryByDateRange('hotel-killarney', '2025-09-11', '2025-11-11')
 */
export const getSalesSummaryByDateRange = async (hotelSlug, startDate, endDate) => {
  return getSalesSummary(hotelSlug, { 
    start_date: startDate, 
    end_date: endDate 
  });
};

export default {
  // Analysis
  getSalesAnalysis,
  
  // Individual Sales
  getSales,
  getAllSales,
  getSalesByMonth,          // NEW - Month-based filtering
  getSalesByCategory,
  getSalesByDateRange,
  getSalesFromDate,
  getSalesUpToDate,
  getSaleById,
  
  // Create/Update/Delete
  createSale,               // UPDATED - Now supports 'month' parameter
  bulkCreateSales,
  updateSale,
  deleteSale,
  
  // Summaries
  getSalesSummary,
  getSalesSummaryByDateRange,
  
  // Utilities
  calculateSalesTotals,
  groupSalesByMonth,
  groupSalesByCategory,
  formatCurrency,
  formatSaleDate
};
