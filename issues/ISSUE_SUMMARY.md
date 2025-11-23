# Issue Tracking Summary

**Date:** November 23, 2025

## Original Issue Status

### `frontend_public_hotel_page_and_booking.md`
**Status:** ⚠️ PARTIALLY COMPLETE

#### What's Done ✅
- Basic route `/h/:hotelSlug` implemented in `HotelPortalPage.jsx`
- Basic data loading with loading/error states
- Guest view component (`GuestHotelHome.jsx`) created
- Navigation back to hotels list
- Responsive layout foundation

#### What's Missing ❌
- Fetching from correct API endpoint (`/api/hotels/<slug>/public/` instead of `/hotel/${hotelSlug}/`)
- Hero section with hero_image_url and booking CTAs
- Room types section with pricing and booking buttons
- Offers section with "Book now" buttons
- Leisure activities/facilities section
- Contact/location section with map, phone, email
- Footer booking CTA
- PIN stub for guest portal access
- Full booking UI functionality
- Currency formatting utilities

---

## New Issues Created

### Issue #1: Update Public Hotel Page API Endpoint
**File:** `01_public_hotel_api_endpoint.md`  
**Priority:** 🔴 HIGH  
**Effort:** Small (1-2 hours)

Update `HotelPortalPage.jsx` to fetch from `/api/hotels/<slug>/public/` instead of the simplified endpoint.

---

### Issue #2: Hero Section with Booking CTAs
**File:** `02_hero_section_with_booking_cta.md`  
**Priority:** 🔴 HIGH  
**Effort:** Medium (3-5 hours)

Implement full-width hero section with:
- Background image from `hero_image_url`
- Hotel logo overlay
- Hotel name, tagline, short_description
- Primary and secondary booking CTA buttons
- Responsive design with dark overlay for readability

---

### Issue #3: Room Types Section with Pricing
**File:** `03_room_types_section.md`  
**Priority:** 🔴 HIGH  
**Effort:** Medium (4-6 hours)

Create "Rooms & Suites" section displaying:
- Room cards with images
- "From €X/night" pricing
- Occupancy and bed setup info
- Availability badges
- Individual "Book this room" buttons
- Currency formatting utility

---

### Issue #4: Offers & Packages Section
**File:** `04_offers_section.md`  
**Priority:** 🟡 MEDIUM  
**Effort:** Small-Medium (2-4 hours)

Create "Special Offers & Packages" section with:
- Offer cards with titles and descriptions
- Tag badges (Popular, Limited Time, etc.)
- Date validity ranges
- "Book now" buttons linking to offer URLs

---

### Issue #5: Leisure Activities & Facilities
**File:** `05_leisure_activities_section.md`  
**Priority:** 🟡 MEDIUM  
**Effort:** Small-Medium (2-3 hours)

Create "Leisure & Facilities" section displaying:
- Activity cards with category-based icons
- Category color coding (Wellness, Family, Dining, etc.)
- Short descriptions
- Responsive grid layout

---

### Issue #6: Location & Contact Information
**File:** `06_location_contact_section.md`  
**Priority:** 🟡 MEDIUM  
**Effort:** Small-Medium (3-4 hours)

Create location and contact section with:
- City, country, full address
- "View on Map" button with Google Maps integration
- Clickable phone (tel:), email (mailto:), website links
- Footer booking CTA card

---

### Issue #7: Guest Portal PIN Stub
**File:** `07_guest_portal_pin_stub.md`  
**Priority:** 🟢 LOW  
**Effort:** Very Small (1-2 hours)

Add "Already staying with us?" section at bottom with:
- Prompt for existing guests
- "Access your stay (PIN required)" button
- "Coming soon" placeholder (no actual PIN logic)
- Non-intrusive design

---

## Implementation Order Recommendation

1. **Issue #1** (Update API) - Must be done first, all others depend on it
2. **Issue #2** (Hero Section) - High priority, first visual element
3. **Issue #3** (Room Types) - Core booking functionality
4. **Issue #4** (Offers) - Secondary booking functionality
5. **Issue #5** (Leisure Activities) - Marketing content
6. **Issue #6** (Location & Contact) - Information + final CTA
7. **Issue #7** (PIN Stub) - Nice to have, lowest priority

---

## Total Estimated Effort
**18-26 hours** of development work

## Files to Be Modified/Created

### Existing Files to Modify
- `hotelmate-frontend/src/pages/HotelPortalPage.jsx`
- `hotelmate-frontend/src/sections/GuestHotelHome.jsx`
- `hotelmate-frontend/src/App.jsx` (optional, for PIN stub route)

### New Files to Create
- `hotelmate-frontend/src/components/hotels/HeroSection.jsx`
- `hotelmate-frontend/src/components/hotels/RoomTypesSection.jsx`
- `hotelmate-frontend/src/components/hotels/OffersSection.jsx`
- `hotelmate-frontend/src/components/hotels/LeisureActivitiesSection.jsx`
- `hotelmate-frontend/src/components/hotels/LocationContactSection.jsx`
- `hotelmate-frontend/src/components/hotels/GuestPortalStub.jsx`
- `hotelmate-frontend/src/utils/formatCurrency.js`
- `hotelmate-frontend/src/styles/hero.css` (optional)
- `hotelmate-frontend/src/styles/offers.css` (optional)

---

## Next Steps

1. Review and approve issue breakdown
2. Begin with Issue #1 (API endpoint update)
3. Test backend `/api/hotels/<slug>/public/` endpoint returns correct data
4. Proceed with implementation in priority order
5. Test each component thoroughly before moving to next issue
