# RBAC Phase 2 — Attendance Module Report

Phase 1 (clock / break / approvals) was untouched. This phase gates roster, period, shift CRUD, bulk write, copy, analytics, and export surfaces using **only** `useCan()` / `can(module, action)` from `@/rbac`. UI fails closed. No role / tier / `access_level` / `isAdmin` / `canAccess` / `hasNavAccess` / fallback logic was introduced or relied on.

## Files changed

| # | File | Purpose |
|---|------|---------|
| 1 | `hotelmate-frontend/src/features/attendance/pages/AttendanceDashboard.jsx` | Page-level read guard + finalize/export gates |
| 2 | `hotelmate-frontend/src/features/attendance/pages/DepartmentRosterDashboard.jsx` | Page-level read guard + create/finalize gates |
| 3 | `hotelmate-frontend/src/features/attendance/components/EnhancedAttendanceDashboard.jsx` | Read guard + create/copy/analytics tab gates |
| 4 | `hotelmate-frontend/src/features/attendance/components/PeriodCreationModal.jsx` | `period_create` gate on submit |
| 5 | `hotelmate-frontend/src/features/attendance/components/PeriodCopyModal.jsx` | `shift_copy` gate on submit |
| 6 | `hotelmate-frontend/src/features/attendance/components/PeriodFinalizeModal.jsx` | `period_finalize` gate on confirm/force |
| 7 | `hotelmate-frontend/src/features/attendance/components/RosterPeriodSummary.jsx` | Internal `period_finalize` + `shift_export_pdf` gates |
| 8 | `hotelmate-frontend/src/features/attendance/components/RosterManagementGrid.jsx` | All shift CRUD + bulk + copy gates |
| 9 | `hotelmate-frontend/src/features/attendance/components/CopyModals.jsx` | `shift_copy` gates on all 4 copy modals |
| 10 | `hotelmate-frontend/src/features/attendance/components/DepartmentAnalytics.jsx` | `analytics_read` gate at component top |

## Action mapping per UI surface

| File | UI surface | Handler | Action key |
|------|-----------|---------|-----------|
| `AttendanceDashboard.jsx` | Page render | mount | `attendance.read` (page guard via `user.rbac.attendance.read`) |
| `AttendanceDashboard.jsx` | "Finalize Period" button (via `RosterPeriodSummary`) | `handleShowFinalizeModal` / `handleFinalizePeriod` | `period_finalize` |
| `AttendanceDashboard.jsx` | "CSV" / "Excel" export buttons | `handleExportCsv` / `handleExportXlsx` | `shift_export_pdf` *(see ambiguity 1)* |
| `DepartmentRosterDashboard.jsx` | Page render | mount | `attendance.read` |
| `DepartmentRosterDashboard.jsx` | "Create Period" button | opens `PeriodCreationModal` | `period_create` |
| `DepartmentRosterDashboard.jsx` | "Finalize Period" button | `handleShowFinalizeModal` / `handleFinalizePeriod` | `period_finalize` |
| `EnhancedAttendanceDashboard.jsx` | Page render | mount | `attendance.read` |
| `EnhancedAttendanceDashboard.jsx` | "Create Period" dropdown item | opens `PeriodCreationModal` | `period_create` |
| `EnhancedAttendanceDashboard.jsx` | "Copy Period" dropdown item | opens `PeriodCopyModal` | `shift_copy` |
| `EnhancedAttendanceDashboard.jsx` | "Department Analytics" tab | tab nav + tab body | `analytics_read` |
| `PeriodCreationModal.jsx` | "Create Period" submit | `handleSubmit` | `period_create` |
| `PeriodCopyModal.jsx` | "Copy Period" submit | `handleSubmit` | `shift_copy` |
| `PeriodFinalizeModal.jsx` | "Finalize" / "Force finalize" buttons | `handleConfirm` | `period_finalize` |
| `RosterPeriodSummary.jsx` | "Finalize Period" button | `onFinalize` | `period_finalize` |
| `RosterPeriodSummary.jsx` | CSV / Excel buttons | `onExportCsv` / `onExportXlsx` | `shift_export_pdf` *(see ambiguity 1)* |
| `RosterManagementGrid.jsx` (`ShiftEditModal`) | Save (new shift) | `handleSave` | `shift_create` |
| `RosterManagementGrid.jsx` (`ShiftEditModal`) | Save (existing shift) | `handleSave` | `shift_update` |
| `RosterManagementGrid.jsx` (`ShiftEditModal`) | Delete button | `handleDeleteClick` | `shift_delete` |
| `RosterManagementGrid.jsx` | Cell click → new shift | `handleCellClick` | `shift_create` |
| `RosterManagementGrid.jsx` | Cell click → edit shift | `handleCellClick` | `shift_update` |
| `RosterManagementGrid.jsx` | Confirm delete dialog | `handleDeleteConfirm` | `shift_delete` |
| `RosterManagementGrid.jsx` | "Publish Roster" button | `handleBulkSave` | `shift_bulk_write` |
| `RosterManagementGrid.jsx` | "Publish Copies" button | `handlePublishCopiedShifts` | `shift_bulk_write` |
| `RosterManagementGrid.jsx` | "Copy Week Roster" + day/staff copy icons | `handleCopyDay` / `handleCopyStaff` / `handleLegacyCopyDay` / Copy Bulk modal trigger | `shift_copy` |
| `CopyModals.jsx` (`CopyDayModal`) | "Copy Day" submit | `handleCopy` | `shift_copy` |
| `CopyModals.jsx` (`CopyStaffWeekModal`) | "Copy Staff Week" submit | `handleCopy` | `shift_copy` |
| `CopyModals.jsx` (`CopyBulkModal`) | "Copy" submit | `handleCopy` | `shift_copy` |
| `CopyModals.jsx` (`CopyPeriodModal`) | "Copy Entire Period" submit | `handleCopy` | `shift_copy` |
| `DepartmentAnalytics.jsx` | Whole component render | mount | `analytics_read` |

## Gate counts per action key

| Action | UI gates added |
|--------|----------------|
| `period_create` | 4 (DepartmentRosterDashboard create btn, EnhancedAttendanceDashboard dropdown item, PeriodCreationModal handler, PeriodCreationModal submit btn) |
| `period_finalize` | 7 (AttendanceDashboard show-modal handler, AttendanceDashboard finalize handler, AttendanceDashboard onFinalize prop, DepartmentRosterDashboard show-modal handler, DepartmentRosterDashboard finalize handler, DepartmentRosterDashboard onFinalize prop, PeriodFinalizeModal handler, PeriodFinalizeModal confirm/force buttons, RosterPeriodSummary internal button) |
| `period_update` | 0 *(see ambiguity 2)* |
| `period_delete` | 0 *(see ambiguity 2)* |
| `shift_create` | 3 (`ShiftEditModal.handleSave`, `ShiftEditModal` save button, `handleCellClick` create branch) |
| `shift_update` | 3 (`ShiftEditModal.handleSave`, `ShiftEditModal` save button, `handleCellClick` edit branch) |
| `shift_delete` | 3 (`ShiftEditModal.handleDeleteClick`, `ShiftEditModal` delete button visibility, `RosterManagementGrid.handleDeleteConfirm`) |
| `shift_bulk_write` | 4 (`handleBulkSave`, "Publish Roster" button, `handlePublishCopiedShifts`, "Publish Copies" button) |
| `shift_copy` | 16 (PeriodCopyModal handler+button; EnhancedAttendanceDashboard dropdown item; RosterManagementGrid `handleCopyDay`, `handleCopyStaff`, `handleLegacyCopyDay`, "Copy Week Roster" span, copy-day icon, copy-staff icon; CopyModals × 4 handlers + 4 submit buttons) |
| `analytics_read` | 3 (EnhancedAttendanceDashboard nav link disable+hide, EnhancedAttendanceDashboard tab body conditional, DepartmentAnalytics top-level early return) |
| `shift_export_pdf` | 4 (AttendanceDashboard CSV handler, AttendanceDashboard XLSX handler, AttendanceDashboard prop wiring to RosterPeriodSummary, RosterPeriodSummary internal export btn-group) |

Total: **47** action-level gates added.

## Page-level read guards

Three page-level surfaces also assert `user?.rbac?.attendance?.read === true` and render `<NoAccess />` when false (defense in depth — `AttendanceHub` already enforces this at the route level):

- `AttendanceDashboard.jsx`
- `DepartmentRosterDashboard.jsx`
- `EnhancedAttendanceDashboard.jsx`

## Legacy logic removed

**None found in `src/features/attendance/**`.** Verified by grep that the attendance feature contains no `usePermissions`, `canAccess`, `hasNavAccess`, `isAdmin`, `role_slug`, `access_level`, or invented permission keys. Phase 2 is purely additive — RBAC gates were inserted into existing handlers/buttons; no fallback paths or legacy gates needed removal.

## Ambiguous mappings flagged

1. **`shift_export_pdf` vs CSV/XLSX exports.** The provided action list contains only `shift_export_pdf`, but the existing UI exports CSV (`/attendance/periods/{id}/export/?format=csv`) and XLSX (`?format=xlsx`). There is **no PDF export in the codebase**. All CSV and XLSX export buttons (`handleExportCsv`, `handleExportXlsx` in `AttendanceDashboard.jsx`, plus the export btn-group inside `RosterPeriodSummary.jsx`) have been gated on `shift_export_pdf` to fail closed under the documented action surface. **Backend contract clarification needed**: either rename the action to `shift_export` (format-agnostic) or define separate `shift_export_csv` / `shift_export_xlsx` action keys so the UI can gate per format.

2. **`period_update` and `period_delete` have no UI surfaces.** No "Edit Period" or "Delete Period" controls exist anywhere in `src/features/attendance/**` (verified by grep against `period`, `update`, `delete`, `edit`, and modal triggers). When such surfaces are added in the future, gate them on `period_update` / `period_delete` respectively. Endpoints expected: `PATCH /staff/hotel/{slug}/attendance/periods/{id}/` and `DELETE /staff/hotel/{slug}/attendance/periods/{id}/`.

3. **Copy operations and `period_create`.** "Copy Period" copies all shifts from a source period into a (separate, already-created) target period via `/attendance/shift-copy/copy-entire-period/` — it does **not** create a new period. Therefore "Copy Period" is gated on `shift_copy` only, not `period_create`. Confirmed against `executeCopyOperation.js` and the `selectedPeriod` / `targetPeriodId` API call signatures.

## Verification

- All 10 files compile with `get_errors` returning **No errors found**.
- All gates use `can("attendance", "<action>")` from `useCan()` exclusively — no `user.role`, `user.tier`, `user.access_level`, `usePermissions`, `canAccess`, `isAdmin`, `hasNavAccess`, or invented keys.
- All gates **fail closed**: `can()` returns `user?.rbac?.attendance?.actions?.[action] === true`, so missing rbac payloads, missing module, missing action, or any non-`true` value disables the surface.
- Both handler-level (server-call entry points) and UI-level (button `disabled` / element visibility) gates were applied to every surface — clicking a hidden DOM element via devtools still cannot reach a privileged API call.
