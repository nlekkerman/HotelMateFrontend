# Stocktake Flow Implementation - Complete Guide

## ✅ Implementation Complete

This document explains the **complete stocktake workflow** as implemented in the frontend, fully aligned with the backend guide (`FRONTEND_PERIOD_STOCKTAKE_GUIDE.md`).

---

## 🎯 **The Correct Flow (No Steps Can Be Skipped)**

```
1. CREATE PERIOD
   ↓
2. CREATE STOCKTAKE (for that period)
   ↓
3. POPULATE STOCKTAKE (auto-fills opening balances)
   ↓
4. COUNT INVENTORY (user enters counted values)
   ↓
5. APPROVE & CLOSE (locks stocktake, closes period, creates snapshots)
```

### **What Each Step Does:**

#### **Step 1: Create Period**
- **Who:** User clicks "Create New Period" button
- **What:** Defines the time frame (start date, end date, period type)
- **API:** `POST /stock_tracker/{hotel}/periods/`
- **Result:** Empty period created (status: OPEN)

#### **Step 2: Create Stocktake**
- **Who:** System automatically creates when user clicks on period card
- **What:** Creates the stocktake container for that period
- **API:** `POST /stock_tracker/{hotel}/stocktakes/`
- **Result:** Empty stocktake created (status: DRAFT, 0 lines)

#### **Step 3: Populate**
- **Who:** System automatically calls after creating stocktake
- **What:** Backend fills stocktake with ALL inventory items
- **API:** `POST /stock_tracker/{hotel}/stocktakes/{id}/populate/`
- **Result:** Stocktake now has lines with opening balances

**Opening Balance Logic:**
```
First Stocktake (e.g., September):
  → Opening = Current inventory in system

Second Stocktake (e.g., October):
  → Opening = September's closing stock (from snapshots)

Third Stocktake (e.g., November):
  → Opening = October's closing stock
```

#### **Step 4: Count**
- **Who:** User manually counts physical inventory
- **What:** Enters counted values (full units + partial units)
- **API:** `PATCH /stock_tracker/{hotel}/stocktake-lines/{id}/`
- **Result:** Line updated with counted values, variance calculated

#### **Step 5: Approve & Close**
- **Who:** User clicks "Approve & Close Period" button
- **What:** Locks everything and finalizes the period
- **API:** `POST /stock_tracker/{hotel}/periods/{id}/approve-and-close/`
- **Result:** 
  - Stocktake status: DRAFT → APPROVED
  - Period status: OPEN → CLOSED
  - Stock snapshots created (closing balances)
  - Stock adjustments created for variances
  - Current inventory updated

---

## 🧩 **Components Implemented**

### **1. CreatePeriodModal.jsx**
**Location:** `src/components/stock_tracker/modals/CreatePeriodModal.jsx`

**Features:**
- ✅ Period type selection (Weekly, Monthly, Quarterly, Yearly)
- ✅ Date pickers with auto-calculation of end date
- ✅ Validation to prevent invalid date ranges
- ✅ Console logging for debugging
- ✅ Toast notifications for success/errors

**Usage:**
```javascript
<CreatePeriodModal
  show={showModal}
  onHide={() => setShowModal(false)}
  hotelSlug={hotel_slug}
  onSuccess={(newPeriod) => {
    // Refresh periods list
    fetchPeriods();
  }}
/>
```

---

### **2. PeriodSnapshots.jsx (Updated)**
**Location:** `src/components/stock_tracker/periods/PeriodSnapshots.jsx`

**New Features:**
- ✅ "Create New Period" button in header
- ✅ Automatic stocktake creation when clicking period card
- ✅ Automatic population after stocktake creation
- ✅ Comprehensive console logging throughout the flow

**Console Logging:**
```javascript
🔵 PERIOD CLICKED - Starting Flow
📋 Period: { id, name, dates, is_closed }
✅ Period has stocktake ID: 123
   → Navigating to existing stocktake
   
📝 STEP 1: Creating Stocktake
📦 Creating new stocktake for period: November 2025
✅ Stocktake created: { id: 456, status: DRAFT }

🔄 STEP 2: Populating Stocktake
📦 Populating stocktake with items...
populate-duration: 2.341s
✅ Population complete: { lines_created: 254 }

🔍 STEP 3: Verifying Opening Balances
📊 Stocktake has 254 lines
🔍 Checking opening balances (first 5 items):
  B0012 - Cronins 0.0%: {
    opening_qty: "69.0000",
    opening_display: "5 + 9",
    expected_qty: "79.84"
  }
✅ Opening balances look good!
```

---

### **3. StocktakeDetail.jsx (Updated)**
**Location:** `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx`

**New Features:**
- ✅ Step-by-step guidance alerts
- ✅ Flow enforcement (can't approve without counting all items)
- ✅ Comprehensive logging in `handlePopulate()`
- ✅ Variance warnings for large discrepancies
- ✅ Zero opening balance detection

**User Guidance:**
```jsx
// Step 1: Before population
"Click 'Populate Lines' to load all inventory items"

// Step 2: After population, before counting
"Count your physical inventory and enter the quantities below"

// Step 2: Partial counting
"Please count all items before approving (125/254 counted)"

// Step 3: Ready to approve
"All items counted! Ready to approve."
```

**Variance Warnings:**
```javascript
⚠️ Large shortage detected: Budweiser 33cl (-15.50 units)
⚠️ Large surplus detected: Guinness Keg (+12.00 units)
```

---

### **4. StocktakeCloseModal.jsx (Updated)**
**Location:** `src/components/stock_tracker/stocktakes/StocktakeCloseModal.jsx`

**Features:**
- ✅ Combined approve & close operation
- ✅ Optional manual financial values (COGS, Revenue)
- ✅ Live preview of GP% and Pour Cost%
- ✅ Comprehensive logging of entire close process

**Console Logging:**
```javascript
🔐 APPROVE & CLOSE PERIOD - Starting
📋 Stocktake: { id: 456, period_start, period_end }

📅 STEP 1: Finding matching period
✅ Found matching period: { id: 123, name: "November 2025" }

💰 STEP 2: Updating period with manual financial values
   💸 Manual Purchases (COGS): 19000.00
   💵 Manual Sales Revenue: 62000.00
✅ Period updated with manual values

🔒 STEP 3: Approve Stocktake & Close Period (Combined)
   This endpoint will:
   1. Change stocktake status: DRAFT → APPROVED
   2. Lock the stocktake (no more edits)
   3. Create stock adjustments for variances
   4. Close the period: OPEN → CLOSED
   5. Create StockSnapshot records (closing stock)

✅ APPROVE & CLOSE COMPLETE
📊 Response: { period, stocktake_updated, adjustments_created }
📸 What happens next:
   → Stocktake is now APPROVED and locked
   → Period is now CLOSED
   → Stock snapshots created (closing balances)
   → These closing balances become opening for next period!
```

---

### **5. useStocktakes.js (Updated)**
**Location:** `src/components/stock_tracker/hooks/useStocktakes.js`

**Updated Functions:**
- ✅ `createStocktake()` - Logs creation
- ✅ `populateStocktake()` - Logs population with timing
- ✅ `approveStocktake()` - Logs approval

---

## 🔒 **Flow Enforcement**

### **Prevention of Step Skipping:**

1. **Can't create stocktake without period:**
   - User must click on a period card
   - System creates stocktake with period's dates

2. **Can't count without populating:**
   - If stocktake has 0 lines, shows "Click Populate Lines" alert
   - Counting interface only shows after lines exist

3. **Can't approve without counting all items:**
   - Button only appears when `countedLines === totalLines`
   - Alert warns user if items are missing

4. **Can't skip closing period:**
   - Combined endpoint ensures atomic operation
   - Both stocktake approval AND period closing happen together

---

## 📊 **Console Logging Strategy**

### **When to Check Console:**

1. **Creating a Period:**
   - Check: Period ID, name, dates
   - Verify: No errors, period created successfully

2. **Creating a Stocktake:**
   - Check: Stocktake ID, status (DRAFT), total_lines (0)
   - Verify: Links to correct period dates

3. **Populating:**
   - Check: Duration (should be 2-3 seconds for 250+ items)
   - Check: Lines created count
   - **CRITICAL:** Verify opening balances are NOT all zero
   - Check: First 5 items have valid opening_qty

4. **Counting:**
   - Check: Line updates show correct variance calculations
   - Watch for large variance warnings

5. **Approving & Closing:**
   - Check: All 3 steps complete (find period, update values, close)
   - Verify: Stocktake status changes to APPROVED
   - Verify: Period status changes to CLOSED
   - Check: Snapshots created

---

## 🚨 **Red Flags to Watch For**

### **❌ Bad Signs:**
```javascript
// All opening balances are zero
opening_qty: "0.0000" for all items
→ Problem: Previous period not closed properly

// No previous period found
"No valid periods found" error on populate
→ Problem: This is the first stocktake (expected) OR database issue

// Negative expected quantities
expected_qty: "-50.0000"
→ Problem: Backend calculation error

// Population fails
"Failed to populate stocktake"
→ Problem: Database connection, permissions, or data integrity issue
```

### **✅ Good Signs:**
```javascript
// Opening matches previous closing
October closing: 69.00 → November opening: 69.00

// Reasonable populate duration
populate-duration: 2.341s

// Variance calculations work
variance_qty: -5.0000 (expected 80, counted 75)

// Period closes successfully
status: DRAFT → APPROVED
period: OPEN → CLOSED
```

---

## 📝 **Testing the Complete Flow**

### **Test Scenario: Create November 2025 Period**

1. **Go to Period History:**
   ```
   Navigate to /stock_tracker/{hotel}/periods/
   ```

2. **Create Period:**
   - Click "Create New Period"
   - Select "Monthly"
   - Start Date: 2025-11-01
   - End Date: 2025-11-30 (auto-calculated)
   - Click "Create Period"
   - ✅ Check console: Period created successfully

3. **Click the Period Card:**
   - System detects no stocktake exists
   - Automatically creates stocktake
   - Automatically populates with items
   - ✅ Check console: 254 lines created, opening balances valid

4. **Count Inventory:**
   - Navigate to stocktake detail page
   - See 254 items grouped by category
   - Enter counted values for each item
   - ✅ Check console: Line updates, variance warnings

5. **Approve & Close:**
   - Click "Approve & Close Period"
   - Optionally enter manual financial values
   - Confirm
   - ✅ Check console: All 3 steps complete, snapshots created

6. **Create Next Period (December):**
   - Repeat steps 2-5
   - **VERIFY:** December opening balances = November closing balances
   - ✅ This proves the snapshot system works!

---

## 🔍 **Troubleshooting**

### **Issue: Opening balances are all zero**

**Check:**
1. Is this the first ever stocktake? (Expected for first one)
2. Was the previous period properly closed?
3. Do snapshots exist in database?

**Solution:**
```sql
-- Check if snapshots were created
SELECT * FROM stock_snapshot WHERE period_id = [previous_period_id];

-- If missing, the previous period wasn't closed properly
-- Close it manually or recreate
```

---

### **Issue: Populate fails**

**Check Console:**
```javascript
❌ POPULATE FAILED
Response: { detail: "Stocktake is already populated" }
```

**Solution:**
- Stocktake already has lines
- Delete and recreate stocktake, or clear lines first

---

### **Issue: Can't approve**

**Check:**
1. Are all items counted? (countedLines === totalLines)
2. Is stocktake already locked? (status === APPROVED)

**Solution:**
- Count remaining items
- If locked, you can't edit (by design)

---

## 📈 **Performance Metrics**

### **Expected Timings:**

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Create Period | < 1 second | Simple database insert |
| Create Stocktake | < 1 second | Simple database insert |
| Populate (250 items) | 2-4 seconds | Bulk creation with calculations |
| Update Line | < 500ms | Single line update |
| Approve & Close | 3-5 seconds | Creates adjustments and snapshots |

---

## 🎉 **Success Criteria**

Your implementation is correct when:

✅ Users can create periods manually
✅ Stocktakes are automatically created for periods
✅ Population happens automatically and quickly
✅ Opening balances match previous period's closing
✅ Users see clear step-by-step guidance
✅ Large variances trigger warnings
✅ Approve & close happens atomically
✅ Console shows detailed debugging information
✅ Next period's opening = previous period's closing

---

## 📚 **Related Files**

- Backend Guide: `FRONTEND_PERIOD_STOCKTAKE_GUIDE.md`
- Period Modal: `CreatePeriodModal.jsx`
- Period List: `PeriodSnapshots.jsx`
- Stocktake Detail: `StocktakeDetail.jsx`
- Close Modal: `StocktakeCloseModal.jsx`
- Hook: `useStocktakes.js`

---

## 🔗 **API Endpoints Used**

```
POST   /stock_tracker/{hotel}/periods/                    # Create period
POST   /stock_tracker/{hotel}/stocktakes/                 # Create stocktake
POST   /stock_tracker/{hotel}/stocktakes/{id}/populate/   # Populate lines
PATCH  /stock_tracker/{hotel}/stocktake-lines/{id}/       # Update line
POST   /stock_tracker/{hotel}/periods/{id}/approve-and-close/  # Approve & close
```

---

*Last Updated: November 12, 2025*
*Implementation Status: ✅ Complete*
