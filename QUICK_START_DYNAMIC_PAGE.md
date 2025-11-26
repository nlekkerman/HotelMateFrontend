# 🚀 Quick Start: Testing Dynamic Hotel Page Builder

## Prerequisites
- Backend API running with endpoint `/api/public/hotel/{slug}/page/`
- Backend seeded with Hotel Killarney data (`python manage.py seed_killarney_public_page`)
- Frontend development server ready to start

## Step 1: Start Development Server

```bash
cd hotelmate-frontend
npm run dev
```

## Step 2: Navigate to Dynamic Page

Open your browser and go to:
```
http://localhost:5173/hotel/hotel-killarney
```

## Step 3: Verify All Sections Load

You should see these sections in order:

1. **Hero Section** ✨
   - Large banner with title, subtitle, and CTA button
   - Background image with overlay

2. **Rooms List** 🛏️
   - Grid of room types (Deluxe Suite, Standard Room, etc.)
   - Pricing, occupancy, bed setup
   - "Book Now" buttons

3. **Cards/Highlights** 🌟
   - Feature cards (Family Friendly, etc.)
   - Icons or images
   - 3-column grid

4. **Gallery** 📸
   - Photo grid or carousel
   - Click to view full-size images
   - Image titles overlay

5. **Reviews** ⭐
   - Customer testimonials
   - Star ratings
   - Reviewer names and sources

6. **Contact Block** 📞
   - Phone, email, address
   - Google Maps embed
   - Clickable contact links

## Step 4: Test Responsive Design

- **Desktop:** All sections should display in multi-column grids
- **Tablet:** 2-column layouts, readable text
- **Mobile:** Single column, larger touch targets

Open DevTools (F12) and test various screen sizes.

## Step 5: Check Console Logs

Open browser console (F12 → Console) and verify:

```
[HotelPublicPage] Fetching page data for: hotel-killarney
[HotelPublicPage] Page data received: { hotel: {...}, sections: [...] }
```

No errors should appear!

## ✅ Expected Behavior

### Loading State
- Shows centered spinner with "Loading hotel page..." message
- Smooth fade-in when data loads

### Error States
- 404: "Hotel not found" with link back to hotels list
- Network error: "Failed to load hotel page" with retry option

### Navigation
- "All Hotels" button in top-left corner
- Links to booking pages work
- "Book Now" room buttons navigate correctly

### Interactions
- Gallery images open in modal on click
- Hover effects on cards and images
- Smooth scroll between sections

## 🐛 Troubleshooting

### Issue: Page Shows "Hotel not found"
**Solution:** 
- Verify backend is running
- Check backend has seeded data
- Ensure slug is correct: `hotel-killarney` (lowercase, hyphenated)

### Issue: Sections Don't Render
**Solution:**
- Check browser console for errors
- Verify API response has `sections` array
- Check each section has `element` object

### Issue: Images Don't Display
**Solution:**
- Check image URLs are valid (not 404)
- Verify Cloudinary URLs are accessible
- Check network tab (F12 → Network) for failed image requests

### Issue: Contact Map Missing
**Solution:**
- Add `VITE_GOOGLE_MAPS_API_KEY` to `.env`
- Or check hotel has `latitude` and `longitude` in database

### Issue: Styles Look Wrong
**Solution:**
- Clear browser cache (Ctrl+Shift+R)
- Verify `hotelPublicPage.css` is imported
- Check Bootstrap is loaded (should see Bootstrap classes working)

## 🎯 Testing Checklist

Run through this checklist:

- [ ] Page loads without errors
- [ ] All 6 sections visible
- [ ] Hero section has background image and CTA
- [ ] Rooms display with prices
- [ ] Cards have icons and descriptions
- [ ] Gallery images clickable
- [ ] Reviews show star ratings
- [ ] Contact info displays correctly
- [ ] Map loads (if API key configured)
- [ ] Mobile responsive works
- [ ] Tablet responsive works
- [ ] Hover effects work on cards
- [ ] "All Hotels" button navigates back
- [ ] No console errors

## 📊 API Response Structure Reference

**Backend Endpoints:**
- `GET /api/public/hotels/` - List all hotels with filters
- `GET /api/public/hotels/filters/` - Get filter options
- `GET /api/public/hotel/{slug}/page/` - Get hotel page structure

Expected response from `/api/public/hotel/hotel-killarney/page/`:

```json
{
  "hotel": {
    "id": 2,
    "name": "Hotel Killarney",
    "slug": "hotel-killarney",
    "city": "Killarney",
    "country": "Ireland",
    "email": "info@hotelkillarney.ie",
    "phone": "+353 64 123 4567"
  },
  "sections": [
    {
      "id": 1,
      "position": 0,
      "name": "hero",
      "element": {
        "element_type": "hero",
        "title": "Welcome to Hotel Killarney",
        "image_url": "https://...",
        "settings": {
          "primary_cta_label": "Book Now",
          "primary_cta_url": "/booking"
        }
      }
    },
    // ... more sections
  ]
}
```

## 🔄 Reseeding Backend Data

If you need fresh test data:

```bash
# In backend directory
python manage.py seed_killarney_public_page
```

This will recreate all sections with fresh placeholder data.

## 📞 Next Steps

After verifying the page works:

1. **Customize Content:** Update section data via backend admin
2. **Add Real Images:** Upload real hotel photos to Cloudinary
3. **Configure Rooms:** Add real room types and pricing
4. **Add Reviews:** Import real customer testimonials
5. **Update Contact:** Ensure accurate contact information
6. **SEO Optimization:** Add meta tags and structured data
7. **Performance:** Optimize images and enable caching

## 🎉 Success!

If you see all sections rendering correctly with no errors, the implementation is working! 

The dynamic page builder is now ready for:
- Content management by hotel staff
- Multiple hotels with unique pages
- Real-time updates via Pusher (future)
- Custom section ordering and configuration

---

**Happy Testing!** 🚀
