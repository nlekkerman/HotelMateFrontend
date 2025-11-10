# API Connection Guide

## ✅ API URLs Fixed!

All stock analytics API endpoints have been corrected to match your project's API structure.

## API Configuration

### Base URL Structure
- **Development**: `http://localhost:8000/api/`
- **Production**: `https://hotel-porter-d25ad83b12cf.herokuapp.com/api`

The `api.js` service already includes `/api/` in the baseURL, so all endpoint paths should **NOT** include a leading slash.

## Corrected Endpoint Patterns

### ✅ CORRECT Format
```javascript
api.get(`stock_tracker/${hotelSlug}/compare/categories/`)
api.get(`stock_tracker/${hotelSlug}/periods/`)
api.get(`stock_tracker/${hotelSlug}/items/profitability/`)
```

### ❌ WRONG Format (Before Fix)
```javascript
api.get(`/stock_tracker/${hotelSlug}/compare/categories/`) // Leading slash causes double slash
```

## All Updated Endpoints

### NEW Comparison Endpoints (6)
1. `stock_tracker/${hotelSlug}/compare/categories/` - Multi-period category comparison
2. `stock_tracker/${hotelSlug}/compare/top-movers/` - Biggest changes between periods
3. `stock_tracker/${hotelSlug}/compare/cost-analysis/` - Cost breakdown waterfall
4. `stock_tracker/${hotelSlug}/compare/trend-analysis/` - Multi-period item trends
5. `stock_tracker/${hotelSlug}/compare/variance-heatmap/` - Variance visualization
6. `stock_tracker/${hotelSlug}/compare/performance-scorecard/` - KPI comparison

### Legacy Endpoints (7)
7. `stock_tracker/${hotelSlug}/items/profitability/` - GP%, Markup%, Pour Cost
8. `stock_tracker/${hotelSlug}/periods/compare/` - Simple two-period comparison
9. `stock_tracker/${hotelSlug}/reports/stock-value/` - Stock value report
10. `stock_tracker/${hotelSlug}/periods/` - Periods list
11. `stock_tracker/${hotelSlug}/periods/${periodId}/` - Period snapshot
12. `stock_tracker/${hotelSlug}/items/?lowStock=true` - Low stock items
13. `stock_tracker/${hotelSlug}/movements/` - Movements summary

## Testing the API Connection

### 1. Check Backend Server
Make sure your Django backend is running on:
- `http://localhost:8000` (development)
- Or your production URL

### 2. Verify Endpoints
Use your browser or Postman to test:
```
http://localhost:8000/api/stock_tracker/your-hotel-slug/periods/
```

### 3. Check Browser Console
Open the Analytics page and check the Network tab:
- Look for requests to `stock_tracker/...`
- Verify status codes (200 = success)
- Check response data format

### 4. Common Issues

**Issue**: 404 Not Found
- **Cause**: Backend endpoint doesn't exist or hotel_slug is wrong
- **Fix**: Verify backend has the comparison_views.py implemented

**Issue**: 401 Unauthorized
- **Cause**: Missing or invalid authentication token
- **Fix**: Ensure you're logged in and token is in localStorage

**Issue**: 403 Forbidden
- **Cause**: No permission to access the hotel's data
- **Fix**: Check user has correct hotel_slug in their profile

**Issue**: CORS Error
- **Cause**: Backend not allowing frontend origin
- **Fix**: Add frontend URL to Django CORS_ALLOWED_ORIGINS

## Headers Automatically Added

The `api.js` interceptor automatically adds these headers:

```javascript
Authorization: Token <your-auth-token>
X-Hotel-ID: <hotel-id>
X-Hotel-Slug: <hotel-slug>
```

So you don't need to manually add them in your component calls.

## Example API Calls from Frontend

### Get Periods List
```javascript
import { getPeriodsList } from '@/services/stockAnalytics';

const periods = await getPeriodsList('my-hotel-slug', true); // closedOnly = true
```

### Compare Categories
```javascript
import { getCompareCategories } from '@/services/stockAnalytics';

const data = await getCompareCategories('my-hotel-slug', [1, 2, 3]);
// Calls: stock_tracker/my-hotel-slug/compare/categories/?periods=1,2,3
```

### Get Top Movers
```javascript
import { getTopMovers } from '@/services/stockAnalytics';

const movers = await getTopMovers('my-hotel-slug', 1, 2, 10);
// Calls: stock_tracker/my-hotel-slug/compare/top-movers/?period1=1&period2=2&limit=10
```

## Next Steps

1. ✅ **API URLs are corrected** - All endpoints now use correct format
2. 🔄 **Start your backend server** - Make sure Django is running
3. 🧪 **Test the Analytics page** - Navigate to `/stock_tracker/your-hotel-slug/analytics`
4. 👀 **Check browser console** - Look for successful API calls
5. 📊 **View charts** - Data should populate if backend returns correct format

## Backend Response Format

Ensure your backend returns data matching the format documented in:
- `COMPARISON_IMPLEMENTATION_SUMMARY.md` (you provided)
- `src/components/stock_tracker/analytics/README.md` (created)

The frontend expects specific field names like:
- `categories`, `periods`, `summary`
- `biggest_increases`, `biggest_decreases`, `new_items`, `discontinued_items`
- `waterfall_data`, `comparison`, `breakdown`
- `trends`, `trend_direction`, `volatility`
- `heatmap_data`, `color_scale`
- `radar_chart_data`, `overall_score`

---

**Status**: ✅ **All API connections are ready to use!**

Just start your backend and test the analytics dashboard.
