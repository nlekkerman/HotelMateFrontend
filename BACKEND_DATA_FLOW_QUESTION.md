# Backend Data Flow Question - Hotel Settings

## Issue
The frontend Settings page is attempting to fetch hotel public settings, but no data is being displayed in the Public Page Overview section.

## Frontend Implementation

### Current API Call
**File**: `hotelmate-frontend/src/components/utils/Settings.jsx`

```javascript
// Fetch hotel settings
const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
  queryKey: ['hotelPublicSettings', hotelSlug],
  queryFn: async () => {
    const response = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
    return response.data;
  },
  enabled: !!hotelSlug && canEdit,
});
```

### Expected Data Structure
The frontend expects the following fields from the backend:

```javascript
{
  welcome_message: string,
  short_description: string,
  long_description: string,
  hero_image: string (URL),
  gallery: array of strings (URLs),
  contact_email: string,
  contact_phone: string,
  contact_address: string,
  website: string,
  google_maps_link: string,
  amenities: array,
  logo: string (URL),
  favicon: string (URL),
  slogan: string
}
```

### Public Overview Display
**File**: `hotelmate-frontend/src/components/utils/settings-sections/SectionPublicOverview.jsx`

Displays:
- `settings?.welcome_message` → "No welcome message set" if empty
- `settings?.hero_image` → "No hero image" if empty

## Questions for Backend Team

1. **Does the endpoint `/staff/hotel/{hotel_slug}/settings/` exist?**
   - Expected HTTP method: GET
   - Expected authentication: Staff user with proper hotel permissions

2. **What is the actual response structure?**
   - Is it returning `{ settings: {...} }` or just `{...}` directly?
   - Are the field names matching the frontend expectations?

3. **Is there a `HotelPublicSettings` model in the database?**
   - What are the actual field names in the model?
   - Are there any default values set?

4. **What permissions are required?**
   - Does the user need to be a staff member?
   - Does the user need to belong to that specific hotel?

5. **Are there any CORS or authentication issues?**
   - Check backend logs for 401/403/404 errors
   - Verify JWT token is being sent correctly

6. **Sample data - Does any test hotel have settings data?**
   - Can you provide a sample response from this endpoint?
   - Is the data actually being saved when staff updates settings?

## Debug Steps Needed

### Frontend Debug
- [ ] Add console.logs to see what `settings` object contains
- [ ] Check if `settingsLoading` is stuck on true
- [ ] Check if `settingsError` contains error message
- [ ] Verify `hotelSlug` is correct and `canEdit` is true

### Backend Debug
- [ ] Check if endpoint is registered in URLs
- [ ] Verify model exists and has data
- [ ] Check serializer is returning all fields
- [ ] Test endpoint with Postman/curl with valid auth token
- [ ] Check database to see if any HotelPublicSettings records exist

## Related Files

### Frontend
- `hotelmate-frontend/src/components/utils/Settings.jsx` - Main settings component
- `hotelmate-frontend/src/components/utils/settings-sections/SectionPublicOverview.jsx` - Display component
- `hotelmate-frontend/src/services/api.js` - API configuration

### Backend (Expected)
- `hotels/models.py` - Should contain `HotelPublicSettings` model
- `hotels/serializers.py` - Should contain settings serializer
- `hotels/views.py` - Should contain settings view
- `hotels/urls.py` - Should contain `/staff/hotel/<slug>/settings/` route

## Temporary Solution
Until backend confirms the endpoint structure, we should add better error handling and loading states to help identify the issue.

---

**Date Created**: November 24, 2025
**Status**: ⏳ Awaiting Backend Response
