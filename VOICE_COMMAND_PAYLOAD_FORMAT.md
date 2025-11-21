# Voice Command Payload Format - CRITICAL SPECIFICATION

**Date:** November 21, 2025  
**Status:** ⚠️ BACKEND MUST FIX

---

## 🚨 PROBLEM DISCOVERED

The voice backend is returning WRONG values that don't match manual entry format.

### Example of BROKEN Response:
```
Transcription: "count, Budweiser bottle, 5 cases, 5 bottles"

Backend Returns (WRONG):
{
  "action": "count",
  "item_identifier": "budweiser",
  "value": 5,           // ❌ Should be 125 (5×24 + 5)
  "full_units": null,   // ❌ Should be 5
  "partial_units": null // ❌ Should be 5
}
```

### What Backend MUST Return:
```json
{
  "action": "count",
  "item_identifier": "budweiser",
  "full_units": 5,        // ✅ 5 cases
  "partial_units": 5,     // ✅ 5 bottles
  "value": 125,           // ✅ Calculated: (5 × 24) + 5
  "transcription": "count, Budweiser bottle, 5 cases, 5 bottles"
}
```

---

## ✅ CORRECT PAYLOAD FORMATS BY ACTION

### 1. COUNT (Counted Values)

**Rule:** Must split into `full_units` and `partial_units`

#### Bottled Beer (Category B, UOM=24)
```json
// User says: "count budweiser 5 cases 5 bottles"
{
  "action": "count",
  "item_identifier": "budweiser",
  "full_units": 5,        // Cases
  "partial_units": 5,     // Bottles
  "value": 125,           // (5 × 24) + 5 = 125 bottles total
  "transcription": "count budweiser 5 cases 5 bottles"
}
```

#### Draught Beer (Category D, UOM=88)
```json
// User says: "count guinness 3 kegs 20 pints"
{
  "action": "count",
  "item_identifier": "guinness",
  "full_units": 3,        // Kegs
  "partial_units": 20,    // Pints
  "value": 284,           // (3 × 88) + 20 = 284 pints total
  "transcription": "count guinness 3 kegs 20 pints"
}
```

---

### 2. PURCHASE

**Rule:** Return single `value` field ONLY (no full_units/partial_units)

#### Bottled Beer (Category B, UOM=24)
```json
// User says: "purchase 5 cases of budweiser"
{
  "action": "purchase",
  "item_identifier": "budweiser",
  "value": 5,             // ✅ Number of CASES (whole number)
  "transcription": "purchase 5 cases of budweiser"
}

// Frontend sends to backend:
{
  "movement_type": "PURCHASE",
  "quantity": 5,          // 5 cases
  "notes": "Added via stocktake",
  "staff_id": 42,
  "staff_name": "John"
}

// Backend converts: 5 cases × 24 = 120 bottles (servings)
```

**SAME AS MANUAL ENTRY:** User types "5" in purchases input (meaning 5 cases)

#### Draught Beer (Category D, UOM=88)
```json
// User says: "purchase 2 kegs of guinness" OR "purchase 176 pints"
{
  "action": "purchase",
  "item_identifier": "guinness",
  "value": 176,           // ✅ Number of PINTS (must be multiple of 88)
  "transcription": "purchase 2 kegs of guinness"
}

// Frontend sends to backend:
{
  "movement_type": "PURCHASE",
  "quantity": 176,        // 176 pints (already in servings)
  "notes": "Added via stocktake",
  "staff_id": 42,
  "staff_name": "John"
}

// Backend stores: 176 pints (no conversion needed)
```

**SAME AS MANUAL ENTRY:** User types "176" in purchases input (meaning 176 pints = 2 kegs)

---

### 3. WASTE

**Rule:** Return single `value` field ONLY (no full_units/partial_units)

#### Bottled Beer (Category B, UOM=24)
```json
// User says: "waste 12 bottles of budweiser"
{
  "action": "waste",
  "item_identifier": "budweiser",
  "value": 12,            // ✅ Number of BOTTLES (must be < 24)
  "transcription": "waste 12 bottles of budweiser"
}

// Frontend sends to backend:
{
  "movement_type": "WASTE",
  "quantity": 12,         // 12 bottles
  "notes": "Added via stocktake",
  "staff_id": 42,
  "staff_name": "John"
}

// Backend stores: 12 bottles (no conversion needed)
```

**SAME AS MANUAL ENTRY:** User types "12" in waste input (meaning 12 bottles)

#### Draught Beer (Category D, UOM=88)
```json
// User says: "waste 25 pints of guinness"
{
  "action": "waste",
  "item_identifier": "guinness",
  "value": 25,            // ✅ Number of PINTS (must be < 88)
  "transcription": "waste 25 pints of guinness"
}

// Frontend sends to backend:
{
  "movement_type": "WASTE",
  "quantity": 25,         // 25 pints
  "notes": "Added via stocktake",
  "staff_id": 42,
  "staff_name": "John"
}

// Backend stores: 25 pints (no conversion needed)
```

**SAME AS MANUAL ENTRY:** User types "25" in waste input (meaning 25 pints)

---

## 📋 SUMMARY TABLE

| Action | Category | Voice Returns | Frontend Sends to `/add-movement/` | Backend Stores |
|--------|----------|---------------|-------------------------------------|----------------|
| **COUNT** | B | `full_units: 5, partial_units: 5` | PATCH `/stocktake-lines/{id}/` with `counted_full_units: 5, counted_partial_units: 5` | Calculates total servings |
| **COUNT** | D | `full_units: 3, partial_units: 20` | PATCH `/stocktake-lines/{id}/` with `counted_full_units: 3, counted_partial_units: 20` | Calculates total servings |
| **PURCHASE** | B | `value: 5` (cases) | POST with `quantity: 5` | Converts: 5×24=120 bottles |
| **PURCHASE** | D | `value: 176` (pints) | POST with `quantity: 176` | Stores: 176 pints |
| **WASTE** | B | `value: 12` (bottles) | POST with `quantity: 12` | Stores: 12 bottles |
| **WASTE** | D | `value: 25` (pints) | POST with `quantity: 25` | Stores: 25 pints |

---

## 🔑 KEY RULES FOR BACKEND VOICE PARSER

### For COUNT Actions:
1. Parse "X cases Y bottles" → `full_units: X, partial_units: Y`
2. Parse "X kegs Y pints" → `full_units: X, partial_units: Y`
3. Calculate `value = (full_units × UOM) + partial_units`
4. Return ALL THREE fields

### For PURCHASE Actions:
1. Parse "X cases" → `value: X` (for Bottled Beer)
2. Parse "X kegs" → convert to pints: `value: X × UOM` (for Draught)
3. Return ONLY `value` field (NO full_units/partial_units)
4. Validate: whole numbers for B, multiples of UOM for D

### For WASTE Actions:
1. Parse "X bottles" → `value: X` (for Bottled Beer)
2. Parse "X pints" → `value: X` (for Draught)
3. Return ONLY `value` field (NO full_units/partial_units)
4. Validate: < UOM (partial units only)

---

## 🐛 CURRENT BUG

**Symptom:** Voice command says "5 cases 5 bottles" but preview shows "Total: 5"

**Cause:** Backend is NOT parsing the breakdown and returning:
```json
{
  "value": 5,           // ❌ Just the first number
  "full_units": null,   // ❌ Missing
  "partial_units": null // ❌ Missing
}
```

**Fix Required:** Backend parser must extract BOTH full and partial units from transcription.

---

## 📞 BACKEND TEAM ACTION ITEMS

1. ✅ Fix COUNT action parser to split "X cases Y bottles" correctly
2. ✅ Calculate total value for COUNT: `(full × UOM) + partial`
3. ✅ For PURCHASE with Draught, convert kegs to pints
4. ✅ Validate PURCHASE must be whole numbers (B) or multiples of UOM (D)
5. ✅ Validate WASTE must be < UOM (partial units only)
6. ✅ Test all three actions with both Bottled Beer and Draught Beer

---

**Last Updated:** November 21, 2025  
**Reported By:** Frontend Team  
**Priority:** CRITICAL - Voice feature currently broken
