# Frontend Issue — Public Hotel Page UI + Booking Logic

## Status: PARTIALLY COMPLETE ⚠️

**Last Updated:** November 23, 2025

### Completion Summary
- ✅ Basic route `/h/:hotelSlug` implemented
- ✅ Basic data loading with loading/error states
- ✅ Guest view component created
- ❌ Missing: Hero section with booking CTAs
- ❌ Missing: Room types with pricing
- ❌ Missing: Offers section
- ❌ Missing: Leisure activities
- ❌ Missing: Contact/location section
- ❌ Missing: Full booking UI functionality
- ❌ Missing: Correct API endpoint (`/api/hotels/<slug>/public/`)

**Next Steps:** See new issues created for each missing feature.

---

## Title  
Public Hotel Page for Non-Staying Guests (/h/:hotelSlug) + Booking UI

## Body  
Implement the **public hotel page** for users who are **not yet staying** at the hotel, including:

- hotel hero + branding  
- booking CTAs (hero + footer + per room/offer)  
- room type overview with “from” prices  
- offers section with “Book now” buttons  
- leisure activities / facilities  
- contact info  

All data must be driven from the backend public endpoint:  
`GET /api/hotels/<slug>/public/`.

---

## Summary

When a user clicks a hotel card on the HotelsMate homepage, they should land on `/h/:hotelSlug` and see a **public hotel marketing + booking page**, NOT guest tools.

This page is a funnel into the booking engine: show why the hotel is attractive, what rooms and offers exist, and provide clear ways to book.

---

## Requirements

### 1. Route & data loading

- Route: `/h/:hotelSlug`  
- Component: `HotelPublicPage` (or equivalent naming convention).  

On mount:
- read `hotelSlug` from the URL params  
- fetch `GET /api/hotels/<slug>/public/`  
- handle:
  - loading state (spinner / skeleton)  
  - error / 404 state (“Hotel not found”)  

### 2. Hero section with primary booking CTA

Use backend data to render:

- hero background image (`hero_image_url`)  
- hotel logo (`logo_url`)  
- hotel name  
- tagline  
- optional short_description  

Booking button(s):

- Primary CTA:
  - label → `booking_options.primary_cta_label` (fallback “Book a Room”)  
  - link → `booking_options.primary_cta_url` (fallback `contact.booking_url`)  
- Secondary CTA (optional):
  - if `booking_options.secondary_cta_phone` → “Call to Book” (`tel:` link)  
  - or use `contact.website_url` as a secondary link  

### 3. Room types section (marketing + booking)

Display a “Rooms & Suites” (or similar) section:

For each `room_types` item:
- image / photo  
- name  
- short_description  
- text like “Up to X guests” (from `max_occupancy`)  
- bed setup if available  
- “From €X/night” using:
  - `starting_price_from` + `currency`  
- if `availability_message` exists, show as subtle badge or subtext (“High demand”, “Popular choice”).

Booking CTA per room card:

- If `booking_url` exists on the room → use it for a **“Book this room”** button.  
- Else fallback to `booking_options.primary_cta_url`.  

### 4. Offers section (packages) with “Book now”

Display an “Offers” or “Special Offers & Packages” section:

For each offer:
- title  
- short_description  
- optional tag badge (`tag`)  
- optional date range (valid_from / valid_to)  
- primary action: **“Book now”** button → `book_now_url`.  

If there are no offers, either hide the section or show a simple “No current offers” message.

### 5. Leisure activities / facilities section

Display a section like “Leisure & Facilities”:

Render `leisure_activities`:

- name  
- category label (Wellness, Family, Dining, etc.)  
- short_description  
- optional icon/image  

Click behaviour can be simple (read-only) or expand/collapse for extra details, depending on design conventions.

### 6. Location & contact section

Show:

- city, country  
- address lines  
- optional map link using lat/lng (if present)  

Contact options:

- “Call us” → `tel:phone`  
- “Email us” → `mailto:email`  
- “Visit website” → `contact.website_url`  

Footer booking CTA:

- another “Book your stay” button that uses the same URL as the primary booking CTA.

### 7. Access-stay (PIN) stub (future guest portal)

At bottom of the page, add a small stub for future guest portal:

- Text: “Already staying with us?”  
- Button: “Access your stay (PIN required)”  

For this issue:
- either link to a placeholder route, or  
- show a “Coming soon” message.  

Do NOT implement real PIN/guest portal logic here.

---

## UX / Behaviour

- The page must be responsive (mobile, tablet, desktop layouts).  
- Booking CTAs (buttons) should be visually prominent and consistent.  
- If some booking URLs are missing:
  - hide or gracefully disable the corresponding button  
  - do not show broken links.  
- Currency values should be formatted cleanly (e.g. “From €123/night”).  

---

## Acceptance Criteria

### ✅ Completed
- ✅ From homepage, clicking a hotel card navigates to `/h/:hotelSlug`
- ✅ Basic page structure with loading/error states
- ✅ Guest view component exists
- ✅ Responsive layout foundation

### ❌ Not Completed
- ❌ The public hotel page fetches data from `/api/hotels/<slug>/public/` (currently uses `/hotel/${hotelSlug}/`)
- ❌ Hero section with booking CTA  
- ❌ Room types with "from" prices and book buttons  
- ❌ Offers with "Book now" buttons  
- ❌ Leisure/facilities section  
- ❌ Contact and location details with map/phone/email
- ❌ Footer booking CTA
- ❌ PIN stub for guest portal access
- ❌ Full booking UI functionality using URLs from backend
- ❌ Currency formatting (e.g., "From €123/night")
