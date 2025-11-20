# 🚨 CRITICAL: Backend Must Return line_id

## ❌ Current Problem

Frontend is doing fuzzy matching - **THIS IS WRONG!**

```javascript
// ❌ BAD: Frontend tries to match product
const matchingLine = lines.find(line => 
  line.item_name.toLowerCase().includes(productName) ||
  productName.includes(line.item_name.toLowerCase())
);
```

## ✅ Correct Solution

**Backend must do ALL matching and return exact `line_id`**

---

## 📋 What Backend Must Do

### 1. Receive Audio + stocktake_id ✅ (Already working)

```python
audio_file = request.FILES.get('audio')
stocktake_id = request.POST.get('stocktake_id')
```

### 2. Transcribe with Whisper ✅ (Already working)

```python
transcription = whisper_transcribe(audio_file)
# Result: "count beams thirty"
```

### 3. Parse Command ✅ (Already working)

```python
command = parse_voice_command(transcription)
# Result: {
#   'action': 'count',
#   'item_identifier': 'beams',
#   'value': 30
# }
```

### 4. ✅ NEW: Normalize Product Name

```python
from .product_aliases import normalize_product_name

normalized_name = normalize_product_name(command['item_identifier'])
# 'beams' → 'beamish'
```

### 5. ✅ NEW: Find Matching Stocktake Line

```python
# Get all lines for this stocktake
stocktake = Stocktake.objects.get(id=stocktake_id)
lines = StocktakeLine.objects.filter(stocktake=stocktake)

# Find match by name, SKU, or alias
matching_line = None
normalized = normalized_name.lower()

for line in lines:
    # Check exact SKU
    if line.item.sku.lower() == normalized:
        matching_line = line
        break
    
    # Check name contains
    if normalized in line.item.name.lower():
        matching_line = line
        break
    
    # Check aliases (if you have them)
    if hasattr(line.item, 'aliases'):
        aliases = [a.lower() for a in line.item.aliases.split(',')]
        if normalized in aliases:
            matching_line = line
            break

if not matching_line:
    return Response({
        'success': False,
        'error': f"Product '{normalized_name}' not found in stocktake",
        'transcription': transcription,
        'searched_for': normalized_name
    }, status=404)
```

### 6. ✅ NEW: Return line_id

```python
return Response({
    'success': True,
    'command': {
        'action': command['action'],
        'line_id': matching_line.id,           # ✅ EXACT LINE ID
        'item_name': matching_line.item.name,  # ✅ REAL NAME
        'item_sku': matching_line.item.sku,    # ✅ REAL SKU
        'value': command['value'],
        'full_units': command.get('full_units'),
        'partial_units': command.get('partial_units'),
        'transcription': transcription
    }
})
```

---

## 📤 Complete Backend Response Format

```json
{
  "success": true,
  "command": {
    "action": "count",
    "line_id": 12345,              // ✅ Frontend uses this directly
    "item_name": "Beamish Stout",  // ✅ Display to user
    "item_sku": "D0001",           // ✅ Display to user
    "value": 30,
    "full_units": null,
    "partial_units": null,
    "transcription": "count beams thirty"
  }
}
```

---

## 🎯 Frontend Changes (Simple!)

Frontend just receives `line_id` and updates that exact line:

```javascript
const handleVoiceCommandConfirm = async (command) => {
  // ✅ NO MATCHING - Backend already found it!
  const lineId = command.line_id;
  
  // Just update the line
  const response = await api.patch(
    `/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`,
    {
      counted_full_units: command.full_units || 0,
      counted_partial_units: command.partial_units || 0
    }
  );
  
  // Done!
  toast.success(`✅ ${command.item_name}: ${command.value}`);
};
```

---

## 🚀 Benefits

1. **Single source of truth** - Backend does ALL matching
2. **No fuzzy logic on frontend** - Just simple update
3. **Better error messages** - Backend knows what products exist
4. **Works with aliases** - Backend has access to database
5. **Consistent** - Same matching logic for all clients

---

## 📝 Backend Implementation Checklist

- [ ] Create `product_aliases.py` with common name variations
- [ ] Create `product_matcher.py` with matching logic
- [ ] Update view to fetch stocktake lines
- [ ] Update view to find matching line
- [ ] Update response to include `line_id`, `item_name`, `item_sku`
- [ ] Update error responses to be helpful

---

## 🔥 Summary

**Frontend's job:**
1. Record audio
2. Send to backend
3. Show preview modal
4. Update the line_id backend returns

**Backend's job:**
1. Transcribe audio
2. Parse command
3. Normalize product name (aliases)
4. **FIND THE EXACT LINE**
5. Return line_id + full details

**NO fuzzy matching on frontend!**
