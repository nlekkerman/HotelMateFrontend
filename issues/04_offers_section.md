# Issue #4 — Offers & Packages Section with Book Now CTAs

## Priority: MEDIUM 🟡

## Title
Implement Offers Section with Special Packages and Book Now Buttons

## Description
Create an "Offers & Packages" section to showcase special deals, seasonal offers, and package deals. Each offer should have a prominent "Book now" button linking to its booking URL.

## Data Structure (from API)

```javascript
offers: [
  {
    id: 1,
    title: "Summer Romance Package",
    short_description: "Includes champagne, late checkout, and spa access",
    tag: "Popular",
    valid_from: "2025-06-01",
    valid_to: "2025-08-31",
    book_now_url: "https://booking.hotel.com/offers/summer-romance"
  }
]
```

## Requirements

### Section Layout
- Section title: "Special Offers & Packages"
- Alternative layout from room types (wider cards or different grid)
- Visually distinct from room types (different color scheme/style)

### Offer Card Components
Each offer card must display:

1. **Title**
   - `title` field as card heading
   - Prominent and eye-catching

2. **Tag Badge** (if available)
   - Display `tag` as badge
   - Examples: "Popular", "Limited Time", "Best Value"
   - Use color coding (e.g., gold for Popular, red for Limited Time)

3. **Description**
   - `short_description` field
   - 2-3 lines describing what's included

4. **Validity Period** (if available)
   - Display date range from `valid_from` and `valid_to`
   - Format: "Valid June 1 - August 31, 2025"
   - Hide if dates not provided

5. **Book Now CTA**
   - Prominent button: "Book now"
   - Link to `book_now_url`
   - High contrast color (e.g., accent color different from room bookings)

### Empty State
- If `offers` array is empty or null:
  - Hide section entirely OR
  - Show subtle message: "Check back soon for special offers"

## Component Example

```jsx
// OffersSection.jsx
import React from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';

const OffersSection = ({ hotel }) => {
  const offers = hotel.offers || [];
  
  if (offers.length === 0) return null;
  
  const formatDateRange = (validFrom, validTo) => {
    if (!validFrom || !validTo) return null;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const fromDate = new Date(validFrom).toLocaleDateString('en-US', options);
    const toDate = new Date(validTo).toLocaleDateString('en-US', options);
    
    return `Valid ${fromDate} - ${toDate}`;
  };
  
  const getBadgeVariant = (tag) => {
    const tagLower = tag?.toLowerCase() || '';
    if (tagLower.includes('popular')) return 'warning';
    if (tagLower.includes('limited')) return 'danger';
    if (tagLower.includes('new')) return 'success';
    return 'info';
  };
  
  return (
    <section className="offers-section py-5 bg-light">
      <Container>
        <div className="text-center mb-4">
          <h2 className="mb-2">Special Offers & Packages</h2>
          <p className="text-muted">Discover our exclusive deals and packages</p>
        </div>
        
        <Row xs={1} md={2} className="g-4">
          {offers.map((offer) => (
            <Col key={offer.id}>
              <Card className="h-100 shadow-sm border-0 hover-lift">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Card.Title className="h4 mb-0">{offer.title}</Card.Title>
                    {offer.tag && (
                      <Badge bg={getBadgeVariant(offer.tag)} className="ms-2">
                        {offer.tag}
                      </Badge>
                    )}
                  </div>
                  
                  <Card.Text className="text-muted flex-grow-1">
                    {offer.short_description}
                  </Card.Text>
                  
                  {formatDateRange(offer.valid_from, offer.valid_to) && (
                    <div className="text-muted small mb-3">
                      <i className="bi bi-calendar-event me-2"></i>
                      {formatDateRange(offer.valid_from, offer.valid_to)}
                    </div>
                  )}
                  
                  <Button 
                    variant="success" 
                    size="lg"
                    href={offer.book_now_url}
                    target="_blank"
                    className="w-100"
                  >
                    <i className="bi bi-cart-check me-2"></i>
                    Book now
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default OffersSection;
```

## Styling Notes

```css
.offers-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
}

.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
```

## Visual Distinction from Room Types
- Use different background color (light gradient)
- Use different button color (success/green instead of primary/blue)
- Use 2-column layout instead of 3-column
- Add subtle hover lift effect instead of shadow

## Acceptance Criteria

- [x] "Special Offers & Packages" section displays after room types
- [x] Each offer renders as a card with title, description, tag, dates
- [x] Tag badges have appropriate color coding
- [x] Date range formatted and displayed if available
- [x] "Book now" button on each offer links to `book_now_url`
- [x] Section hidden entirely if no offers exist
- [x] Section visually distinct from room types section
- [x] Cards have hover effects
- [x] Fully responsive layout
- [x] All links open in new tab (target="_blank")

## Dependencies
- Issue #1 completed (API endpoint with `offers` data)

## Files to Create/Modify
- Create: `hotelmate-frontend/src/components/hotels/OffersSection.jsx`
- Modify: `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (import and render)
- Optional: `hotelmate-frontend/src/styles/offers.css`

## Estimated Effort
Small-Medium (2-4 hours)
