# Phase 1 - GitHub Issues Creation Script
# Run this script in the repository root directory
# Prerequisites: GitHub CLI (gh) installed and authenticated

Write-Host "Creating Phase 1 Frontend Issues..." -ForegroundColor Cyan

# Create labels if they don't exist
Write-Host "`nCreating labels..." -ForegroundColor Yellow
gh label create "frontend" --description "Frontend development tasks" --color "0052CC" --force
gh label create "public-page" --description "Public hotel page features" --color "00B8D9" --force
gh label create "staff-feature" --description "Staff-only features" --color "FF5630" --force
gh label create "phase-1" --description "Phase 1 implementation" --color "36B37E" --force
gh label create "enhancement" --description "New feature or request" --color "A2EEEF" --force

Write-Host "`nLabels created successfully!" -ForegroundColor Green

# Issue 1: Load HotelPublicSettings
Write-Host "`nCreating Issue 1: Load HotelPublicSettings..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Load HotelPublicSettings on public hotel page" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** The public hotel page should render using data from the backend settings API.

**Tasks:**
- On route like ``/hotels/:hotel_slug``:
  - On mount, call ``GET /api/public/hotels/<hotel_slug>/settings/``
  - Store response in ``settings`` state
- Render:
  - Hero image from ``settings.hero_image``
  - Gallery from ``settings.gallery`` (simple carousel or grid)
  - ``settings.short_description``, ``settings.long_description``, ``settings.welcome_message``
  - Contact info (phone/email/address)
  - Amenities as chips/badges
- Handle loading state (spinner/skeleton) and error (fallback UI)

**Deliverable:** Updated public hotel page component wired to backend

**Related Files:**
- ``src/pages/HotelPortalPage.jsx``
- ``src/sections/GuestHotelHome.jsx``
- ``src/services/api.js``

**API Endpoint:** ``GET /api/public/hotels/<hotel_slug>/settings/``
"@

# Issue 2: Permission Hook
Write-Host "Creating Issue 2: Permission Hook..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Determine if current user can edit this hotel's public page" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Know if the current viewer is allowed to edit the public page for this hotel.

**Tasks:**
- Create helper hook ``useHotelPublicEditPermission(hotelSlug)``:
  - Calls ``GET /api/auth/me/`` once (or uses global auth state if already present)
  - Derives:
    - ``isAuthenticated``
    - ``isStaffMember`` (from presence of staff_profile info)
    - whether ``user.hotel_slug === hotelSlug`` or equivalent
    - whether their ``access_level`` or ``role_slug`` qualifies them to edit
  - Returns ``{ canEdit, loading }``
- Use this hook inside the public hotel page component to decide if "Customize" UI should show

**Deliverable:** Reusable hook/utility and its integration on the page

**Related Files:**
- ``src/hooks/useHotelPublicEditPermission.js`` (new)
- ``src/context/AuthContext.jsx``
- ``src/hooks/usePermissions.js`` (reference)

**API Endpoint:** ``GET /api/auth/me/``

**Dependencies:** Issue #1
"@

# Issue 3: Guest/Editor Mode Toggle
Write-Host "Creating Issue 3: Guest/Editor Mode Toggle..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Add Guest / Editor mode toggle logic" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Allow authorized staff to switch between normal view and editor mode on the public hotel page.

**Tasks:**
- On public hotel page, add local state:
  - ``viewMode = "guest" | "editor"``
- Default to ``"guest"``
- Optional: sync with query param ``mode``:
  - ``?mode=editor`` → start in editor mode (only if ``canEdit === true``)
  - ``?mode=guest`` → force guest mode
- If ``!canEdit``, always force ``viewMode = "guest"`` (ignore ``mode=editor``)

**Deliverable:** View mode toggle state and logic implemented

**Related Files:**
- ``src/pages/HotelPortalPage.jsx``

**Dependencies:** Issue #2
"@

# Issue 4: UI Controls for Toggle
Write-Host "Creating Issue 4: UI Controls for Toggle..." -ForegroundColor Yellow
gh issue create --title "[Frontend] UI controls for Customize public page and View as guest" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Provide simple UI to enter/exit editor mode for staff.

**Tasks:**
- When ``canEdit && viewMode === "guest"``:
  - Show a button on the page (e.g. top-right):
    - Label: **"Customize public page"**
    - On click → ``setViewMode("editor")``
- When ``canEdit && viewMode === "editor"``:
  - Show an editor bar at top or bottom:
    - Text like: ``"You are editing this public page"``
    - Button: **"View as guest"** → sets ``viewMode = "guest"``

**NEW REQUIREMENT - Superuser Toggle:**
For superuser/admin staff viewing ANY hotel page:
- Show a prominent toggle (e.g., top-right corner with icon)
- Toggle should be visible on BOTH public hotel page and staff dashboard
- Clearly indicate current mode (Guest View / Staff View)
- Allow switching between views regardless of which hotel they're viewing
- Visual indicator: badge, icon, or colored bar showing active mode
- This is SEPARATE from the editor mode toggle (which is for editing settings)

**Deliverable:** Buttons/bar visually integrated with existing design

**Related Files:**
- ``src/pages/HotelPortalPage.jsx``
- ``src/components/layout/`` (for shared toggle component if needed)

**Dependencies:** Issue #2, Issue #3

**UI Components:** React Bootstrap Button, ButtonGroup, Badge
"@

# Issue 5: Editor Panel
Write-Host "Creating Issue 5: Editor Panel..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Implement editor panel for HotelPublicSettings" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** When in editor mode, show a panel where staff can change public settings.

**Tasks:**
- When ``viewMode === "editor" && canEdit``:
  - Render a side panel/drawer overlay with tabs/sections

**Sections:**
- **Content:**
  - Inputs for ``short_description``, ``long_description``, ``welcome_message``
- **Images:**
  - Input for ``hero_image`` URL
  - A list input for ``gallery`` URLs (add/remove items)
- **Contact:**
  - Inputs for ``contact_email``, ``contact_phone``, ``contact_address``
- **Amenities:**
  - Simple tag editor for ``amenities`` (add/remove strings)
- **Branding (optional/phaseable):**
  - Inputs (or small color pickers) for:
    - ``primary_color``, ``secondary_color``, ``accent_color``,
      ``background_color``, ``button_color``
  - Select for ``theme_mode`` (light/dark/custom)

- Initialize panel form fields from the currently loaded ``settings`` state

**Deliverable:** Editor panel UI component wired to existing settings state

**Related Files:**
- ``src/components/hotels/HotelSettingsEditorPanel.jsx`` (new)
- ``src/pages/HotelPortalPage.jsx``

**UI Components:** React Bootstrap Modal or Offcanvas, Form, Tabs

**Dependencies:** Issue #3, Issue #4
"@

# Issue 6: Save Settings
Write-Host "Creating Issue 6: Save Settings..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Save settings from editor to backend" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Persist editor changes via the staff API.

**Tasks:**
- Add a **Save** button in the editor panel
- On click:
  - Build a payload from the form state matching backend fields
  - Send ``PUT /api/staff/hotels/<hotel_slug>/settings/``
  - While saving, show a loading state on the button
  - On success:
    - Update the main ``settings`` state with returned data
    - Optionally keep editor open and show a success toast
  - On error:
    - Display an error message/toast

**Optional:**
- Disable Save if no changes have been made since last load
- Show "Unsaved changes" indicator

**Deliverable:** Editor save flow fully wired to backend

**Related Files:**
- ``src/components/hotels/HotelSettingsEditorPanel.jsx``
- ``src/services/api.js``

**API Endpoint:** ``PUT /api/staff/hotels/<hotel_slug>/settings/``

**Libraries:** React Query (useMutation), react-toastify

**Dependencies:** Issue #5
"@

# Issue 7: Apply Branding
Write-Host "Creating Issue 7: Apply Branding..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Apply branding colors to public page" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Make the public page visually respect branding colors defined in settings.

**Tasks:**
- Create a helper or hook (e.g. ``useHotelTheme(settings)``):
  - Converts branding fields into CSS variables or a theme object:
    - ``--color-primary``, ``--color-secondary``, ``--color-accent``,
      ``--color-background``, ``--color-button``
- Apply these variables on a top-level container or document root for the page
- Apply theme_mode (light/dark/custom) to decide background/text contrast
- Provide fallback theme when branding fields are missing

**Deliverable:** Public hotel page visually follows configured theme

**Related Files:**
- ``src/hooks/useHotelTheme.js`` (new)
- ``src/context/ThemeContext.jsx`` (reference existing implementation)
- ``src/pages/HotelPortalPage.jsx``

**Reference:** Existing theme system in ThemeContext for pattern

**Dependencies:** Issue #1
"@

# Issue 8: Guard Editor UI
Write-Host "Creating Issue 8: Guard Editor UI..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Guard editor UI for non-staff users" --label "frontend,public-page,phase-1,enhancement" --body @"
**Goal:** Ensure non-staff and staff from other hotels never see the editor controls.

**Tasks:**
- Use ``canEdit`` flag from Issue #2:
  - If ``!canEdit``:
    - Hide Customize button, editor bar, editor panel
    - Ignore ``mode=editor`` in URL
- Optionally show a subtle lock icon on Customize button if you want to reflect restricted state (but do NOT show button if completely unauthorized)

**Security Note:** This is UI-level protection only. Backend must also enforce permissions.

**Deliverable:** Editor UI invisibly disabled for guests and wrong hotel staff

**Related Files:**
- ``src/pages/HotelPortalPage.jsx``
- ``src/components/hotels/HotelSettingsEditorPanel.jsx``

**Dependencies:** Issue #2, Issue #4, Issue #5
"@

# Issue 9: Staff Bookings List
Write-Host "Creating Issue 9: Staff Bookings List..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Staff bookings list view per hotel" --label "frontend,staff-feature,phase-1,enhancement" --body @"
**Goal:** Show hotel bookings in the staff part of the app so staff can review/manage them.

**Tasks:**
- Add route to staff SPA, e.g.:
  - ``/staff/hotels/:hotel_slug/bookings``
- On mount:
  - Call ``GET /api/staff/hotels/<hotel_slug>/bookings/``
- Render a table or list with columns:
  - booking ID/reference
  - guest name
  - guest email
  - room / room type
  - check-in date
  - check-out date
  - total amount
  - booking/payment status
- Add minimal filters on the client (or via query params):
  - by status
  - by date range (if backend supports)

**Deliverable:** Staff bookings screen wired to backend API

**Related Files:**
- ``src/pages/bookings/StaffBookingsPage.jsx`` (new)
- ``src/App.jsx`` (add route)
- ``src/services/api.js`` (add API function)

**API Endpoint:** ``GET /api/staff/hotels/<hotel_slug>/bookings/``

**UI Components:** React Bootstrap Table, Form (for filters), Badge (for status)

**Reference:** Existing restaurant bookings components in ``src/components/bookings/``

**Date Library:** date-fns (already installed)
"@

# Issue 10: Booking Detail + Confirm
Write-Host "Creating Issue 10: Booking Detail + Confirm..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Booking detail view and Confirm booking action" --label "frontend,staff-feature,phase-1,enhancement" --body @"
**Goal:** Allow staff to open a single booking and confirm it.

**Tasks:**
- From the bookings list:
  - Clicking a row opens a detail panel/page:
    - Show all booking info: guest details, room, dates, amounts, notes, payment info if available
- If booking is in a pending/confirmable state:
  - Show **"Confirm booking"** button
  - On click:
    - Call ``POST /api/staff/hotels/<hotel_slug>/bookings/<booking_id>/confirm/``
    - Show loading state
    - On success:
      - Update booking status in the list + detail view
      - Show success toast: e.g. "Booking confirmed. Confirmation email has been sent to the guest."
- Handle server errors gracefully (e.g. already confirmed, cancelled)

**Deliverable:** Booking detail + confirm UX wired to backend

**Related Files:**
- ``src/components/bookings/BookingDetailModal.jsx`` (new)
- ``src/pages/bookings/StaffBookingsPage.jsx``
- ``src/services/api.js``

**API Endpoint:** ``POST /api/staff/hotels/<hotel_slug>/bookings/<booking_id>/confirm/``

**UI Components:** React Bootstrap Modal, Button, Spinner, Badge

**Libraries:** React Query (useMutation), react-toastify

**Dependencies:** Issue #9
"@

# Issue 11: Confirmation UX
Write-Host "Creating Issue 11: Confirmation UX..." -ForegroundColor Yellow
gh issue create --title "[Frontend] Confirmation experience and feedback" --label "frontend,staff-feature,phase-1,enhancement" --body @"
**Goal:** Make the confirmation flow clear for staff users.

**Tasks:**
- After successful confirmation:
  - Visually mark booking as confirmed (status pill, color change)
  - Show toast/snackbar with clear message
- Optional:
  - Add a subtle label in the detail view: "Confirmation email sent to <guest_email>"
  - Reserve UI area for future "Resend confirmation" action

**Success Message Examples:**
- "Booking confirmed! Confirmation email has been sent to guest@example.com"
- "Booking #12345 confirmed successfully"

**Visual Indicators:**
- Green badge for confirmed status
- Success icon next to status
- Disabled confirm button with checkmark after confirmation

**Deliverable:** Clean staff UX around confirming bookings and understanding the outcome

**Related Files:**
- ``src/components/bookings/BookingDetailModal.jsx``
- ``src/pages/bookings/StaffBookingsPage.jsx``

**Libraries:** react-toastify (already configured)

**Dependencies:** Issue #10
"@

Write-Host "`n✅ All 11 Phase 1 issues created successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Check GitHub issues page to verify all issues were created"
Write-Host "2. Review and adjust priorities if needed"
Write-Host "3. Start implementation with Issue #1"
Write-Host "`nIssue labels: frontend, public-page, staff-feature, phase-1, enhancement" -ForegroundColor Yellow
