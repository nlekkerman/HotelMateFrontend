/**
 * Safe utility functions for defensive coding in attendance system
 */

/**
 * Safely extracts a time string
 * @param {*} value - The value to convert to a safe time string
 * @returns {string} - Safe time string or empty string
 */
export function safeTime(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Safely extracts a number
 * @param {*} value - The value to convert to a number
 * @returns {number} - Safe number or 0
 */
export function safeNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely extracts a string
 * @param {*} value - The value to convert to a string
 * @returns {string} - Safe string or empty string
 */
export function safeString(value) {
  return value != null ? String(value) : "";
}

/**
 * Safely extracts an array from API response
 * @param {*} data - The data that might be an array
 * @param {string} [itemsKey] - Optional key to extract items from (e.g., 'results')
 * @returns {Array} - Safe array
 */
export function safeArray(data, itemsKey = null) {
  if (itemsKey && data && typeof data === 'object') {
    const items = data[itemsKey];
    return Array.isArray(items) ? items : [];
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Safely parses API response with standard format
 * @param {*} json - JSON response from API
 * @returns {Array} - Safe array of items
 */
export function safeApiResponse(json) {
  if (!json) return [];
  
  // Handle paginated response with 'results'
  if (json.results && Array.isArray(json.results)) {
    return json.results;
  }
  
  // Handle direct array response
  if (Array.isArray(json)) {
    return json;
  }
  
  // Handle object with 'items' or other array fields
  if (json.items && Array.isArray(json.items)) {
    return json.items;
  }
  
  // Handle single object as array
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return [json];
  }
  
  return [];
}

/**
 * Safely extracts staff ID from various formats
 * @param {*} item - Item that might have staff_id or staff
 * @returns {string|number|null} - Safe staff ID or null
 */
export function safeStaffId(item) {
  if (!item) return null;
  return item.staff_id || item.staff || null;
}

/**
 * Safely extracts staff name
 * @param {*} item - Item that might have staff_name
 * @returns {string} - Safe staff name or fallback
 */
export function safeStaffName(item) {
  if (!item) return "Unknown Staff";
  return safeString(item.staff_name) || `Staff #${safeStaffId(item) || "Unknown"}`;
}

/**
 * Safely checks if a period ID is valid
 * @param {*} periodId - The period ID to validate
 * @returns {boolean} - Whether the period ID is valid
 */
export function isValidPeriodId(periodId) {
  return periodId != null && !isNaN(Number(periodId));
}

/**
 * Safely parses a date string
 * @param {*} dateStr - The date string to parse
 * @returns {Date|null} - Valid Date object or null
 */
export function safeDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Safely extracts time slice from datetime string
 * @param {*} datetime - The datetime string
 * @param {number} start - Start index for slice
 * @param {number} end - End index for slice
 * @returns {string} - Safe time slice or empty string
 */
export function safeTimeSlice(datetime, start = 0, end = 10) {
  const time = safeTime(datetime);
  return time.length >= end ? time.slice(start, end) : "";
}

/**
 * Safely checks if an object has a property
 * @param {*} obj - Object to check
 * @param {string} prop - Property name
 * @returns {boolean} - Whether the property exists and is not null/undefined
 */
export function hasSafeProp(obj, prop) {
  return obj && typeof obj === 'object' && obj[prop] != null;
}