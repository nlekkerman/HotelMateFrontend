# Purchases and Waste Backend Operations

## Overview
When entering purchases and waste for stocktake items, the frontend sends movement data to the backend, which creates permanent `StockMovement` records (hotel-wide audit trail) and recalculates the stocktake line's expected quantities and variance by summing all movements during the stocktake period.

**Important:** The backend uses `StockMovement` (not `StocktakeMovement`). Movements are hotel-wide inventory records, not line-specific entries.

---

## 1. Purchases Flow

### User Action
- User enters a quantity in the "Purchases" input field (e.g., `5.5`)
- Clicks the "💾 Save" button

### Frontend Processing
```javascript
const handleSavePurchases = async (lineId, line) => {
  // 1. Validate input
  const purchasesQty = parseFloat(inputs.purchasesQty);
  if (isNaN(purchasesQty) || purchasesQty <= 0) {
    // Show error
    return;
  }

  // 2. Prepare payload
  const payload = {
    movement_type: 'PURCHASE',
    quantity: purchasesQty,
    notes: 'Added via stocktake',
  };

  // 3. Send to backend
  const response = await api.post(
    `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
    payload
  );

  // 4. Update UI with backend response
  onLineUpdated(response.data.line);
}
```

### Backend Endpoint
**POST** `/api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/add-movement/`

### Backend Processing
1. **Create Movement Record**
   - Creates a new `StockMovement` entry (permanent audit trail)
   - Links to: `hotel`, `item`, `period` (StockPeriod)
   - Stores: `movement_type='PURCHASE'`, `quantity`, `unit_cost`, `reference`, `notes`, `timestamp`, `staff`
   - This is a **hotel-wide** inventory record, not line-specific

2. **Recalculate Cumulative Purchases**
   - **Queries ALL `StockMovement` records** for this item during the stocktake period
   - **Sums** all PURCHASE movements: `purchases = SUM(quantity WHERE movement_type='PURCHASE')`
   - Example: If movements are [3.0, 2.5], then `purchases = 5.5`
   - **Not** a simple increment - always recalculated from source

3. **Recalculate Expected Quantity**
   ```
   expected_qty = opening_qty + purchases - waste
   ```
   - Example:
     - `opening_qty = 10.0`
     - `purchases = 5.5` (cumulative)
     - `waste = 2.0`
     - `expected_qty = 10.0 + 5.5 - 2.0 = 13.5`

4. **Recalculate Variance**
   ```
   variance_qty = counted_qty - expected_qty
   variance_value = variance_qty × item_cost
   ```
   - Example:
     - `counted_qty = 12.0`
     - `expected_qty = 13.5`
     - `variance_qty = 12.0 - 13.5 = -1.5` (shortage)
     - `variance_value = -1.5 × €10 = -€15.00`

5. **Calculate Display Units**
   - Splits quantities back into full/partial units for display
   - Applies category-specific rounding rules
   - Example for Beer (UOM=12):
     - `variance_qty = -1.5`
     - `full_units = -0` (cases)
     - `partial_units = -1.50` (bottles)

### Response
Returns the updated line with:
- `purchases`: New cumulative total
- `expected_qty`: Recalculated expected quantity
- `expected_display_full_units`: Display value
- `expected_display_partial_units`: Display value
- `expected_value`: Expected stock value
- `variance_qty`: Recalculated variance
- `variance_value`: Recalculated variance value
- `variance_display_full_units`: Display value
- `variance_display_partial_units`: Display value

---

## 2. Waste Flow

### User Action
- User enters a quantity in the "Waste" input field (e.g., `2.0`)
- Clicks the "💾 Save" button

### Frontend Processing
```javascript
const handleSaveWaste = async (lineId, line) => {
  // 1. Validate input
  const wasteQty = parseFloat(inputs.wasteQuantity);
  if (isNaN(wasteQty) || wasteQty <= 0) {
    // Show error
    return;
  }

  // 2. Prepare payload
  const payload = {
    movement_type: 'WASTE',
    quantity: wasteQty,
    notes: 'Added via stocktake',
  };

  // 3. Send to backend
  const response = await api.post(
    `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
    payload
  );

  // 4. Update UI with backend response
  onLineUpdated(response.data.line);
}
```

### Backend Endpoint
**POST** `/api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/add-movement/`

### Backend Processing
1. **Create Movement Record**
   - Creates a new `StockMovement` entry (permanent audit trail)
   - Links to: `hotel`, `item`, `period` (StockPeriod)
   - Stores: `movement_type='WASTE'`, `quantity`, `unit_cost`, `reference`, `notes`, `timestamp`, `staff`
   - This is a **hotel-wide** inventory record, not line-specific

2. **Recalculate Cumulative Waste**
   - **Queries ALL `StockMovement` records** for this item during the stocktake period
   - **Sums** all WASTE movements: `waste = SUM(quantity WHERE movement_type='WASTE')`
   - Example: If movements are [1.0, 2.0], then `waste = 3.0`
   - **Not** a simple increment - always recalculated from source

3. **Recalculate Expected Quantity**
   ```
   expected_qty = opening_qty + purchases - waste
   ```
   - Example:
     - `opening_qty = 10.0`
     - `purchases = 5.5`
     - `waste = 3.0` (cumulative)
     - `expected_qty = 10.0 + 5.5 - 3.0 = 12.5`

4. **Recalculate Variance**
   ```
   variance_qty = counted_qty - expected_qty
   variance_value = variance_qty × item_cost
   ```
   - Example:
     - `counted_qty = 12.0`
     - `expected_qty = 12.5`
     - `variance_qty = 12.0 - 12.5 = -0.5` (shortage)
     - `variance_value = -0.5 × €10 = -€5.00`

5. **Calculate Display Units**
   - Same as purchases flow

### Response
Returns the updated line with all recalculated fields.

---

## 3. Complete Example Flow

### Initial State
```
opening_qty: 10.0 servings
purchases: 0.0
waste: 0.0
expected_qty: 10.0
counted_qty: null
variance_qty: null
```

### Step 1: Add Purchases (5.5 servings)
**Request:**
```json
POST /api/stock_tracker/hotel-slug/stocktake-lines/123/add-movement/
{
  "movement_type": "PURCHASE",
  "quantity": 5.5,
  "notes": "Added via stocktake"
}
```

**Backend Updates:**
```
purchases: 0.0 + 5.5 = 5.5
expected_qty: 10.0 + 5.5 - 0.0 = 15.5
```

**Response:**
```json
{
  "line": {
    "id": 123,
    "opening_qty": "10.0000",
    "purchases": "5.5000",
    "waste": "0.0000",
    "expected_qty": "15.5000",
    "expected_display_full_units": "1",
    "expected_display_partial_units": "3.50",
    "expected_value": "155.00",
    // ... other fields
  }
}
```

### Step 2: Add Waste (2.0 servings)
**Request:**
```json
POST /api/stock_tracker/hotel-slug/stocktake-lines/123/add-movement/
{
  "movement_type": "WASTE",
  "quantity": 2.0,
  "notes": "Added via stocktake"
}
```

**Backend Updates:**
```
waste: 0.0 + 2.0 = 2.0
expected_qty: 10.0 + 5.5 - 2.0 = 13.5
```

**Response:**
```json
{
  "line": {
    "id": 123,
    "opening_qty": "10.0000",
    "purchases": "5.5000",
    "waste": "2.0000",
    "expected_qty": "13.5000",
    "expected_display_full_units": "1",
    "expected_display_partial_units": "1.50",
    "expected_value": "135.00",
    // ... other fields
  }
}
```

### Step 3: Count Stock (12.0 servings)
**Request:**
```json
PATCH /api/stock_tracker/hotel-slug/stocktake-lines/123/
{
  "counted_full_units": 1,
  "counted_partial_units": 0
}
```

**Backend Updates:**
```
counted_qty: (1 × 12) + 0 = 12.0
variance_qty: 12.0 - 13.5 = -1.5 (shortage)
variance_value: -1.5 × €10 = -€15.00
```

**Response:**
```json
{
  "id": 123,
  "counted_qty": "12.0000",
  "counted_full_units": 1,
  "counted_partial_units": "0.00",
  "expected_qty": "13.5000",
  "variance_qty": "-1.5000",
  "variance_value": "-15.00",
  "variance_display_full_units": "-0",
  "variance_display_partial_units": "-1.50"
}
```

---

## 4. Movement History

All purchases and waste are stored as individual `StockMovement` records (hotel-wide audit trail) with:
- `movement_type`: 'PURCHASE' or 'WASTE' (also supports SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, etc.)
- `quantity`: Amount added/removed
- `unit_cost`: Optional cost per unit
- `reference`: Optional reference (e.g., invoice number)
- `notes`: Description
- `timestamp`: When the movement was recorded
- `staff`: Who created the movement
- `hotel`: Link to hotel
- `item`: Link to stock item
- `period`: Link to StockPeriod (which determines the stocktake date range)

**Important:** Movements are linked to `StockPeriod` and `StockItem`, NOT directly to stocktake lines. Multiple stocktakes can reference the same movements.

### Viewing Movement History
Users can view all movements for an item during the stocktake period:
- **Endpoint:** `GET /api/stock_tracker/{hotel}/stocktake-lines/{line_id}/movements/`
- Returns all movements for that item within the stocktake's date range

### Editing/Deleting Movements
When a movement is edited or deleted, the backend:
1. Updates/removes the `StockMovement` record
2. **Re-queries ALL movements** for that item during the period
3. **Recalculates** cumulative purchases/waste by summing
4. Recalculates expected quantity: `opening + purchases - waste`
5. Recalculates variance: `counted - expected`
6. Broadcasts update via Pusher to all connected clients

---

## 5. Key Principles

### ✅ Cumulative Tracking via Recalculation
- Purchases and waste are **cumulative** - but NOT simple increments
- Backend **recalculates** totals by querying and summing ALL `StockMovement` records
- `purchases` = SUM of all PURCHASE movements during the period
- `waste` = SUM of all WASTE movements during the period
- This ensures consistency even if movements are edited/deleted

### ✅ Automatic Recalculation
- Backend recalculates everything automatically
- Frontend never performs optimistic updates
- UI always displays authoritative backend data

### ✅ Audit Trail
- Every purchase/waste entry creates a timestamped movement record
- Full history is preserved and can be reviewed
- Movements can be individually deleted if errors occur

### ✅ Real-Time Sync
- Changes are broadcast via Pusher to all connected clients
- Multiple users can work simultaneously
- UI updates instantly across all devices

---

## 6. Critical Implementation Detail: SUM vs INCREMENT

### ❌ What Frontend Might Assume (WRONG):
```javascript
// Simple increment approach (DON'T DO THIS)
line.purchases += newPurchase;  // 3.0 + 5.5 = 8.5
```

### ✅ What Backend Actually Does (CORRECT):
```python
# Backend recalculates from source of truth
from django.db.models import Sum

# Query ALL movements for this item during period
movements = StockMovement.objects.filter(
    item=line.item,
    hotel=line.stocktake.hotel,
    timestamp__gte=line.stocktake.period_start,
    timestamp__lte=line.stocktake.period_end
)

# Recalculate totals
purchases = movements.filter(
    movement_type='PURCHASE'
).aggregate(Sum('quantity'))['quantity__sum'] or 0

waste = movements.filter(
    movement_type='WASTE'
).aggregate(Sum('quantity'))['quantity__sum'] or 0

# Update line
line.purchases = purchases  # Result: 8.5
line.waste = waste
line.save()
```

**Why This Matters:**
- Backend is **authoritative** - frontend must trust its calculations
- If a movement is deleted, backend re-sums remaining movements
- No risk of cumulative arithmetic errors from increments
- Multiple stocktakes for same period see consistent data

---

## 7. Category-Specific Behavior

### All Categories
- Purchases and waste are **always tracked in servings** (base unit)
- User input allows up to 2 decimal places (e.g., `5.50`)
- Backend stores values with 4 decimal precision

### SYRUPS
- Servings = bottles (no conversion)
- Input: `2.5` → Backend: `2.5000` servings

### Beer (Bottled - Doz)
- Servings = bottles
- 1 case = 12 bottles (UOM=12)
- Input: `2.5` → Backend: `2.5000` bottles

### BIB (Bag-in-Box)
- Servings = boxes
- Each box contains multiple drink servings
- Backend calculates both box variance and drink serving variance

### All Other Categories
- Standard serving-based tracking
- UOM defines how many servings per full unit

---

## 8. Movement Management Endpoints

### Get Movement History
**GET** `/api/stock_tracker/{hotel}/stocktake-lines/{line_id}/movements/`

**Response:**
```json
{
  "movements": [
    {
      "id": 123,
      "movement_type": "PURCHASE",
      "quantity": "10.5000",
      "unit_cost": "2.50",
      "reference": "INV-12345",
      "notes": "Manual entry from stocktake",
      "timestamp": "2024-11-18T10:30:00Z",
      "staff_name": "John Doe"
    },
    {
      "id": 124,
      "movement_type": "WASTE",
      "quantity": "2.0000",
      "notes": "Broken bottles",
      "timestamp": "2024-11-18T11:00:00Z",
      "staff_name": "Jane Smith"
    }
  ],
  "summary": {
    "total_purchases": "15.5000",
    "total_waste": "2.0000",
    "movement_count": 2
  }
}
```

### Delete Movement
**DELETE** `/api/stock_tracker/{hotel}/stocktake-lines/{line_id}/delete-movement/{movement_id}/`

**Response:**
```json
{
  "message": "Movement deleted successfully",
  "deleted_movement": {
    "id": 123,
    "movement_type": "PURCHASE",
    "quantity": "10.5000"
  },
  "line": {
    "id": 456,
    "purchases": "5.0000",  // Recalculated after deletion
    "waste": "2.0000",
    "expected_qty": "13.0000",  // Recalculated
    "variance_qty": "-3.0000"  // Recalculated
  }
}
```

### Update Movement
**PATCH** `/api/stock_tracker/{hotel}/stocktake-lines/{line_id}/update-movement/{movement_id}/`

**Request:**
```json
{
  "movement_type": "PURCHASE",
  "quantity": 15.0,  // Changed from 10.5
  "unit_cost": 2.75,
  "reference": "INV-12345-UPDATED",
  "notes": "Corrected quantity"
}
```

**Response:**
```json
{
  "message": "Movement updated successfully",
  "movement": {
    "id": 123,
    "movement_type": "PURCHASE",
    "quantity": "15.0000",
    "unit_cost": "2.75",
    "reference": "INV-12345-UPDATED",
    "notes": "Corrected quantity"
  },
  "old_values": {
    "quantity": "10.5000",
    "unit_cost": "2.50"
  },
  "line": {
    "id": 456,
    "purchases": "20.0000",  // Recalculated after update
    "expected_qty": "22.0000",  // Recalculated
    "variance_qty": "-2.0000"  // Recalculated
  }
}
```

---

## 9. Error Handling

### Frontend Validation
- Must be a positive number
- Must be greater than 0
- Allows up to 2 decimal places

### Backend Validation
- Validates movement_type is valid
- Validates quantity is positive
- Prevents negative cumulative totals
- Returns detailed error messages if validation fails

### User Feedback
- Success: UI updates silently with new values
- Error: Red validation message displayed below input
- Clear input field after successful save
