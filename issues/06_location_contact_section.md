# Issue #6 — Location & Contact Information Section

## Priority: MEDIUM 🟡

## Title
Implement Location and Contact Information Section with Map and Footer Booking CTA

## Description
Create a comprehensive location and contact section displaying the hotel's address, contact methods, and an optional map. Include a final footer booking CTA to encourage conversions before users leave the page.

## Data Structure (from API)

```javascript
{
  city: "Paris",
  country: "France",
  address: {
    street: "123 Champs-Élysées",
    postal_code: "75008",
    // ... other address fields
  },
  location: {
    latitude: 48.8566,
    longitude: 2.3522
  },
  contact: {
    phone: "+33 1 23 45 67 89",
    email: "info@hotel.com",
    website_url: "https://hotel.com",
    booking_url: "https://booking.hotel.com"
  },
  booking_options: {
    primary_cta_label: "Book Your Stay",
    primary_cta_url: "https://..."
  }
}
```

## Requirements

### Section 1: Location & Address

Display:
- City and country with icon
- Full address (street, postal code, etc.)
- Optional map preview using lat/lng coordinates

Map Options:
1. **Embedded Google Map** (if API key available)
2. **Static map image** link
3. **"View on Map" button** linking to Google Maps
   - Format: `https://www.google.com/maps?q=${lat},${lng}`

### Section 2: Contact Methods

Display three contact options:

1. **Phone**
   - Icon + formatted phone number
   - Clickable `tel:` link
   - Example: "+33 1 23 45 67 89"

2. **Email**
   - Icon + email address
   - Clickable `mailto:` link
   - Example: "info@hotel.com"

3. **Website**
   - Icon + "Visit our website" text
   - Link to `contact.website_url`
   - Opens in new tab

### Section 3: Footer Booking CTA

Final call-to-action before footer:
- Large centered button: "Book Your Stay"
- Uses `booking_options.primary_cta_url` or `contact.booking_url`
- Prominent styling matching hero CTA
- Includes subtitle: "Ready to experience {hotel.name}?"

## Component Example

```jsx
// LocationContactSection.jsx
import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

const LocationContactSection = ({ hotel }) => {
  const { city, country, address, location, contact, booking_options } = hotel;
  
  const getGoogleMapsUrl = () => {
    if (location?.latitude && location?.longitude) {
      return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    }
    return null;
  };
  
  const formatAddress = () => {
    if (!address) return null;
    return [
      address.street,
      `${address.postal_code || ''} ${city || ''}`.trim(),
      country
    ].filter(Boolean).join(', ');
  };
  
  return (
    <section className="location-contact-section py-5 bg-white">
      <Container>
        {/* Location & Address */}
        <Row className="mb-5">
          <Col lg={6} className="mb-4 mb-lg-0">
            <h3 className="mb-4">
              <i className="bi bi-geo-alt me-2"></i>
              Location
            </h3>
            
            {(city || country) && (
              <h5 className="mb-3">{city}, {country}</h5>
            )}
            
            {formatAddress() && (
              <p className="text-muted mb-3">{formatAddress()}</p>
            )}
            
            {getGoogleMapsUrl() && (
              <Button 
                variant="outline-primary"
                href={getGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-map me-2"></i>
                View on Map
              </Button>
            )}
          </Col>
          
          {/* Contact Methods */}
          <Col lg={6}>
            <h3 className="mb-4">
              <i className="bi bi-telephone me-2"></i>
              Contact Us
            </h3>
            
            <div className="d-flex flex-column gap-3">
              {contact?.phone && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-telephone-fill me-2 text-primary"></i>
                      Phone
                    </h6>
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-decoration-none fs-5"
                    >
                      {contact.phone}
                    </a>
                  </Card.Body>
                </Card>
              )}
              
              {contact?.email && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-envelope-fill me-2 text-primary"></i>
                      Email
                    </h6>
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-decoration-none fs-5"
                    >
                      {contact.email}
                    </a>
                  </Card.Body>
                </Card>
              )}
              
              {contact?.website_url && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-globe me-2 text-primary"></i>
                      Website
                    </h6>
                    <a 
                      href={contact.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-decoration-none fs-5"
                    >
                      Visit our website
                      <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                    </a>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Col>
        </Row>
        
        {/* Footer Booking CTA */}
        <Row>
          <Col>
            <Card className="bg-primary text-white text-center border-0 shadow-lg">
              <Card.Body className="py-5">
                <h2 className="mb-3">Ready to experience {hotel.name}?</h2>
                <p className="lead mb-4">
                  Book your stay today and enjoy our exceptional hospitality
                </p>
                <Button 
                  variant="light"
                  size="lg"
                  href={booking_options?.primary_cta_url || contact?.booking_url}
                  target="_blank"
                  className="px-5 py-3"
                >
                  <i className="bi bi-calendar-check me-2"></i>
                  {booking_options?.primary_cta_label || "Book Your Stay"}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default LocationContactSection;
```

## Optional: Embedded Map

If you want to embed a map instead of just a link:

```jsx
{location?.latitude && location?.longitude && (
  <div className="map-container mb-3" style={{ height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
    <iframe
      title="Hotel Location"
      width="100%"
      height="100%"
      frameBorder="0"
      src={`https://www.google.com/maps?q=${location.latitude},${location.longitude}&output=embed`}
    />
  </div>
)}
```

## Acceptance Criteria

- [x] Location section displays city, country, and full address
- [x] "View on Map" button links to Google Maps with coordinates
- [x] Contact section shows phone, email, and website
- [x] Phone number is clickable (tel: link)
- [x] Email is clickable (mailto: link)
- [x] Website opens in new tab
- [x] Footer booking CTA is prominent and matches hero CTA
- [x] Footer CTA uses correct booking URL
- [x] Section is fully responsive
- [x] No errors if optional fields are missing

## Dependencies
- Issue #1 completed (API endpoint with location and contact data)

## Files to Create/Modify
- Create: `hotelmate-frontend/src/components/hotels/LocationContactSection.jsx`
- Modify: `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (import and render)

## Estimated Effort
Small-Medium (3-4 hours)
