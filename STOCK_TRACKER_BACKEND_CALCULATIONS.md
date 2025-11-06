# Stock Tracker Backend Calculations - Implementation Guide

## 🚨 URGENT: Current State Analysis

**Date:** November 6, 2025

### Current Database State
Based on frontend logs, all 153 stock items currently have:
- ✅ `serving_size` populated (e.g., "35.00" for spirits)
- ❌ `shots_per_bottle` = **null** (needs calculation)
- ❌ `pints_per_keg` = **null** (needs calculation)
- ❌ `half_pints_per_keg` = **null** (needs calculation)
- ❌ `servings_per_unit` = **null** (needs calculation for wine)
- ⚠️ `gp_percentage` = **null** (separate calculation needed)

### Required Actions
1. **Implement calculation functions** (see Section 1 below)
2. **Add pre-save hooks** (see Section 2.1)
3. **Run bulk update script** on all 153+ existing items (see Section 4)
4. **Verify API returns calculated values** (see Section 5)

### Expected Outcome
After implementation, a spirit item like "Gordons Gin" should have:
```json
{
  "serving_size": "35.00",
  "size_value": "700.00",
  "size_unit": "ml",
  "shots_per_bottle": "20.0"  // ← Auto-calculated: 700ml ÷ 35ml = 20 shots
}
```

---

## Overview
This document outlines the backend calculations and updates needed for the Stock Tracker system to automatically calculate serving information based on product types.

---

## 1. Auto-Calculate Fields on Save/Update

### 1.1 Spirits & Liqueurs - Shots Per Bottle

**When:** Item is saved or updated with `product_type` in: `['Spirit', 'Vodka', 'Gin', 'Rum', 'Whiskey', 'Whisky', 'Tequila', 'Brandy', 'Liqueur', 'Cognac', 'Bourbon']` OR `category_name` in: `['Spirits', 'Liqueurs']`

**Calculation:**
```python
def calculate_shots_per_bottle(size_value, size_unit, serving_size):
    """
    Calculate number of shots per bottle
    
    Args:
        size_value: Bottle size (e.g., 700, 1000)
        size_unit: Unit (ml, cl, L)
        serving_size: Shot size in ml (e.g., 25, 35)
    
    Returns:
        shots_per_bottle: Number of shots (float)
    """
    # Convert bottle size to ml
    if size_unit.lower() == 'cl':
        size_in_ml = size_value * 10
    elif size_unit.lower() == 'l':
        size_in_ml = size_value * 1000
    else:  # ml
        size_in_ml = size_value
    
    # Calculate shots
    shots_per_bottle = size_in_ml / serving_size
    
    return round(shots_per_bottle, 1)
```

**Examples:**
- 700ml bottle ÷ 35ml shot = **20 shots**
- 1000ml bottle ÷ 25ml shot = **40 shots**
- 70cl bottle ÷ 35ml shot = **20 shots** (70cl = 700ml)

---

### 1.2 Draught Beer - Pints & Half Pints Per Keg

**When:** Item is saved or updated with `product_type` in: `['Draught', 'Keg']`

**Calculation:**
```python
def calculate_pints_per_keg(size_value, size_unit):
    """
    Calculate pints and half-pints per keg
    
    Args:
        size_value: Keg size (e.g., 50, 30)
        size_unit: Unit (L, l, litres)
    
    Returns:
        pints_per_keg: Number of pints (float)
        half_pints_per_keg: Number of half-pints (float)
    """
    # Convert to litres
    if size_unit.lower() in ['l', 'litres', 'liters']:
        size_in_litres = size_value
    else:
        # Assume litres if not specified for kegs
        size_in_litres = size_value
    
    # Convert to ml
    size_in_ml = size_in_litres * 1000
    
    # Calculate pints (1 pint = 568ml)
    pints_per_keg = size_in_ml / 568
    
    # Calculate half-pints (1 half-pint = 284ml)
    half_pints_per_keg = size_in_ml / 284
    
    return round(pints_per_keg, 1), round(half_pints_per_keg, 1)
```

**Examples:**
- 50L keg = 50,000ml ÷ 568ml = **88 pints** or **176 half-pints**
- 30L keg = 30,000ml ÷ 568ml = **52.8 pints** or **105.6 half-pints**
- 20L keg = 20,000ml ÷ 568ml = **35.2 pints** or **70.4 half-pints**

---

### 1.3 Wine - Servings Per Unit (Glasses)

**When:** Item is saved or updated with `product_type` = `'Wine'`

**Calculation:**
```python
def calculate_servings_per_unit_wine(size_value, size_unit, serving_size):
    """
    Calculate number of glasses per bottle
    
    Args:
        size_value: Bottle size (e.g., 750)
        size_unit: Unit (ml, cl, L)
        serving_size: Glass size in ml (e.g., 175, 250)
    
    Returns:
        servings_per_unit: Number of glasses (float)
    """
    # Convert bottle size to ml
    if size_unit.lower() == 'cl':
        size_in_ml = size_value * 10
    elif size_unit.lower() == 'l':
        size_in_ml = size_value * 1000
    else:  # ml
        size_in_ml = size_value
    
    # Calculate glasses
    servings_per_unit = size_in_ml / serving_size
    
    return round(servings_per_unit, 1)
```

**Examples:**
- 750ml bottle ÷ 175ml glass = **4.3 glasses**
- 750ml bottle ÷ 125ml glass = **6 glasses**
- 750ml bottle ÷ 250ml glass = **3 glasses**

---

### 1.4 Garnishes - Servings Per Unit (Pieces)

**When:** Item is saved or updated with `product_type` = `'Garnish'`

**Manual Entry Required:**
- `servings_per_unit` should be manually entered by user
- Examples:
  - 1 lemon = 6-8 slices
  - 1 lime = 6-8 wedges
  - 1 jar olives = 20-30 pieces

**Note:** This is NOT auto-calculated as it varies by product and cutting method.

---

### 1.5 Soft Drinks, Mixers, Other

**When:** Item is saved or updated with `product_type` in: `['Soft Drink', 'Mixer', 'Other']`

**Optional Calculation:**
```python
def calculate_servings_per_unit_optional(size_value, size_unit, serving_size):
    """
    Optional: Calculate servings for multi-serve containers
    Only if serving_size is provided
    
    Args:
        size_value: Container size (e.g., 1000 for 1L)
        size_unit: Unit (ml, cl, L)
        serving_size: Serving size in ml (e.g., 50, 100, 200)
    
    Returns:
        servings_per_unit: Number of servings (float) or None
    """
    if not serving_size or serving_size == 0:
        return None
    
    # Convert container size to ml
    if size_unit.lower() == 'cl':
        size_in_ml = size_value * 10
    elif size_unit.lower() == 'l':
        size_in_ml = size_value * 1000
    else:  # ml
        size_in_ml = size_value
    
    # Calculate servings
    servings_per_unit = size_in_ml / serving_size
    
    return round(servings_per_unit, 1)
```

**Examples:**
- 1L tonic water ÷ 200ml serving = **5 servings**
- 1L juice ÷ 50ml mixer pour = **20 servings**
- 330ml can = **1 serving** (bottle IS the serving)

---

## 2. Backend Implementation Logic

### 2.1 Pre-Save Hook/Signal

Create a pre-save hook that triggers calculations before saving:

```python
from django.db.models.signals import pre_save
from django.dispatch import receiver

@receiver(pre_save, sender=StockItem)
def calculate_serving_info(sender, instance, **kwargs):
    """
    Auto-calculate serving information before saving
    """
    product_type = instance.product_type.lower() if instance.product_type else ''
    category_name = instance.category_name.lower() if instance.category_name else ''
    
    # Spirits & Liqueurs - Calculate Shots Per Bottle
    if is_spirit(product_type, category_name):
        if instance.size_value and instance.serving_size:
            instance.shots_per_bottle = calculate_shots_per_bottle(
                instance.size_value,
                instance.size_unit,
                instance.serving_size
            )
    
    # Draught Beer - Calculate Pints & Half Pints Per Keg
    elif product_type in ['draught', 'keg']:
        if instance.size_value:
            pints, half_pints = calculate_pints_per_keg(
                instance.size_value,
                instance.size_unit
            )
            instance.pints_per_keg = pints
            instance.half_pints_per_keg = half_pints
    
    # Wine - Calculate Servings Per Unit (Glasses)
    elif product_type == 'wine':
        if instance.size_value and instance.serving_size:
            instance.servings_per_unit = calculate_servings_per_unit_wine(
                instance.size_value,
                instance.size_unit,
                instance.serving_size
            )
    
    # Soft Drinks, Mixers, Other - Optional Calculation
    elif product_type in ['soft drink', 'mixer', 'other']:
        if instance.size_value and instance.serving_size and instance.serving_size > 0:
            instance.servings_per_unit = calculate_servings_per_unit_optional(
                instance.size_value,
                instance.size_unit,
                instance.serving_size
            )


def is_spirit(product_type, category_name):
    """Check if item is a spirit"""
    spirit_types = ['spirit', 'vodka', 'gin', 'rum', 'whiskey', 'whisky', 
                    'tequila', 'brandy', 'liqueur', 'cognac', 'bourbon']
    spirit_categories = ['spirits', 'liqueurs', 'liqueur']
    
    return product_type in spirit_types or category_name in spirit_categories
```

---

## 3. Required Database Fields

Ensure the following fields exist in the `StockItem` model:

```python
class StockItem(models.Model):
    # ... existing fields ...
    
    # Size information
    size_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    size_unit = models.CharField(max_length=10, null=True, blank=True)  # ml, cl, L
    
    # Serving information
    serving_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Auto-calculated fields
    shots_per_bottle = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pints_per_keg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    half_pints_per_keg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    servings_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
```

---

## 4. Bulk Update Existing Items

**CRITICAL:** Run this script AFTER deploying the calculation functions to update all 153+ existing items.

```python
def bulk_update_serving_info():
    """
    Update all existing stock items with calculated serving information
    
    IMPORTANT: This will process all items in the database.
    Current count: 153+ items
    """
    from your_app.models import StockItem
    
    items = StockItem.objects.all()
    total_items = items.count()
    updated_count = 0
    
    print(f"Starting bulk update of {total_items} items...")
    
    for item in items:
        # Trigger the pre-save calculations by saving
        try:
            item.save()
            updated_count += 1
            
            if updated_count % 10 == 0:
                print(f"Updated {updated_count}/{total_items} items...")
                
        except Exception as e:
            print(f"Error updating item {item.sku}: {e}")
    
    print(f"\n✅ Bulk update complete!")
    print(f"Total items updated: {updated_count}/{total_items}")
    
    # Summary report
    spirits = StockItem.objects.filter(shots_per_bottle__isnull=False).count()
    draughts = StockItem.objects.filter(pints_per_keg__isnull=False).count()
    wines = StockItem.objects.filter(
        product_type__iexact='wine',
        servings_per_unit__isnull=False
    ).count()
    
    print(f"\n📊 Results:")
    print(f"  Spirits with shots_per_bottle: {spirits}")
    print(f"  Draughts with pints_per_keg: {draughts}")
    print(f"  Wines with servings_per_unit: {wines}")
```

### Django Management Command (Recommended)

Create a management command for easy execution:

```python
# your_app/management/commands/update_serving_info.py
from django.core.management.base import BaseCommand
from your_app.models import StockItem

class Command(BaseCommand):
    help = 'Update all stock items with calculated serving information'

    def handle(self, *args, **options):
        bulk_update_serving_info()
```

**Run with:**
```bash
python manage.py update_serving_info
```

---

## 5. API Response

Ensure the API returns all calculated fields:

```json
{
  "id": 380,
  "sku": "SP0011",
  "name": "Gordons Gin",
  "product_type": "Gin",
  "category_name": "Spirits",
  "size_value": "700.00",
  "size_unit": "ml",
  "serving_size": "35.00",
  "shots_per_bottle": "20.0",  // Auto-calculated
  "pints_per_keg": null,
  "half_pints_per_keg": null,
  "servings_per_unit": null
}
```

---

## 6. Frontend Display Logic

The frontend will conditionally display fields based on product type:

| Product Type | Shows These Fields |
|-------------|-------------------|
| **Draught Beer** | Serving Size, Pints Per Keg, Half Pints Per Keg |
| **Spirits/Liqueurs** | Serving Size, Shots Per Bottle |
| **Wine** | Serving Size, Servings Per Unit (glasses) |
| **Bottled Beer** | Serving Size ONLY |
| **Soft Drinks** | Serving Size, Servings Per Unit (optional) |
| **Mixers** | Serving Size, Servings Per Unit (optional) |
| **Garnish** | Serving Size (pieces), Servings Per Unit (pieces) |
| **Other** | Serving Size, Servings Per Unit (optional) |

---

## 7. Validation Rules

Add these validations:

1. **Spirits:** If `serving_size` is provided, auto-calculate `shots_per_bottle`
2. **Draught:** If `size_value` is provided, auto-calculate `pints_per_keg` and `half_pints_per_keg`
3. **Wine:** If `serving_size` is provided, auto-calculate `servings_per_unit`
4. **Size Unit:** Validate that `size_unit` is one of: `ml`, `cl`, `L`, `l`

---

## 8. Testing Checklist

- [ ] Create new Spirit item → `shots_per_bottle` auto-calculated
- [ ] Create new Draught item → `pints_per_keg` and `half_pints_per_keg` auto-calculated
- [ ] Create new Wine item → `servings_per_unit` auto-calculated
- [ ] Update existing Spirit with new `serving_size` → `shots_per_bottle` recalculated
- [ ] Update existing Draught with new `size_value` → pints recalculated
- [ ] Bulk update script runs successfully on all items
- [ ] API returns all calculated fields correctly

---

## 9. Common Serving Sizes Reference

### Spirits
- **Standard Shot (Ireland/UK):** 35ml
- **Small Shot (UK):** 25ml
- **US Shot:** 44ml (1.5 oz)
- **Double:** 50ml or 70ml

### Draught Beer
- **Pint:** 568ml
- **Half-pint:** 284ml

### Wine
- **Small glass:** 125ml
- **Medium glass:** 175ml
- **Large glass:** 250ml

### Common Bottle Sizes
- **Spirit bottle:** 700ml or 1000ml (1L)
- **Wine bottle:** 750ml
- **Beer keg:** 50L, 30L, 20L
- **Bottled beer:** 330ml, 500ml

---

## 10. Migration Order

1. Add/verify database fields exist
2. Deploy calculation functions
3. Deploy pre-save hooks
4. Test with new items
5. Run bulk update script on existing items
6. Verify API responses
7. Frontend should automatically display calculated values

---

## Questions?

Contact the frontend team if:
- New product types need to be added
- Calculation logic needs adjustment
- Additional fields need to be displayed

---

**Document Version:** 1.0  
**Date:** November 6, 2025  
**Author:** Frontend Team
