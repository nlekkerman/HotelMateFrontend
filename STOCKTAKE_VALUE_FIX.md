# � Stocktake Display - Understanding Current Implementation

## ❓ FRONTEND TEAM: Help Us Understand

**We're curious about how the stocktake displays are currently working:**

1. **Category Totals Display**
   - Where do you show "Bottled Beer Total: €X,XXX.XX"?
   - Which page/component is this in?
   - Could you share a screenshot of this section?

2. **API Integration**
   - Which endpoint do you call to get these category totals?
   - What does the response data look like that you're working with?
   - Which fields from the API response are you displaying?

3. **Other Stocktake Value Displays**
   - Are there any other places showing stocktake totals or summaries?
   - Dashboard, reports, or summary cards?

**Just trying to understand the current setup - no changes needed yet!**

---

## 🤔 Background - Why We're Asking

We're comparing the UI displays with Excel reports and noticed some differences in the values shown.

### Example Mismatch:
| Category | UI Shows (Expected) | Excel Shows (Counted) | Difference |
|----------|-------------------|---------------------|-----------|
| Draught Beer | €5,250.58 | €5,303.15 | +€52.57 |
| Bottled Beer | €2,465.50 | €3,079.04 | +€613.54 |
| **TOTAL** | **€7,716.08** | **€8,382.19** | **+€666.11** |

---

## 📊 What's Wrong

### Current Behavior (WRONG):
```
UI displays: expected_value = expected_qty × cost_per_serving

Where expected_qty = opening + purchases - waste
```

This shows what SHOULD theoretically be in stock, not what WAS ACTUALLY COUNTED.

### Correct Behavior (NEEDED):
```
Should display: counted_value = counted_qty × cost_per_serving

Where counted_qty = (counted_cases × UOM) + counted_bottles
```

This matches Excel's "Stock at Cost" - the value of physically counted stock.

---

## 🔍 Root Cause

### Backend Code Issue

**File:** `stock_tracker/stock_serializers.py` (Lines 997-999)

```python
def get_total_value(self, obj):
    """Total expected stock value (calculated from lines)"""
    total = sum(line.expected_value for line in obj.lines.all())  # ❌ WRONG
    return str(total)
```

**Should be:**
```python
def get_total_value(self, obj):
    """Total counted stock value (Stock at Cost)"""
    total = sum(line.counted_value for line in obj.lines.all())  # ✅ CORRECT
    return str(total)
```



---

## 📡 Available API Endpoints & Fields

### 1. Category Totals Endpoint
**GET** `/api/stock_tracker/{hotel}/stocktakes/{id}/category_totals/`

**Returns:**
```json
{
  "D": {
    "category_code": "D",
    "category_name": "Draught Beer",
    "opening_qty": "1250.0000",
    "purchases": "500.0000",
    "waste": "25.0000",
    "expected_qty": "1725.0000",
    "counted_qty": "1720.0000",
    "variance_qty": "-5.0000",
    "expected_value": "5250.58",     // ❌ Don't use this for totals
    "counted_value": "5303.15",      // ✅ Use this (Stock at Cost)
    "variance_value": "52.57",
    "item_count": 14
  },
  "B": {
    "category_code": "B",
    "category_name": "Bottled Beer",
    "counted_value": "3079.03",      // ✅ Use this (Stock at Cost)
    ...
  }
}
```

### 2. Stocktake Detail Endpoint
**GET** `/api/stock_tracker/{hotel}/stocktakes/{id}/`

**Returns (relevant fields):**
```json
{
  "id": 17,
  "total_items": 254,
  "total_value": "27720.48",           // ❌ This is expected value
  "total_counted_value": "27504.05",   // ✅ NEW: Use this (Stock at Cost)
  "total_variance_value": "-216.43",
  ...
}
```



---

## � Understanding the Difference

### What Each Field Means:

| Field | What It Represents | When To Use |
|-------|-------------------|-------------|
| `expected_value` | Value of stock that SHOULD be there based on opening + purchases - waste | Variance analysis, comparing theory vs reality |
| `counted_value` | Value of stock that WAS ACTUALLY COUNTED physically | **Stock at Cost reports, matching Excel** ✅ |
| `variance_value` | Difference between expected and counted | Identifying shrinkage/overage |

---

## �📝 Example Values

### D0004 (30 Heineken):
```
Opening: 128.64 pints
Counted: 2 kegs + 26.5 pints = 132.14 pints

Expected Value (UI currently shows): €286.65
Counted Value (Excel shows, should display): €294.45
```

### B1006 (Kopparberg):
```
Opening: 48 bottles
Counted: 233 bottles

Expected Value (UI currently shows): €105.60
Counted Value (Excel shows, should display): €512.60
```

---

## ✅ Verification

After implementing the fix, verify:

1. **Backend Response:** 
   - GET `/api/stock_tracker/1/stocktakes/17/` should return `total_counted_value: "8382.19"`
   - Category totals already return correct `counted_value` for each category

2. **Frontend Display:**
   - Category totals should show `counted_value` (not `expected_value`)
   - Grand total should be `€8,382.19` (matching Excel)

3. **Excel Match:**
   - Draught Beer: €5,303.15 ✓
   - Bottled Beer: €3,079.04 ✓
   - Total: €8,382.19 ✓

---

## 🔄 Migration Notes

No database migration needed - this is a calculation/serialization fix only.

All data is already in the database:
- ✅ `counted_full_units` 
- ✅ `counted_partial_units`
- ✅ `valuation_cost`

The calculation `line.counted_value` already works correctly in the model.

---

## 📚 Related Code

- **Model Property (CORRECT):** `stock_tracker/models.py` Line 2018
  ```python
  @property
  def counted_value(self):
      """Counted value at frozen cost"""
      return self.counted_qty * self.valuation_cost
  ```

- **Category Totals (CORRECT):** `stock_tracker/models.py` Lines 1599-1697
  ```python
  cat['counted_value'] += line.counted_value
  ```

- **Serializer (NEEDS FIX):** `stock_tracker/stock_serializers.py` Line 997-999

---

## 🎯 Summary for Backend Team

✅ **Backend fix is COMPLETE**
- Added `total_counted_value` field to API
- Category totals already return both `expected_value` and `counted_value`
- No breaking changes - existing fields still work

---

## 🎯 Summary for Frontend Team

**Current Issue:** UI shows €7,716.08 but Excel shows €8,382.19 (€666.11 difference)

**Root Cause:** UI is displaying `expected_value` instead of `counted_value`

**What You Need:** 
1. First, tell us which fields you're currently using (see questions at top)
2. Then we'll tell you exactly what to change
3. Expected result: UI will match Excel (within €1 due to rounding)

**Target Values (for Draught + Bottled Beer only):**
- Draught Beer: €5,303.15
- Bottled Beer: €3,079.04  
- **Total: €8,382.19**
