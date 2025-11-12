# Stocktake Display Variables & Methods - Backend Reference

**Route:** `/stock_tracker/hotel-killarney/stocktakes/16`

This document explains all variables, methods, and calculations used to display values in each column and row of the stocktake table. This information is for the backend team to understand what the frontend expects and displays.

---

## 📊 Table Structure Overview

The stocktake display is organized by **categories** (Bottled Beer, Draught Beer, Minerals & Syrups, Spirits, Wine), with each category containing:
- **Individual item rows** (stocktake lines)
- **Category totals row** (aggregated calculations)

---

## 📋 Column-by-Column Variable Reference

### Column 1: SKU
**Frontend Variable:** `line.item_sku`  
**Data Type:** String  
**Display:** Code format (e.g., "B0012", "D0004", "S0001")

---

### Column 2: Name
**Frontend Variable:** `line.item_name`  
**Data Type:** String  
**Display:** Product name (e.g., "Cronins 0.0%", "30 Heineken")

---

### Column 3: Category
**Frontend Variables:**
- `line.category_name` - Full name display
- `line.category_code` - Used for calculations (B, D, M, S, W)

**Data Type:** String  
**Display:** Badge with category name

---

### Column 4: Size
**Frontend Variable:** `line.item_size`  
**Data Type:** String  
**Display:** Product size (e.g., "70cl", "Doz", "30Lt")  
**Special Use:** Determines if dozen logic applies for Minerals category

---

### Column 5: UOM (Unit of Measure)
**Frontend Variable:** `line.item_uom` or `line.uom`  
**Data Type:** Float (parsed from string)  
**Display:** Number of servings per full unit  
**Examples:**
- Bottled Beer: 12 (bottles per case)
- Draught Beer: 53 (pints per 30L keg)
- Spirits: 20 (shots per bottle)

---

### Column 6: Opening
**Frontend Variables:**
```javascript
line.opening_display_full_units   // Cases/Kegs/Bottles
line.opening_display_partial_units // Bottles/Pints/Shots
line.opening_qty                   // Total servings
```

**Calculation Method:** `convertToDisplayUnits(opening_qty, line)`
```javascript
// Formula:
fullUnits = Math.floor(opening_qty / uom)
partialUnits = opening_qty % uom

// Example (Bottled Beer, UOM=12):
// opening_qty = 12.43 servings
// fullUnits = 0 cases
// partialUnits = 12.43 bottles (rounded to 12 for display)
```

**Display Format:**
- **Top:** `0 cases` (full units)
- **Middle:** `12 bottles` (partial units)
- **Bottom:** `12.43 servings` (raw servings)

---

### Column 7: Purchases
**Frontend Variables:**
```javascript
line.purchases  // Cumulative total in servings
```

**Data Type:** Float (parsed from string)  
**Backend Calculation:** Sum of all movements where `movement_type = 'PURCHASE'`

**Display Components:**
1. **Total Purchases:** `{purchases}.toFixed(2)` servings
2. **Movement History Button:** Opens modal with all purchase movements
3. **Add Purchase Input:** Allows adding new purchases (in servings)

**API Endpoint for Adding Purchase:**
```
POST /api/stock_tracker/{hotel}/stocktake-lines/{line_id}/add-movement/
Body: {
  "movement_type": "PURCHASE",
  "quantity": 14.98,  // in servings
  "notes": "Added via stocktake"
}
```

**Example Display:**
```
14.98    ← Total cumulative purchases
[View History Button]
Add Purchase (bottles)
[0.00 input field]
[💾 Save button]
```

---

### Column 8: Waste
**Frontend Variables:**
```javascript
line.waste  // Cumulative total in servings
```

**Data Type:** Float (parsed from string)  
**Backend Calculation:** Sum of all movements where `movement_type = 'WASTE'`

**Display Components:**
1. **Total Waste:** `{waste}.toFixed(2)` servings
2. **Movement History Button:** Opens modal with all waste movements
3. **Add Waste Input:** Allows adding new waste (in servings)

**API Endpoint for Adding Waste:**
```
POST /api/stock_tracker/{hotel}/stocktake-lines/{line_id}/add-movement/
Body: {
  "movement_type": "WASTE",
  "quantity": 1.00,  // in servings
  "notes": "Added via stocktake"
}
```

---

### Column 9: Expected
**Frontend Variables:**
```javascript
line.expected_display_full_units   // Cases/Kegs/Bottles
line.expected_display_partial_units // Bottles/Pints/Shots
line.expected_qty                   // Total servings
line.expected_value                 // Euro value
```

**CRITICAL CALCULATION (Backend Formula):**
```javascript
expected_qty = opening_qty + purchases - waste

// Example (B0012 - Cronins 0.0%):
// opening_qty = 0.00
// purchases = 12.43
// waste = 1.00
// expected_qty = 0.00 + 12.43 - 1.00 = 11.43 servings

// Then convert to display units:
// fullUnits = 0 cases
// partialUnits = 11 bottles (11.43 rounded for B category)
```

**Display Format:**
- **Top:** `0 cases` (full units)
- **Middle:** `11 bottles` (partial units)
- **Bottom:** `€13.53` (expected value)

**Value Calculation:**
```javascript
expected_value = expected_qty × valuation_cost
```

---

### Column 10: Counted Cases (Full Units)
**Frontend Variables:**
```javascript
line.counted_full_units  // Cases/Kegs/Bottles
```

**Data Type:** Integer  
**User Input:** Whole numbers only  
**Validation:** Must be ≥ 0

**API Endpoint for Saving Count:**
```
PATCH /api/stock_tracker/{hotel}/stocktake-lines/{line_id}/
Body: {
  "counted_full_units": 0,
  "counted_partial_units": 0.00
}
```

---

### Column 11: Counted Bottles (Partial Units)
**Frontend Variables:**
```javascript
line.counted_partial_units  // Bottles/Pints/Shots
```

**Data Type:** Float  
**Validation Rules (Category-Specific):**

**Category B (Bottled Beer):**
- Whole numbers only (no decimals)
- Range: 0 to (UOM - 1)
- Example: 0-11 for UOM=12

**Category M with "Doz" (Dozen Minerals):**
- Whole numbers only (no decimals)
- Range: 0 to 11

**Categories D, S, W, M (non-dozen):**
- Maximum 2 decimal places
- Range: 0.00 to (UOM - 0.01)

**API Endpoint:** Same as Column 10 (both sent together)

---

### Column 12: Variance
**Frontend Variables:**
```javascript
line.variance_qty    // Total variance in servings
line.variance_value  // Variance in euros
line.counted_qty     // Used for calculation
```

**CRITICAL CALCULATION (Backend Formula):**
```javascript
// Step 1: Calculate counted quantity
counted_qty = (counted_full_units × uom) + counted_partial_units

// Step 2: Calculate variance
variance_qty = counted_qty - expected_qty

// Step 3: Calculate variance value
variance_value = variance_qty × valuation_cost
```

**Example (B0012 - Cronins 0.0%):**
```javascript
// Counted:
counted_full_units = 0
counted_partial_units = 0
counted_qty = (0 × 12) + 0 = 0.00 servings

// Expected:
expected_qty = 11.43 servings

// Variance:
variance_qty = 0.00 - 11.43 = -11.43 servings
variance_value = -11.43 × 1.23 = -€13.53

// Display conversion:
fullUnits = -0 cases
partialUnits = -11 bottles
```

**Display Format:**
- **Top:** `-0 cases -11 bottles`
- **Middle:** `€-13.53` with ⚠️ if significant
- **Bottom:** `(-11.43 servings)`

**Color Coding:**
- **Red background** (shortage): `variance_value < 0`
- **Green background** (surplus): `variance_value > 0`
- **Grey** (balanced): `variance_value ≈ 0`
- **⚠️ Warning icon:** `|variance_value| > €10`

---

## 📊 Category Totals Row

**Frontend Variables (per category):**
```javascript
categoryTotals[categoryCode] = {
  item_count: 21,              // Number of items in category
  counted_qty: 0.00,           // Sum of all counted_qty
  counted_value: 0.00,         // Sum of all counted_value
  variance_qty: -173.66,       // Sum of all variance_qty
  variance_value: -244.03,     // Sum of all variance_value
  expected_qty: 173.66,        // Sum of all expected_qty
  expected_value: 244.03,      // Sum of all expected_value
  manual_purchases_value: null // Optional manual input
}
```

**API Endpoint for Category Totals:**
```
GET /api/stock_tracker/{hotel}/stocktakes/{id}/category-totals/
```

**Display Format:**
```
Bottled Beer Category Totals: 21 Items
Counted Total: 0.00 servings | €0.00
Variance: -173.66 servings | -€244.03 ⚠️ (100.0%)
```

**Variance Percentage Calculation:**
```javascript
variance_percent = (Math.abs(variance_value) / expected_value) × 100
// Example: (244.03 / 244.03) × 100 = 100.0%
```

---

## 🔧 Category-Specific Calculation Methods

### Method: `convertToDisplayUnits(servings, item)`
Converts base servings to full + partial units with category-specific rounding.

```javascript
/**
 * @param {number} servings - Total quantity in base units
 * @param {object} item - Item with category_code, item_size, uom
 * @returns {object} { full, partial, decimals }
 */
function convertToDisplayUnits(servings, item) {
  const uom = parseFloat(item.item_uom || item.uom) || 1;
  const categoryCode = item.category_code;
  const size = item.item_size || '';
  
  // Calculate full and partial
  const fullUnits = Math.floor(servings / uom);
  const partialUnits = servings % uom;
  
  // Apply rounding rules
  if (categoryCode === 'B' || (categoryCode === 'M' && size.includes('Doz'))) {
    // Bottled beer and dozen minerals - whole numbers only
    return {
      full: fullUnits,
      partial: Math.round(partialUnits),
      decimals: 0
    };
  } else {
    // Draught, Spirits, Wine, other Minerals - 2 decimals
    return {
      full: fullUnits,
      partial: parseFloat(partialUnits.toFixed(2)),
      decimals: 2
    };
  }
}
```

---

### Method: `calculateExpectedQty(line)`
Backend formula used by frontend for validation.

```javascript
/**
 * Expected = Opening + Purchases - Waste
 * NOTE: Sales are tracked separately, NOT in this formula
 */
function calculateExpectedQty(line) {
  const opening = parseFloat(line.opening_qty) || 0;
  const purchases = parseFloat(line.purchases) || 0;
  const waste = parseFloat(line.waste) || 0;
  
  return opening + purchases - waste;
}
```

---

### Method: `calculateCountedQty(line)`
Converts user inputs to base servings.

```javascript
/**
 * Counted = (Full Units × UOM) + Partial Units
 */
function calculateCountedQty(line) {
  const fullUnits = parseFloat(line.counted_full_units) || 0;
  const partialUnits = parseFloat(line.counted_partial_units) || 0;
  const uom = parseFloat(line.item_uom || line.uom) || 1;
  
  return (fullUnits × uom) + partialUnits;
}
```

---

### Method: `calculateVariance(line)`
Determines surplus or shortage.

```javascript
/**
 * Variance = Counted - Expected
 * Positive = Surplus (more than expected)
 * Negative = Shortage (less than expected)
 */
function calculateVariance(line) {
  const counted = calculateCountedQty(line);
  const expected = calculateExpectedQty(line);
  
  return counted - expected;
}
```

---

## 🎯 Key Backend Requirements

### 1. All Numeric Fields Must Be Strings in API Response
The frontend parses all numeric values using `parseFloat()`:
```javascript
const opening = parseFloat(line.opening_qty) || 0;
const purchases = parseFloat(line.purchases) || 0;
const waste = parseFloat(line.waste) || 0;
```

### 2. Display Unit Fields
Backend must provide pre-calculated display units:
```json
{
  "opening_display_full_units": "0",
  "opening_display_partial_units": "12",
  "expected_display_full_units": "0",
  "expected_display_partial_units": "11"
}
```

### 3. Category Totals Endpoint
Must aggregate all lines by category:
```
GET /api/stock_tracker/{hotel}/stocktakes/{id}/category-totals/
Response: {
  "B": { item_count: 21, counted_qty: "0.00", ... },
  "D": { item_count: 14, counted_qty: "0.00", ... },
  "M": { item_count: 47, counted_qty: "0.00", ... },
  "S": { item_count: 128, counted_qty: "0.00", ... },
  "W": { item_count: 44, counted_qty: "0.00", ... }
}
```

### 4. Movement Endpoints
```
POST /api/stock_tracker/{hotel}/stocktake-lines/{id}/add-movement/
PATCH /api/stock_tracker/{hotel}/stocktake-lines/{id}/
GET /api/stock_tracker/{hotel}/stocktake-lines/{id}/movements/
```

---

## 📝 Example Data Flow

### Example 1: Bottled Beer Item (B0012 - Cronins 0.0%)

**Backend Data:**
```json
{
  "id": 123,
  "item_sku": "B0012",
  "item_name": "Cronins 0.0%",
  "category_code": "B",
  "category_name": "Bottled Beer",
  "item_size": "Doz",
  "item_uom": "12",
  "opening_qty": "0.00",
  "opening_display_full_units": "0",
  "opening_display_partial_units": "0",
  "purchases": "12.43",
  "waste": "1.00",
  "expected_qty": "11.43",
  "expected_display_full_units": "0",
  "expected_display_partial_units": "11",
  "expected_value": "13.53",
  "counted_full_units": 0,
  "counted_partial_units": 0,
  "counted_qty": "0.00",
  "counted_value": "0.00",
  "variance_qty": "-11.43",
  "variance_value": "-13.53",
  "valuation_cost": "1.23"
}
```

**Frontend Display:**
```
SKU: B0012
Name: Cronins 0.0%
Category: Bottled Beer
Size: Doz
UOM: 12

Opening: 0 cases, 0 bottles (0.00 servings)
Purchases: 12.43 servings
Waste: 1.00 servings
Expected: 0 cases, 11 bottles (€13.53)

Counted: 0 cases, 0 bottles
Variance: -0 cases, -11 bottles (€-13.53 ⚠️)
          (-11.43 servings)
```

---

### Example 2: Draught Beer Item (D0005 - 50 Guinness)

**Backend Data:**
```json
{
  "item_sku": "D0005",
  "item_name": "50 Guinness",
  "category_code": "D",
  "item_uom": "88",
  "opening_qty": "0.00",
  "purchases": "0.95",
  "waste": "6.23",
  "expected_qty": "-5.28",
  "expected_display_full_units": "0",
  "expected_display_partial_units": "-5.28",
  "expected_value": "-11.19",
  "counted_full_units": 0,
  "counted_partial_units": 0.00,
  "variance_qty": "5.28",
  "variance_value": "11.19"
}
```

**Frontend Display:**
```
Opening: 0 kegs, 0.00 pints (0.00 servings)
Purchases: 0.95 pints
Waste: 6.23 pints
Expected: 0 kegs, -5.28 pints (€-11.19)

Counted: 0 kegs, 0.00 pints
Variance: +0 kegs, +5.28 pints (+€11.19 ⚠️)
          (+5.28 servings)
```

---

## 🔍 Validation Rules Summary

| Category | Partial Units | Decimals | Range | Example |
|----------|---------------|----------|-------|---------|
| B (Bottled Beer) | Whole numbers | 0 | 0 to UOM-1 | 0-11 bottles |
| M (Dozen) | Whole numbers | 0 | 0 to 11 | 0-11 units |
| D (Draught) | Decimals allowed | 2 | 0.00 to UOM-0.01 | 0.00-87.99 pints |
| S (Spirits) | Decimals allowed | 2 | 0.00 to UOM-0.01 | 0.00-19.99 shots |
| W (Wine) | Decimals allowed | 2 | 0.00 to UOM-0.01 | 0.00-0.99 glasses |
| M (Other) | Decimals allowed | 2 | 0.00 to UOM-0.01 | 0.00-19.99 servings |

---

## 📊 Complete Variable List for Backend Team

### Per Line (StocktakeLine Model):
```javascript
// Identification
id, item_sku, item_name, category_code, category_name, item_size, item_uom

// Opening Stock
opening_qty, opening_display_full_units, opening_display_partial_units

// Movements
purchases, waste

// Expected (Calculated)
expected_qty, expected_display_full_units, expected_display_partial_units, expected_value

// Counted (User Input)
counted_full_units, counted_partial_units, counted_qty, counted_value

// Variance (Calculated)
variance_qty, variance_value

// Costing
valuation_cost
```

### Category Totals:
```javascript
item_count, counted_qty, counted_value, 
variance_qty, variance_value, 
expected_qty, expected_value,
manual_purchases_value
```

---

## 📧 Contact Information

**Frontend Developer:** [Your Name]  
**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Route Reference:** `/stock_tracker/hotel-killarney/stocktakes/16`

---

**END OF DOCUMENT**
