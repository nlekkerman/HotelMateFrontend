# Quick Start: Period & Stocktake Flow

## 🚀 **What's New?**

You can now create periods manually and the system enforces the correct flow!

---

## 📋 **The 5-Step Flow**

```
1. CREATE PERIOD ─────┐
                      │
2. CREATE STOCKTAKE ──┤ (Auto-created when you click period)
                      │
3. POPULATE ──────────┤ (Auto-populated with opening balances)
                      │
4. COUNT INVENTORY ───┤ (You enter counted values)
                      │
5. APPROVE & CLOSE ───┘ (Locks everything, creates snapshots)
```

---

## 🎯 **How to Use**

### **Step 1: Create a New Period**

1. Navigate to **Period History** page
2. Click **"Create New Period"** button
3. Select:
   - **Period Type:** Monthly (recommended)
   - **Start Date:** First day of month (e.g., 2025-12-01)
   - **End Date:** Auto-calculated to last day (e.g., 2025-12-31)
4. Click **"Create Period"**

**Result:** ✅ Period created (status: OPEN)

---

### **Step 2-3: Create & Populate Stocktake**

1. Click on the **period card** you just created
2. System automatically:
   - Creates a stocktake for that period
   - Populates it with ALL inventory items
   - Calculates opening balances from previous period

**Result:** ✅ Stocktake ready with 250+ items to count

---

### **Step 4: Count Your Inventory**

1. You'll see all items grouped by category (D, B, S, W, M)
2. For each item, enter:
   - **Full Units:** Cases/Kegs/Bottles
   - **Partial Units:** Bottles/Pints/Shots
3. System calculates:
   - Expected quantity (opening + purchases - waste)
   - Variance (expected vs counted)
   - Variance value in €

**Tips:**
- Count systematically (category by category)
- Watch for variance warnings (large discrepancies)
- Progress is saved automatically

---

### **Step 5: Approve & Close**

1. Once all items are counted, click **"Approve & Close Period"**
2. Optionally enter:
   - Total Purchases (COGS) in €
   - Total Sales Revenue in €
3. System previews GP% and Pour Cost%
4. Click **"Yes, Approve & Close Period"**

**What happens:**
- ✅ Stocktake locked (status: APPROVED)
- ✅ Period closed (status: CLOSED)
- ✅ Stock adjustments created
- ✅ Current inventory updated
- ✅ **Snapshots created** (closing stock → next period's opening)

---

## 🔍 **Open Browser Console for Details**

Press **F12** and go to **Console** tab. You'll see detailed logs like:

```
🔵 PERIOD CLICKED - Starting Flow
📝 STEP 1: Creating Stocktake
✅ Stocktake created: { id: 456 }

🔄 STEP 2: Populating Stocktake
populate-duration: 2.341s
✅ Population complete: { lines_created: 254 }

🔍 STEP 3: Verifying Opening Balances
  B0012 - Cronins 0.0%: {
    opening_qty: "69.0000",
    opening_display: "5 + 9"
  }
✅ Opening balances look good!
```

---

## ⚠️ **Important Notes**

### **You CANNOT Skip Steps:**
- ❌ Can't create stocktake without period
- ❌ Can't count without populating first
- ❌ Can't approve without counting all items
- ❌ Can't edit after approval (locked)

### **Opening Balances:**
- **First stocktake:** Uses current inventory in system
- **Second+ stocktakes:** Uses previous period's closing stock
- This ensures continuity between periods!

### **Large Variances:**
Watch for warnings like:
```
⚠️ Large shortage detected: Budweiser 33cl (-15.50 units)
```
These indicate significant discrepancies that need attention.

---

## 🎉 **Success Indicators**

You're doing it right when:

✅ Opening balances are NOT all zero (except first stocktake)
✅ Next period's opening = previous period's closing
✅ Console shows all steps completing successfully
✅ No red error messages in console
✅ Approve button only appears when all items counted

---

## 🆘 **Troubleshooting**

### **Opening balances are all zero:**
- **First stocktake?** Normal! Uses current inventory
- **Second+ stocktake?** Previous period wasn't closed properly

### **Can't approve:**
- Count all items (e.g., 125/254 counted means 129 items left)
- Stocktake might already be approved (check badge)

### **Populate button doesn't work:**
- Check console for errors
- Stocktake might already have lines

---

## 📊 **Period Types**

| Type | Duration | Use Case |
|------|----------|----------|
| Weekly | 7 days | High-frequency tracking |
| **Monthly** | 1 month | **Most common** |
| Quarterly | 3 months | Low-frequency tracking |
| Yearly | 1 year | Annual audits |

---

## 🔗 **Where to Find Everything**

- **Period History:** `/stock_tracker/{hotel}/periods/`
- **Stocktake Detail:** Auto-navigates when you click period
- **Period Creation:** "Create New Period" button (top right)

---

*For detailed implementation docs, see: `STOCKTAKE_FLOW_IMPLEMENTATION.md`*
