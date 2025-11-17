# SYRUPS Opening Stock - What Does Backend Send?

For SYRUPS items, when I fetch stocktake lines, what values do you send for opening stock?

**Scenario:** A syrup has opening stock of `15.6 bottles` (15 full bottles + 0.6 fractional)

## What does the API return?

**Option A - Separate values:**
```json
{
  "opening_display_full_units": 15,
  "opening_display_partial_units": 0.6
}
```

**Option B - Combined in partial:**
```json
{
  "opening_display_full_units": 0,
  "opening_display_partial_units": 15.6
}
```

**Option C - Both fields with full values:**
```json
{
  "current_full_units": 15,
  "current_partial_units": 0.6
}
```

## What should I send when user updates opening stock to `1234` bottles?

**Current frontend logic:**
```javascript
// User enters: 1234
// Frontend splits:
fullUnits = 1234
partialUnits = 0

// Sends: opening_qty = (1234 × 1000) + 0 = 1,234,000
```

**Is this correct for SYRUPS?**

---

## Context

SYRUPS uses single decimal input (e.g., `10.5` bottles) but backend stores in TWO fields:
- `current_full_units` = whole bottles (10)
- `current_partial_units` = decimal part (0.5)

Need to confirm:
1. How opening values are returned in API response
2. How to send updated opening values back to backend
