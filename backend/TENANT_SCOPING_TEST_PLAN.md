# Tenant-Scoping Verification & Test Plan

> **Scope:** Verify backend enforcement of `request.user.staff_profile.hotel` across
> maintenance, stock tracker, comparison/report views, department/role, and overstay modules.
>
> **Django backend is hosted remotely.** Endpoint URLs below are derived from the
> frontend service layer. All test code runs against the DRF API surface.
>
> **Rules:** No production code changes. No refactors. Verification only.

---

## 1. Fixture Setup (`conftest.py`)

```python
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

# ---------------------------------------------------------------------------
# Hotels
# ---------------------------------------------------------------------------
@pytest.fixture
def hotel_a(db):
    """Primary test hotel."""
    from hotels.models import Hotel
    return Hotel.objects.create(name="Hotel Alpha", slug="hotel-alpha")

@pytest.fixture
def hotel_b(db):
    """Secondary hotel — used to prove cross-hotel isolation."""
    from hotels.models import Hotel
    return Hotel.objects.create(name="Hotel Bravo", slug="hotel-bravo")

# ---------------------------------------------------------------------------
# Users & Staff Profiles
# ---------------------------------------------------------------------------
@pytest.fixture
def staff_a(hotel_a):
    """Regular staff at Hotel Alpha."""
    u = User.objects.create_user(username="staff_a", password="test1234")
    from staff.models import StaffProfile
    StaffProfile.objects.create(user=u, hotel=hotel_a, access_level="staff")
    return u

@pytest.fixture
def staff_b(hotel_b):
    """Regular staff at Hotel Bravo."""
    u = User.objects.create_user(username="staff_b", password="test1234")
    from staff.models import StaffProfile
    StaffProfile.objects.create(user=u, hotel=hotel_b, access_level="staff")
    return u

@pytest.fixture
def admin_a(hotel_a):
    """Staff admin at Hotel Alpha (for manager-override paths)."""
    u = User.objects.create_user(username="admin_a", password="test1234")
    from staff.models import StaffProfile
    StaffProfile.objects.create(user=u, hotel=hotel_a, access_level="staff_admin")
    return u

@pytest.fixture
def superuser(db):
    """Django superuser — not scoped to any single hotel."""
    return User.objects.create_superuser(
        username="super", password="test1234", email="su@test.com"
    )

@pytest.fixture
def api(db):
    return APIClient()
```

### Seed Data Per Hotel

| Entity | Hotel Alpha | Hotel Bravo | Notes |
|--------|-------------|-------------|-------|
| Rooms | `room_a1`, `room_a2` | `room_b1` | Identified by `room_number` |
| Active Bookings | `booking_a1` (checked-in, past checkout → overstay) | `booking_b1` | FK to hotel |
| Maintenance Requests | `maint_req_a1` + photo + comment | `maint_req_b1` | Nested children |
| Stock Categories | `cat_a` | `cat_b` | FK to hotel |
| Stock Items | `item_a1`, `item_a2` | `item_b1` | FK to category → hotel |
| Accounting Periods | `period_a1`, `period_a2` | `period_b1` | FK to hotel |
| Stocktakes | `st_a1` (in period_a1) | `st_b1` | FK to period → hotel |
| Stocktake Lines | `line_a1` (in st_a1) | `line_b1` | FK to stocktake → hotel |
| Movements | `mov_a1` (on line_a1) | `mov_b1` | FK to line → hotel |
| Sales Records | `sale_a1` | `sale_b1` | FK to hotel |
| Cocktails | `cocktail_a1` | `cocktail_b1` | FK to hotel |
| Ingredients | `ingredient_a1` | `ingredient_b1` | FK to cocktail → hotel |
| Departments | `dept_a1` | `dept_b1` | FK to hotel |
| Roles | `role_a1` | `role_b1` | FK to hotel |
| Shift Locations | `loc_a1` | `loc_b1` | FK to hotel |
| Clock Logs | `clock_a1` | `clock_b1` | FK to staff → hotel |

---

## 2. Endpoint Inventory & Test Matrix

### Legend

| Symbol | Meaning |
|--------|---------|
| **P0** | Must-pass before deploy — data mutation or document leak across tenants |
| **P1** | High — data read across tenants or FK injection |
| **P2** | Medium — superuser behaviour documentation, defence-in-depth |
| ✅ 200 | Request succeeds |
| 🚫 403 | Permission denied |
| 🔍 404 | Object not found (acceptable alternative to 403 for object-level checks) |
| ∅ | Filtered empty list returned |

---

### 2.1 MAINTENANCE

**Endpoints** (base: `/api/staff/hotel/{slug}/`)

| ID | Path | Method | View |
|----|------|--------|------|
| M-01 | `rooms/{roomNumber}/mark-maintenance/` | POST | APIView |
| M-02 | `rooms/{roomNumber}/complete-maintenance/` | POST | APIView |
| M-03 | `housekeeping/rooms/{roomId}/status/` | POST | APIView |
| M-04 | `housekeeping/rooms/{roomId}/status-history/` | GET | APIView |
| M-05 | `housekeeping/rooms/{roomId}/manager_override/` | POST | APIView |

**Endpoints — nested children** (base: `/maintenance/`)

| ID | Path | Method | View | Parent FK |
|----|------|--------|------|-----------|
| M-06 | `requests/` | GET | ViewSet | — |
| M-07 | `requests/` | POST | ViewSet | — |
| M-08 | `requests/{id}/` | PATCH | ViewSet | — |
| M-09 | `requests/{id}/` | DELETE | ViewSet | — |
| M-10 | `photos/` | POST | ViewSet | `request` (FK in body) |
| M-11 | `comments/` | POST | ViewSet | `request` (FK in body) |

#### Test Cases

| Test Name | EP | Actor | Scenario | Expected | Priority |
|-----------|----|-------|----------|----------|----------|
| `test_mark_maintenance_own_hotel` | M-01 | staff_a | Own room, own slug | ✅ 200 | P0 |
| `test_mark_maintenance_cross_hotel_room` | M-01 | staff_a | room_b1 via slug `hotel-bravo` | 🚫 403 | P0 |
| `test_mark_maintenance_slug_tamper` | M-01 | staff_a | room_a1 via slug `hotel-bravo` | 🚫 403 | P0 |
| `test_complete_maintenance_own_hotel` | M-02 | staff_a | Own room | ✅ 200 | P0 |
| `test_complete_maintenance_cross_hotel` | M-02 | staff_a | room_b1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_housekeeping_status_update_cross_hotel` | M-03 | staff_a | room_b1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_status_history_own_hotel` | M-04 | staff_a | Own room | ✅ 200 | P1 |
| `test_status_history_cross_hotel` | M-04 | staff_a | room_b1 via `hotel-bravo` | 🚫 403 | P1 |
| `test_manager_override_own_hotel` | M-05 | admin_a | Own room | ✅ 200 | P0 |
| `test_manager_override_cross_hotel` | M-05 | admin_a | room_b1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_list_maint_requests_own_hotel` | M-06 | staff_a | GET list | ✅ only hotel_a records | P1 |
| `test_list_maint_requests_no_cross_hotel_leak` | M-06 | staff_a | GET list | ∅ hotel_b records absent | P1 |
| `test_create_maint_request_own_hotel` | M-07 | staff_a | POST | ✅ 201 | P0 |
| `test_patch_maint_request_cross_hotel` | M-08 | staff_a | PATCH maint_req_b1 | 🚫 403 / 🔍 404 | P0 |
| `test_delete_maint_request_cross_hotel` | M-09 | staff_a | DELETE maint_req_b1 | 🚫 403 / 🔍 404 | P0 |
| **`test_photo_upload_cross_hotel_request_fk`** | M-10 | staff_a | POST photo with `request: maint_req_b1.id` | 🚫 403 / 🔍 404 | **P0** |
| **`test_comment_cross_hotel_request_fk`** | M-11 | staff_a | POST comment with `request: maint_req_b1.id` | 🚫 403 / 🔍 404 | **P0** |
| `test_maintenance_superuser` | M-01 | superuser | room_b1 via `hotel-bravo` | Document: ✅ 200 or 🚫 403 | P2 |

> **HIGH-RISK: M-10, M-11** — Photo and comment endpoints accept `request` as a
> body FK. If the view does not verify `request.hotel == staff_profile.hotel`,
> staff_a can attach photos/comments to Hotel Bravo maintenance requests.

---

### 2.2 STOCK TRACKER — Core CRUD

**Endpoints** (base: `/stock_tracker/{slug}/`)

| ID | Path | Method | View |
|----|------|--------|------|
| ST-01 | `categories/` | GET | ViewSet |
| ST-02 | `items/` | POST | ViewSet |
| ST-03 | `items/{id}/` | PATCH | ViewSet |
| ST-04 | `items/{id}/` | DELETE | ViewSet |
| ST-05 | `periods/` | GET | ViewSet |
| ST-06 | `periods/` | POST | ViewSet |
| ST-07 | `periods/{id}/` | GET | ViewSet |
| ST-08 | `stocktakes/` | GET | ViewSet |
| ST-09 | `stocktakes/` | POST | ViewSet |
| ST-10 | `stocktakes/{id}/populate/` | POST | ViewSet action |
| ST-11 | `stocktakes/{id}/approve/` | POST | ViewSet action |
| ST-12 | `stocktake-lines/{lineId}/` | PATCH | ViewSet |
| ST-13 | `stocktake-lines/{lineId}/add-movement/` | POST | ViewSet action |
| ST-14 | `stocktake-lines/{lineId}/delete-movement/{movId}/` | DELETE | ViewSet action |
| ST-15 | `stocktake-lines/{lineId}/update-movement/{movId}/` | PATCH | ViewSet action |
| ST-16 | `cocktails/` | POST | ViewSet |
| ST-17 | `consumptions/` | POST | ViewSet |
| ST-18 | `ingredients/` | POST | ViewSet |
| ST-19 | `sales/` | GET | APIView |
| ST-20 | `sales/` | POST | APIView |
| ST-21 | `sales/bulk-create/` | POST | APIView |
| ST-22 | `sales/{id}/` | PATCH | APIView |
| ST-23 | `sales/{id}/` | DELETE | APIView |
| ST-24 | `stocktakes/{id}/download-pdf/` | GET | APIView |
| ST-25 | `stocktakes/{id}/download-excel/` | GET | APIView |
| ST-26 | `periods/{id}/download-pdf/` | GET | APIView |
| ST-27 | `movements/` | GET | APIView |
| ST-28 | `items/low-stock/` | GET | APIView |
| ST-29 | `items/profitability/` | GET | APIView |

#### Test Cases

| Test Name | EP | Actor | Scenario | Expected | Priority |
|-----------|----|-------|----------|----------|----------|
| `test_categories_own_hotel` | ST-01 | staff_a | GET list | ✅ only hotel_a categories | P1 |
| `test_categories_cross_hotel_slug` | ST-01 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| **`test_create_item_with_cross_hotel_category_fk`** | ST-02 | staff_a | POST `{category: cat_b.id}` via own slug | 🚫 403 / validation error | **P0** |
| `test_create_item_own_hotel` | ST-02 | staff_a | POST valid | ✅ 201 | P0 |
| `test_patch_item_cross_hotel` | ST-03 | staff_a | PATCH item_b1 via `hotel-bravo` | 🚫 403 | P0 |
| **`test_patch_item_reassign_category_fk`** | ST-03 | staff_a | PATCH item_a1 `{category: cat_b.id}` | 🚫 validation error | **P0** |
| `test_delete_item_cross_hotel` | ST-04 | staff_a | DELETE item_b1 | 🚫 403 / 🔍 404 | P0 |
| `test_periods_list_own_hotel` | ST-05 | staff_a | GET | ✅ only hotel_a periods | P1 |
| `test_periods_list_cross_hotel_slug` | ST-05 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_create_period_cross_hotel_slug` | ST-06 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_period_detail_cross_hotel_id` | ST-07 | staff_a | GET period_b1.id via own slug | 🔍 404 | P1 |
| `test_stocktakes_list_own_hotel` | ST-08 | staff_a | GET | ✅ only hotel_a stocktakes | P1 |
| `test_create_stocktake_cross_hotel_slug` | ST-09 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| **`test_create_stocktake_with_cross_hotel_period_fk`** | ST-09 | staff_a | POST `{period: period_b1.id}` via own slug | 🚫 403 / validation error | **P0** |
| `test_populate_stocktake_cross_hotel` | ST-10 | staff_a | POST st_b1.id via `hotel-bravo` | 🚫 403 | P0 |
| `test_approve_stocktake_cross_hotel` | ST-11 | staff_a | POST st_b1.id via `hotel-bravo` | 🚫 403 | P0 |
| **`test_patch_stocktake_line_cross_hotel`** | ST-12 | staff_a | PATCH line_b1 via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_add_movement_cross_hotel_line_fk`** | ST-13 | staff_a | POST to line_b1 via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_add_movement_own_line_cross_hotel_slug`** | ST-13 | staff_a | line_a1 via slug `hotel-bravo` | 🚫 403 | **P0** |
| `test_delete_movement_cross_hotel` | ST-14 | staff_a | DELETE mov_b1 on line_b1 | 🚫 403 / 🔍 404 | P0 |
| `test_update_movement_cross_hotel` | ST-15 | staff_a | PATCH mov_b1 on line_b1 | 🚫 403 / 🔍 404 | P0 |
| `test_create_cocktail_cross_hotel_slug` | ST-16 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_create_consumption_cross_hotel_slug` | ST-17 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| **`test_create_ingredient_cross_hotel_cocktail_fk`** | ST-18 | staff_a | POST `{cocktail: cocktail_b1.id}` via own slug | 🚫 403 / validation error | **P0** |
| `test_sales_list_own_hotel` | ST-19 | staff_a | GET | ✅ only hotel_a sales | P1 |
| `test_sales_list_cross_hotel_slug` | ST-19 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_create_sale_cross_hotel_slug` | ST-20 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_bulk_create_sales_cross_hotel` | ST-21 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_patch_sale_cross_hotel` | ST-22 | staff_a | PATCH sale_b1 | 🚫 403 / 🔍 404 | P0 |
| `test_delete_sale_cross_hotel` | ST-23 | staff_a | DELETE sale_b1 | 🚫 403 / 🔍 404 | P0 |
| **`test_download_pdf_cross_hotel_stocktake`** | ST-24 | staff_a | GET st_b1 PDF via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_download_excel_cross_hotel_stocktake`** | ST-25 | staff_a | GET st_b1 Excel via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_download_pdf_cross_hotel_period`** | ST-26 | staff_a | GET period_b1 PDF via `hotel-bravo` | 🚫 403 | **P0** |
| `test_movements_cross_hotel_slug` | ST-27 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_low_stock_cross_hotel_slug` | ST-28 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_profitability_cross_hotel_slug` | ST-29 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_stock_tracker_superuser` | ST-01,05 | superuser | Any slug | Document ✅/🚫 | P2 |

> **HIGH-RISK AREAS:**
> - **FK injection** (ST-02, ST-03, ST-09, ST-13, ST-18): POST/PATCH body contains a
>   foreign key (`category`, `period`, `cocktail`, `stocktake-line`). The view's
>   `perform_create` / serializer `validate_*` MUST verify the referenced object
>   belongs to the same hotel.
> - **Nested movement endpoints** (ST-13–ST-15): Three-level nesting
>   (hotel → stocktake → line → movement). Each level must be scoped.
> - **Document download** (ST-24–ST-26): Often overlooked for permission checks.

---

### 2.3 COMPARISON / REPORT VIEWS

**Endpoints** (base: `/stock_tracker/{slug}/`)

| ID | Path | Method | View |
|----|------|--------|------|
| CR-01 | `kpi-summary/` | GET | APIView |
| CR-02 | `compare/categories/` | GET | APIView |
| CR-03 | `compare/top-movers/` | GET | APIView |
| CR-04 | `compare/cost-analysis/` | GET | APIView |
| CR-05 | `compare/trend-analysis/` | GET | APIView |
| CR-06 | `compare/variance-heatmap/` | GET | APIView |
| CR-07 | `compare/performance-scorecard/` | GET | APIView |
| CR-08 | `reports/stock-value/` | GET | APIView |
| CR-09 | `periods/compare/` | GET | APIView (legacy) |
| CR-10 | `periods/{id}/sales-analysis/` | GET | APIView |

#### Test Cases

| Test Name | EP | Actor | Scenario | Expected | Priority |
|-----------|----|-------|----------|----------|----------|
| `test_kpi_summary_own_hotel` | CR-01 | staff_a | Valid params | ✅ 200 | P1 |
| `test_kpi_summary_cross_hotel_slug` | CR-01 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_kpi_summary_slug_tamper` | CR-01 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_compare_categories_own_hotel` | CR-02 | staff_a | period_a1 & period_a2 | ✅ 200 | P1 |
| `test_compare_categories_cross_hotel_slug` | CR-02 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_compare_categories_cross_hotel_period_fk`** | CR-02 | staff_a | Own slug, but `period_ids=[period_b1.id]` | ∅ or 🚫 400 | **P0** |
| `test_top_movers_cross_hotel_slug` | CR-03 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_top_movers_cross_hotel_period_fk`** | CR-03 | staff_a | `period1=period_b1.id` | ∅ or 🚫 400 | **P0** |
| `test_cost_analysis_cross_hotel_slug` | CR-04 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_cost_analysis_cross_hotel_period_fk`** | CR-04 | staff_a | `period1=period_b1.id` | ∅ or 🚫 400 | **P0** |
| `test_trend_analysis_own_hotel` | CR-05 | staff_a | Valid periods + category | ✅ 200 | P1 |
| `test_trend_analysis_cross_hotel_slug` | CR-05 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_trend_analysis_mixed_hotel_periods`** | CR-05 | staff_a | `periods=[period_a1.id, period_b1.id]` | Only hotel_a data or 🚫 400 | **P0** |
| `test_variance_heatmap_cross_hotel_slug` | CR-06 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_performance_scorecard_cross_hotel_slug` | CR-07 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_performance_scorecard_cross_hotel_period_fk`** | CR-07 | staff_a | `period1=period_b1.id` | ∅ or 🚫 400 | **P0** |
| `test_stock_value_report_cross_hotel_slug` | CR-08 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_legacy_periods_compare_cross_hotel_slug` | CR-09 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_sales_analysis_cross_hotel_slug` | CR-10 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| **`test_sales_analysis_cross_hotel_period_fk`** | CR-10 | staff_a | Own slug, period_b1 id in path | 🔍 404 | **P0** |
| `test_compare_views_superuser` | CR-01–07 | superuser | Any slug | Document ✅/🚫 | P2 |

> **HIGH-RISK: FK injection via query params.** Comparison endpoints accept `period_ids`,
> `period1`, `period2` as GET query parameters. The backend MUST filter these through
> `Period.objects.filter(hotel=request.user.staff_profile.hotel)` before aggregating.
> If a period from hotel_b is accepted, the comparison will include foreign data.
>
> **Previously lacked `permission_classes`:** These report views were the most likely
> to have been missing `permission_classes` before the scoping changes. Verify each
> view explicitly declares `[IsAuthenticated, IsSameHotel]` or equivalent.

---

### 2.4 DEPARTMENT / ROLE ACCESS

**Endpoints** (base: `/api/staff/hotel/{slug}/`)

| ID | Path | Method | View |
|----|------|--------|------|
| DR-01 | `attendance/roster-analytics/kpis/` | GET | APIView |
| DR-02 | `attendance/roster-analytics/staff-summary/` | GET | APIView |
| DR-03 | `attendance/roster-analytics/department-summary/` | GET | APIView |
| DR-04 | `attendance/roster-analytics/daily-totals/` | GET | APIView |
| DR-05 | `attendance/roster-analytics/weekly-totals/` | GET | APIView |
| DR-06 | `attendance/shift-locations/` | GET | ViewSet |
| DR-07 | `attendance/shift-locations/` | POST | ViewSet |
| DR-08 | `attendance/shift-locations/{id}/` | PUT | ViewSet |
| DR-09 | `attendance/shift-locations/{id}/` | DELETE | ViewSet |
| DR-10 | `attendance/clock-logs/` | POST | APIView |
| DR-11 | `attendance/clock-logs/clock-out/` | POST | APIView |
| DR-12 | `attendance/clock-logs/{id}/approve/` | POST | APIView |
| DR-13 | `attendance/clock-logs/{id}/reject/` | POST | APIView |
| DR-14 | `staff/{slug}/me/` | GET | APIView |

#### Test Cases

| Test Name | EP | Actor | Scenario | Expected | Priority |
|-----------|----|-------|----------|----------|----------|
| `test_kpis_own_hotel` | DR-01 | staff_a | Valid | ✅ 200 | P1 |
| `test_kpis_cross_hotel_slug` | DR-01 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_staff_summary_own_hotel` | DR-02 | staff_a | Valid | ✅ only hotel_a staff | P1 |
| `test_staff_summary_cross_hotel_slug` | DR-02 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_department_summary_own_hotel` | DR-03 | staff_a | Valid | ✅ only hotel_a departments | P1 |
| `test_department_summary_cross_hotel_slug` | DR-03 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| **`test_department_summary_cross_hotel_dept_fk`** | DR-03 | staff_a | `?department=dept_b1.id` via own slug | ∅ empty or 🚫 400 | **P0** |
| `test_daily_totals_cross_hotel_slug` | DR-04 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_weekly_totals_cross_hotel_slug` | DR-05 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_shift_locations_list_own_hotel` | DR-06 | staff_a | GET | ✅ only hotel_a locations | P1 |
| `test_shift_locations_list_cross_hotel_slug` | DR-06 | staff_a | slug=`hotel-bravo` | 🚫 403 | P1 |
| `test_create_shift_location_own_hotel` | DR-07 | staff_a | POST | ✅ 201 | P1 |
| `test_create_shift_location_cross_hotel_slug` | DR-07 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_update_shift_location_cross_hotel` | DR-08 | staff_a | PUT loc_b1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_delete_shift_location_cross_hotel` | DR-09 | staff_a | DELETE loc_b1 via `hotel-bravo` | 🚫 403 | P0 |
| **`test_update_shift_location_cross_hotel_object_id`** | DR-08 | staff_a | PUT loc_b1.id via *own* slug | 🔍 404 | **P0** |
| **`test_delete_shift_location_cross_hotel_object_id`** | DR-09 | staff_a | DELETE loc_b1.id via *own* slug | 🔍 404 | **P0** |
| `test_clock_in_cross_hotel_slug` | DR-10 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| `test_clock_out_cross_hotel_slug` | DR-11 | staff_a | POST via `hotel-bravo` | 🚫 403 | P0 |
| **`test_approve_clock_log_cross_hotel`** | DR-12 | admin_a | approve clock_b1.id via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_reject_clock_log_cross_hotel`** | DR-13 | admin_a | reject clock_b1.id via `hotel-bravo` | 🚫 403 | **P0** |
| **`test_approve_clock_log_cross_hotel_object_id`** | DR-12 | admin_a | approve clock_b1.id via *own* slug | 🔍 404 | **P0** |
| `test_staff_me_own_hotel` | DR-14 | staff_a | Own slug | ✅ hotel_a profile | P1 |
| `test_staff_me_slug_tamper` | DR-14 | staff_a | slug=`hotel-bravo` | 🚫 403 | P0 |
| `test_department_superuser` | DR-01–05 | superuser | Any slug | Document ✅/🚫 | P2 |

> **HIGH-RISK:**
> - **Department scoping through Staff FK** (DR-03): Department is accessed via
>   `StaffProfile.department`. If the analytics view doesn't filter
>   `department__hotel=staff_profile.hotel`, it could aggregate departments from
>   another hotel if a `department` query param is injected.
> - **Clock log approve/reject** (DR-12, DR-13): These act on another user's clock
>   log. Must verify `clock_log.staff.hotel == admin.staff_profile.hotel`.

---

### 2.5 OVERSTAY

**Endpoints** (base: `/api/staff/hotel/{slug}/room-bookings/{bookingId}/overstay/`)

| ID | Path | Method | View |
|----|------|--------|------|
| OV-01 | `status/` | GET | APIView |
| OV-02 | `acknowledge/` | POST | APIView |
| OV-03 | `extend/` | POST | APIView |

#### Test Cases

| Test Name | EP | Actor | Scenario | Expected | Priority |
|-----------|----|-------|----------|----------|----------|
| `test_overstay_status_own_hotel` | OV-01 | staff_a | booking_a1 via `hotel-alpha` | ✅ 200 | P1 |
| `test_overstay_status_cross_hotel_slug` | OV-01 | staff_a | booking_b1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_overstay_status_slug_tamper` | OV-01 | staff_a | booking_a1 via `hotel-bravo` | 🚫 403 | P0 |
| **`test_overstay_status_booking_id_guess`** | OV-01 | staff_a | booking_b1 via `hotel-alpha` (own slug, foreign booking ID) | 🔍 404 | **P0** |
| `test_overstay_acknowledge_own_hotel` | OV-02 | staff_a | booking_a1 | ✅ 200 | P0 |
| `test_overstay_acknowledge_cross_hotel_slug` | OV-02 | staff_a | booking_b1 via `hotel-bravo` | 🚫 403 | P0 |
| **`test_overstay_acknowledge_booking_id_guess`** | OV-02 | staff_a | booking_b1 via `hotel-alpha` | 🔍 404 | **P0** |
| `test_overstay_extend_own_hotel` | OV-03 | staff_a | booking_a1, `add_nights: 1` | ✅ 200 | P0 |
| `test_overstay_extend_cross_hotel_slug` | OV-03 | staff_a | booking_b1 via `hotel-bravo` | 🚫 403 | P0 |
| **`test_overstay_extend_booking_id_guess`** | OV-03 | staff_a | booking_b1 via `hotel-alpha` | 🔍 404 | **P0** |
| `test_overstay_extend_slug_tamper` | OV-03 | staff_a | booking_a1 via `hotel-bravo` | 🚫 403 | P0 |
| `test_overstay_superuser` | OV-01–03 | superuser | booking_b1 via `hotel-bravo` | Document ✅/🚫 | P2 |

> **HIGH-RISK: Booking ID guessing.**
> The booking ID is in the URL path. Even with the correct slug for staff_a's own hotel,
> if the view resolves the booking by PK without filtering `booking.hotel == staff_profile.hotel`,
> staff_a could read/acknowledge/extend a Hotel Bravo booking by guessing its ID.
> The view MUST use `get_object_or_404(Booking, pk=bookingId, hotel=staff_profile.hotel)`.

---

## 3. Test Template (Reusable Pattern)

```python
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestTenantScoping:
    """
    Template for all tenant-scoping tests. Three patterns to cover:
    1. Same-hotel → succeeds
    2. Cross-hotel slug → 403
    3. Own slug + foreign object ID → 404
    """

    # ── Pattern 1: same-hotel access ──────────────────────────────
    def test_endpoint_own_hotel(self, api, staff_a, hotel_a, fixture_a):
        api.force_authenticate(user=staff_a)
        url = f"/api/staff/hotel/{hotel_a.slug}/resource/{fixture_a.pk}/"
        resp = api.get(url)
        assert resp.status_code == status.HTTP_200_OK

    # ── Pattern 2: cross-hotel via URL slug ───────────────────────
    def test_endpoint_cross_hotel_slug(self, api, staff_a, hotel_b, fixture_b):
        api.force_authenticate(user=staff_a)
        url = f"/api/staff/hotel/{hotel_b.slug}/resource/{fixture_b.pk}/"
        resp = api.get(url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    # ── Pattern 3: own slug + foreign object ID ───────────────────
    def test_endpoint_foreign_object_id(self, api, staff_a, hotel_a, fixture_b):
        api.force_authenticate(user=staff_a)
        url = f"/api/staff/hotel/{hotel_a.slug}/resource/{fixture_b.pk}/"
        resp = api.get(url)
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    # ── Pattern 4: FK injection in body ───────────────────────────
    def test_endpoint_fk_injection(self, api, staff_a, hotel_a, foreign_fk_id):
        api.force_authenticate(user=staff_a)
        url = f"/api/staff/hotel/{hotel_a.slug}/resource/"
        resp = api.post(url, {"parent_fk": foreign_fk_id, "name": "test"})
        assert resp.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST,
        )

    # ── Pattern 5: FK injection in query params ───────────────────
    def test_endpoint_query_fk_injection(self, api, staff_a, hotel_a, foreign_period_id):
        api.force_authenticate(user=staff_a)
        url = f"/stock_tracker/{hotel_a.slug}/compare/categories/"
        resp = api.get(url, {"period_ids": foreign_period_id})
        # Must return empty or error — never foreign hotel data
        if resp.status_code == status.HTTP_200_OK:
            assert len(resp.data.get("results", resp.data)) == 0
        else:
            assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # ── Pattern 6: superuser ──────────────────────────────────────
    def test_endpoint_superuser(self, api, superuser, hotel_b, fixture_b):
        api.force_authenticate(user=superuser)
        url = f"/api/staff/hotel/{hotel_b.slug}/resource/{fixture_b.pk}/"
        resp = api.get(url)
        # Document actual behavior — then pin as assertion
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
```

---

## 4. Consolidated High-Risk Items

| # | Risk | Module | Endpoints | Attack Vector | Code Review Target |
|---|------|--------|-----------|---------------|-------------------|
| **HR-1** | FK injection in POST/PATCH body | Stock Tracker | ST-02, ST-03, ST-09, ST-18 | `{category: cat_b.id}`, `{period: period_b1.id}`, `{cocktail: cocktail_b1.id}` | Serializer `validate_<field>()` or `perform_create()` must filter FK by hotel |
| **HR-2** | FK injection in query params | Comparison/Reports | CR-02–CR-07, CR-10 | `?period_ids=<hotel_b_period>`, `?period1=<hotel_b>` | View must intersect param IDs with `Period.objects.filter(hotel=...)` |
| **HR-3** | Nested resource parent FK in body | Maintenance | M-10, M-11 | `{request: maint_req_b1.id}` in photo/comment POST | View must verify `maintenance_request.hotel == staff_profile.hotel` |
| **HR-4** | 3-level nested path traversal | Stock Tracker | ST-12–ST-15 | `/stocktake-lines/{line_b1}/add-movement/` | View must verify line → stocktake → period → hotel chain |
| **HR-5** | Booking ID guessing | Overstay | OV-01–OV-03 | Correct own slug + guessed `booking_b1.id` | `get_object_or_404(Booking, pk=id, hotel=staff_profile.hotel)` |
| **HR-6** | Report views missing `permission_classes` | Comparison/Reports | CR-01–CR-10 | Previously no scoping | Verify each view class has `permission_classes = [IsAuthenticated, IsSameHotel]` |
| **HR-7** | Document downloads | Stock Tracker | ST-24–ST-26 | Direct URL to foreign hotel PDF/Excel | View must verify `stocktake.period.hotel == staff_profile.hotel` |
| **HR-8** | `perform_create` sets hotel from body | Stock Tracker | ST-02, ST-06, ST-09, ST-16–ST-18, ST-20 | `{hotel: hotel_b.id}` injected in POST body | Hotel must be set from `staff_profile.hotel`, never from request body |
| **HR-9** | Clock-log approval across hotels | Dept/Role | DR-12, DR-13 | Approve/reject a clock log belonging to Hotel Bravo staff | View must check `clock_log.staff_profile.hotel == request.user.staff_profile.hotel` |
| **HR-10** | Department query param injection | Dept/Role | DR-03 | `?department=dept_b1.id` | Analytics view must filter `Department.objects.filter(hotel=...)` |

---

## 5. Gaps Requiring Backend Code Review

The Django backend is not in this workspace. These items **cannot be verified from the
frontend** and require reading the Django source:

| # | Gap | What to Inspect | Why It Matters |
|---|-----|-----------------|----------------|
| G-01 | `permission_classes` on every view | Each view/viewset declares `[IsAuthenticated, IsSameHotel]` | Missing = falls back to `DEFAULT_PERMISSION_CLASSES` (often just `IsAuthenticated`) |
| G-02 | `get_queryset()` hotel filter | Every ViewSet filters by `hotel=request.user.staff_profile.hotel` | Unfiltered queryset leaks data on list AND allows object retrieval by PK |
| G-03 | `get_object()` hotel check | Detail/action views filter by hotel in object lookup | Without this, guessing a PK returns another hotel's object |
| G-04 | `perform_create()` / `perform_update()` | Sets `hotel` from `staff_profile.hotel`, not from `request.data` | Attacker can inject `hotel_id` in POST body |
| G-05 | Serializer FK validation | `validate_category()`, `validate_period()`, etc. verify FK belongs to same hotel | Without this, FK injection works even if URL scoping is correct |
| G-06 | Comparison query-param filtering | Period IDs from query params are intersected with hotel-scoped queryset | Without this, comparison views aggregate foreign data |
| G-07 | Nested resource parent validation | Photo/comment views verify `request.hotel` (body FK) belongs to same hotel | Without this, child objects attach to foreign parents |
| G-08 | Movement endpoint chain validation | Line → Stocktake → Period → Hotel chain is verified | 3 levels of nesting = 3 possible bypass points |
| G-09 | Download views object scoping | `download-pdf`, `download-excel` verify object.hotel == staff_profile.hotel | Downloads are frequently overlooked for permissions |
| G-10 | Superuser explicit handling | Code has intentional `is_superuser` branch or does NOT exempt superusers | Ambiguous handling is a bug |
| G-11 | X-Hotel-Slug header vs URL slug | Middleware validates header matches URL matches `staff_profile.hotel` | Mismatch could confuse scoping logic |
| G-12 | Maintenance endpoints hotel association | `/maintenance/requests/` (non-hotel-slug URL) somehow associates data with hotel | These URLs don't contain `{hotel_slug}` — how is hotel determined? |

---

## 6. Manual QA Checklist

**Setup:** Two browser sessions — Staff A (Hotel Alpha) and Staff B (Hotel Bravo).

### Maintenance
| # | Action | Expected |
|---|--------|----------|
| 1 | Staff A views maintenance request list | Only Hotel Alpha requests visible |
| 2 | Staff A copies URL, replaces slug with `hotel-bravo` | 403 error or redirect |
| 3 | Staff A opens DevTools, replays POST to `/maintenance/photos/` with `request: <hotel_b_request_id>` | 403 or 404 |
| 4 | Staff A replays POST to `/maintenance/comments/` with `request: <hotel_b_request_id>` | 403 or 404 |

### Stock Tracker
| # | Action | Expected |
|---|--------|----------|
| 5 | Staff A opens stock dashboard | Only Hotel Alpha items/categories |
| 6 | Staff A changes slug to `hotel-bravo` in stock URLs | 403 |
| 7 | Staff A creates item via DevTools with `category: <hotel_b_category_id>` | 403 or validation error |
| 8 | Staff A creates stocktake via DevTools with `period: <hotel_b_period_id>` | 403 or validation error |
| 9 | Staff A tries to download Hotel B stocktake PDF by crafting URL | 403 |

### Comparison/Reports
| # | Action | Expected |
|---|--------|----------|
| 10 | Staff A opens KPI summary | Only Hotel Alpha data |
| 11 | Staff A changes slug to `hotel-bravo` | 403 |
| 12 | Staff A intercepts comparison request, injects `period_ids=<hotel_b_period>` | Empty results or 400 |
| 13 | Staff A intercepts top-movers, sets `period1=<hotel_b_period>` | Empty or 400 |

### Department/Role
| # | Action | Expected |
|---|--------|----------|
| 14 | Staff A opens department roster | Only Hotel Alpha departments/staff |
| 15 | Staff A changes slug to `hotel-bravo` | 403 |
| 16 | Staff A appends `?department=<hotel_b_dept_id>` to department-summary | Empty or 400 |
| 17 | Admin A tries to approve a Hotel Bravo clock log by crafting URL | 403 or 404 |

### Overstay
| # | Action | Expected |
|---|--------|----------|
| 18 | Staff A checks overstay status for own booking | 200 with overstay data |
| 19 | Staff A changes slug to `hotel-bravo` in overstay URL | 403 |
| 20 | Staff A keeps own slug, changes booking ID to Hotel Bravo booking | 404 |
| 21 | Staff A tries to extend Hotel Bravo booking via DevTools | 403 or 404 |

### Superuser
| # | Action | Expected |
|---|--------|----------|
| 22 | Superuser accesses Hotel Bravo endpoints | Document actual behavior |
| 23 | Verify superuser can/cannot access all hotel data | Pin as spec |

---

## 7. Summary Counts

| Module | P0 | P1 | P2 | Total |
|--------|----|----|----|----- |
| Maintenance | 10 | 4 | 1 | **15** |
| Stock Tracker — CRUD | 18 | 8 | 1 | **27** |
| Comparison/Reports | 10 | 4 | 1 | **15** |
| Department/Role | 10 | 7 | 1 | **18** |
| Overstay | 8 | 1 | 1 | **10** |
| **Total** | **56** | **24** | **5** | **85** |

### Test File Organization

| File | Module | Tests |
|------|--------|-------|
| `tests/test_tenant_maintenance.py` | Maintenance (rooms + nested requests/photos/comments) | 15 |
| `tests/test_tenant_stock_crud.py` | Stock Tracker CRUD + movements + downloads | 27 |
| `tests/test_tenant_comparison.py` | Comparison/report views + FK injection | 15 |
| `tests/test_tenant_department.py` | Department/role + shift locations + clock logs | 18 |
| `tests/test_tenant_overstay.py` | Overstay status/acknowledge/extend | 10 |

---

## 8. Execution Order

1. **P0 First** — Cross-hotel writes and FK injection (56 tests)
2. **P1 Next** — Cross-hotel reads and list filtering (24 tests)
3. **P2 Last** — Superuser behaviour documentation (5 tests)
4. **Manual QA** — 23-step checklist above
5. **Code Review** — 12 gaps (G-01 through G-12) against Django source
