# Backend 500 Internal Server Error Analysis

## Overview
The Analytics dashboard is experiencing multiple 500 Internal Server errors from the backend API. These are server-side issues that need to be resolved on the backend.

## Failing Endpoints

### 1. Category Comparison
```
GET /api/stock_tracker/hotel-killarney/compare/categories/?periods=9,7,8
Status: 500 Internal Server Error
```
**Expected behavior:** Should return category comparison data across multiple periods
**Current issue:** Server is crashing when processing this request

### 2. Cost Analysis Comparison
```
GET /api/stock_tracker/hotel-killarney/compare/cost-analysis/?period1=7&period2=9
Status: 500 Internal Server Error
```
**Expected behavior:** Should return cost analysis comparison between two periods
**Current issue:** Server is crashing when processing this request

### 3. Trend Analysis
```
GET /api/stock_tracker/hotel-killarney/compare/trend-analysis/?periods=9,7,8
Status: 500 Internal Server Error
```
**Expected behavior:** Should return trend analysis across multiple periods
**Current issue:** Server is crashing when processing this request

### 4. Performance Scorecard
```
GET /api/stock_tracker/hotel-killarney/compare/performance-scorecard/?period1=7&period2=9
Status: 500 Internal Server Error
```
**Expected behavior:** Should return performance scorecard comparison between two periods
**Current issue:** Server is crashing when processing this request

## Period IDs Being Requested
- Period IDs: 9, 7, 8
- These are the last 3 closed periods being auto-selected by the frontend

## Possible Backend Issues

### 1. Data Validation Issues
- Backend may not be validating period IDs exist before querying
- Database queries may be failing due to missing period data
- Period IDs might not have associated stock tracking data

### 2. Database Query Issues
- Complex JOIN queries may be timing out
- Aggregation functions may be encountering null/empty data
- Index issues causing slow queries that timeout

### 3. Data Format Issues
- Backend may be expecting different data structures than what exists
- Period data may be incomplete or in unexpected formats
- Missing required fields in database records

### 4. Logic Errors
- Comparison logic may have division by zero errors
- Percentage calculations may fail with null values
- Array operations may fail with empty datasets

## Required Backend Fixes

### Immediate Actions:
1. **Check Backend Logs** - Review server logs for the exact error messages and stack traces
2. **Verify Period Data** - Confirm periods 7, 8, 9 exist and have stock tracking data
3. **Test Endpoints Directly** - Use Postman/curl to test these endpoints with known good data
4. **Add Error Handling** - Ensure all endpoints have proper try-catch blocks
5. **Validate Input** - Add validation to check period IDs exist before querying

### Debugging Steps:
```bash
# Test if periods exist
GET /api/stock_tracker/hotel-killarney/periods/?is_closed=true

# Test with single period first
GET /api/stock_tracker/hotel-killarney/snapshot/?period_id=9

# Then test comparison with two periods
GET /api/stock_tracker/hotel-killarney/compare/categories/?periods=9,8
```

### Expected Response Structures:

#### Category Comparison Response:
```json
{
  "categories": [
    {
      "category_name": "Beverages",
      "periods": [
        {
          "period_id": 9,
          "period_name": "October 2024",
          "total_value": 5000.00
        },
        {
          "period_id": 7,
          "period_name": "August 2024",
          "total_value": 4500.00
        }
      ]
    }
  ]
}
```

#### Top Movers Response:
```json
{
  "biggest_increases": [
    {
      "item_name": "Item A",
      "period1_value": 100.00,
      "period2_value": 150.00,
      "value_change": 50.00,
      "percentage_change": 50.0
    }
  ],
  "biggest_decreases": [...],
  "new_items": [...],
  "discontinued_items": [...]
}
```

## Frontend Changes Made

The frontend has been updated to handle these errors gracefully:

1. **VarianceHeatmapChart.jsx** - Added validation to prevent crash when heatmap_data structure is invalid
2. **TopMoversChart.jsx** - Added validation to ensure arrays are always arrays before operations
3. **Error Boundaries** - Already in place to catch rendering errors

## Testing Recommendations

### Backend Testing:
1. Unit tests for each comparison endpoint
2. Integration tests with real period data
3. Load testing to ensure queries complete within timeout
4. Edge case testing (empty data, single period, invalid IDs)

### Data Validation:
1. Ensure all closed periods have corresponding stock tracking data
2. Verify period relationships and data integrity
3. Check for orphaned records or missing foreign keys

## Contact Backend Team

The backend team needs to:
1. Review server error logs immediately
2. Fix the database queries causing 500 errors
3. Add proper error handling and validation
4. Return meaningful error messages instead of 500 errors
5. Test all comparison endpoints with the period IDs: 7, 8, 9

## Temporary Workaround

Until backend is fixed, users will see error messages like:
- "Failed to load variance heatmap data"
- "Failed to load category comparison"
- "No top movers data available"

These are expected and inform users that the feature is temporarily unavailable.
