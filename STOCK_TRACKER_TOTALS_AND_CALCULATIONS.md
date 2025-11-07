# Stock Tracker - Totals, Calculations & Where They're Saved

## Overview
This document explains where category totals, general totals, period comparisons, and stocktake calculations happen - whether they're **calculated on-the-fly** (frontend) or **saved in the database** (backend).

---

## 📊 Category Totals

### 1. **Stocktake Category Totals** 
**Location:** `StocktakeDetail.jsx` + `useStocktakes.js`

#### Where Calculated: **BACKEND** ✅
- **Endpoint:** `GET /stock_tracker/{hotel_slug}/stocktakes/{id}/category-totals/`
- **Hook Function:** `getCategoryTotals(stocktakeId)`

#### What It Returns:
```json
[
  {
    "category": "S",
    "category_name": "Spirits",
    "total_expected_value": 12500.00,
    "total_counted_value": 12350.00,
    "total_variance_value": -150.00,
    "variance_percentage": -1.2,
    "item_count": 85
  },
  {
    "category": "B",
    "category_name": "Bottled Beer",
    "total_expected_value": 5600.00,
    "total_counted_value": 5580.00,
    "total_variance_value": -20.00,
    "variance_percentage": -0.36,
    "item_count": 42
  }
]
```

#### Where It's Used:
- **NOT currently displayed in StocktakeDetail** (we could add a summary card)
- Available via hook: `const { getCategoryTotals } = useStocktakes(hotel_slug);`

#### Where Saved: **NOT SAVED** ❌
- Calculated on-demand from `StocktakeLine` data
- Each line has: `expected_value`, `counted_value`, `variance_value`
- Backend aggregates by category when endpoint is called

---

### 2. **Period Snapshot Category Totals**
**Location:** `PeriodSnapshotDetail.jsx`

#### Where Calculated: **FRONTEND** 🖥️
```javascript
const categoryTotals = Object.entries(groupedSnapshots).map(([categoryName, items]) => ({
  categoryName,
  itemCount: items.length,
  totalValue: items.reduce((sum, snap) => sum + parseFloat(snap.closing_stock_value || 0), 0),
  totalServings: items.reduce((sum, snap) => sum + parseFloat(snap.total_servings || 0), 0),
  avgGP: items.reduce((sum, snap) => sum + parseFloat(snap.gp_percentage || 0), 0) / items.length
}));
```

#### What It Shows:
- Total closing stock value per category
- Total servings per category
- Average GP% per category
- Item count per category

#### Where Saved: **NOT SAVED** ❌
- Calculated from `StockSnapshot` records
- Each snapshot has: `closing_stock_value`, `total_servings`, `gp_percentage`
- Frontend groups by category and sums

---

### 3. **Period Comparison Category Totals**
**Location:** `PeriodsComparison.jsx`

#### Where Calculated: **FRONTEND** 🖥️
```javascript
const categoryTotals = categories.map(cat => {
  const categoryItems = comparisonData.items.filter(item => item.category_code === cat.code);
  
  const period1Total = categoryItems.reduce((sum, item) => 
    sum + parseFloat(item.period1_value || 0), 0
  );
  const period2Total = categoryItems.reduce((sum, item) => 
    sum + parseFloat(item.period2_value || 0), 0
  );
  const changeValue = period2Total - period1Total;
  const changePercent = period1Total !== 0 ? (changeValue / period1Total) * 100 : 0;
  
  return {
    ...cat,
    period1Total,
    period2Total,
    changeValue,
    changePercent
  };
});
```

#### What It Shows:
- Period 1 total value per category
- Period 2 total value per category
- Change in € per category
- Change in % per category

#### Where Saved: **NOT SAVED** ❌
- Calculated from backend comparison data
- Backend endpoint: `/stock_tracker/{hotel_slug}/periods/compare/?period1={id1}&period2={id2}`
- Frontend aggregates by category

---

## 💰 General Totals (Overall Stock Value)

### 1. **Current Stock Value (All Items)**

#### Where Calculated: **BACKEND PER ITEM** ✅
- Each `StockItem` has calculated property: `total_stock_value`
- Formula: `total_stock_in_servings × cost_per_serving`

#### Frontend Aggregation:
```javascript
// In StockItemsList or dashboard
const totalStockValue = items.reduce((sum, item) => 
  sum + parseFloat(item.total_stock_value || 0), 0
);
```

#### Where Saved: **NOT SAVED** ❌
- Each item's value is calculated on-the-fly by backend
- Frontend sums them when needed

---

### 2. **Stocktake Total Values**

#### Where Calculated: **BACKEND PER LINE** ✅
- Each `StocktakeLine` has:
  - `expected_value` = `expected_qty × valuation_cost`
  - `counted_value` = `counted_qty × valuation_cost`
  - `variance_value` = `counted_value - expected_value`

#### Frontend Aggregation:
```javascript
// Total across all lines
const totalExpected = lines.reduce((sum, line) => 
  sum + parseFloat(line.expected_value || 0), 0
);
const totalCounted = lines.reduce((sum, line) => 
  sum + parseFloat(line.counted_value || 0), 0
);
const totalVariance = totalCounted - totalExpected;
```

#### Where Saved: **LINE LEVEL ONLY** ⚠️
- Individual line values are calculated and stored
- Overall totals calculated on-demand (not stored)

---

### 3. **Period Snapshot Total Value**

#### Where Calculated: **BACKEND PER SNAPSHOT** ✅
- Each `StockSnapshot` has: `closing_stock_value`
- Formula: `total_servings × cost_per_serving`

#### Frontend Aggregation:
```javascript
// Total for a period
const periodTotal = snapshots.reduce((sum, snap) => 
  sum + parseFloat(snap.closing_stock_value || 0), 0
);
```

#### Where Saved: **SNAPSHOT LEVEL ONLY** ⚠️
- Individual snapshot values are frozen at period close
- Period total calculated on-demand (not stored)

---

## 🔄 Period Comparison Logic

### How It Works:

#### 1. **Backend Endpoint**
```
GET /stock_tracker/{hotel_slug}/periods/compare/?period1={id1}&period2={id2}
```

#### 2. **What Backend Returns**
```json
{
  "period1": {
    "id": 1,
    "period_name": "September 2025",
    "start_date": "2025-09-01",
    "end_date": "2025-09-30"
  },
  "period2": {
    "id": 2,
    "period_name": "October 2025",
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  },
  "categories": [
    {"code": "S", "name": "Spirits"},
    {"code": "B", "name": "Bottled Beer"}
  ],
  "items": [
    {
      "item_id": 1,
      "item_sku": "S0045",
      "item_name": "Bacardi 1ltr",
      "category_code": "S",
      "category_name": "Spirits",
      "period1_servings": 170.25,
      "period1_value": 150.00,
      "period2_servings": 197.45,
      "period2_value": 174.02,
      "change_servings": 27.20,
      "change_value": 24.02,
      "change_percentage": 16.01
    }
  ]
}
```

#### 3. **Where Saved: BACKEND CALCULATES, NOT SAVED** ❌
- Backend queries `StockSnapshot` for both periods
- Matches items by SKU
- Calculates differences on-the-fly
- **No comparison records are saved**

#### 4. **Frontend Display**
- Receives comparison data
- Groups by category (frontend)
- Calculates category totals (frontend)
- Shows visual indicators (arrows, badges)

---

## 📦 Stocktake Workflow & Calculations

### Step-by-Step: What Gets Saved Where

#### 1. **Create Stocktake**
```javascript
POST /stock_tracker/{hotel_slug}/stocktakes/
{
  "period_start": "2025-10-01",
  "period_end": "2025-10-31"
}
```
**Saved:** `Stocktake` record (status: DRAFT)

---

#### 2. **Populate Lines**
```javascript
POST /stock_tracker/{hotel_slug}/stocktakes/{id}/populate/
```

**Backend Creates:**
- One `StocktakeLine` per active `StockItem`

**Each Line Saves:**
```javascript
{
  "opening_qty": 170.25,        // From previous period snapshot or current stock
  "purchases": 56.40,           // Sum of PURCHASE movements in period
  "sales": 85.20,               // Sum of SALE movements in period
  "waste": 2.10,                // Sum of WASTE movements in period
  "valuation_cost": 0.88,       // Frozen cost at this moment
  "counted_full_units": null,   // User will enter
  "counted_partial_units": null // User will enter
}
```

**Calculated Properties (NOT SAVED):**
- `expected_qty` = opening + purchases - sales - waste
- `counted_qty` = (full × UOM) + partial
- `variance_qty` = counted - expected
- `expected_value` = expected_qty × valuation_cost
- `counted_value` = counted_qty × valuation_cost
- `variance_value` = counted_value - expected_value

---

#### 3. **Count Items (User Input)**
```javascript
PATCH /stock_tracker/{hotel_slug}/stocktake-lines/{lineId}/
{
  "counted_full_units": 7,
  "counted_partial_units": 0.05
}
```

**Saved:** `counted_full_units` and `counted_partial_units` in `StocktakeLine`

**Backend Recalculates:**
- `counted_qty` = (7 × 28.2) + 0.05 = 197.45
- `variance_qty` = 197.45 - 139.35 = +58.10
- `counted_value` = 197.45 × 0.88 = €173.76
- `variance_value` = €173.76 - €122.63 = +€51.13

**Displayed in Frontend via:**
- `StocktakeLines.jsx` component
- Grouped by category
- Color-coded variance badges

---

#### 4. **Approve Stocktake**
```javascript
POST /stock_tracker/{hotel_slug}/stocktakes/{id}/approve/
```

**Backend Actions:**

1. **Updates Stocktake:**
   - `status` = 'APPROVED'
   - `approved_at` = current timestamp
   - `approved_by` = current user

2. **Creates StockMovements:**
   - One `ADJUSTMENT` movement per line with variance
   - `quantity` = variance_qty
   - `reference` = "Stocktake #{id} Adjustment"

3. **Updates StockItem:**
   - `current_partial_units` += variance_qty
   - (Backend auto-converts to full/partial as needed)

4. **Creates StockPeriod (if doesn't exist):**
   - `period_type` = 'MONTHLY'
   - `start_date` = stocktake.period_start
   - `end_date` = stocktake.period_end
   - `is_closed` = True

5. **Creates StockSnapshots:**
   - One snapshot per item with counted values
   - Freezes: closing_full_units, closing_partial_units, unit_cost, menu_price
   - Links to the period

**What's Saved:**
- ✅ Stocktake status (APPROVED)
- ✅ Stock movements (adjustments)
- ✅ Updated current stock levels
- ✅ Period record (closed)
- ✅ Snapshots (frozen historical data)

**What's NOT Saved:**
- ❌ Total variance amounts (calculated on-demand)
- ❌ Category totals (calculated on-demand)
- ❌ Comparison results (calculated on-demand)

---

## 📍 Where to Add Missing UI Elements

### 1. **Stocktake Category Totals Summary**

**Add to:** `StocktakeDetail.jsx`

**After the info card, before lines:**
```jsx
{lines.length > 0 && (
  <CategoryTotalsSummary stocktakeId={id} hotelSlug={hotel_slug} />
)}
```

**New Component:** `CategoryTotalsSummary.jsx`
```jsx
export const CategoryTotalsSummary = ({ stocktakeId, hotelSlug }) => {
  const [totals, setTotals] = useState([]);
  const { getCategoryTotals } = useStocktakes(hotelSlug);
  
  useEffect(() => {
    const loadTotals = async () => {
      const data = await getCategoryTotals(stocktakeId);
      setTotals(data);
    };
    loadTotals();
  }, [stocktakeId]);
  
  return (
    <Card className="mb-4">
      <Card.Header className="bg-info text-white">
        <h5 className="mb-0">Category Summary</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table hover size="sm" className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Category</th>
              <th className="text-end">Expected Value</th>
              <th className="text-end">Counted Value</th>
              <th className="text-end">Variance</th>
              <th className="text-end">Items</th>
            </tr>
          </thead>
          <tbody>
            {totals.map(cat => (
              <tr key={cat.category}>
                <td><strong>{cat.category_name}</strong></td>
                <td className="text-end">€{cat.total_expected_value.toFixed(2)}</td>
                <td className="text-end">€{cat.total_counted_value.toFixed(2)}</td>
                <td className="text-end">
                  <Badge bg={cat.total_variance_value < 0 ? 'danger' : 'success'}>
                    {cat.total_variance_value >= 0 ? '+' : ''}€{cat.total_variance_value.toFixed(2)}
                  </Badge>
                </td>
                <td className="text-end"><Badge bg="secondary">{cat.item_count}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};
```

---

### 2. **General Stock Value Dashboard**

**Create:** `src/components/stock_tracker/dashboard/StockDashboard.jsx`

```jsx
export const StockDashboard = () => {
  const { hotel_slug } = useParams();
  const { items } = useStockItems(hotel_slug);
  
  // Calculate totals
  const totalValue = items.reduce((sum, item) => 
    sum + parseFloat(item.total_stock_value || 0), 0
  );
  
  const categoryBreakdown = items.reduce((acc, item) => {
    const cat = item.category_name || 'Unknown';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += parseFloat(item.total_stock_value || 0);
    return acc;
  }, {});
  
  return (
    <Container>
      <h2>Stock Overview</h2>
      
      {/* Total Value Card */}
      <Card className="mb-4">
        <Card.Body>
          <h3 className="text-success">€{totalValue.toFixed(2)}</h3>
          <p className="text-muted">Total Stock Value</p>
        </Card.Body>
      </Card>
      
      {/* Category Breakdown */}
      <Row>
        {Object.entries(categoryBreakdown).map(([cat, value]) => (
          <Col md={3} key={cat}>
            <Card>
              <Card.Body>
                <h5>{cat}</h5>
                <h4 className="text-primary">€{value.toFixed(2)}</h4>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};
```

---

## 📋 Summary Table

| Calculation Type | Where Calculated | Where Saved | Component |
|-----------------|------------------|-------------|-----------|
| **Item Stock Value** | Backend (per item) | ❌ Calculated | StockItem.total_stock_value |
| **Line Expected Value** | Backend (per line) | ❌ Calculated | StocktakeLine.expected_value |
| **Line Counted Value** | Backend (per line) | ❌ Calculated | StocktakeLine.counted_value |
| **Line Variance** | Backend (per line) | ❌ Calculated | StocktakeLine.variance_value |
| **Stocktake Category Totals** | Backend API | ❌ Calculated | `/stocktakes/{id}/category-totals/` |
| **Period Snapshot Value** | Backend (per snapshot) | ✅ Frozen | StockSnapshot.closing_stock_value |
| **Period Total** | Frontend | ❌ Calculated | Sum of snapshots |
| **Period Comparison** | Backend API | ❌ Calculated | `/periods/compare/` |
| **Category Comparison Totals** | Frontend | ❌ Calculated | PeriodsComparison.jsx |
| **Stock Adjustments** | Backend | ✅ Saved | StockMovement (ADJUSTMENT) |
| **Updated Stock Levels** | Backend | ✅ Saved | StockItem.current_partial_units |

---

## 🎯 Key Takeaways

1. **Most totals are calculated on-demand, NOT saved**
   - Reduces database size
   - Always shows current data
   - No synchronization issues

2. **What IS saved:**
   - Individual item stock levels
   - Individual stocktake line counts
   - Historical snapshots (frozen at period close)
   - Stock movements (adjustments, purchases, sales)

3. **Backend provides endpoints for:**
   - Category totals (stocktakes)
   - Period comparisons
   - All calculated metrics (GP%, variance, etc.)

4. **Frontend calculates:**
   - Category aggregations for display
   - Period snapshot totals
   - Visual indicators and formatting

5. **Approval process saves:**
   - Adjusted stock levels
   - Movement records
   - Period snapshots
   - Stocktake status

---

## Status: ✅ DOCUMENTED

All calculation logic is **working** but some **UI elements** (like category totals summary in stocktake detail) could be **added for better UX**.
