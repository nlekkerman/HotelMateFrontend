# Backend Theme Fields Required

**Date:** November 24, 2025  
**Priority:** HIGH - Frontend is ready and sending these fields

---

## Current Situation

The **frontend Settings page** now sends ALL theme color fields, but the backend `HotelPublicSettings` model only supports 4 color fields.

---

## Fields Backend NEEDS TO ADD

Add these fields to the `HotelPublicSettings` model in `hotel/models.py`:

### 1. Button Customization
```python
button_text_color = models.CharField(
    max_length=7,
    default='#ffffff',
    blank=True,
    help_text="Button text color (hex)"
)

button_hover_color = models.CharField(
    max_length=7,
    default='#0066cc',
    blank=True,
    help_text="Button hover state color (hex)"
)
```

### 2. Text & Typography
```python
text_color = models.CharField(
    max_length=7,
    default='#333333',
    blank=True,
    help_text="Main text color (hex)"
)
```

### 3. Borders
```python
border_color = models.CharField(
    max_length=7,
    default='#e5e7eb',
    blank=True,
    help_text="Border color (hex)"
)
```

### 4. Links
```python
link_color = models.CharField(
    max_length=7,
    default='#007bff',
    blank=True,
    help_text="Link color (hex)"
)

link_hover_color = models.CharField(
    max_length=7,
    default='#0056b3',
    blank=True,
    help_text="Link hover color (hex)"
)
```

---

## Complete Field List

After adding these, the model will have:

| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| ✅ `primary_color` | CharField | #3B82F6 | Main brand color |
| ✅ `secondary_color` | CharField | #10B981 | Secondary brand color |
| ✅ `button_color` | CharField | #3B82F6 | Primary button color |
| ✅ `background_color` | CharField | #FFFFFF | Page background |
| ➕ `button_text_color` | CharField | #ffffff | Button text |
| ➕ `button_hover_color` | CharField | #0066cc | Button hover |
| ➕ `text_color` | CharField | #333333 | Body text |
| ➕ `border_color` | CharField | #e5e7eb | Borders |
| ➕ `link_color` | CharField | #007bff | Links |
| ➕ `link_hover_color` | CharField | #0056b3 | Link hover |

---

## Migration Steps

1. **Add fields to model:**
```bash
# In hotel/models.py - HotelPublicSettings class
# Add the 6 new CharField fields above
```

2. **Update serializer:**
```python
# In hotel/serializers.py - HotelPublicSettingsStaffSerializer
class Meta:
    model = HotelPublicSettings
    fields = [
        'short_description',
        'long_description',
        'welcome_message',
        'hero_image',
        'gallery',
        'amenities',
        'contact_email',
        'contact_phone',
        'contact_address',
        'primary_color',
        'secondary_color',
        'button_color',
        'button_text_color',      # NEW
        'button_hover_color',     # NEW
        'text_color',             # NEW
        'background_color',
        'border_color',           # NEW
        'link_color',             # NEW
        'link_hover_color',       # NEW
        'updated_at',
    ]
```

3. **Create and run migration:**
```bash
python manage.py makemigrations
python manage.py migrate
```

4. **Test the endpoint:**
```bash
# GET request should return all new fields
curl https://hotel-porter-d25ad83b12cf.herokuapp.com/api/staff/hotel/hotel-killarney/settings/

# PATCH request should accept all new fields
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "button_text_color": "#ffffff",
    "button_hover_color": "#0066cc",
    "text_color": "#333333",
    "border_color": "#e5e7eb",
    "link_color": "#007bff",
    "link_hover_color": "#0056b3"
  }' \
  https://hotel-porter-d25ad83b12cf.herokuapp.com/api/staff/hotel/hotel-killarney/settings/
```

---

## Frontend Status

✅ **Frontend is READY** - Already sending these fields:
- Settings.jsx sends all 10 color fields on save
- SectionTheme.jsx displays all 10 color pickers
- useHotelTheme.js applies all colors as CSS variables
- CSS files use the CSS variables

⏳ **Waiting on backend** to accept and save these fields.

---

## Why This is Important

Without these fields, hotels cannot:
- ❌ Customize button text color (stuck with white)
- ❌ Customize button hover states (auto-calculated)
- ❌ Customize link colors to match brand
- ❌ Customize border and text colors for full theming

With these fields, hotels get:
- ✅ Complete brand customization
- ✅ Full control over all UI colors
- ✅ Better brand consistency
- ✅ Professional appearance

---

## Testing Checklist

After backend update:
- [ ] Frontend can save all 10 color fields without errors
- [ ] Settings page loads with all saved colors
- [ ] Public page displays correct colors
- [ ] Theme preview shows all colors correctly
- [ ] No console errors about missing fields

---

**Status:** 🔴 Blocked - Waiting for backend migration  
**Frontend Ready:** ✅ YES  
**Backend Ready:** ❌ NO - Migration needed
