# Issue #2 — Hero Section with Booking CTAs

## Priority: HIGH 🔴

## Title
Implement Hero Section with Background Image and Primary/Secondary Booking CTAs

## Description
Create a prominent hero section at the top of the public hotel page that showcases the hotel with a large background image and clear calls-to-action for booking.

## Requirements

### Visual Elements
- **Hero background image** from `hero_image_url`
- **Hotel logo** overlay from `logo_url`
- **Hotel name** (h1)
- **Tagline** (if available)
- **Short description** (optional, 1-2 sentences)

### Primary CTA Button
- Label from `booking_options.primary_cta_label` (fallback: "Book a Room")
- Link to `booking_options.primary_cta_url` (fallback: `contact.booking_url`)
- Prominent styling (large, high contrast)

### Secondary CTA (Optional)
- **Option A:** If `booking_options.secondary_cta_phone` exists
  - Display "Call to Book" button with `tel:` link
- **Option B:** Otherwise, link to `contact.website_url`

### Design Requirements
- Full-width hero (viewport width)
- Minimum height: 60vh on desktop, 50vh on mobile
- Dark overlay on background image for text readability
- Centered content
- Responsive layout (stack buttons on mobile)

## Component Structure

```jsx
// Add to GuestHotelHome.jsx or create HeroSection.jsx

<section className="hero-section">
  <div className="hero-background" style={{ backgroundImage: `url(${hotel.hero_image_url})` }}>
    <div className="hero-overlay">
      <Container>
        <div className="hero-content text-center text-white">
          {hotel.logo_url && (
            <img src={hotel.logo_url} alt={hotel.name} className="hero-logo mb-4" />
          )}
          <h1 className="display-3 fw-bold">{hotel.name}</h1>
          {hotel.tagline && <h2 className="h4 mb-3">{hotel.tagline}</h2>}
          {hotel.short_description && (
            <p className="lead mb-4">{hotel.short_description}</p>
          )}
          
          <div className="hero-cta-buttons">
            <Button 
              variant="primary" 
              size="lg"
              href={hotel.booking_options?.primary_cta_url || hotel.contact?.booking_url}
              className="me-3 mb-2"
            >
              {hotel.booking_options?.primary_cta_label || "Book a Room"}
            </Button>
            
            {hotel.booking_options?.secondary_cta_phone ? (
              <Button 
                variant="outline-light" 
                size="lg"
                href={`tel:${hotel.booking_options.secondary_cta_phone}`}
                className="mb-2"
              >
                <i className="bi bi-telephone me-2"></i>
                Call to Book
              </Button>
            ) : hotel.contact?.website_url && (
              <Button 
                variant="outline-light" 
                size="lg"
                href={hotel.contact.website_url}
                target="_blank"
                className="mb-2"
              >
                Visit Website
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  </div>
</section>
```

## Styling Considerations

```css
.hero-section {
  position: relative;
  width: 100%;
  min-height: 60vh;
}

.hero-background {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
}

.hero-overlay {
  background: rgba(0, 0, 0, 0.4);
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
}

.hero-logo {
  max-width: 200px;
  max-height: 150px;
  object-fit: contain;
}

@media (max-width: 768px) {
  .hero-overlay {
    min-height: 50vh;
  }
  
  .hero-logo {
    max-width: 150px;
  }
}
```

## Acceptance Criteria

- [x] Hero section displays at top of guest hotel page
- [x] Background image from `hero_image_url` covers full width
- [x] Hotel logo, name, tagline, and description rendered correctly
- [x] Primary booking CTA button is prominent and functional
- [x] Secondary CTA displays based on available data
- [x] All buttons link to correct URLs
- [x] Section is fully responsive (mobile, tablet, desktop)
- [x] Text is readable against background image (proper contrast)
- [x] No broken images if URLs are missing

## Dependencies
- Issue #1 completed (API endpoint updated)
- Backend provides `hero_image_url`, `booking_options`, and `contact` data

## Files to Modify
- `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (or create new `HeroSection.jsx`)
- `hotelmate-frontend/src/styles/` (add hero styles)

## Estimated Effort
Medium (3-5 hours)
