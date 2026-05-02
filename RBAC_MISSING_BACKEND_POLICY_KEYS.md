# Missing Backend RBAC Policy Keys Required by Frontend

These frontend surfaces need backend `MODULE_POLICY` support before they can be
safely enabled. Until the backend exposes these modules/actions, the frontend
keeps these surfaces **fail-closed** (hardcoded `false`) with TODO markers.

The frontend RBAC contract is fail-closed: if a module/action is not present in
backend policy, the gate evaluates to `false`. **Do NOT reintroduce** `isAdmin`,
`role`, `role_slug`, `tier`, `access_level`, `canAccess`, or `hasNavAccess` as
authority sources to bypass these gaps.

## admin_settings

Needed for:
- Theme update mutation in [hotelmate-frontend/src/context/ThemeContext.jsx](hotelmate-frontend/src/context/ThemeContext.jsx)
- Settings page read access in [hotelmate-frontend/src/components/utils/Settings.jsx](hotelmate-frontend/src/components/utils/Settings.jsx)
- Section editor page entry in [hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx)

Suggested actions:
- `read`
- `theme_update`

## public_page

Needed for:
- Public-page edit controls in [hotelmate-frontend/src/hooks/usePublicPagePermissions.js](hotelmate-frontend/src/hooks/usePublicPagePermissions.js)

Suggested actions:
- `edit`

## sections

Needed for:
- Section create/update/delete handlers in [hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx](hotelmate-frontend/src/pages/sections/SectionEditorPage.jsx)

Suggested actions:
- `read`
- `section_create`
- `section_update`
- `section_delete`

## home

Needed for:
- Comment edit/delete in [hotelmate-frontend/src/components/home/CommentItem.jsx](hotelmate-frontend/src/components/home/CommentItem.jsx)

Suggested actions:
- `comment_update`
- `comment_delete`
