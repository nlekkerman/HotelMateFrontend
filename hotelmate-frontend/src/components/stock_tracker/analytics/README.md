# Stock Tracker Analytics System

## Overview

A comprehensive multi-library analytics dashboard for HotelMate stock tracking, featuring **6 NEW comparison endpoints** and support for **4 chart libraries** (Recharts, Chart.js, Victory, Apache ECharts).

## Architecture

### Directory Structure

```
src/
├── context/
│   └── ChartPreferencesContext.jsx         # Global chart library preferences
├── services/
│   └── stockAnalytics.js                   # Centralized analytics API service
├── components/stock_tracker/
│   ├── charts/                             # Chart infrastructure
│   │   ├── UniversalChart.jsx              # Library-agnostic wrapper
│   │   ├── ChartLoadingSkeleton.jsx        # Loading states
│   │   ├── ChartEmptyState.jsx             # Empty states
│   │   ├── ChartErrorBoundary.jsx          # Error handling
│   │   ├── recharts/
│   │   │   └── RechartsRenderer.jsx        # Recharts implementation
│   │   ├── chartjs/
│   │   │   └── ChartJSRenderer.jsx         # Chart.js implementation
│   │   ├── victory/
│   │   │   └── VictoryRenderer.jsx         # Victory implementation
│   │   └── echarts/
│   │       └── EChartsRenderer.jsx         # ECharts implementation
│   └── analytics/                          # Analytics chart components
│       ├── AnalyticsFilters.jsx            # Filters panel
│       ├── CategoryComparisonChart.jsx     # Multi-period category comparison
│       ├── TopMoversChart.jsx              # Biggest changes between periods
│       ├── WaterfallCostChart.jsx          # Cost flow analysis
│       ├── ItemTrendsChart.jsx             # Multi-period item trends
│       ├── VarianceHeatmapChart.jsx        # Variance intensity heatmap
│       └── PerformanceRadarChart.jsx       # KPI scorecard radar
└── pages/stock_tracker/
    └── Analytics.jsx                       # Main analytics dashboard
```

## NEW Comparison Endpoints

### 1. Category Comparison (`/compare/categories/`)
**Method:** `GET`  
**Parameters:** `periods` (array of period IDs)  
**Returns:** Category values across multiple periods (2-6 periods)

```javascript
import { getCompareCategories } from '@/services/stockAnalytics';

const data = await getCompareCategories(hotelSlug, [1, 2, 3]);
// Response:
{
  categories: [
    {
      category: "Food",
      periods: [
        { period_id: 1, period_name: "Jan 2024", total_value: 5000, items_count: 50 },
        { period_id: 2, period_name: "Feb 2024", total_value: 5500, items_count: 52 }
      ]
    }
  ],
  summary: { total_value: 10500, total_items: 102, categories_count: 5 }
}
```

### 2. Top Movers (`/compare/top-movers/`)
**Method:** `GET`  
**Parameters:** `period1`, `period2`, `limit` (default: 10)  
**Returns:** Biggest increases/decreases, new items, discontinued items

```javascript
import { getTopMovers } from '@/services/stockAnalytics';

const data = await getTopMovers(hotelSlug, period1Id, period2Id, 10);
// Response:
{
  biggest_increases: [
    { item_id: 1, item_name: "Beer", period1_value: 1000, period2_value: 1500, value_change: 500, percentage_change: 50 }
  ],
  biggest_decreases: [...],
  new_items: [...],
  discontinued_items: [...],
  summary: { increases_count: 15, decreases_count: 8, new_items_count: 3, discontinued_count: 2 }
}
```

### 3. Cost Analysis Waterfall (`/compare/cost-analysis/`)
**Method:** `GET`  
**Parameters:** `period1`, `period2`  
**Returns:** Waterfall chart data showing cost flow

```javascript
import { getCostAnalysis } from '@/services/stockAnalytics';

const data = await getCostAnalysis(hotelSlug, period1Id, period2Id);
// Response:
{
  waterfall_data: [
    { label: "Opening Stock", value: 10000, type: "total" },
    { label: "Purchases", value: 5000, type: "positive" },
    { label: "Waste", value: -200, type: "negative" },
    { label: "Closing Stock", value: 14800, type: "total" }
  ],
  summary: { opening_stock: 10000, total_purchases: 5000, total_usage: 200, closing_stock: 14800 },
  breakdown: { waste: 200, transfers_in: 0, transfers_out: 0 }
}
```

### 4. Trend Analysis (`/compare/trend-analysis/`)
**Method:** `GET`  
**Parameters:** `periods` (array), `category` (optional), `items` (optional array)  
**Returns:** Multi-period item trends with volatility indicators

```javascript
import { getTrendAnalysis } from '@/services/stockAnalytics';

const data = await getTrendAnalysis(hotelSlug, [1, 2, 3], 'Food', []);
// Response:
{
  trends: [
    {
      item_id: 1,
      item_name: "Beer",
      category: "Beverages",
      values: [
        { period_id: 1, period_name: "Jan", value: 1000 },
        { period_id: 2, period_name: "Feb", value: 1200 }
      ],
      trend_direction: "increasing",  // or "decreasing", "stable", "volatile"
      volatility: "low",               // or "medium", "high"
      average_value: 1100
    }
  ]
}
```

### 5. Variance Heatmap (`/compare/variance-heatmap/`)
**Method:** `GET`  
**Parameters:** `periods` (array of period IDs)  
**Returns:** Variance intensity by category and period

```javascript
import { getVarianceHeatmap } from '@/services/stockAnalytics';

const data = await getVarianceHeatmap(hotelSlug, [1, 2, 3]);
// Response:
{
  heatmap_data: [
    {
      category: "Food",
      values: [
        { period_id: 1, period_name: "Jan", variance_percentage: 5.2 },
        { period_id: 2, period_name: "Feb", variance_percentage: -3.1 }
      ]
    }
  ],
  categories: ["Food", "Beverages", "Supplies"],
  periods: ["Jan 2024", "Feb 2024", "Mar 2024"],
  summary: { highest_variance: 15.5, average_variance: 5.2, lowest_variance: -2.1 }
}
```

### 6. Performance Scorecard (`/compare/performance-scorecard/`)
**Method:** `GET`  
**Parameters:** `period1`, `period2`  
**Returns:** KPI radar chart with improvement metrics

```javascript
import { getPerformanceScorecard } from '@/services/stockAnalytics';

const data = await getPerformanceScorecard(hotelSlug, period1Id, period2Id);
// Response:
{
  radar_chart_data: {
    metrics: ["Value Management", "Waste Control", "Turnover", "Variance Control"],
    period1_values: [85, 70, 60, 75],
    period2_values: [90, 75, 65, 80],
    period1_name: "Jan 2024",
    period2_name: "Feb 2024"
  },
  overall_score: { period1: 72.5, period2: 77.5, improvement: 5.0 },
  breakdown: {
    "Value Management": { period1: 85, period2: 90 },
    "Waste Control": { period1: 70, period2: 75 }
  },
  insights: ["Improved waste control by 7%", "Turnover rate increased"]
}
```

## Chart Library System

### UniversalChart Wrapper

All chart components use the `UniversalChart` wrapper which:
- Reads user's chart library preference from `ChartPreferencesContext`
- Lazy loads the appropriate renderer (Recharts/ChartJS/Victory/ECharts)
- Handles loading states with `ChartLoadingSkeleton`
- Catches errors with `ChartErrorBoundary`
- Displays empty states with `ChartEmptyState`

```jsx
import UniversalChart from '@/components/stock_tracker/charts/UniversalChart';

<UniversalChart
  type="bar"              // bar, line, area, pie, donut, radar
  data={chartData}        // Standard format: { labels: [], datasets: [] }
  config={chartConfig}    // Library-specific configuration
  height={400}
  onDataClick={handleClick}
/>
```

### Supported Chart Types

| Type | Recharts | Chart.js | Victory | ECharts |
|------|----------|----------|---------|---------|
| Bar | ✅ | ✅ | ✅ | ✅ |
| Line | ✅ | ✅ | ✅ | ✅ |
| Area | ✅ | ✅ | ✅ | ✅ |
| Pie | ✅ | ✅ | ✅ | ✅ |
| Donut | ✅ | ✅ | ✅ | ✅ |
| Radar | ✅ | ✅ | ❌ | ✅ |
| Composed | ✅ | ❌ | ❌ | ❌ |

### Switching Chart Libraries

Users can switch between chart libraries via:
1. **ChartPreferencesContext** (programmatically)
2. **Chart Settings Modal** (UI) - *Coming soon*

```javascript
import { useChartPreferences } from '@/context/ChartPreferencesContext';

const { chartLibrary, updateChartLibrary } = useChartPreferences();

// Switch to ECharts
updateChartLibrary('echarts'); // 'recharts' | 'chartjs' | 'victory' | 'echarts'
```

Preference is persisted in `localStorage` as `chart_preferences`.

## Analytics Components

### AnalyticsFilters

Provides filtering controls for the dashboard:

```jsx
<AnalyticsFilters
  hotelSlug={hotel_slug}
  selectedPeriods={[1, 2, 3]}           // Multi-period selection
  onPeriodsChange={setSelectedPeriods}
  period1={1}                            // Two-period comparison
  period2={2}
  onPeriod1Change={setPeriod1}
  onPeriod2Change={setPeriod2}
  selectedCategory="Food"
  onCategoryChange={setSelectedCategory}
  categories={['Food', 'Beverages']}
  onRefresh={handleRefresh}
  loading={false}
/>
```

### CategoryComparisonChart

Multi-period category comparison with stacked/grouped bars.

**Props:**
- `hotelSlug` (string) - Hotel identifier
- `selectedPeriods` (array) - Array of period IDs (2-6 periods)
- `onPeriodClick` (function) - Click handler
- `height` (number) - Chart height in pixels
- `defaultChartType` (string) - 'bar', 'line', or 'area'

### TopMoversChart

Biggest changes between two periods with tabbed views.

**Props:**
- `hotelSlug` (string)
- `period1` (number) - First period ID
- `period2` (number) - Second period ID
- `limit` (number) - Number of top movers (default: 10)
- `onItemClick` (function)
- `height` (number)

**Tabs:**
- All (top 5 increases + top 5 decreases)
- Increases (green)
- Decreases (red)
- New Items (blue)
- Discontinued Items (purple)

### WaterfallCostChart

Cost flow visualization using ECharts waterfall.

**Props:**
- `hotelSlug` (string)
- `period1` (number)
- `period2` (number)
- `onSegmentClick` (function)
- `height` (number)

Shows: Opening Stock → +Purchases → -Waste → -Transfers → Closing Stock → Usage/COGS

### ItemTrendsChart

Multi-line chart showing item value trends over time.

**Props:**
- `hotelSlug` (string)
- `selectedPeriods` (array) - 2+ periods
- `categories` (array) - Available categories
- `onItemClick` (function)
- `height` (number)

**Features:**
- Category filtering
- Chart type switching (line/area)
- Trend direction indicators (📈📉➡️)
- Volatility badges (low/medium/high)
- Summary table with trends

### VarianceHeatmapChart

Variance intensity heatmap by category and period.

**Props:**
- `hotelSlug` (string)
- `selectedPeriods` (array) - 2+ periods
- `onCellClick` (function)
- `height` (number)

Uses ECharts heatmap with color scale from blue (low) to red (high variance).

### PerformanceRadarChart

KPI scorecard comparing two periods.

**Props:**
- `hotelSlug` (string)
- `period1` (number)
- `period2` (number)
- `height` (number)

**Metrics:**
- Value Management
- Waste Control
- Turnover
- Variance Control

Shows overall score, improvement percentage, and breakdown by metric.

## Adding New Chart Components

1. **Create Component File**
   ```jsx
   // src/components/stock_tracker/analytics/MyNewChart.jsx
   import React, { useState, useEffect } from 'react';
   import UniversalChart from '../charts/UniversalChart';
   import { myApiFunction } from '@/services/stockAnalytics';
   
   const MyNewChart = ({ hotelSlug, period, height = 400 }) => {
     const [chartData, setChartData] = useState(null);
     
     useEffect(() => {
       fetchData();
     }, [hotelSlug, period]);
     
     const fetchData = async () => {
       const data = await myApiFunction(hotelSlug, period);
       setChartData(transformData(data));
     };
     
     return (
       <Card>
         <Card.Header>My New Chart</Card.Header>
         <Card.Body>
           <UniversalChart
             type="bar"
             data={chartData}
             config={{}}
             height={height}
           />
         </Card.Body>
       </Card>
     );
   };
   ```

2. **Add API Function** (if needed)
   ```javascript
   // src/services/stockAnalytics.js
   export const myApiFunction = async (hotelSlug, period) => {
     const response = await api.get(`/stock_tracker/${hotelSlug}/my-endpoint/`, {
       params: { period }
     });
     return response.data;
   };
   ```

3. **Import in Analytics Page**
   ```jsx
   // src/pages/stock_tracker/Analytics.jsx
   import MyNewChart from '@/components/stock_tracker/analytics/MyNewChart';
   
   // Add to render:
   <Col xs={12} lg={6}>
     <MyNewChart hotelSlug={hotel_slug} period={period1} />
   </Col>
   ```

## Data Format Standards

### Chart Data Format

All charts use a consistent data format compatible with all 4 libraries:

```javascript
{
  labels: ['Jan', 'Feb', 'Mar'],  // X-axis labels
  datasets: [
    {
      label: 'Dataset 1',          // Legend label
      data: [100, 200, 150],       // Y-axis values
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgb(75, 192, 192)',
      // Additional metadata for tooltips
      itemsCount: [10, 15, 12]
    }
  ]
}
```

### Pie/Donut Format

```javascript
{
  labels: ['Category A', 'Category B'],
  datasets: [{
    data: [300, 150],
    backgroundColor: ['#FF6384', '#36A2EB']
  }]
}
```

### Radar Format

```javascript
{
  labels: ['Metric 1', 'Metric 2', 'Metric 3'],
  datasets: [
    {
      label: 'Period 1',
      data: [85, 70, 60]
    },
    {
      label: 'Period 2',
      data: [90, 75, 65]
    }
  ]
}
```

## Utility Functions

### formatCurrency(value)
Formats numbers as currency with € symbol:
```javascript
formatCurrency(1234.56) // "€1,234.56"
```

### calculatePercentageChange(oldValue, newValue)
Calculates percentage change:
```javascript
calculatePercentageChange(100, 150) // 50
calculatePercentageChange(150, 100) // -33.33
```

### getVarianceColor(variance)
Returns color based on variance severity:
```javascript
getVarianceColor(2.5)  // 'green'
getVarianceColor(7.5)  // 'yellow'
getVarianceColor(12.5) // 'red'
```

## Performance Optimization

### Lazy Loading
Chart libraries are lazy loaded to reduce initial bundle size:
```javascript
const RechartsRenderer = lazy(() => import('./recharts/RechartsRenderer'));
```

### Auto-Refresh
Analytics page auto-refreshes every 5 minutes:
```javascript
useEffect(() => {
  const interval = setInterval(handleRefresh, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

### Responsive Design
- Desktop: 2-column grid, 400px charts
- Mobile: 1-column stack, 300px charts
```javascript
const isMobile = useMediaQuery({ maxWidth: 768 });
const chartHeight = isMobile ? 300 : 400;
```

## Testing Checklist

- [ ] All 6 NEW endpoints return data correctly
- [ ] Multi-period selection (2-6 periods) works
- [ ] Two-period comparison works (period1 vs period2)
- [ ] Category filtering updates relevant charts
- [ ] All 4 chart libraries render correctly
- [ ] Switching between libraries preserves data
- [ ] Loading states display properly
- [ ] Empty states show helpful messages
- [ ] Error boundaries catch and display errors
- [ ] Click handlers work on all charts
- [ ] Tooltips show formatted currency and percentages
- [ ] Responsive design works on mobile/tablet
- [ ] Auto-refresh updates charts every 5 minutes
- [ ] Last updated timestamp displays correctly

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

```json
{
  "recharts": "^2.x",
  "chart.js": "^4.x",
  "react-chartjs-2": "^5.x",
  "victory": "^36.x",
  "echarts": "^5.x",
  "echarts-for-react": "^3.x",
  "react-bootstrap": "^2.x",
  "react-icons": "^4.x",
  "react-responsive": "^9.x"
}
```

## Known Issues

1. Victory does not support radar charts - falls back to Recharts
2. Waterfall charts require ECharts for proper rendering
3. Heatmaps require ECharts for proper color scaling

## Future Enhancements

- [ ] Chart Settings Modal with live preview
- [ ] Export to PDF/Excel functionality
- [ ] Real-time updates via WebSockets
- [ ] Session caching for faster loading
- [ ] Custom color schemes
- [ ] Drill-down navigation
- [ ] Dashboard templates
- [ ] Saved filter presets

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Maintainer:** HotelMate Development Team
