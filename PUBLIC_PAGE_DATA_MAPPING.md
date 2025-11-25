# Public Hotel Page - Real vs Mock Data

## 🎯 Data Sources
- **Real Backend Data**: `/api/hotel/public/page/{slug}/` - Full hotel data
- **Settings Data**: `/api/staff/hotel/{slug}/settings/` - Editable settings

---

## ✅ REAL DATA (From Backend)

### 1. **Hero Section** (`HeroSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Hero Image | `settings.hero_image_display` or `settings.hero_image` | ✅ Yes - Images section |
| Hotel Name | `hotel.name` | ❌ No (from Hotel model) |
| Tagline | `settings.tagline_display` or `hotel.tagline` | ❌ Backend only |
| City/Country | `hotel.city`, `hotel.country` | ❌ No (from Hotel model) |
| Welcome Message | `settings.welcome_message` | ✅ Yes - Content section |
| Short Description | `settings.short_description` | ✅ Yes - Content section |
| Book Now Button | Links to `/book` | ✅ Functional |

### 2. **Gallery Section** (`GallerySection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Gallery Images | `settings.gallery[]` | ✅ Yes - Images section |
| Display | Only shows if `gallery.length > 0` | ✅ Upload/manage in Settings |

**Current Issue**: Was showing Unsplash placeholder images - NOW FIXED ✅

### 3. **Room Types Section** (`RoomTypesSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Room List | `hotel.room_types[]` | ✅ Yes - Rooms section |
| Room Name | `room.name` | ✅ Yes |
| Room Code | `room.code` | ✅ Yes |
| Room Description | `room.short_description` | ✅ Yes |
| Room Photo | `room.photo` or `room.photo_url` | ✅ Yes - Upload in modal |
| Max Occupancy | `room.max_occupancy` | ✅ Yes |
| Bed Setup | `room.bed_setup` | ✅ Yes |
| Starting Price | `room.starting_price_from` | ✅ Yes |
| Currency | `room.currency` | ✅ Yes |

**Fallback**: Uses Unsplash hotel room image if no photo uploaded

### 4. **Offers Section** (`OffersSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Offers List | `hotel.offers[]` | ✅ Yes - Offers section |
| Offer Title | `offer.title` | ✅ Yes |
| Offer Description | `offer.description` | ✅ Yes |
| Category | `offer.category` | ✅ Yes |
| Valid From/To | `offer.valid_from`, `offer.valid_to` | ✅ Yes |
| Status | `offer.status` (active/inactive) | ✅ Yes |
| Discount | `offer.discount_percentage` or `offer.discount_amount` | ✅ Yes |

**Note**: Only ACTIVE offers are displayed on public page

### 5. **Amenities Section** (`AmenitiesSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Amenities List | `settings.amenities[]` | ✅ Yes - Amenities section |
| Display | Only shows if `amenities.length > 0` | ✅ Add/remove in Settings |

**Icons Mapped**:
- `wifi` → bi-wifi
- `pool` → bi-water
- `gym` → bi-heart-pulse
- `parking` → bi-car-front
- `restaurant` → bi-shop-window
- `bar` → bi-cup-straw
- etc.

### 6. **Leisure Activities** (`LeisureActivitiesSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Activities List | `hotel.leisure_activities[]` | ✅ Yes - Leisure section |
| Activity Name | `activity.name` | ✅ Yes |
| Activity Description | `activity.description` | ✅ Yes |
| Category | `activity.category` | ✅ Yes |
| Operating Hours | `activity.operating_hours` | ✅ Yes |
| Status | `activity.status` | ✅ Yes |

**Categories**: Wellness, Dining, Sports, Entertainment, Kids, Events

### 7. **Location & Contact** (`LocationContactSection.jsx`)
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Contact Email | `settings.contact_email` | ✅ Yes - Contact section |
| Contact Phone | `settings.contact_phone` | ✅ Yes - Contact section |
| Address | `settings.contact_address` | ✅ Yes - Contact section |
| Website | `settings.website` | ✅ Yes - Contact section |
| Google Maps | `settings.google_maps_link` | ✅ Yes - Contact section |

---

## ❌ MOCK/HARDCODED DATA

### 1. **Guest Features Grid** (HIDDEN)
Currently hidden with `{false && ...}` - Internal guest services section
- Room Service
- Breakfast
- Restaurant Bookings
- Hotel Information
- Games & Entertainment
- Requests & Support

**Status**: ⏳ Coming in Phase 2

### 2. **Theme Colors**
| Field | Source | Editable in Settings |
|-------|--------|---------------------|
| Primary Color | `settings.primary_color` | ✅ Yes - Theme section |
| Secondary Color | `settings.secondary_color` | ✅ Yes - Theme section |
| Accent Color | `settings.accent_color` | ✅ Yes - Theme section |
| Button Colors | `settings.button_color`, etc. | ✅ Yes - Theme section |

**Current Status**: Colors are saved but not fully applied to CSS variables yet

---

## 📊 Settings Coverage Summary

| Section | Backend Endpoint | Frontend Component | Status |
|---------|------------------|-------------------|--------|
| **Content** | ✅ `/staff/hotel/{slug}/settings/` | `SectionContent` | ✅ Save button added |
| **Images** | ✅ `/staff/hotel/{slug}/settings/` | `SectionImages` | ✅ Save button added |
| **Gallery Upload** | ✅ `/staff/hotel/{slug}/settings/gallery/upload/` | `SectionImages` | ✅ Working |
| **Gallery Manage** | ✅ `/staff/hotel/{slug}/settings/gallery/reorder/` | `SectionImages` | ✅ Working |
| **Amenities** | ✅ `/staff/hotel/{slug}/settings/` | `SectionAmenities` | ⏳ Needs save button |
| **Contact** | ✅ `/staff/hotel/{slug}/settings/` | `SectionContact` | ⏳ Needs save button |
| **Branding** | ✅ `/staff/hotel/{slug}/settings/` | `SectionBranding` | ⏳ Needs save button |
| **Theme** | ✅ `/staff/hotel/{slug}/settings/` | `SectionTheme` | ⏳ Needs save button |
| **Room Types** | ✅ `/staff/hotel/{slug}/room-types/` | `SectionRooms` | ✅ Modal save works |
| **Offers** | ✅ Via hotel model | `SectionOffers` | ✅ Modal save works |
| **Leisure** | ✅ Via hotel model | `SectionLeisure` | ✅ Modal save works |

---

## 🔄 Real-Time Updates (Pusher)

**Channel**: `hotel-{slug}`

**Events Implemented**:
- ✅ `settings-updated` - Hero image, general settings
- ✅ `gallery-image-uploaded` - New gallery images
- ✅ `gallery-reordered` - Gallery reorder
- ✅ `room-type-image-updated` - Room type photos

**Status**: Backend broadcasting, frontend listening ✅

---

## 🎨 What You CAN Edit in Settings Page

### ✅ Fully Working
1. **Content** - Welcome message, descriptions
2. **Hero Image** - Upload or URL
3. **Gallery** - Upload multiple images, reorder, remove
4. **Room Types** - Name, photo, pricing, beds, description
5. **Offers** - Create, edit offers with dates/discounts
6. **Leisure Activities** - Add activities by category
7. **Amenities** - Add/remove amenities
8. **Contact Info** - Email, phone, address, maps link
9. **Branding** - Logo, favicon, slogan
10. **Theme Colors** - All color customization

### ⏳ Needs Save Buttons
- Amenities section
- Contact section
- Branding section
- Theme section

---

## 🚫 What You CANNOT Edit (Backend/Model Data)

1. Hotel Name (from Hotel model)
2. Hotel Slug (from Hotel model)
3. City/Country (from Hotel model)
4. Hotel ID (system generated)

---

## 📝 Next Steps

1. Add individual save buttons to remaining sections:
   - Amenities
   - Contact
   - Branding
   - Theme

2. Apply theme colors to CSS variables dynamically

3. Test Pusher real-time updates across multiple browsers

4. Remove any remaining placeholder/mock data

---

**Last Updated**: November 25, 2025
**Status**: ✅ Real data flowing, Pusher integrated, Gallery fixed
