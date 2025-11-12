# Frontend Guide: Creating Periods & Stocktakes from Scratch

## Overview
This guide explains the complete workflow for creating stock periods and stocktakes in the correct order.

---

## 📋 **Step-by-Step Process**

### **1️⃣ Create a Stock Period**

A **Period** represents a time frame (week, month, quarter, year) for tracking stock.

#### **Endpoint:**
```http
POST /api/stock-tracker/{hotel_identifier}/periods/
```

#### **Request Body:**
```json
{
  "period_type": "MONTHLY",
  "start_date": "2025-11-01",
  "end_date": "2025-11-30"
}
```

#### **Period Types:**
- `WEEKLY` - 7 days
- `MONTHLY` - 1 month (most common)
- `QUARTERLY` - 3 months
- `YEARLY` - 1 year

#### **Response:**
```json
{
  "id": 123,
  "hotel": 1,
  "period_type": "MONTHLY",
  "period_name": "November 2025",
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "year": 2025,
  "month": 11,
  "is_closed": false,
  "stocktake_id": null
}
```

---

### **2️⃣ Create a Stocktake**

A **Stocktake** is the actual inventory count for a period.

#### **Endpoint:**
```http
POST /api/stock-tracker/{hotel_identifier}/stocktakes/
```

#### **Request Body:**
```json
{
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "notes": "November monthly stocktake"
}
```

#### **Response:**
```json
{
  "id": 456,
  "hotel": 1,
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "status": "DRAFT",
  "is_locked": false,
  "lines": [],
  "total_lines": 0,
  "notes": "November monthly stocktake"
}
```

**Note:** The stocktake is created **empty** (no lines yet).

---

### **3️⃣ Populate the Stocktake**

This creates all the stocktake lines with opening balances.

#### **Endpoint:**
```http
POST /api/stock-tracker/{hotel_identifier}/stocktakes/{stocktake_id}/populate/
```

#### **Request Body:**
```json
{}
```
*(No body needed)*

#### **What Happens:**
1. Backend fetches all `StockItem` records
2. For each item, calculates **opening balance**:
   - **If first stocktake:** Uses current inventory (`StockItem.total_stock_in_servings`)
   - **If NOT first:** Uses previous period's closing stock
3. Calculates **purchases, waste, transfers** from period movements
4. Creates a `StocktakeLine` for each item

#### **Opening Balance Logic:**
```
Priority Order:
1. Previous Period's Closing Stock (from StockSnapshot)
   → Example: October closing = 69.00, November opening = 69.00

2. Current Stock Inventory (for first stocktake)
   → Example: Item has 292 servings in stock, opening = 292.00

3. Historical Movements (legacy fallback)
   → Calculates from StockMovement records
```

#### **Response:**
```json
{
  "message": "Created 254 stocktake lines",
  "lines_created": 254
}
```

---

### **4️⃣ The Stocktake is Ready for Counting**

After population, GET the stocktake to see all lines:

#### **Endpoint:**
```http
GET /api/stock-tracker/{hotel_identifier}/stocktakes/{stocktake_id}/
```

#### **Response:**
```json
{
  "id": 456,
  "status": "DRAFT",
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "lines": [
    {
      "id": 1001,
      "item_sku": "B0012",
      "item_name": "Cronins 0.0%",
      "category_code": "B",
      "item_size": "Doz",
      "item_uom": 12,
      
      // Opening stock (from October closing)
      "opening_qty": "69.0000",
      "opening_display_full_units": "5",
      "opening_display_partial_units": "9",
      
      // Period movements
      "purchases": "10.8400",
      "waste": "1.0000",
      "transfers_in": "0.0000",
      "transfers_out": "0.0000",
      
      // Calculated expected
      "expected_qty": "79.8400",
      "expected_display_full_units": "6",
      "expected_display_partial_units": "8",
      
      // Counting fields (user fills these)
      "counted_full_units": 0,
      "counted_partial_units": 0,
      "counted_qty": "0.0000",
      
      // Variance (calculated)
      "variance_qty": "-79.8400",
      "variance_value": "-80.23",
      
      // Values
      "expected_value": "80.23",
      "counted_value": "0.00"
    }
    // ... 253 more items
  ],
  "total_lines": 254
}
```

---

## 🎯 **User Workflow (Frontend UI)**

### **Step 1: List Periods**
```
GET /api/stock-tracker/{hotel}/periods/
```
Show table of existing periods with status.

### **Step 2: Create New Period Button**
- Show modal with date pickers
- User selects start/end dates
- POST to create period

### **Step 3: Create Stocktake Button**
- Appears when period has no stocktake
- POST to create stocktake (auto-links to period by dates)

### **Step 4: Populate Button**
- Appears when stocktake has 0 lines
- POST to populate
- Show loading spinner (can take 2-3 seconds for 250+ items)

### **Step 5: Counting Interface**
- Show table of all lines
- Group by category (D, B, S, W, M)
- Allow input for counted_full_units and counted_partial_units
- PATCH each line as user counts:
  ```http
  PATCH /api/stock-tracker/{hotel}/stocktake-lines/{line_id}/
  {
    "counted_full_units": 5,
    "counted_partial_units": 9
  }
  ```

### **Step 6: Approve Stocktake**
- Button appears when counting is complete
- POST to approve:
  ```http
  POST /api/stock-tracker/{hotel}/stocktakes/{id}/approve/
  ```
- Creates adjustment movements for variances
- Locks the stocktake (can't edit anymore)

### **Step 7: Close Period**
- Button appears when stocktake is approved
- POST to close period (or combined approve+close):
  ```http
  POST /api/stock-tracker/{hotel}/periods/{id}/approve-and-close/
  ```

---

## 📊 **Display Data for Frontend**

### **Opening Stock Display:**
Show user-friendly units instead of raw servings:

```javascript
// Draught Beer
Opening: "5 kegs + 12.5 pints"  // Not "172.5 servings"

// Bottled Beer  
Opening: "5 cases + 9 bottles"  // Not "69 bottles"

// Spirits
Opening: "5 bottles + 0.75 shots"  // Not "105.75 servings"
```

Use these fields from the API:
- `opening_display_full_units` (kegs/cases/bottles)
- `opening_display_partial_units` (pints/bottles/shots)

### **Variance Indicators:**
```javascript
if (variance_qty < -10) {
  // Show ⚠️ warning icon (significant shortage)
} else if (variance_qty > 10) {
  // Show ⚠️ warning icon (significant surplus)
}
```

---

## 🔄 **Creating Future Periods**

### **December Stocktake (after November is closed):**

1. **Create December Period:**
   ```json
   POST /periods/
   {
     "period_type": "MONTHLY",
     "start_date": "2025-12-01",
     "end_date": "2025-12-31"
   }
   ```

2. **Create December Stocktake:**
   ```json
   POST /stocktakes/
   {
     "period_start": "2025-12-01",
     "period_end": "2025-12-31"
   }
   ```

3. **Populate:**
   ```
   POST /stocktakes/{id}/populate/
   ```
   - **Opening balance automatically comes from November's closing stock!**
   - Example: November closing = 85 bottles → December opening = 85 bottles

---

## ⚠️ **Important Notes**

### **1. Period & Stocktake Relationship:**
- Periods and Stocktakes are linked by **dates** (not FK)
- One Period = One Stocktake
- Match by `period.start_date == stocktake.period_start`

### **2. Opening Balance Source:**
```
First Stocktake (September):
  Opening = Current inventory in system

Second Stocktake (October):
  Opening = September closing stock

Third Stocktake (November):
  Opening = October closing stock
```

### **3. Zero Opening Issue (FIXED):**
The backend now correctly:
- ✅ Uses previous period's closing as opening
- ✅ Falls back to current inventory for first stocktake
- ✅ No more zero opening balances!

### **4. Repopulating:**
If opening balances are wrong:
```
1. Delete the stocktake
2. Create new stocktake
3. Populate again
```

---

## 🔧 **Common API Endpoints**

### **Get All Periods:**
```
GET /api/stock-tracker/{hotel}/periods/
```

### **Get Period with Snapshots:**
```
GET /api/stock-tracker/{hotel}/periods/{id}/
```

### **Get All Stocktakes:**
```
GET /api/stock-tracker/{hotel}/stocktakes/
```

### **Get Stocktake with Lines:**
```
GET /api/stock-tracker/{hotel}/stocktakes/{id}/
```

### **Update Counted Values:**
```
PATCH /api/stock-tracker/{hotel}/stocktake-lines/{line_id}/
{
  "counted_full_units": 5,
  "counted_partial_units": 9
}
```

### **Category Totals:**
```
GET /api/stock-tracker/{hotel}/stocktakes/{id}/category_totals/
```

---

## 📝 **Example Complete Flow**

```javascript
// 1. Create Period
const period = await fetch('/api/stock-tracker/hotel1/periods/', {
  method: 'POST',
  body: JSON.stringify({
    period_type: 'MONTHLY',
    start_date: '2025-11-01',
    end_date: '2025-11-30'
  })
});

// 2. Create Stocktake
const stocktake = await fetch('/api/stock-tracker/hotel1/stocktakes/', {
  method: 'POST',
  body: JSON.stringify({
    period_start: '2025-11-01',
    period_end: '2025-11-30'
  })
});

// 3. Populate
await fetch(`/api/stock-tracker/hotel1/stocktakes/${stocktake.id}/populate/`, {
  method: 'POST'
});

// 4. Get populated stocktake
const populated = await fetch(`/api/stock-tracker/hotel1/stocktakes/${stocktake.id}/`);

// 5. User counts inventory...
// 6. Update each line with counted values...

// 7. Approve
await fetch(`/api/stock-tracker/hotel1/stocktakes/${stocktake.id}/approve/`, {
  method: 'POST'
});

// 8. Close period
await fetch(`/api/stock-tracker/hotel1/periods/${period.id}/approve-and-close/`, {
  method: 'POST'
});
```

---

## ✅ **Summary**

1. **Create Period** → Set date range
2. **Create Stocktake** → Links to period by dates
3. **Populate** → Auto-fills opening balances + movements
4. **Count** → User enters actual inventory
5. **Approve** → Locks stocktake, creates adjustments
6. **Close Period** → Finalizes the period

**Opening balance will automatically come from previous period's closing stock!**

---

*For questions, contact backend team or check the full API documentation.*
