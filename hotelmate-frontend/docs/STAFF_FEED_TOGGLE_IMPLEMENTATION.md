# Staff Feed Toggle Implementation

## Overview
Implemented a toggle system in the staff feed page (`/staff/:hotelSlug/feed`) that allows staff members to switch between:
1. **Staff Feed View** - Internal staff communication and posts
2. **Public Preview View** - Preview of the hotel's public page with editor capabilities

## Features Implemented

### 1. View Mode Toggle Component
**File:** `src/components/home/ViewModeToggle.jsx`
- Clean button group toggle between "Staff Feed" and "Public Preview"
- Visual feedback with icons (chat-dots for feed, eye for public)
- Info text when in public preview mode

### 2. Enhanced Home Page with Dual Modes
**File:** `src/pages/home/Home.jsx`
- **View Mode State Management:**
  - State synced with URL query parameter (`?view=feed` or `?view=public`)
  - Default mode is 'feed' for staff internal communication
  - Seamless switching preserves staff URL structure

- **Feed View:**
  - Original Feed component with posts and composer
  - Quick link banner to access public preview

- **Public Preview View:**
  - Full GuestHotelHome component rendering
  - Fetches hotel data and public settings via React Query
  - Applies theme CSS variables from settings
  - Editor controls bar (for authorized staff only)
  - HotelSettingsEditorPanel integration with edit mode

### 3. Permission-Based Editor Access
- Uses `useHotelPublicEditPermission` hook to check edit rights
- Editor controls only visible to authorized staff
- Toggle between "Edit Page" and "Editing" states
- Editor panel slides in when edit mode is activated

### 4. Quick Navigation in Feed
**File:** `src/components/home/Feed.jsx`
- Info banner at top of feed with link to public preview
- Encourages staff to customize their hotel's public page
- Direct navigation to `?view=public` mode

### 5. Styling Enhancements
**File:** `src/styles/home.css`
- Smooth animations for toggle and editor bar
- Slide-down animation for editor controls
- Hover effects on toggle buttons
- Consistent with existing social feed design

## User Flow

### For Staff Members:
1. Log in and land on `/staff/:hotelSlug/feed` (staff feed view)
2. See posts from team members and post composer
3. Notice banner about customizing public page
4. Click "Public Preview" toggle or banner link
5. URL updates to `/staff/:hotelSlug/feed?view=public`
6. View hotel's public page as guests would see it

### For Authorized Staff (Admins/Superusers):
1. Same flow as above
2. In public preview, see "Public Page Editor" control bar
3. Click "Edit Page" button
4. Editor panel slides in from right
5. Make changes to hotel settings (content, images, contact, amenities, branding)
6. Save changes and see immediate preview updates
7. Toggle back to "Staff Feed" to return to internal view

## Technical Architecture

### State Management:
- **Local State:** View mode, editor mode, editor panel visibility
- **URL State:** Query parameter `?view=feed|public` for shareable URLs
- **Server State:** React Query for hotel data and settings with automatic refetching

### Data Flow:
```
User toggles view mode
  ↓
URL query param updates (?view=public)
  ↓
React Query fetches hotel data + settings (if not cached)
  ↓
Theme hook applies CSS variables
  ↓
GuestHotelHome renders public page
  ↓
Editor panel available for authorized users
  ↓
Changes saved → settings refetch → preview updates
```

### API Endpoints Used:
- `GET /api/public/hotels/:hotelSlug/` - Hotel public data
- `GET /api/public/hotels/:hotelSlug/settings/` - Public page settings
- `PUT /api/staff/hotels/:hotelSlug/settings/` - Update settings (editor)

## Benefits

1. **Single URL Structure:** Staff never leave `/staff/:hotelSlug/*` URLs
2. **Seamless Toggle:** Instant switching between internal and public views
3. **Permission-Based:** Editor only shown to authorized staff
4. **Real-Time Preview:** See changes immediately after saving
5. **Shareable URLs:** Query parameter allows direct links to public preview
6. **No Page Reloads:** React Query caching makes switching instant
7. **Consistent UX:** Uses existing components and patterns

## Files Modified/Created

### Created:
- `src/components/home/ViewModeToggle.jsx` - Toggle component

### Modified:
- `src/pages/home/Home.jsx` - Added dual-mode rendering
- `src/components/home/Feed.jsx` - Added public preview link banner
- `src/styles/home.css` - Added toggle and editor bar styles

## Testing Recommendations

1. **Basic Toggle:**
   - Switch between feed and public views
   - Verify URL updates with query parameter
   - Confirm view persists on page refresh

2. **Editor Access:**
   - Test as regular staff (no editor access)
   - Test as admin/superuser (has editor access)
   - Verify editor panel only shows for authorized users

3. **Data Loading:**
   - Check loading states during data fetch
   - Verify React Query caching works (fast second load)
   - Test error handling if backend is down

4. **Editor Functionality:**
   - Open editor panel
   - Make changes to settings
   - Save and verify preview updates
   - Close editor and return to view mode

5. **Navigation:**
   - Click banner link in feed
   - Use toggle buttons
   - Verify both paths work correctly

## Future Enhancements

1. **Autosave Draft:** Save editor changes to localStorage
2. **Preview Modes:** Mobile/tablet/desktop preview sizes
3. **Change Comparison:** Show diff between saved and current state
4. **Publish Schedule:** Schedule settings changes for future dates
5. **Version History:** Track and revert setting changes
6. **Collaborative Editing:** Multiple staff editing simultaneously
