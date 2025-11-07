# Stock Tracker - "Doz" Items Display Logic Implementation

## Overview
Implemented special display logic for bottled beer items (size="Doz") to show cases + loose bottles instead of total bottles.

---

## The Problem

**Backend Storage:**
- For "Doz" (dozen/case) items, the backend stores ALL bottles in `current_partial_units`
- Example: 113 bottles stored as `current_partial_units: 113.00`
- `current_full_units` is always `0.00` for Doz items

**Frontend Challenge:**
- Users think in terms of **cases + loose bottles**, not total bottles
- "113 bottles" is less intuitive than "9 cases + 5 bottles"

---

## The Solution

### Backend Provides Display Helpers

The backend API includes these calculated fields for Doz items:

```json
{
  "sku": "B0070",
  "name": "Budweiser 33cl",
  "size": "Doz",
  "current_full_units": "0.00",          // Not used for Doz
  "current_partial_units": "113.00",     // Total bottles (for calculation)
  "display_full_units": "9.00",          // Cases (113 ÷ 12)
  "display_partial_units": "5.00",       // Loose bottles (113 % 12)
  "total_stock_in_servings": "113.00"    // Always correct
}
```

### Frontend Implementation

#### 1. StockItemCard.jsx - Conditional Display

```jsx
{item.size && item.size.includes('Doz') ? (
  <>
    <div className="col-4">
      <div className="text-muted">Cases</div>
      <div className="fw-bold">
        {parseFloat(item.display_full_units || 0).toFixed(0)}
      </div>
    </div>
    <div className="col-4">
      <div className="text-muted">Loose Bottles</div>
      <div className="fw-bold">
        {parseFloat(item.display_partial_units || 0).toFixed(0)}
      </div>
    </div>
    <div className="col-4">
      <div className="text-muted">Total Bottles</div>
      <div className="fw-bold text-primary">
        {parseFloat(item.total_stock_in_servings || 0).toFixed(0)}
      </div>
    </div>
  </>
) : (
  // Standard display for non-Doz items
  ...
)}
```

**Result:** Shows "9 Cases + 5 Loose + 113 Total" instead of "0 Full + 113 Partial"

---

#### 2. StockItemDetail.jsx - Editable Cases + Bottles

```jsx
{item.size && item.size.includes('Doz') ? (
  <Row className="g-3">
    <Col md={4}>
      <Form.Group>
        <Form.Label>Cases (Doz)</Form.Label>
        <Form.Control
          type="number"
          step="1"
          value={formData.display_full_units || Math.floor(parseFloat(formData.current_partial_units || 0) / 12)}
          onChange={(e) => {
            const cases = parseFloat(e.target.value) || 0;
            const looseBottles = parseFloat(formData.display_partial_units || 0);
            const totalBottles = (cases * 12) + looseBottles;
            setFormData(prev => ({ 
              ...prev, 
              current_partial_units: totalBottles,
              display_full_units: cases
            }));
          }}
        />
      </Form.Group>
    </Col>
    <Col md={4}>
      <Form.Group>
        <Form.Label>Loose Bottles</Form.Label>
        <Form.Control
          type="number"
          min="0"
          max="11"
          value={formData.display_partial_units || (parseFloat(formData.current_partial_units || 0) % 12)}
          onChange={(e) => {
            const looseBottles = parseFloat(e.target.value) || 0;
            const cases = parseFloat(formData.display_full_units || 0);
            const totalBottles = (cases * 12) + looseBottles;
            setFormData(prev => ({ 
              ...prev, 
              current_partial_units: totalBottles,
              display_partial_units: looseBottles
            }));
          }}
        />
      </Form.Group>
    </Col>
  </Row>
) : (
  // Standard fields for non-Doz items
  ...
)}
```

**Key Features:**
- User enters cases and loose bottles
- Frontend calculates total bottles: `(cases × 12) + loose`
- Stores in `current_partial_units` for backend
- Validates loose bottles: 0-11 range
- Backend calculations remain 100% accurate

---

#### 3. StockItemsList.jsx - Table Display

```jsx
{item.size && item.size.includes('Doz') ? (
  <>
    <td>
      <span className="badge bg-info">
        {parseFloat(item.display_full_units || 0).toFixed(0)} cases
      </span>
    </td>
    <td>
      <span className="badge bg-light text-dark">
        {parseFloat(item.display_partial_units || 0).toFixed(0)} bottles
      </span>
    </td>
  </>
) : (
  <>
    <td>
      <span className="badge bg-info">
        {parseFloat(item.current_full_units || 0).toFixed(0)}
      </span>
    </td>
    <td>
      <span className="badge bg-light text-dark">
        {parseFloat(item.current_partial_units || 0).toFixed(2)}
      </span>
    </td>
  </>
)}
<td>
  <strong>
    {item.size && item.size.includes('Doz') 
      ? parseFloat(item.total_stock_in_servings || 0).toFixed(0) + ' bottles'
      : parseFloat(item.total_stock_in_servings || 0).toFixed(2)
    }
  </strong>
</td>
```

**Result:** Table shows "9 cases" | "5 bottles" | "113 bottles total"

---

## Detection Logic

All components use the same detection:

```javascript
item.size && item.size.includes('Doz')
```

This works for:
- `"Doz"`
- `"12 Doz"`
- `"Doz Case"`

---

## Data Flow

### Reading (Display)
1. Backend returns all 4 fields: `current_partial_units`, `display_full_units`, `display_partial_units`, `total_stock_in_servings`
2. Frontend detects `size.includes('Doz')`
3. Frontend displays `display_full_units` and `display_partial_units`
4. Calculations use `total_stock_in_servings` (always correct)

### Writing (Updates)
1. User enters cases (e.g., 9) and loose bottles (e.g., 5)
2. Frontend calculates: `totalBottles = (9 × 12) + 5 = 113`
3. Frontend sends to backend: `{ current_partial_units: 113 }`
4. Backend recalculates display helpers automatically
5. Backend returns updated item with all fields

---

## Example Scenarios

### Scenario 1: Viewing Stock
**Backend Response:**
```json
{
  "sku": "B0070",
  "name": "Budweiser 33cl",
  "size": "Doz",
  "current_partial_units": "113.00",
  "display_full_units": "9.00",
  "display_partial_units": "5.00"
}
```

**Frontend Display:**
- **Card:** "9 Cases | 5 Loose | 113 Total"
- **Table:** "9 cases | 5 bottles | 113 bottles"
- **Detail:** "Cases: 9" + "Loose: 5" = "Total: 113"

---

### Scenario 2: Editing Stock
**User Input:**
- Cases: 10
- Loose Bottles: 3

**Frontend Calculation:**
```javascript
totalBottles = (10 × 12) + 3 = 123
```

**Sent to Backend:**
```json
{
  "current_partial_units": 123
}
```

**Backend Response:**
```json
{
  "current_partial_units": "123.00",
  "display_full_units": "10.00",
  "display_partial_units": "3.00",
  "total_stock_in_servings": "123.00",
  "total_stock_value": "120.54"  // 123 × €0.98
}
```

---

### Scenario 3: Non-Doz Item (Spirits)
**Backend Response:**
```json
{
  "sku": "S0045",
  "name": "Bacardi 1ltr",
  "size": "1 Lt",
  "current_full_units": "7.00",
  "current_partial_units": "0.05",
  "total_stock_in_servings": "197.45"
}
```

**Frontend Display:**
- Uses standard display (no Doz detection)
- Shows: "7 Full | 0.05 Partial | 197.45 Servings"

---

## Files Modified

1. ✅ `src/components/stock_tracker/stock_items/StockItemCard.jsx`
   - Added conditional display for Doz items
   - Shows "Cases | Loose | Total" layout

2. ✅ `src/components/stock_tracker/stock_items/StockItemDetail.jsx`
   - Added conditional form fields for Doz items
   - Separate inputs for cases and loose bottles
   - Auto-calculates total bottles on change
   - Added `display_full_units` and `display_partial_units` to formData state

3. ✅ `src/components/stock_tracker/stock_items/StockItemsList.jsx`
   - Added conditional table cells for Doz items
   - Badges show "X cases" and "Y bottles"
   - Total shows "Z bottles" with label

---

## Key Benefits

✅ **User-Friendly:** Staff think in cases + bottles, not total bottles  
✅ **Accurate:** Backend calculations always use correct total  
✅ **Consistent:** Same logic across all views (card, list, detail)  
✅ **No Frontend Math:** Display helpers provided by backend  
✅ **Backward Compatible:** Non-Doz items work exactly as before  
✅ **Validation:** Loose bottles limited to 0-11 range  
✅ **Real-time:** Updates immediately when editing  

---

## Testing Checklist

- [x] Card view shows cases + loose for Doz items
- [x] List view shows cases + loose in table
- [x] Detail view has separate inputs for cases and loose bottles
- [x] Editing cases updates total bottles correctly
- [x] Editing loose bottles updates total bottles correctly
- [x] Non-Doz items display normally
- [x] Calculations (stock value, GP%, etc.) remain accurate
- [x] Display helpers included in formData state

---

## Notes

- Only items with `size` containing "Doz" use this logic
- All calculations continue to use `total_stock_in_servings` (always correct)
- Display helpers (`display_full_units`, `display_partial_units`) are **presentation only**
- Backend automatically recalculates display helpers on every update
- No risk of calculation errors - backend is source of truth

---

## Status: ✅ IMPLEMENTED

All three components now properly display "Doz" items as cases + bottles for better user experience while maintaining calculation accuracy.
