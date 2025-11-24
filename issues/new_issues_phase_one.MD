# Phase 1 – Frontend Issues: Public Hotel Page + Staff Bookings

Context:
- Frontend and backend are separated.
- Staff auth is already implemented (login, JWT or session).
- We have or will have:
  - `GET /api/public/hotels/<hotel_slug>/settings/`
  - `PUT /api/staff/hotels/<hotel_slug>/settings/`
  - `GET /api/auth/me/`
  - `GET /api/staff/hotels/<hotel_slug>/bookings/`
  - `POST /api/staff/hotels/<hotel_slug>/bookings/<booking_id>/confirm/`

Goal:
- Render public hotel page from backend settings.
- Allow staff to toggle “Customize” mode on that page and edit content/branding.
- Show bookings in staff area and allow staff to confirm them.
- After confirmation, backend sends email, but frontend must show clear feedback.

---

## Issue 1 – [Frontend] Load HotelPublicSettings on public hotel page

Goal:
The public hotel page should render using data from the backend settings API.

Tasks:
- On route like `/hotels/:hotel_slug`:
  - On mount, call `GET /api/public/hotels/<hotel_slug>/settings/`.
  - Store response in `settings` state.
- Render:
  - Hero image from `settings.hero_image`.
  - Gallery from `settings.gallery` (simple carousel or grid).
  - `settings.short_description`, `settings.long_description`, `settings.welcome_message`.
  - Contact info (phone/email/address).
  - Amenities as chips/badges.
- Handle loading state (spinner/skeleton) and error (fallback UI).

Deliverable:
- Updated public hotel page component wired to backend.

---

## Issue 2 – [Frontend] Determine if current user can edit this hotel’s public page

Goal:
Know if the current viewer is allowed to edit the public page for this hotel.

Tasks:
- Create helper hook `useHotelPublicEditPermission(hotelSlug)`:
  - Calls `GET /api/auth/me/` once (or uses global auth state if already present).
  - Derives:
    - `isAuthenticated`
    - `isStaffMember` (from presence of staff_profile info)
    - whether `user.hotel_slug === hotelSlug` or equivalent
    - whether their `access_level` or `role_slug` qualifies them to edit (same logic as backend).
  - Returns `{ canEdit, loading }`.
- Use this hook inside the public hotel page component to decide if "Customize" UI should show.

Deliverable:
- Reusable hook/utility and its integration on the page.

---

## Issue 3 – [Frontend] Add Guest / Editor mode toggle logic

Goal:
Allow authorized staff to switch between normal view and editor mode on the public hotel page.

Tasks:
- On public hotel page, add local state:
  - `viewMode = "guest" | "editor"`.
- Default to `"guest"`.
- Optional: sync with query param `mode`:
  - `?mode=editor` → start in editor mode (only if `canEdit === true`).
  - `?mode=guest` → force guest mode.
- If `!canEdit`, always force `viewMode = "guest"` (ignore `mode=editor`).

Deliverable:
- View mode toggle state and logic implemented.

---

## Issue 4 – [Frontend] UI controls for "Customize public page" / "View as guest"

Goal:
Provide simple UI to enter/exit editor mode for staff.

Tasks:
- When `canEdit && viewMode === "guest"`:
  - Show a button on the page (e.g. top-right):
    - Label: **"Customize public page"**
    - On click → `setViewMode("editor")`.
- When `canEdit && viewMode === "editor"`:
  - Show an editor bar at top or bottom:
    - Text like: `"You are editing this public page"`
    - Button: **"View as guest"** → sets `viewMode = "guest"`.

Deliverable:
- Buttons/bar visually integrated with existing design.

---

## Issue 5 – [Frontend] Implement editor panel for HotelPublicSettings

Goal:
When in editor mode, show a panel where staff can change public settings.

Tasks:
- When `viewMode === "editor" && canEdit`:
  - Render a side panel/drawer overlay with tabs/sections:

    Sections:
    - **Content**:
      - Inputs for `short_description`, `long_description`, `welcome_message`.
    - **Images**:
      - Input for `hero_image` URL.
      - A list input for `gallery` URLs (add/remove items).
    - **Contact**:
      - Inputs for `contact_email`, `contact_phone`, `contact_address`.
    - **Amenities**:
      - Simple tag editor for `amenities` (add/remove strings).
    - **Branding (optional/phaseable)**:
      - Inputs (or small color pickers) for:
        - `primary_color`, `secondary_color`, `accent_color`,
          `background_color`, `button_color`
      - Select for `theme_mode` (light/dark/custom).

- Initialize panel form fields from the currently loaded `settings` state.

Deliverable:
- Editor panel UI component wired to existing settings state.

---

## Issue 6 – [Frontend] Save settings from editor to backend

Goal:
Persist editor changes via the staff API.

Tasks:
- Add a **Save** button in the editor panel.
- On click:
  - Build a payload from the form state matching backend fields.
  - Send `PUT /api/staff/hotels/<hotel_slug>/settings/`.
  - While saving, show a loading state on the button.
  - On success:
    - Update the main `settings` state with returned data.
    - Optionally keep editor open and show a success toast.
  - On error:
    - Display an error message/toast.

- Optional:
  - Disable Save if no changes have been made since last load.

Deliverable:
- Editor save flow fully wired to backend.

---

## Issue 7 – [Frontend] Apply branding colors to public page

Goal:
Make the public page visually respect branding colors defined in settings.

Tasks:
- Create a helper or hook (e.g. `useHotelTheme(settings)`):
  - Converts branding fields into CSS variables or a theme object:
    - `--color-primary`, `--color-secondary`, `--color-accent`,
      `--color-background`, `--color-button`.
- Apply these variables on a top-level container or document root for the page.
- Apply theme_mode (light/dark/custom) to decide background/text contrast.
- Provide fallback theme when branding fields are missing.

Deliverable:
- Public hotel page visually follows configured theme.

---

## Issue 8 – [Frontend] Guard editor UI for non-staff users

Goal:
Ensure non-staff and staff from other hotels never see the editor controls.

Tasks:
- Use `canEdit` flag from Issue 2:
  - If `!canEdit`:
    - Hide Customize button, editor bar, editor panel.
    - Ignore `mode=editor` in URL.
- Optionally show a subtle lock icon on Customize button if you want to reflect restricted state (but do NOT show button if completely unauthorized).

Deliverable:
- Editor UI invisibly disabled for guests and wrong hotel staff.

---

## Issue 9 – [Frontend] Staff bookings list view per hotel

Goal:
Show hotel bookings in the staff part of the app so staff can review/manage them.

Tasks:
- Add route to staff SPA, e.g.:
  - `/staff/hotels/:hotel_slug/bookings`
- On mount:
  - Call `GET /api/staff/hotels/<hotel_slug>/bookings/`.
- Render a table or list with columns:
  - booking ID/reference
  - guest name
  - guest email
  - room / room type
  - check-in date
  - check-out date
  - total amount
  - booking/payment status.
- Add minimal filters on the client (or via query params):
  - by status
  - by date range (if backend supports).

Deliverable:
- Staff bookings screen wired to backend API.

---

## Issue 10 – [Frontend] Booking detail view + “Confirm booking” action

Goal:
Allow staff to open a single booking and confirm it.

Tasks:
- From the bookings list:
  - Clicking a row opens a detail panel/page:
    - Show all booking info: guest details, room, dates, amounts, notes, payment info if available.
- If booking is in a pending/confirmable state:
  - Show **"Confirm booking"** button.
  - On click:
    - Call `POST /api/staff/hotels/<hotel_slug>/bookings/<booking_id>/confirm/`.
    - Show loading state.
    - On success:
      - Update booking status in the list + detail view.
      - Show success toast: e.g. "Booking confirmed. Confirmation email has been sent to the guest."
- Handle server errors gracefully (e.g. already confirmed, cancelled).

Deliverable:
- Booking detail + confirm UX wired to backend.

---

## Issue 11 – [Frontend] Confirmation experience & feedback

Goal:
Make the confirmation flow clear for staff users.

Tasks:
- After successful confirmation:
  - Visually mark booking as confirmed (status pill, color change).
  - Show toast/snackbar with clear message.
- Optional:
  - Add a subtle label in the detail view: “Confirmation email sent to <guest_email>”.
  - Reserve UI area for future "Resend confirmation" action.

Deliverable:
- Clean staff UX around confirming bookings and understanding the outcome.
