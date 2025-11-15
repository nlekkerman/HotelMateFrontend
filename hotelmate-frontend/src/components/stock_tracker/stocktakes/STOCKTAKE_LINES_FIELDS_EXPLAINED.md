 StocktakeLines Component - Complete Field Reference

## Overview
This document explains **every field** displayed and used in the StocktakeLines component. The component displays stocktake line items in a table format, showing item details, opening stock, movements (purchases/waste), expected quantities, counted quantities, and variance calculations.

---

## 🔍 **Item Identification Fields**

### `item_sku` (SKU Column)
- **What**: Unique Stock Keeping Unit identifier for the item
- **Display**: Shown in monospace code format (e.g., `BUD-BTL-330`)
- **Purpose**: Uniquely identifies each inventory item
- **Format**: Text/Code (e.g., `GUIN-KEG-50L`, `JACK-BTL-700ML`)

### `item_name` (Name Column)
- **What**: Human-readable name of the item
- **Display**: Bold text (e.g., "Budweiser 330ml", "Jack Daniels 700ml")
- **Purpose**: User-friendly identification
- **Format**: Text string

### `subcategory` (Name Column - Badge)
- **What**: Optional subcategory classification
- **Display**: Small colored badge below item name
- **Purpose**: Additional categorization (e.g., "Draft", "Premium Spirit")
- **Format**: Text with visual badge component
- **Examples**: "Draft Beer", "Premium Wine", "Soft Drink"

---

## 📦 **Category & Unit Information**

### `category_name` (Cat Column)
- **What**: Main category classification
- **Display**: Gray badge (e.g., "Draught", "Bottled Beer", "Spirits")
- **Purpose**: Groups items by type for totals and reporting
- **Format**: Text badge
- **Categories**: D (Draught), B (Bottled Beer), S (Spirits), W (Wine), M (Minerals)

### `category_code` (Used for calculations, not displayed directly)
- **What**: Single-letter code identifying category
- **Purpose**: Determines calculation rules and validation logic
- **Values**: 
  - `D` = Draught (kegs/pints)
  - `B` = Bottled Beer (cases/bottles)
  - `S` = Spirits (bottles/measures)
  - `W` = Wine (bottles/glasses)
  - `M` = Minerals (cases/bottles or dozens)

### `item_size` (Size Column)
- **What**: Physical size/volume of the item
- **Display**: Gray text (e.g., "330ml", "50L", "Doz 12")
- **Purpose**: Specifies item packaging size
- **Format**: Text (volume, weight, or count)
- **Examples**: "50L", "330ml", "700ml", "Doz 12", "187ml"

### `item_uom` / `uom` (UOM Column)
- **What**: Unit of Measure - number of servings per full unit
- **Display**: Light badge showing number (e.g., "24", "88", "12")
- **Purpose**: Conversion factor for calculating total servings
- **Format**: Numeric (integer)
- **Examples**:
  - Keg 50L = 88 pints
  - Case 24x330ml = 24 bottles
  - Bottle 700ml spirits = 28 measures (25ml each)
  - Dozen minerals = 12 bottles

---

## 📊 **Opening Stock Fields**

### `opening_qty` (Backend value, not displayed directly)
- **What**: Total opening stock in servings
- **Purpose**: Starting point for expected calculations
- **Format**: Decimal (servings)
- **Calculation**: `(opening_full_units × uom) + opening_partial_units`
- **Backend managed**: ✅ Yes

### `opening_display_full_units` (Opening Column - Top number)
- **What**: Opening stock FULL units (cases/kegs/bottles)
- **Display**: Blue bold number with unit label
- **Purpose**: Shows how many complete units were in opening stock
- **Format**: Integer (whole number)
- **Backend managed**: ✅ Yes (calculated from opening_qty)
- **Example**: "5 Cases" = 5 full cases of beer

### `opening_display_partial_units` (Opening Column - Bottom number)
- **What**: Opening stock PARTIAL units (bottles/pints/measures)
- **Display**: Light blue bold number with serving unit label
- **Purpose**: Shows partial/loose servings in opening stock
- **Format**: Decimal (2 places for most categories, 0 for B/M-Doz)
- **Backend managed**: ✅ Yes (calculated from opening_qty)
- **Example**: "8.50 Bottles" = 8.5 loose bottles

### Opening Stock Input Fields (Editable when not locked)
- **`openingFullUnits` (input)**: Manual entry for full units
- **`openingPartialUnits` (input)**: Manual entry for partial units
- **Purpose**: Allows staff to manually set opening stock
- **Validation**: Category-specific (whole numbers for B/M-Doz, decimals for D/S/W)
- **Action**: Clicking "💾 Save" sends PATCH request to update `opening_qty`

---

## 🛒 **Purchases Fields**

### `purchases` (Purchases Column - Display number)
- **What**: Cumulative total of all purchase movements in servings
- **Display**: Large bold number in green (if >0) or gray
- **Purpose**: Shows total stock added via purchases
- **Format**: Decimal (2 places)
- **Backend managed**: ✅ Yes (sum of all PURCHASE movements)
- **Example**: "48.00" = 48 servings added via purchases

### Purchases Input Field (Editable when not locked)
- **`purchasesQty` (input)**: Enter quantity of new purchase in servings
- **Purpose**: Add new purchase movement
- **Validation**: Must be >0, allows 2 decimals
- **Action**: Clicking "💾 Save" sends POST to `/add-movement/` with:
  ```json
  {
    "movement_type": "PURCHASE",
    "quantity": 48.00,
    "notes": "Added via stocktake"
  }
  ```

### Purchases Movement History Button
- **What**: Button to view all purchase movements
- **Display**: Shows modal with list of all purchases (date, qty, notes)
- **Purpose**: Audit trail of all purchases added during stocktake
- **Features**: Can delete individual movements if not locked

---

## 🗑️ **Waste Fields**

### `waste` (Waste Column - Display number)
- **What**: Cumulative total of all waste movements in servings
- **Display**: Large bold number in red (if >0) or gray
- **Purpose**: Shows total stock removed via waste
- **Format**: Decimal (2 places)
- **Backend managed**: ✅ Yes (sum of all WASTE movements)
- **Example**: "12.50" = 12.5 servings marked as waste

### Waste Input Field (Editable when not locked)
- **`wasteQuantity` (input)**: Enter quantity of waste in servings
- **Purpose**: Record stock damaged/expired/broken
- **Validation**: Must be >0, allows 2 decimals
- **Action**: Clicking "💾 Save" sends POST to `/add-movement/` with:
  ```json
  {
    "movement_type": "WASTE",
    "quantity": 12.50,
    "notes": "Added via stocktake"
  }
  ```

### Waste Movement History Button
- **What**: Button to view all waste movements
- **Display**: Shows modal with list of all waste entries (date, qty, notes)
- **Purpose**: Audit trail of all waste recorded during stocktake
- **Features**: Can delete individual movements if not locked

---

## 📈 **Expected Stock Fields**

### `expected_qty` (Backend calculation, servings)
- **What**: What SHOULD be in stock based on math
- **Calculation**: `opening_qty + purchases - waste`
- **Purpose**: Baseline for variance calculation
- **Format**: Decimal (servings)
- **Backend managed**: ✅ Yes
- **Example**: 100 opening + 50 purchases - 10 waste = 140 expected

### `expected_display_full_units` (Expected Column - Top number)
- **What**: Expected stock in FULL units (cases/kegs/bottles)
- **Display**: Red/orange bold number with unit label
- **Purpose**: Shows expected complete units
- **Format**: Integer (whole number)
- **Backend managed**: ✅ Yes (calculated from expected_qty)
- **Example**: "5 Cases"

### `expected_display_partial_units` (Expected Column - Bottom number)
- **What**: Expected stock in PARTIAL units (bottles/pints/measures)
- **Display**: Red/orange bold number with serving unit label
- **Purpose**: Shows expected partial/loose servings
- **Format**: Decimal (category-specific rounding)
- **Backend managed**: ✅ Yes (calculated from expected_qty)
- **Example**: "8.50 Bottles"

### `expected_value` (Expected Column - Money)
- **What**: Euro value of expected stock
- **Display**: Green text showing €X.XX
- **Purpose**: Financial value of what should be in stock
- **Format**: Currency (2 decimal places)
- **Backend managed**: ✅ Yes
- **Calculation**: `expected_qty × valuation_cost`

---

## 📋 **Counted Stock Fields**

### `counted_full_units` (Counted Cases Column - Input & Display)
- **What**: ACTUAL full units (cases/kegs/bottles) physically counted
- **Display**: Input field when active, bold number when locked
- **Purpose**: User enters what they physically counted
- **Format**: Integer (whole numbers only)
- **Validation**: Must be ≥0, no decimals allowed
- **Frontend validates**: ✅ Format only
- **Backend calculates**: ✅ Converts to counted_qty

### `counted_partial_units` (Counted Bottles Column - Input & Display)
- **What**: ACTUAL partial units (bottles/pints/measures) physically counted
- **Display**: Input field when active, bold number when locked
- **Purpose**: User enters loose/partial servings counted
- **Format**: Category-specific:
  - **B** (Bottled Beer): Whole numbers only (0-23 for case of 24)
  - **M-Doz** (Dozen Minerals): Whole numbers only (0-11)
  - **D/S/W**: Decimals allowed (max 2 decimal places)
- **Validation**: 
  - Must be ≥0
  - Must be < uom (can't have 24 bottles in a 24-case)
  - Category-specific decimal rules
- **Frontend validates**: ✅ Format and max value
- **Backend calculates**: ✅ Converts to counted_qty

### `counted_qty` (Backend value, not displayed directly)
- **What**: Total counted stock in servings
- **Purpose**: Used for variance calculation
- **Format**: Decimal (servings)
- **Backend calculation**: `(counted_full_units × uom) + counted_partial_units`
- **Backend managed**: ✅ Yes

### Counted Input Labels
- **`labels.unit`**: Dynamic label for full units (e.g., "Cases", "Kegs", "Bottles")
- **`labels.servingUnit`**: Dynamic label for partial units (e.g., "Bottles", "Pints", "Measures")
- **`labels.partialMax`**: Maximum allowed value for partial units (from backend API)
- **Source**: Generated by `getCountingLabels()` helper function

---

## 📉 **Variance Fields**

### `variance_qty` (Backend calculation, servings)
- **What**: Difference between counted and expected (in servings)
- **Calculation**: `counted_qty - expected_qty`
- **Purpose**: Shows shortage/surplus in raw serving units
- **Format**: Decimal (servings, can be negative)
- **Backend managed**: ✅ Yes
- **Example**: 
  - -10.50 = shortage of 10.5 servings
  - +5.25 = surplus of 5.25 servings

### `variance_display_full_units` (Variance Column - Top number)
- **What**: Variance in FULL units (cases/kegs/bottles)
- **Display**: Green (surplus) or Red (shortage) bold number with +/- sign
- **Purpose**: Shows variance in complete units
- **Format**: Integer with sign
- **Backend managed**: ✅ Yes (calculated from variance_qty with category-specific rounding)
- **Example**: "+2 Cases" or "-1 Keg"

### `variance_display_partial_units` (Variance Column - Bottom number)
- **What**: Variance in PARTIAL units (bottles/pints/measures)
- **Display**: Green (surplus) or Red (shortage) bold number with +/- sign
- **Purpose**: Shows variance in partial servings
- **Format**: Decimal with sign (category-specific rounding)
- **Backend managed**: ✅ Yes (calculated from variance_qty)
- **Example**: "+8.50 Bottles" or "-3.75 Pints"

### `variance_value` (Variance Column - Money)
- **What**: Euro value of variance (shortage or surplus)
- **Display**: Green/Red bold text with +/- and € symbol
- **Purpose**: Financial impact of variance
- **Format**: Currency (2 decimal places, can be negative)
- **Backend managed**: ✅ Yes
- **Calculation**: `variance_qty × valuation_cost`
- **Visual indicators**:
  - **Red background**: Shortage (negative value)
  - **Green background**: Surplus (positive value)
  - **⚠️ Icon**: Significant variance (absolute value >€10)

### Variance Display Logic
- **Not counted yet**: Shows "-" (gray)
- **Shortage**: Red text, red background, negative values
- **Surplus**: Green text, green background, positive values
- **Significant**: Bold text if absolute variance value >€10

---

## 🔐 **Backend-Only Calculation Fields**

These fields are **NEVER edited by frontend** - backend calculates and returns them:

### `valuation_cost` (Not displayed directly)
- **What**: Frozen cost per serving at stocktake start
- **Purpose**: Used for all value calculations
- **Format**: Decimal (cost per serving)
- **Backend managed**: ✅ Yes
- **Usage**: Multiplied by quantities to get euro values

### `input_fields` (API metadata)
- **What**: Backend-provided configuration for input fields
- **Purpose**: Tells frontend what labels/limits to use
- **Format**: JSON object
- **Contains**:
  - `fullUnitLabel`: "Cases", "Kegs", "Bottles"
  - `partialUnitLabel`: "Bottles", "Pints", "Measures"
  - `partialMax`: Maximum allowed partial value
- **Backend managed**: ✅ Yes

---

## 🎯 **State Management Fields (Frontend Only)**

### `lineInputs` (Component state)
- **What**: Local state tracking all input field values
- **Purpose**: Manages user input before saving
- **Structure**:
  ```javascript
  {
    [lineId]: {
      fullUnits: '5',           // Counted cases input
      partialUnits: '8.50',     // Counted bottles input
      wasteQuantity: '2.00',    // Waste input
      purchasesQty: '24.00',    // Purchases input
      openingFullUnits: '10',   // Opening cases input
      openingPartialUnits: '0'  // Opening bottles input
    }
  }
  ```

### `validationErrors` (Component state)
- **What**: Tracks validation errors for each line/field
- **Purpose**: Shows error messages to user
- **Structure**:
  ```javascript
  {
    [lineId]: {
      fullUnits: 'Must be whole number',
      partialUnits: 'Must be 0-23 bottles',
      wasteQuantity: 'Must be greater than 0'
    }
  }
  ```

---

## 🚀 **Action Buttons & Operations**

### Save Count Button
- **Trigger**: "💾 Save" in Actions column
- **Sends**: `counted_full_units` and `counted_partial_units`
- **Endpoint**: `PATCH /stocktake-lines/{id}/`
- **Backend calculates**: All display values, variance, totals
- **Frontend updates**: From backend response (no optimistic updates)

### Save Purchases Button
- **Trigger**: "💾 Save" in Purchases section
- **Sends**: `{ movement_type: 'PURCHASE', quantity, notes }`
- **Endpoint**: `POST /stocktake-lines/{id}/add-movement/`
- **Backend updates**: Purchases total, expected values, variance
- **Frontend updates**: From backend response

### Save Waste Button
- **Trigger**: "💾 Save" in Waste section
- **Sends**: `{ movement_type: 'WASTE', quantity, notes }`
- **Endpoint**: `POST /stocktake-lines/{id}/add-movement/`
- **Backend updates**: Waste total, expected values, variance
- **Frontend updates**: From backend response

### Save Opening Stock Button
- **Trigger**: "💾 Save" in Opening section
- **Sends**: Calculated `opening_qty` from full + partial inputs
- **Endpoint**: `PATCH /stocktake-lines/{id}/`
- **Backend updates**: Opening values, expected values, variance
- **Frontend updates**: From backend response

### Clear Button
- **Trigger**: "Clear" in Actions column
- **Action**: Resets all input fields to current saved values
- **No API call**: Local state reset only

---

## 📏 **Validation Rules by Category**

### Bottled Beer (B)
- **Full Units**: Whole numbers only (0, 1, 2, ...)
- **Partial Units**: Whole numbers only, max = uom - 1
- **Example**: Case of 24 → partial can be 0-23 bottles

### Dozen Minerals (M with "Doz" in size)
- **Full Units**: Whole numbers only
- **Partial Units**: Whole numbers only, max = 11
- **Example**: Dozen → partial can be 0-11 bottles

### Draught (D), Spirits (S), Wine (W), Non-Doz Minerals (M)
- **Full Units**: Whole numbers only
- **Partial Units**: Decimals allowed (max 2 decimal places)
- **Example**: Keg 88 pints → partial can be 0.00-87.99 pints

---

## 🔄 **Real-Time Updates (Pusher)**

All calculations are done by backend. When any user saves changes:
1. Backend calculates all values
2. Backend saves to database
3. Backend broadcasts via Pusher
4. **All connected clients** receive update
5. Frontend updates UI with backend values

**No optimistic updates** - UI always shows backend-calculated values.

---

## 🎨 **Display States**

### Active/Draft Stocktake
- All input fields shown
- Edit buttons enabled
- Movement history buttons visible
- Full interactive UI

### Locked/Closed Stocktake
- No input fields (display only)
- Clean, stylish view
- Larger, bold numbers
- No edit buttons
- Movement history hidden
- Read-only presentation

---

## 📊 **Category Totals Row**

Each category table shows footer totals:
- **Total Opening Value**: Sum of all line opening_value
- **Total Expected Value**: Sum of all line expected_value
- **Total Counted Value**: Sum of all line counted_value
- **Total Variance Value**: Sum of all line variance_value

Backend calculates all category totals via dedicated endpoint.

---

## 🎯 **Key Architecture Principles**

1. **Backend Calculates Everything**: Frontend never does math
2. **No Optimistic Updates**: Wait for backend response
3. **Frontend Validates Format Only**: Business logic on backend
4. **Pusher for Real-Time Sync**: All clients stay synchronized
5. **Display Values from Backend**: Use `*_display_*` fields directly
6. **Frozen Valuation Cost**: Financial values stable during stocktake

---

## 📖 **Related Documentation**

- `BACKEND_API_COMPLETE_REFERENCE_FOR_FRONTEND.md` - API endpoints
- `categoryHelpers.js` - Label generation logic
- `stocktakeCalculations.js` - Frontend validation helpers
- `CategoryTotalsRow.jsx` - Category summary component
- `MovementsList.jsx` - Purchase/waste history component
