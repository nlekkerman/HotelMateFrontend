# Issue #3 — Room Types Section with Pricing and Booking

## Priority: HIGH 🔴

## Title
Implement Room Types Section with Pricing and Individual Booking CTAs

## Description
Create a "Rooms & Suites" section that displays available room types as marketing cards with pricing information and booking buttons. This section should showcase why guests should book each room type.

## Data Structure (from API)

```javascript
room_types: [
  {
    id: 1,
    name: "Deluxe Suite",
    short_description: "Spacious suite with city views",
    image_url: "...",
    max_occupancy: 2,
    bed_setup: "1 King Bed",
    starting_price_from: 150.00,
    currency: "EUR",
    availability_message: "High demand",
    booking_url: "https://..."
  }
]
```

## Requirements

### Section Layout
- Section title: "Rooms & Suites" or similar
- Grid layout: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- Card-based design for each room type

### Room Card Components
Each card must display:

1. **Room Image**
   - From `image_url`
   - Full-width in card
   - Aspect ratio 16:9 or 4:3

2. **Room Name**
   - `name` field as card title

3. **Short Description**
   - `short_description` field

4. **Occupancy Info**
   - Icon + text: "Up to X guests" from `max_occupancy`

5. **Bed Setup** (if available)
   - Icon + text: `bed_setup` (e.g., "1 King Bed")

6. **Pricing**
   - Display format: "From €X/night"
   - Use `starting_price_from` + `currency`
   - Implement proper currency formatting

7. **Availability Badge** (if available)
   - Small badge/tag with `availability_message`
   - Examples: "High demand", "Popular choice", "Limited availability"

8. **Booking CTA**
   - Button label: "Book this room"
   - Link priority:
     - Use room's `booking_url` if exists
     - Else fallback to `booking_options.primary_cta_url`
   - Prominent button at bottom of card

### Empty State
- If no room types exist, hide the section OR
- Show message: "Room information coming soon"

## Component Example

```jsx
// RoomTypesSection.jsx
const RoomTypesSection = ({ hotel }) => {
  const roomTypes = hotel.room_types || [];
  
  if (roomTypes.length === 0) return null;
  
  const formatPrice = (price, currency) => {
    // Format based on currency (EUR -> €, USD -> $, GBP -> £)
    const symbols = { EUR: '€', USD: '$', GBP: '£' };
    const symbol = symbols[currency] || currency;
    return `${symbol}${parseFloat(price).toFixed(0)}`;
  };
  
  return (
    <section className="room-types-section py-5">
      <Container>
        <h2 className="text-center mb-4">Rooms & Suites</h2>
        
        <Row xs={1} md={2} lg={3} className="g-4">
          {roomTypes.map((room) => (
            <Col key={room.id}>
              <Card className="h-100 shadow-sm hover-shadow">
                {room.image_url && (
                  <Card.Img 
                    variant="top" 
                    src={room.image_url} 
                    alt={room.name}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                
                <Card.Body className="d-flex flex-column">
                  <div className="mb-auto">
                    <Card.Title className="fw-bold">{room.name}</Card.Title>
                    
                    {room.availability_message && (
                      <Badge bg="warning" text="dark" className="mb-2">
                        {room.availability_message}
                      </Badge>
                    )}
                    
                    <Card.Text className="text-muted">
                      {room.short_description}
                    </Card.Text>
                    
                    <div className="room-details text-muted small">
                      {room.max_occupancy && (
                        <div>
                          <i className="bi bi-people me-1"></i>
                          Up to {room.max_occupancy} guests
                        </div>
                      )}
                      {room.bed_setup && (
                        <div>
                          <i className="bi bi-moon me-1"></i>
                          {room.bed_setup}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="mb-2">
                      <strong className="text-primary fs-5">
                        From {formatPrice(room.starting_price_from, room.currency)}/night
                      </strong>
                    </div>
                    
                    <Button 
                      variant="primary" 
                      className="w-100"
                      href={room.booking_url || hotel.booking_options?.primary_cta_url}
                      target="_blank"
                    >
                      Book this room
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};
```

## Currency Formatting Function

```javascript
// utils/formatCurrency.js
export const formatCurrency = (amount, currencyCode) => {
  const symbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    // Add more as needed
  };
  
  const symbol = symbols[currencyCode] || currencyCode;
  const formatted = parseFloat(amount).toFixed(0);
  
  // Some currencies use symbol after amount
  const symbolAfter = ['CHF'];
  
  return symbolAfter.includes(currencyCode) 
    ? `${formatted} ${symbol}`
    : `${symbol}${formatted}`;
};
```

## Styling Notes
- Cards should have subtle shadow and hover effect
- Images should have consistent height with object-fit: cover
- Booking button should be full-width within card
- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop

## Acceptance Criteria

- [x] "Rooms & Suites" section displays below hero
- [x] Each room type renders as a card with image, name, description
- [x] Occupancy and bed setup info displayed with icons
- [x] Pricing shows "From €X/night" format with proper currency
- [x] Availability badge shown if `availability_message` exists
- [x] Each card has "Book this room" button
- [x] Button links to `room.booking_url` or falls back to global booking URL
- [x] Section hidden if no room types available
- [x] Grid is fully responsive
- [x] No broken links or images if data is missing

## Dependencies
- Issue #1 completed (API endpoint with `room_types` data)

## Files to Create/Modify
- Create: `hotelmate-frontend/src/components/hotels/RoomTypesSection.jsx`
- Create: `hotelmate-frontend/src/utils/formatCurrency.js`
- Modify: `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (import and render component)

## Estimated Effort
Medium (4-6 hours)
