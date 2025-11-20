# Voice Recognition Product Training Guide

## 🎯 Problem
Voice recognition is hearing products incorrectly:
- "beams" instead of "Beamish" 
- Unclear product names
- Mispronunciations

## ✅ Solution: Product Name Aliases

The backend AI needs to be trained with common product name variations and how people actually say them.

---

## 📋 Product Alias System

### Backend Implementation Needed

Create a product alias mapping in your backend:

```python
# voice_recognition/product_aliases.py

PRODUCT_ALIASES = {
    # Beers - Common mispronunciations
    'beamish': ['beamish', 'beams', 'beam', 'beems', 'beamis'],
    'heineken': ['heineken', 'heiney', 'heine', 'hieneken'],
    'guinness': ['guinness', 'guiness', 'guin', 'guinnes'],
    'budweiser': ['budweiser', 'bud', 'budw', 'budwiser'],
    'carlsberg': ['carlsberg', 'carls', 'carlsburg'],
    'coors': ['coors', 'coors light', 'cores'],
    'corona': ['corona', 'carona'],
    'stella': ['stella', 'stella artois', 'stela'],
    
    # Irish Beers
    'smithwicks': ['smithwicks', 'smithicks', 'smithwix', 'smitticks'],
    'murphys': ['murphys', 'murphy', 'murphies'],
    
    # Spirits
    'jameson': ['jameson', 'jamo', 'jammo', 'jamesons'],
    'jack daniels': ['jack daniels', 'jack', 'jd', 'jack daniel'],
    'bacardi': ['bacardi', 'barcardi', 'bacadi'],
    'smirnoff': ['smirnoff', 'smernoff', 'smirnov'],
    'baileys': ['baileys', 'bailey', 'bailies'],
    
    # Wines
    'merlot': ['merlot', 'merlo', 'merlott'],
    'chardonnay': ['chardonnay', 'chardonay', 'shardonay'],
    'sauvignon': ['sauvignon', 'sauvignon blanc', 'savignon'],
    
    # Minerals/Soft Drinks
    'coca cola': ['coca cola', 'coke', 'coca-cola', 'cocacola'],
    'pepsi': ['pepsi', 'pepsie'],
    'sprite': ['sprite', 'spright'],
    'fanta': ['fanta', 'fanter'],
    '7up': ['7up', '7 up', 'seven up'],
    
    # Water
    'ballygowan': ['ballygowan', 'bally', 'ballygowen'],
    'evian': ['evian', 'evien'],
    
    # Energy Drinks
    'red bull': ['red bull', 'redbull', 'red-bull'],
    'monster': ['monster', 'monster energy'],
    
    # Syrups
    'lime cordial': ['lime cordial', 'lime', 'lime syrup'],
    'blackcurrant': ['blackcurrant', 'black currant', 'blackcurrent'],
    'orange squash': ['orange squash', 'orange', 'orange syrup'],
}

def normalize_product_name(spoken_name):
    """
    Convert spoken product name to actual product SKU/name
    
    Args:
        spoken_name: What user said (e.g., "beams", "heine")
        
    Returns:
        Normalized product name (e.g., "beamish", "heineken")
    """
    spoken_lower = spoken_name.lower().strip()
    
    # Check all aliases
    for product, aliases in PRODUCT_ALIASES.items():
        if spoken_lower in aliases:
            return product
    
    # If no match, return original (might be exact name)
    return spoken_name
```

---

## 🔧 Update Command Parser

Modify your backend command parser to use aliases:

```python
# voice_recognition/command_parser.py

from .product_aliases import normalize_product_name

def parse_voice_command(transcription: str) -> Dict:
    """Parse voice command with product normalization"""
    
    # ... existing parsing logic ...
    
    # Extract item_identifier
    item_identifier = text.strip()
    
    # ✅ NORMALIZE PRODUCT NAME
    item_identifier = normalize_product_name(item_identifier)
    
    result = {
        'action': action,
        'item_identifier': item_identifier,  # Now normalized!
        'value': value,
        'transcription': transcription
    }
    
    return result
```

---

## 🎓 Training the AI (GPT-based approach)

If using GPT to parse commands, add this to your system prompt:

```python
SYSTEM_PROMPT = """
You are a voice command parser for a stocktake system in an Irish bar/hotel.

PRODUCT NAME VARIATIONS (recognize these):
- "beams" or "beam" → "Beamish"
- "heine" or "heiney" → "Heineken"
- "guin" → "Guinness"
- "bud" → "Budweiser"
- "jamo" or "jammo" → "Jameson"
- "jack" or "jd" → "Jack Daniels"
- "coke" → "Coca Cola"
- "bally" → "Ballygowan"

EXAMPLES:
- "count beams 30 kegs" → {"action": "count", "item_identifier": "beamish", "value": 30}
- "purchase heiney 5 cases" → {"action": "purchase", "item_identifier": "heineken", "value": 5}
- "waste jamo 2 bottles" → {"action": "waste", "item_identifier": "jameson", "value": 2}

Always normalize product names to their full correct spelling.
"""
```

---

## 📊 Product Database Enhancement

### Option 1: Add Alias Field to Database

Add an `aliases` field to your stock items table:

```sql
ALTER TABLE stock_items ADD COLUMN aliases TEXT;

-- Example data
UPDATE stock_items 
SET aliases = 'beams,beam,beems' 
WHERE name = 'Beamish Stout';

UPDATE stock_items 
SET aliases = 'heiney,heine' 
WHERE name = 'Heineken';
```

### Option 2: Separate Alias Table

```sql
CREATE TABLE product_aliases (
    id SERIAL PRIMARY KEY,
    stock_item_id INTEGER REFERENCES stock_items(id),
    alias VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add aliases
INSERT INTO product_aliases (stock_item_id, alias) VALUES
    (123, 'beams'),
    (123, 'beam'),
    (124, 'heiney'),
    (124, 'heine');
```

---

## 🔍 Improved Product Matching

Update your backend matching logic:

```python
def find_stocktake_line(item_identifier, stocktake_lines):
    """
    Find matching stocktake line with fuzzy matching
    
    Args:
        item_identifier: Normalized product name from voice
        stocktake_lines: List of stocktake line objects
        
    Returns:
        Matching line or None
    """
    item_lower = item_identifier.lower()
    
    # Priority 1: Exact SKU match
    for line in stocktake_lines:
        if line.item_sku.lower() == item_lower:
            return line
    
    # Priority 2: Check aliases
    for line in stocktake_lines:
        if hasattr(line, 'aliases') and line.aliases:
            aliases = line.aliases.lower().split(',')
            if item_lower in aliases:
                return line
    
    # Priority 3: Name contains identifier
    for line in stocktake_lines:
        if item_lower in line.item_name.lower():
            return line
    
    # Priority 4: Identifier contains name
    for line in stocktake_lines:
        if line.item_name.lower() in item_lower:
            return line
    
    # Priority 5: Fuzzy match (Levenshtein distance)
    from difflib import get_close_matches
    names = [line.item_name.lower() for line in stocktake_lines]
    matches = get_close_matches(item_lower, names, n=1, cutoff=0.6)
    if matches:
        for line in stocktake_lines:
            if line.item_name.lower() == matches[0]:
                return line
    
    return None
```

---

## 📝 Quick Implementation Checklist

### Backend Changes Needed:

1. ✅ Create `product_aliases.py` with common variations
2. ✅ Update command parser to normalize product names
3. ✅ Add aliases to database OR use hardcoded mapping
4. ✅ Update matching logic to check aliases
5. ✅ If using GPT: Update system prompt with examples

### Testing:

```bash
# Test voice commands
"count beams 30"           → Should match "Beamish"
"purchase heiney 5 cases"  → Should match "Heineken"
"waste jamo 2 bottles"     → Should match "Jameson"
```

---

## 🎯 Common Irish Bar Products to Add

```python
IRISH_BAR_PRODUCTS = {
    # Draught Beers
    'beamish': ['beamish', 'beams', 'beam'],
    'murphys': ['murphys', 'murphy', 'murph'],
    'smithwicks': ['smithwicks', 'smithicks', 'smithwix', 'smitticks'],
    
    # Bottled Beers
    'heineken': ['heineken', 'heiney', 'heine'],
    'budweiser': ['budweiser', 'bud'],
    'corona': ['corona', 'carona'],
    'coors': ['coors', 'coors light'],
    
    # Irish Spirits
    'jameson': ['jameson', 'jamo', 'jammo'],
    'bushmills': ['bushmills', 'bushmill', 'bushmils'],
    'tullamore': ['tullamore', 'tullamore dew', 'tully'],
    'baileys': ['baileys', 'bailey'],
    
    # International Spirits
    'jack daniels': ['jack daniels', 'jack', 'jd'],
    'captain morgan': ['captain morgan', 'captain', 'morgan'],
    'bacardi': ['bacardi', 'barcardi'],
    'smirnoff': ['smirnoff', 'smernoff'],
    
    # Minerals
    'coca cola': ['coca cola', 'coke', 'coca-cola'],
    'pepsi': ['pepsi', 'pepsie'],
    '7up': ['7up', '7 up', 'seven up'],
    'club orange': ['club orange', 'club'],
    'ballygowan': ['ballygowan', 'bally'],
}
```

---

## 🚀 Expected Results

### Before:
```
User says: "count thirty beams to kegs"
AI hears: "and 30 beams to kegs"
Backend: ❌ No action keyword found
```

### After:
```
User says: "count thirty beamish kegs"
AI hears: "count thirty beams kegs"
Backend normalizes: "beams" → "Beamish"
Result: ✅ {"action": "count", "item_identifier": "beamish", "value": 30}
```

---

## 📞 Frontend Improvements (Optional)

Show hints to users about what to say:

```jsx
// Add to VoiceRecorder or StocktakeLines
<div className="voice-hints">
  <small className="text-muted">
    💡 Try saying: "count heineken 24" or "purchase bud 5 cases"
  </small>
</div>
```

---

## 🎓 Training Tips for Users

1. **Speak clearly** - Enunciate product names
2. **Use common nicknames** - "Bud" instead of "Budweiser"
3. **Include action word first** - "count", "purchase", "waste"
4. **Say numbers clearly** - "twenty four" or "24"
5. **Pause before speaking** - Let recording start fully

---

## Summary

The main issue is that voice recognition needs **product name aliases** to understand how people actually say product names vs. what they're called in the system.

**BACKEND must implement:**
- Product alias mapping
- Name normalization in parser
- Better fuzzy matching

This is a **BACKEND task** - the frontend is working correctly!
