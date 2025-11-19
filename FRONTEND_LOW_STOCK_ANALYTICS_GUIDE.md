# Frontend Guide: Low Stock Analytics - LowStockChart Component

## 🚨 QUICK REFERENCE - Read This First!

```javascript
// ✅ CORRECT - Low Stock Analytics Display
const currentStock = item.unopened_units_count;  // Whole numbers: 3 bottles, 50 units
const threshold = item.low_stock_threshold;      // Reorder level: 2, 10, 50, etc.
const isLowStock = currentStock < threshold;

// ❌ WRONG - Don't use these for low stock charts!
const wrong1 = item.total_stock_in_servings;      // This is for menu sales
const wrong2 = item.total_stock_in_physical_units; // This has decimals (2.5)
const wrong3 = item.current_full_units;            // This is raw stocktake data
```

**For bottle-based categories (Wine, Spirits, Bottled Beer):**
- Use `unopened_units_count` and round DOWN with `Math.floor()` to show only full bottles
- No partial bottles shown (12.5 becomes 12)

---

## Overview
The `LowStockChart` component displays low stock analytics with:
- **Category-specific filtering** (Spirits, Wine, Bottled Beer, Draught Beer, Minerals & Syrups)
- **Whole number displays** (no decimals for bottles/kegs)
- **Current period monitoring** (no manual period selection)
- **Severity-based alerts** (critical, warning, caution)
- **Interactive bar charts** with color-coded severity levels

---

## Component Location

**File:** `c:\Users\nlekk\HotelMateFrontend\hotelmate-frontend\src\components\stock_tracker\analytics\LowStockChart.jsx`

**Usage:**
```jsx
import LowStockChart from '@/components/stock_tracker/analytics/LowStockChart';

<LowStockChart 
  hotelSlug="hotel-killarney"
  period={31}  // Current period ID
  height={400}
  servingsThreshold={50}
  thresholds={{
    critical: 20,
    warning: 35,
    caution: 50
  }}
/>
```

---

## API Integration

### Endpoint Used
```
GET /stock_tracker/{hotelSlug}/items/low-stock/?threshold={servingsThreshold}&period_id={period}
```

### Request Parameters
- `hotelSlug`: Hotel identifier (e.g., "hotel-killarney")
- `threshold`: Minimum servings threshold (default: 50)
- `period_id`: **Current period ID** (passed as prop, NOT user-selectable)

### API Service Function
```javascript
// From: @/services/stockAnalytics
export const getLowStockItems = async (hotelSlug, threshold = 50, periodId = null) => {
  try {
    const params = { threshold };
    if (periodId) {
      params.period_id = periodId;
    }
    const response = await api.get(`stock_tracker/${hotelSlug}/items/low-stock/`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};
```

---

## Key Implementation Details

### 1. Stock Calculation Logic

**For Bottle Categories (Wine, Spirits, Bottled Beer):**
```javascript
const categoryName = item.category_name || getCategoryName(item.category);
const isBottleCategory = ['Wine', 'Spirits', 'Bottled Beer'].includes(categoryName);

// Use only full/unopened units (no decimals)
let currentStock = parseFloat(item.unopened_units_count || 0);

// Round down for bottle-based items (12.5 → 12)
if (isBottleCategory) {
  currentStock = Math.floor(currentStock);
}
```

**For Other Categories:**
```javascript
// Use unopened_units_count without rounding
let currentStock = parseFloat(item.unopened_units_count || 0);
```

### 2. Severity Calculation

```javascript
const getSeverity = (currentStock, threshold) => {
  if (threshold === 0) return 'ok';
  const percentage = (currentStock / threshold) * 100;
  if (percentage === 0 || percentage < 40) return 'critical'; // 0-40% of threshold
  if (percentage < 70) return 'warning';   // 40-70% of threshold
  if (percentage < 100) return 'caution';  // 70-100% of threshold
  return 'ok';
};
```

### 3. Color Coding

```javascript
const getSeverityColor = (currentStock, threshold) => {
  if (threshold === 0) return 'rgba(40, 167, 69, 0.7)';
  const percentage = (currentStock / threshold) * 100;
  if (percentage === 0 || percentage < 40) return 'rgba(220, 53, 69, 0.7)';  // Red
  if (percentage < 70) return 'rgba(255, 193, 7, 0.7)';  // Yellow
  if (percentage < 100) return 'rgba(23, 162, 184, 0.7)'; // Cyan
  return 'rgba(40, 167, 69, 0.7)'; // Green
};
```

---

## Chart Display Features

### 1. Bar Chart Configuration

```javascript
// Display top 15 items only (prevents overcrowding)
const topItems = filteredItems.slice(0, 15);

// Labels: Item name with [OUT OF STOCK] indicator
const labels = topItems.map(item => {
  const stockInfo = item.current_stock === 0 ? ' [OUT OF STOCK]' : '';
  return `${item.item_name}${stockInfo}`;
});

// Data: Use 0.1 for zero values to show visible bar
const currentStocks = topItems.map(item => 
  item.current_stock === 0 ? 0.1 : item.current_stock
);
const actualStocks = topItems.map(item => item.current_stock); // For tooltips
```

### 2. Bar Sizing

```javascript
{
  barThickness: 'flex',        // Responsive sizing
  maxBarThickness: 40,         // Max 40px thick
  minBarLength: 2,             // Min 2px for visibility
}

// Height calculation
height={Math.max(400, Math.min(items.length * 25, 800))}
// Min: 400px, Max: 800px, Scale: 25px per item
```

### 3. Tooltip Configuration

```javascript
tooltipCallbacks: {
  label: function(context) {
    const actualValue = context.dataset.actualStocks?.[context.dataIndex] ?? context.parsed.x;
    const threshold = context.dataset.thresholds?.[context.dataIndex] || 0;
    const percentage = threshold > 0 ? ((actualValue / threshold) * 100).toFixed(1) : 0;
    
    if (actualValue === 0) {
      return `Current Stock (Physical Units): 0 units (OUT OF STOCK)`;
    }
    return `Current Stock (Physical Units): ${actualValue.toFixed(2)} units (${percentage}% of threshold)`;
  }
}
```

---

## Component Features

### ✅ Implemented Features

1. **Current Period Monitoring**
   - Uses `period` prop (passed from parent)
   - NO manual period selector
   - Displays: "Monitoring current period: {period}"

2. **Category Filtering**
   - Dropdown selector for categories
   - Shows item count per category
   - Categories: Spirits, Wine, Bottled Beer, Draught Beer, Minerals & Syrups

3. **Severity Filtering**
   - All Levels / Critical / Warning / Caution
   - Shows count badges for each severity
   - Filters both chart and table

4. **Visual Indicators**
   - Color-coded bars (red/yellow/cyan/green)
   - [OUT OF STOCK] labels for zero stock items
   - Top 15 items shown in chart (sorted by lowest stock)

5. **Detailed Table**
   - Shows ALL items (not limited to 15)
   - Columns: Item, Current Stock, Threshold, Stock %, Status
   - Sortable and filterable

6. **Whole Number Display**
   - Bottle categories: Math.floor() applied
   - No decimals shown for Wine/Spirits/Bottled Beer
   - Clean purchasing decisions

---

## State Management

```javascript
const [items, setItems] = useState([]);
const [selectedCategory, setSelectedCategory] = useState('');
const [severityFilter, setSeverityFilter] = useState('all');
const [categories, setCategories] = useState([]);
const [categorySummary, setCategorySummary] = useState(null);
const [loading, setLoading] = useState(true);
const [loadingItems, setLoadingItems] = useState(false);
const [error, setError] = useState(null);
```

---

## Data Flow

1. **Component Mount**
   ```
   hotelSlug + period props received
   ↓
   useEffect triggers fetchCategorySummary()
   ↓
   API call: getLowStockItems(hotelSlug, threshold, period)
   ↓
   Group items by category → setCategorySummary()
   ↓
   Display category counts in dropdown
   ```

2. **Category Selection**
   ```
   User selects category from dropdown
   ↓
   setSelectedCategory(category)
   ↓
   useEffect triggers fetchItemsForCategory()
   ↓
   Filter items by category
   ↓
   Apply bottle-based rounding logic
   ↓
   Calculate severity and colors
   ↓
   setItems(itemsWithSeverity)
   ↓
   Transform to chart data (top 15 items)
   ↓
   Display bar chart + full table
   ```

3. **Severity Filter**
   ```
   User selects severity level
   ↓
   setSeverityFilter(severity)
   ↓
   useEffect re-transforms chart data
   ↓
   Filter items by severity
   ↓
   Update chart and table
   ```

---

## Console Logging (Debug Panel Integration)

The component logs key events for the DebugPanel:

```javascript
// Period monitoring
console.log('🔄 Fetching low stock data for current period:', period);

// API response
console.log('📦 Low Stock API Response for Period:', period, data);
console.log('📊 Low Stock Items Count:', lowStockItems.length);
console.log('🔍 Period ID being used:', period);

// Chart data transformation
console.log('Chart Data:', topItems.map(item => ({
  name: item.item_name,
  current: item.current_stock,
  threshold: item.threshold
})));
```

**DebugPanel captures these logs automatically** with keywords:
- "low stock", "period", "threshold", "period_id"

---

## Important Notes

### ✅ DO:
- Use `unopened_units_count` for current stock
- Round DOWN with `Math.floor()` for Wine/Spirits/Bottled Beer
- Display whole numbers only
- Show top 15 items in chart (all items in table)
- Use severity colors for visual alerts
- Monitor current period only (no period selector)

### ❌ DON'T:
- Use `total_stock_in_servings` (wrong units)
- Use `total_stock_in_physical_units` (has decimals)
- Show decimal values for bottles (12.5 bottles ❌)
- Add manual period selection (removed by design)
- Display more than 15 items in chart (overcrowding)

---

## Testing Checklist

- [ ] Wine category shows whole numbers only (no decimals)
- [ ] Spirits category shows whole numbers only
- [ ] Bottled Beer shows whole numbers only
- [ ] Chart displays top 15 items with lowest stock
- [ ] Zero stock items show [OUT OF STOCK] label
- [ ] Zero stock items show small visible red bar (0.1 value)
- [ ] Tooltips show actual values (0 for out of stock)
- [ ] Severity filter works (critical/warning/caution)
- [ ] Category selector shows item counts
- [ ] Table shows all items (not limited to 15)
- [ ] Current period displayed: "Monitoring current period: {id}"
- [ ] No period selector dropdown visible
- [ ] Debug logs captured in DebugPanel
- [ ] Bar thickness appropriate (not too thick)
- [ ] Chart height scales correctly (400-800px)

---

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hotelSlug` | string | required | Hotel identifier |
| `period` | number | required | Current period ID |
| `height` | number | 400 | Chart base height |
| `onItemClick` | function | null | Click handler for items |
| `servingsThreshold` | number | 50 | Alert threshold |
| `thresholds` | object | see below | Severity thresholds |

**Default thresholds:**
```javascript
{
  critical: 20,    // < 20 servings
  warning: 35,     // 20-35 servings
  caution: 50      // 35-50 servings
}
```

---

## Summary

The `LowStockChart` component:
- ✅ Monitors **current period only** (no manual selection)
- ✅ Uses `unopened_units_count` for **whole number displays**
- ✅ Rounds DOWN for **Wine, Spirits, Bottled Beer**
- ✅ Shows **top 15 items** in chart (all items in table)
- ✅ Displays **[OUT OF STOCK]** labels with visible bars
- ✅ Provides **severity filtering** and **category grouping**
- ✅ Integrates with **DebugPanel** for monitoring
- ✅ Uses **period prop** from parent component

**No changes needed for period handling** - the component correctly uses the period prop passed from the parent Analytics Dashboard.
