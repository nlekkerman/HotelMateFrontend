# Issue #1 — Update Public Hotel Page to Use Correct API Endpoint

## Priority: HIGH 🔴

## Title
Update HotelPortalPage to fetch from `/api/hotels/<slug>/public/` endpoint

## Description
Currently, `HotelPortalPage.jsx` fetches hotel data from `/hotel/${hotelSlug}/` which is a simplified endpoint. According to the requirements, it should fetch from `/api/hotels/<slug>/public/` which returns the full public hotel data structure including:

- `hero_image_url`
- `booking_options` (primary_cta_label, primary_cta_url, secondary_cta_phone)
- `room_types[]` with pricing and booking URLs
- `offers[]` with book_now_url
- `leisure_activities[]`
- Extended `contact` info with booking_url, website_url

## Current Implementation
File: `hotelmate-frontend/src/pages/HotelPortalPage.jsx`

```javascript
const response = await api.get(`/hotel/${hotelSlug}/`);
```

## Required Changes

1. Update the API call to use the public endpoint:
```javascript
const response = await api.get(`/api/hotels/${hotelSlug}/public/`);
```

2. Update error handling to match the new response structure

3. Ensure the hotel data passed to `GuestHotelHome` includes all new fields

## Acceptance Criteria

- [x] API call changed to `/api/hotels/<slug>/public/`
- [x] Response data includes all required fields (hero_image_url, booking_options, room_types, offers, leisure_activities, contact)
- [x] Error states properly handled for 404 or network errors
- [x] No breaking changes to existing functionality

## Dependencies
- Backend endpoint `/api/hotels/<slug>/public/` must be available and returning correct data structure

## Estimated Effort
Small (1-2 hours)
