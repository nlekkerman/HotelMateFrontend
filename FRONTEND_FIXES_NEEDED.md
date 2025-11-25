# Frontend Settings Issues & Fixes

## Problems Identified

### ❌ Problem #1: Trying to fetch theme from wrong/non-existent endpoint
**Current code:**
```javascript
const { data: themeSettings } = useQuery({
  queryKey: ['hotelTheme', hotelSlug],
  queryFn: async () => {
    const response = await api.get(`/common/${hotelSlug}/theme/`);
    return response.data;
  }
});
```

**Issue:** Backend doesn't have a `/common/{slug}/theme/` endpoint!

**Solution:** Backend returns BOTH content AND theme colors in ONE response from `/staff/hotel/{slug}/settings/`

---

### ❌ Problem #2: Field name mismatch
**Frontend expects:** `main_color`  
**Backend returns:** `primary_color`

**Frontend expects:** Multiple theme fields  
**Backend returns:** Only `primary_color`, `secondary_color`, `accent_color`, `background_color`, `button_color`, `theme_mode`

---

### ❌ Problem #3: Trying to save fields that don't exist in backend
You're sending these fields that backend doesn't support:
- `website` 
- `google_maps_link`
- `logo` (this is on Hotel model, not settings)
- `favicon`
- `slogan`
- `button_text_color`
- `button_hover_color`
- `text_color`
- `border_color`
- `link_color`
- `link_hover_color`

---

## ✅ The Correct Implementation

### Single API Call

```javascript
// Only ONE fetch needed - gets everything!
const { data: settings, isLoading, error } = useQuery({
  queryKey: ['hotelPublicSettings', hotelSlug],
  queryFn: async () => {
    const response = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
    return response.data; // Contains BOTH content AND theme
  },
  enabled: !!hotelSlug && canEdit,
});
```

### Backend Response Structure
```json
{
  "short_description": "",
  "long_description": "",
  "welcome_message": "",
  "hero_image": "",
  "gallery": [],
  "amenities": [],
  "contact_email": "",
  "contact_phone": "",
  "contact_address": "",
  "primary_color": "#3B82F6",
  "secondary_color": "#10B981",
  "accent_color": "#F59E0B",
  "background_color": "#FFFFFF",
  "button_color": "#3B82F6",
  "theme_mode": "light",
  "updated_at": "2025-11-24T10:30:00Z"
}
```

### Correct Form Initialization
```javascript
useEffect(() => {
  if (settings) {
    setFormData(prev => ({
      ...prev,
      // Content
      welcome_message: settings.welcome_message || '',
      short_description: settings.short_description || '',
      long_description: settings.long_description || '',
      hero_image: settings.hero_image || '',
      gallery: settings.gallery || [],
      contact_email: settings.contact_email || '',
      contact_phone: settings.contact_phone || '',
      contact_address: settings.contact_address || '',
      amenities: settings.amenities || [],
      // Theme (note the field names!)
      primary_color: settings.primary_color || '#3B82F6',
      secondary_color: settings.secondary_color || '#10B981',
      button_color: settings.button_color || '#3B82F6',
      background_color: settings.background_color || '#FFFFFF',
    }));
  }
}, [settings]);
```

### Correct Save Payload
```javascript
const saveSettingsMutation = useMutation({
  mutationFn: async () => {
    const payload = {
      // Content
      welcome_message: formData.welcome_message,
      short_description: formData.short_description,
      long_description: formData.long_description,
      hero_image: formData.hero_image,
      gallery: formData.gallery,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      contact_address: formData.contact_address,
      amenities: formData.amenities,
      // Theme
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      button_color: formData.button_color,
      background_color: formData.background_color,
      // DON'T send: website, google_maps_link, logo, favicon, slogan
    };
    
    return await api.patch(`/staff/hotel/${hotelSlug}/settings/`, payload);
  }
});
```

---

## Quick Fix Summary

1. **Remove** the separate theme endpoint fetch (`/common/${hotelSlug}/theme/`)
2. **Change** `main_color` to `primary_color` everywhere
3. **Remove** unsupported fields from save payload
4. **Remove** second `useEffect` for theme (it's in main settings now)
5. **Update** onSuccess to handle single response (no `data.theme`, just `data`)
6. **Remove** `themeLoading` from loading check (only need `settingsLoading`)

---

## Files That Need Changes

1. `Settings.jsx` - Main component (multiple changes)
2. UI sections are probably fine - they receive data via props

---

## Testing Checklist

After fixing:
- [ ] Check console logs - should see single API call to `/staff/hotel/{slug}/settings/`
- [ ] Verify response contains all fields (content + theme)
- [ ] Check form populates correctly
- [ ] Test saving - should succeed without backend errors
- [ ] Verify CSS variables update after save

---

**Status:** 🔧 Fixes needed  
**Priority:** HIGH - Page won't work until fixed
