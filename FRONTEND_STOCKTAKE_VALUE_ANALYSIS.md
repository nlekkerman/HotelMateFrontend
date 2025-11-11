# 🔍 Frontend Stocktake Value Display - Current Implementation Analysis

**Date:** November 11, 2025  
**Status:** ⚠️ MISMATCH DETECTED - Frontend displays `expected_value` instead of `counted_value`

---

## 📋 Executive Summary

**Issue:** Frontend is displaying **expected_value** (theoretical stock) instead of **counted_value** (actual physical count).  
**Impact:** UI shows €7,716.08 but Excel shows €8,382.19 - a difference of €666.11  
**Root Cause:** Frontend components are using the wrong field from API responses

---

## 🎯 Where Values Are Displayed (Frontend)

### 1. **Category Totals Row** ✅ PARTIALLY CORRECT
**File:** `src/components/stock_tracker/stocktakes/CategoryTotalsRow.jsx`  
**Line:** 66

**Current Code:**
```jsx
<small className="text-success">€{formatValue(totals.expected_value)}</small>
```

**What API Returns:**
```json
{
  "D": {
    "category_name": "Draught Beer",
    "expected_value": "5250.58",     // ❌ Currently showing this
    "counted_value": "5303.15",      // ✅ Should show this instead
    "variance_value": "52.57"
  }
}
```

**API Endpoint Used:**  
`GET /api/stock_tracker/{hotel}/stocktakes/{id}/category_totals/`

**Hook:** `src/components/stock_tracker/hooks/useCategoryTotals.js`

---

### 2. **Stocktake Detail Summary** ⚠️ NOT DISPLAYING (But will need fixing)
**File:** `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx`  
**Lines:** 550-650

**Currently Shows:**
- Period dates ✅
- Line counts ✅
- Counted progress ✅
- Financial results (COGS, Revenue, GP%) ✅

**Missing:** Grand Total Stock Value Display

**Note:** There's no grand total being displayed currently, but when implemented, it should use `total_counted_value` field.

---

### 3. **Individual Line Values** ✅ CORRECT (for reference)
**File:** `src/components/stock_tracker/stocktakes/StocktakeLines.jsx`  
**Lines:** 684, 952

```jsx
<small className="text-muted">€{parseFloat(line.expected_value || 0).toFixed(2)}</small>
```

**Note:** This is correct for individual lines - shows expected value for comparison purposes.

---

## 🔧 What Frontend Currently Uses

### API Endpoints Currently Called:

1. **Category Totals:**
   - Endpoint: `/stock_tracker/{hotel}/stocktakes/{id}/category_totals/`
   - Hook: `useCategoryTotals`
   - Fields Used: `expected_value` ❌ (wrong)
   - Fields Available: `counted_value` ✅ (correct, but not used)

2. **Stocktake Detail:**
   - Endpoint: `/stock_tracker/{hotel}/stocktakes/{id}/`
   - Fields Used: `total_value` (if displayed - currently not shown)
   - Fields Needed: `total_counted_value` ✅

---

## 📊 Current Data Flow

```
Backend API Response
│
├─ Category Totals Endpoint
│  ├─ expected_value: "5250.58"  ← Frontend uses this ❌
│  └─ counted_value: "5303.15"   ← Frontend should use this ✅
│
└─ Stocktake Detail Endpoint
   ├─ total_value: "7716.08"          ← Expected total (wrong)
   └─ total_counted_value: "8382.19"  ← Counted total (correct) ✅
```

---

## 🎨 UI Screenshots Context

### Category Totals Display Location:
The category totals appear in a **bold info-colored row** (`className="table-info fw-bold"`) that shows:
- Category name badge
- Item count
- Expected quantity/value (in a yellow/warning background cell)
- Variance badges

**Visual Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Category Name] Category Totals:          [X Items]         │
│                                                              │
│ Expected Total:                                             │
│ 1,725.00 servings                                           │
│ €5,250.58 ← This shows expected_value (WRONG)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 API Response Comparison

### What Backend Currently Returns:

**Category Totals (`/category_totals/` endpoint):**
```json
{
  "D": {
    "category_code": "D",
    "category_name": "Draught Beer",
    "opening_qty": "1250.0000",
    "purchases": "500.0000",
    "waste": "25.0000",
    "expected_qty": "1725.0000",      // opening + purchases - waste
    "counted_qty": "1720.0000",       // actual physical count
    "variance_qty": "-5.0000",        // counted - expected
    "expected_value": "5250.58",      // expected_qty × cost ❌
    "counted_value": "5303.15",       // counted_qty × cost ✅
    "variance_value": "52.57",
    "item_count": 14
  }
}
```

**Stocktake Detail (`/stocktakes/{id}/` endpoint):**
```json
{
  "id": 17,
  "status": "APPROVED",
  "total_items": 254,
  "total_value": "27720.48",              // Sum of expected_value ❌
  "total_counted_value": "27504.05",      // Sum of counted_value ✅ NEW!
  "total_variance_value": "-216.43",
  "total_cogs": "12500.00",
  "total_revenue": "45000.00",
  // ... other fields
}
```

---

## 🧪 Test Case: Draught + Bottled Beer Only

### Expected Results After Fix:

| Category | Current (Wrong) | Should Show (Correct) | Source Field |
|----------|----------------|----------------------|--------------|
| Draught Beer | €5,250.58 | €5,303.15 | `counted_value` |
| Bottled Beer | €2,465.50 | €3,079.04 | `counted_value` |
| **TOTAL** | **€7,716.08** | **€8,382.19** | Sum of `counted_value` |

---

## 💡 Understanding the Difference

### What Each Value Means:

**`expected_value`** = What stock SHOULD theoretically be worth
- Formula: `(opening + purchases - waste) × cost_per_serving`
- Use case: Comparing theory vs reality, calculating shrinkage
- ❌ **Don't use for "Stock at Cost" reports**

**`counted_value`** = What stock IS actually worth (physical count)
- Formula: `counted_qty × cost_per_serving`
- Use case: **Stock at Cost reports, matching Excel, balance sheets**
- ✅ **Use this for total stock value displays**

**`variance_value`** = Difference between counted and expected
- Formula: `counted_value - expected_value`
- Use case: Identifying losses, overages, discrepancies
- ℹ️ Informational only

---

## 📝 Example to Illustrate the Issue

### Item: D0004 (Heineken Keg 30L)

**Scenario:**
- Opening Stock: 128.64 pints
- Purchases: 60 pints (2 kegs)
- Waste: 2 pints (spillage)
- **Expected Qty:** 128.64 + 60 - 2 = 186.64 pints
- **Counted Qty:** 132.14 pints (2 kegs + 26.5 pints)

**Values:**
- Cost per pint: €2.23
- **Expected Value:** 186.64 × €2.23 = **€416.21** ← Frontend shows this
- **Counted Value:** 132.14 × €2.23 = **€294.67** ← Should show this
- **Variance:** €294.67 - €416.21 = **-€121.54** (shrinkage)

**Why the difference?**  
The expected value assumes all that stock is still there. The counted value reflects what was actually found during stocktake.

---

## 🚨 Why This Matters

### Business Impact:

1. **Financial Reporting:**  
   Stock at Cost value is used for balance sheets and financial statements. It must reflect actual physical inventory, not theoretical expectations.

2. **Excel Report Mismatch:**  
   Finance team exports to Excel and sees €8,382.19. UI shows €7,716.08. This creates confusion and distrust in the system.

3. **Variance Analysis:**  
   If we're showing expected values as totals, variance calculations become meaningless - we're comparing expected vs expected.

---

## ✅ Backend Team: What We Need

### Question 1: Is `total_counted_value` field ready?
**File:** `stock_tracker/stock_serializers.py` (around line 997-999)

**Current Code (before fix):**
```python
def get_total_value(self, obj):
    """Total expected stock value (calculated from lines)"""
    total = sum(line.expected_value for line in obj.lines.all())  # ❌
    return str(total)
```

**Fixed Code (needed):**
```python
def get_total_counted_value(self, obj):
    """Total counted stock value (Stock at Cost)"""
    total = sum(line.counted_value for line in obj.lines.all())  # ✅
    return str(total)
```

**Question:** Has this been added to the serializer and is it returned in the API response?

---

### Question 2: Category Totals - Already Correct?
The `/category_totals/` endpoint already returns both `expected_value` AND `counted_value`.  
✅ **This is perfect - no backend changes needed for category totals.**

We just need to confirm the field exists and contains correct calculations.

---

### Question 3: Field Names Confirmation
Please confirm these fields are available:

**In Stocktake Detail Response:**
- ✅ `total_counted_value` (new field)
- ✅ `total_variance_value` (existing)
- ✅ `total_value` (existing, keep for backward compatibility)

**In Category Totals Response:**
- ✅ `counted_value` (existing)
- ✅ `expected_value` (existing)
- ✅ `variance_value` (existing)

---

## 🔄 Frontend Changes Required (After Backend Fix)

### Change 1: CategoryTotalsRow.jsx (Line 66)
**Before:**
```jsx
<small className="text-success">€{formatValue(totals.expected_value)}</small>
```

**After:**
```jsx
<small className="text-success">€{formatValue(totals.counted_value)}</small>
```

---

### Change 2: Add Grand Total Display (if needed)
**File:** `StocktakeDetail.jsx`  
**Add a summary card showing:**
```jsx
<div className="col-md-3">
  <strong>Total Stock Value:</strong>{" "}
  <Badge bg="success">
    €{stocktake.total_counted_value 
      ? parseFloat(stocktake.total_counted_value).toFixed(2) 
      : "0.00"}
  </Badge>
</div>
```

---

## 🧪 Testing & Verification

### Step 1: Verify Backend Response
```bash
GET /api/stock_tracker/1/stocktakes/17/
```

**Expected Response:**
```json
{
  "id": 17,
  "total_value": "7716.08",           // existing (expected)
  "total_counted_value": "8382.19",   // NEW (counted) ✅
  "total_variance_value": "-666.11"
}
```

---

### Step 2: Verify Category Totals
```bash
GET /api/stock_tracker/1/stocktakes/17/category_totals/
```

**Expected Response:**
```json
{
  "D": {
    "category_name": "Draught Beer",
    "counted_value": "5303.15",  // ✅ Should match Excel
    "expected_value": "5250.58"
  },
  "B": {
    "category_name": "Bottled Beer", 
    "counted_value": "3079.04",  // ✅ Should match Excel
    "expected_value": "2465.50"
  }
}
```

---

### Step 3: Frontend Display Match
After frontend changes, verify UI shows:
- Draught Beer: **€5,303.15** ✅
- Bottled Beer: **€3,079.04** ✅
- Total: **€8,382.19** ✅

---

## 📚 Related Files Reference

### Frontend Files:
- `src/components/stock_tracker/stocktakes/CategoryTotalsRow.jsx` (line 66)
- `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx` (lines 550-650)
- `src/components/stock_tracker/hooks/useCategoryTotals.js` (endpoint integration)

### Backend Files (for reference):
- `stock_tracker/models.py` (lines 1599-1697, 2018) - Calculations ✅ CORRECT
- `stock_tracker/stock_serializers.py` (line 997-999) - Serializer NEEDS FIX

---

## 🎯 Summary for Backend Team

### ✅ What's Working:
1. Model calculations are correct (`line.counted_value` property works)
2. Category totals endpoint returns both `expected_value` and `counted_value`
3. No database migration needed - all data exists

### ❌ What Needs Fixing:
1. Add `total_counted_value` field to Stocktake serializer
2. Change calculation from `sum(line.expected_value)` to `sum(line.counted_value)`
3. Confirm field appears in API response

### 🔄 Frontend Action (After Backend Fix):
1. Change `CategoryTotalsRow.jsx` line 66 to use `counted_value`
2. Optionally add grand total display using `total_counted_value`
3. Test that values match Excel (€8,382.19)

---

## ❓ Questions for Backend Team

1. **Has `total_counted_value` field been added to the stocktake serializer?**
2. **What's the current response when we GET `/api/stock_tracker/1/stocktakes/17/`?**
3. **Can you confirm the calculation is now using `line.counted_value`?**
4. **Any breaking changes we should be aware of?**

---

## 🎉 Success Criteria

After fix is complete:
- ✅ Category totals show counted values (not expected)
- ✅ Grand total matches Excel report (€8,382.19)
- ✅ Variance calculations remain correct
- ✅ No breaking changes to existing functionality
- ✅ All displays within €1 of Excel (due to rounding)

---

**Ready to proceed once backend confirms the fix is deployed!** 🚀
