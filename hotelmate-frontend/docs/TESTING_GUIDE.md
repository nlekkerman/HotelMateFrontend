# Analytics Dashboard Testing Guide

## 🧪 Testing Checklist

Your development server is running at: **http://localhost:5173**

## Step 1: Navigate to Analytics Dashboard

1. **Log in** to your application
2. **Navigate to**: `/stock_tracker/{your-hotel-slug}/analytics`
   - Example: `http://localhost:5173/stock_tracker/my-hotel/analytics`

## Step 2: Initial Load Tests

### ✅ Page Loads
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools (F12)
- [ ] All chart containers are visible

### ✅ Filters Panel
- [ ] AnalyticsFilters component renders
- [ ] Period selector shows available periods
- [ ] Period1 and Period2 dropdowns populated
- [ ] Category filter shows categories
- [ ] Refresh button is clickable

### ✅ Auto-Selection
- [ ] Last 3 periods are auto-selected on page load
- [ ] Period1 and Period2 auto-populate with last 2 periods
- [ ] "Last updated" timestamp shows in footer

## Step 3: KPI Cards Test

### ✅ KPI Summary Cards (6 cards)
- [ ] **Total Stock Value** card shows currency amount
- [ ] **Average GP%** card shows percentage
- [ ] **Top Category** card shows category name and value
- [ ] **Low Stock Items** card shows count
- [ ] **Top Movers** card shows count (if period2 selected)
- [ ] **Efficiency Score** card shows score/100 with badge
- [ ] Cards have hover effect (lift animation)

## Step 4: Main Comparison Charts (NEW Endpoints)

### ✅ Category Comparison Chart
**Endpoint**: `stock_tracker/{slug}/compare/categories/`

- [ ] Chart renders with selected periods
- [ ] Can switch between bar/line/area chart types
- [ ] Stacked toggle works for bar charts
- [ ] Tooltips show value and items count
- [ ] Summary stats display (total value, total items, categories count)
- [ ] Works with 2-6 periods selected

**Test Actions:**
1. Select 2 periods → Chart should show 2 bars per category
2. Select 3+ periods → Chart should show multiple bars
3. Toggle "Stacked" → Bars should stack
4. Change chart type → Visualization updates

### ✅ Top Movers Chart
**Endpoint**: `stock_tracker/{slug}/compare/top-movers/`

- [ ] Chart renders when period1 and period2 are selected
- [ ] 5 tabs visible: All, Increases, Decreases, New, Discontinued
- [ ] Each tab shows correct badge count
- [ ] Horizontal bars with appropriate colors:
  - Green for increases
  - Red for decreases
  - Blue for new items
  - Purple for discontinued items
- [ ] Tooltips show both period values and percentage change

**Test Actions:**
1. Click "Increases" tab → Shows only items that increased
2. Click "Decreases" tab → Shows only items that decreased
3. Click "New Items" tab → Shows items only in period2
4. Click "Discontinued" tab → Shows items only in period1

### ✅ Waterfall Cost Chart
**Endpoint**: `stock_tracker/{slug}/compare/cost-analysis/`

- [ ] ECharts waterfall visualization renders
- [ ] Shows flow: Opening Stock → +Purchases → -Waste → Closing Stock
- [ ] Colors are correct (blue totals, green positive, red negative)
- [ ] Tooltips show value, percentage, and change
- [ ] Summary shows opening/closing stock, purchases, usage

**Test Actions:**
1. Hover over each segment → Tooltip shows details
2. Verify numbers add up correctly
3. Check breakdown section shows waste, transfers

### ✅ Item Trends Chart
**Endpoint**: `stock_tracker/{slug}/compare/trend-analysis/`

- [ ] Multi-line chart with one line per item
- [ ] Category filter dropdown works
- [ ] Chart type toggle (line/area) works
- [ ] Trend indicators visible (📈📉➡️〰️)
- [ ] Volatility badges show (low/medium/high)
- [ ] Summary table shows all items with trends

**Test Actions:**
1. Select a category → Chart filters to that category's items
2. Change chart type → Switches between line and area
3. Check summary table → Shows trend direction and volatility

## Step 5: Advanced Analytics Charts

### ✅ Variance Heatmap
**Endpoint**: `stock_tracker/{slug}/compare/variance-heatmap/`

- [ ] ECharts heatmap renders
- [ ] Color gradient visible (blue → yellow → red)
- [ ] X-axis shows periods
- [ ] Y-axis shows categories
- [ ] Tooltips show category, period, variance %
- [ ] Summary shows highest/average/lowest variance

**Test Actions:**
1. Hover over cells → Tooltip shows variance percentage
2. Verify color intensity matches variance level
3. Check summary stats at bottom

### ✅ Performance Radar Chart
**Endpoint**: `stock_tracker/{slug}/compare/performance-scorecard/`

- [ ] Radar chart renders with 4 metrics
- [ ] Two overlapping polygons (period1 vs period2)
- [ ] Overall score improvement shows with badge (↑↓→)
- [ ] Score badges color-coded:
  - Green for ≥80
  - Yellow for 60-79
  - Red for <60
- [ ] Breakdown section shows metric-by-metric changes

**Test Actions:**
1. Compare the two polygons → See which period performed better
2. Check breakdown grid → Shows individual metric changes

## Step 6: Operational Analytics Charts (Legacy)

### ✅ Stock Value Trends Chart
**Endpoint**: `stock_tracker/{slug}/periods/`

- [ ] Line/Area chart showing last 12 periods
- [ ] Chart type toggle works
- [ ] "Show Average Line" toggle adds dashed line
- [ ] "Show Min/Max Lines" toggle adds bounds
- [ ] Statistics show: average, max, min, trend %
- [ ] Trend badge shows ↑ or ↓ with percentage

**Test Actions:**
1. Toggle "Show Average" → Dashed horizontal line appears
2. Toggle "Show Min/Max" → Two dashed boundary lines appear
3. Hover over points → Tooltip shows value

### ✅ Low Stock Chart
**Endpoint**: `stock_tracker/{slug}/items/?lowStock=true`

- [ ] Horizontal bars with color coding
- [ ] Summary shows counts: Critical, Warning, Caution
- [ ] Category filter works
- [ ] Severity filter works
- [ ] Detailed table shows all low stock items
- [ ] Colors match severity:
  - Red for <50%
  - Orange for 50-80%
  - Yellow for 80-100%

**Test Actions:**
1. Select "Critical Only" → Shows only red items
2. Select a category → Filters to that category
3. Check table → All items listed with par levels

### ✅ Profitability Chart
**Endpoint**: `stock_tracker/{slug}/items/profitability/`

- [ ] Bar chart renders
- [ ] View selector (by category / by item) works
- [ ] Category filter works in item view
- [ ] Metric selector works (GP% / Markup% / Pour Cost%)
- [ ] Summary shows average GP, markup, total GP
- [ ] Formula badges visible in footer

**Test Actions:**
1. Switch to "By Item" view → Shows individual items
2. Select a category → Filters items
3. Change metric → Chart data updates
4. Hover bars → Tooltip shows cost, selling price, profit

### ✅ Category Breakdown Chart
**Endpoint**: `stock_tracker/{slug}/periods/{id}/`

- [ ] Pie or Donut chart renders
- [ ] Chart type toggle works
- [ ] Period info shows name and dates
- [ ] Summary shows total value and category count
- [ ] Detail table lists all categories
- [ ] Color indicators match pie slices

**Test Actions:**
1. Toggle to "Donut Chart" → Chart changes to donut
2. Hover slices → Tooltip shows value, percentage, item count
3. Click table rows → (if onCategoryClick implemented)

## Step 7: Interactivity Tests

### ✅ Filtering
- [ ] Changing period selection updates relevant charts
- [ ] Category filter affects ItemTrends chart
- [ ] Filters persist during session

### ✅ Responsive Design
- [ ] Open DevTools (F12) → Toggle device toolbar
- [ ] Test mobile view (375px width):
  - Charts stack to 1 column
  - Chart height = 300px
  - Controls are touch-friendly
- [ ] Test tablet view (768px width)
- [ ] Test desktop view (1920px width):
  - Charts in 2-column grid
  - Chart height = 400px

### ✅ Auto-Refresh
- [ ] Wait 5 minutes → Charts should auto-refresh
- [ ] "Last updated" timestamp updates
- [ ] Or change to 30 seconds for testing:

```javascript
// In Analytics.jsx, temporarily change:
5 * 60 * 1000  // to →  30 * 1000  (30 seconds)
```

## Step 8: Chart Library Switching

### ✅ Test Different Libraries
You can programmatically test library switching:

1. Open browser console (F12)
2. Test Recharts (default):
```javascript
localStorage.setItem('chart_preferences', JSON.stringify({ chartLibrary: 'recharts' }));
location.reload();
```

3. Test Chart.js:
```javascript
localStorage.setItem('chart_preferences', JSON.stringify({ chartLibrary: 'chartjs' }));
location.reload();
```

4. Test Victory:
```javascript
localStorage.setItem('chart_preferences', JSON.stringify({ chartLibrary: 'victory' }));
location.reload();
```

5. Test ECharts:
```javascript
localStorage.setItem('chart_preferences', JSON.stringify({ chartLibrary: 'echarts' }));
location.reload();
```

**Verify:**
- [ ] All bar charts render correctly
- [ ] All line charts render correctly
- [ ] All pie/donut charts render correctly
- [ ] Tooltips work in all libraries
- [ ] Colors are consistent

## Step 9: Error Handling Tests

### ✅ Test Empty States

1. **No Periods Selected:**
   - [ ] Clear all period selections → Empty state shows

2. **No Data Available:**
   - [ ] Select periods with no stock data → "No data available" message

3. **Network Error:**
   - [ ] Stop backend server → Error message shows
   - [ ] Retry button appears and works

### ✅ Test Loading States
- [ ] Refresh page → Loading skeletons appear briefly
- [ ] Skeletons have shimmer animation

## Step 10: Browser Console Checks

### ✅ Network Tab
Open DevTools → Network tab:

1. **Check API Calls:**
   - [ ] `stock_tracker/{slug}/compare/categories/` → Status 200
   - [ ] `stock_tracker/{slug}/compare/top-movers/` → Status 200
   - [ ] `stock_tracker/{slug}/compare/cost-analysis/` → Status 200
   - [ ] `stock_tracker/{slug}/compare/trend-analysis/` → Status 200
   - [ ] `stock_tracker/{slug}/compare/variance-heatmap/` → Status 200
   - [ ] `stock_tracker/{slug}/compare/performance-scorecard/` → Status 200
   - [ ] All legacy endpoints return 200

2. **Check Response Data:**
   - Click on any request → Preview tab
   - Verify response structure matches expected format

### ✅ Console Tab
- [ ] No error messages
- [ ] No warning messages (or only expected warnings)
- [ ] API error logs are descriptive if errors occur

## Step 11: Performance Tests

### ✅ Page Load Performance
- [ ] Initial load < 3 seconds
- [ ] All charts render < 2 seconds
- [ ] No layout shift during load

### ✅ Chart Rendering
- [ ] Switching chart types < 500ms
- [ ] Filtering updates < 1 second
- [ ] Smooth animations

### ✅ Memory
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Auto-refresh doesn't accumulate memory

## Common Issues & Solutions

### Issue: "No periods available"
**Solution:** 
1. Check backend has closed periods: `GET /stock_tracker/{slug}/periods/?is_closed=true`
2. Ensure at least 2 closed periods exist

### Issue: Charts show "No data available"
**Solution:**
1. Verify periods have stock snapshots
2. Check movements data exists (purchases, waste, etc.)
3. Verify backend response format matches expected structure

### Issue: API returns 404
**Solution:**
1. Confirm backend has comparison_views.py implemented
2. Check URLs.py includes comparison routes
3. Verify hotel_slug is correct

### Issue: API returns 403
**Solution:**
1. Check authentication token is valid
2. Verify user has permission to access hotel data
3. Check X-Hotel-Slug header is being sent

### Issue: Charts don't render
**Solution:**
1. Check browser console for errors
2. Verify chart library dependencies installed: `npm list recharts chart.js victory echarts`
3. Check data format matches expected structure

### Issue: "Port 5173 already in use"
**Solution:**
```bash
# Kill the process using port 5173
npx kill-port 5173
# Or use a different port
npm run dev -- --port 5174
```

## Testing Report Template

Create a copy of this and fill it out:

```
# Analytics Dashboard Test Report

**Date:** [Date]
**Tester:** [Your Name]
**Environment:** [Dev/Staging/Prod]
**Browser:** [Chrome/Firefox/Safari] [Version]

## Test Results

### 1. Page Load: ✅ / ❌
- Notes: 

### 2. KPI Cards: ✅ / ❌
- Notes:

### 3. NEW Comparison Charts: ✅ / ❌
- Category Comparison: ✅ / ❌
- Top Movers: ✅ / ❌
- Waterfall Cost: ✅ / ❌
- Item Trends: ✅ / ❌
- Variance Heatmap: ✅ / ❌
- Performance Radar: ✅ / ❌
- Notes:

### 4. Legacy Charts: ✅ / ❌
- Stock Value Trends: ✅ / ❌
- Low Stock: ✅ / ❌
- Profitability: ✅ / ❌
- Category Breakdown: ✅ / ❌
- Notes:

### 5. Responsive Design: ✅ / ❌
- Mobile: ✅ / ❌
- Tablet: ✅ / ❌
- Desktop: ✅ / ❌
- Notes:

### 6. Chart Library Switching: ✅ / ❌
- Recharts: ✅ / ❌
- Chart.js: ✅ / ❌
- Victory: ✅ / ❌
- ECharts: ✅ / ❌
- Notes:

### 7. Interactivity: ✅ / ❌
- Filters: ✅ / ❌
- Tooltips: ✅ / ❌
- Auto-refresh: ✅ / ❌
- Notes:

### Issues Found:
1. [Issue description]
2. [Issue description]

### Recommendations:
1. [Recommendation]
2. [Recommendation]

### Overall Status: ✅ PASS / ❌ FAIL
```

---

## Quick Start Testing

**Fastest way to test:**

1. **Open**: http://localhost:5173/stock_tracker/your-hotel-slug/analytics
2. **Check**: Browser console (F12) for errors
3. **Verify**: All 11 charts render
4. **Test**: Select different periods from filters
5. **Confirm**: Data updates in charts

**Expected Result:** All charts show data, no console errors, smooth interactions.

---

**Status**: Ready to test! 🧪
