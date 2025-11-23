/**
 * Format currency amount with proper symbol and formatting
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - ISO currency code (EUR, USD, GBP, etc.)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'EUR') => {
  const symbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
  };
  
  const symbol = symbols[currencyCode] || currencyCode;
  const formatted = parseFloat(amount).toFixed(0);
  
  // Some currencies use symbol after amount
  const symbolAfter = ['CHF'];
  
  return symbolAfter.includes(currencyCode) 
    ? `${formatted} ${symbol}`
    : `${symbol}${formatted}`;
};

/**
 * Format price with "From" prefix for room pricing
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - ISO currency code
 * @returns {string} Formatted price string with "From" prefix
 */
export const formatFromPrice = (amount, currencyCode = 'EUR') => {
  return `From ${formatCurrency(amount, currencyCode)}/night`;
};
