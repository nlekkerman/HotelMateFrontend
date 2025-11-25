# Settings Component - Fixes Applied ✅

## What Was Wrong

### 1. **You were calling TWO endpoints instead of ONE**
   - ❌ `/staff/hotel/${hotelSlug}/settings/` for content
   - ❌ `/common/${hotelSlug}/theme/` for theme (THIS DOESN'T EXIST!)
   
   **Fixed:** Now only calling ONE endpoint that returns everything

### 2. **Field name mismatches**
   - You expected `main_color` but backend returns `primary_color`
   - You expected many theme fields that don't exist in backend
   
   **Fixed:** Using correct field names from backend

### 3. **Trying to save unsupported fields**
   - Sending `website`, `google_maps_link`, `logo`, `favicon`, `slogan`
   - These don't exist in backend model yet
   
   **Fixed:** Removed from save payload (added TODO comments)

---

## Changes Made

### ✅ Removed Second API Call
```javascript
// REMOVED THIS:
const { data: themeSettings } = useQuery({
  queryFn: async () => {
    const response = await api.get(`/common/${hotelSlug}/theme/`);
    return response.data;
  }
});

// NOW: Only one fetch that gets everything
const { data: settings } = useQuery({
  queryFn: async () => {
    const response = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
    return response.data; // Contains both content AND theme
  }
});
```

### ✅ Fixed Form Initialization
```javascript
// Now correctly reads from single settings object
setFormData(prev => ({
  ...prev,
  // Content
  welcome_message: settings.welcome_message || '',
  hero_image: settings.hero_image || '',
  // Theme (using correct field names)
  primary_color: settings.primary_color || '#3498db',
  secondary_color: settings.secondary_color || '#10B981',
  button_color: settings.button_color || '#3B82F6',
  background_color: settings.background_color || '#FFFFFF',
}));
```

### ✅ Fixed Save Mutation
```javascript
// Only sending fields that exist in backend
const settingsPayload = {
  welcome_message: formData.welcome_message,
  short_description: formData.short_description,
  long_description: formData.long_description,
  hero_image: formData.hero_image,
  gallery: formData.gallery,
  contact_email: formData.contact_email,
  contact_phone: formData.contact_phone,
  contact_address: formData.contact_address,
  amenities: formData.amenities,
  primary_color: formData.primary_color,
  secondary_color: formData.secondary_color,
  button_color: formData.button_color,
  background_color: formData.background_color,
};

// REMOVED: website, google_maps_link, logo, favicon, slogan
// REMOVED: Second API call to /theme/ endpoint
```

### ✅ Fixed onSuccess Handler
```javascript
onSuccess: (data) => {
  // No more data.theme - it's all in data directly
  document.documentElement.style.setProperty('--primary-color', data.primary_color);
  document.documentElement.style.setProperty('--secondary-color', data.secondary_color);
  document.documentElement.style.setProperty('--button-color', data.button_color);
  document.documentElement.style.setProperty('--background-color', data.background_color);
  
  // Only invalidate one query (not hotelTheme anymore)
  queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
}
```

### ✅ Fixed Loading State
```javascript
// REMOVED: themeLoading check
if (settingsLoading) {
  return <LoadingSpinner />;
}
```

---

## Added Comprehensive Logging

All these console.logs will help you debug:
- `[Settings] Permission Check:` - Shows if user can edit
- `[Settings] Fetching settings from:` - Shows API endpoint being called
- `[Settings] Settings response:` - Shows raw backend response
- `[Settings] Settings fetch error:` - Shows any API errors
- `[Settings] Populating form with settings:` - Shows form data
- `[Settings] Render state:` - Shows component state
- `[Settings] Saving settings for hotel:` - Shows save attempt
- `[Settings] Sending payload:` - Shows what's being sent to backend
- `[Settings] Save successful:` - Shows save response
- `[SectionPublicOverview] Rendering with:` - Shows props in overview section

---

## Testing Steps

1. **Open browser console (F12)**

2. **Navigate to Settings page**
   ```
   /staff/hotel-killarney/settings
   ```

3. **Check console logs - You should see:**
   ```
   [Settings] Permission Check: { hotelSlug: "hotel-killarney", canEdit: true, user: {...} }
   [Settings] Fetching settings from: /staff/hotel/hotel-killarney/settings/
   [Settings] Settings response: { welcome_message: "", hero_image: "", primary_color: "#3B82F6", ... }
   [Settings] Settings data updated: { ... }
   [Settings] Populating form with settings: { welcome_message: "", hero_image: "", ... }
   [Settings] Render state: { canEdit: true, settingsLoading: false, hasSettings: true, ... }
   [SectionPublicOverview] Rendering with: { hotelSlug: "hotel-killarney", settings: {...} }
   ```

4. **Check Network tab:**
   - Should see ONE request to `/api/staff/hotel/hotel-killarney/settings/`
   - NOT TWO requests
   - Status should be 200
   - Response should contain both content and theme fields

5. **Check if data displays:**
   - PUBLIC URL should show
   - PUBLIC STATUS should show "Active"
   - WELCOME MESSAGE should show data or "No welcome message set"
   - HERO IMAGE should show image or "No hero image"

---

## If Still Nothing Shows

Check these in console logs:

### Scenario A: `canEdit` is false
```
[Settings] User cannot edit - showing permission warning
```
**Fix:** User needs proper permissions for this hotel

### Scenario B: `settingsLoading` stuck on true
```
[Settings] Loading state: { settingsLoading: true }
```
**Fix:** API call is hanging or failing silently - check Network tab

### Scenario C: `settingsError` exists
```
[Settings] Settings fetch error: ...
[Settings] Error response: ...
```
**Fix:** Backend error - check error message

### Scenario D: `settings` is empty/null
```
[Settings] Settings data updated: undefined
[Settings] No settings data available yet
```
**Fix:** Backend returning empty response or wrong structure

---

## Expected Backend Response

When you call `/api/staff/hotel/hotel-killarney/settings/`, you should get:

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

**NOT wrapped in `{ settings: {...} }` - it should be the object directly!**

---

## Files Changed

1. ✅ `hotelmate-frontend/src/components/utils/Settings.jsx`
   - Removed theme endpoint fetch
   - Fixed form initialization
   - Fixed save mutation
   - Added comprehensive logging
   - Fixed loading/error states

2. ✅ `hotelmate-frontend/src/components/utils/settings-sections/SectionPublicOverview.jsx`
   - Added logging to see received props

---

## Next Steps

1. **Test the page** - Open `/staff/hotel-killarney/settings` in browser
2. **Check console logs** - Look for the `[Settings]` logs
3. **Share the console output** - If still not working, share what you see
4. **Check Network tab** - Verify API call and response

---

**Status:** ✅ Fixes Applied  
**Date:** November 24, 2025  
**Ready for Testing:** YES
