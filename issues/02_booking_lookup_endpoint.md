# Booking Lookup Endpoint - Backend Implementation Required

## Priority: MEDIUM 🟡

## Overview
The frontend booking system needs a backend endpoint to allow users to look up their bookings by email or confirmation number. Currently, bookings are stored only in localStorage, which is not persistent across devices or browsers.

## Required Endpoint

### GET `/api/bookings/lookup/`

**Purpose**: Allow users to retrieve their booking information without authentication

**Query Parameters**:
- `email` (optional): Guest email address
- `confirmation_number` (optional): Booking confirmation number
- At least one parameter must be provided

**Example Requests**:
```
GET /api/bookings/lookup/?email=john@example.com
GET /api/bookings/lookup/?confirmation_number=HOT-2025-1DAE
GET /api/bookings/lookup/?email=john@example.com&confirmation_number=HOT-2025-1DAE
```

## Response Format

### Success Response (200 OK)
```json
{
  "bookings": [
    {
      "booking_id": "BK-2025-C66B9B",
      "confirmation_number": "HOT-2025-1DAE",
      "status": "CONFIRMED",
      "hotel": {
        "slug": "hotel-killarney",
        "name": "Hotel Killarney",
        "phone": "+353 64 663 1555",
        "email": "info@hotelkillarney.ie",
        "address_line_1": "123 Main Street"
      },
      "room": {
        "type": "Family Suite",
        "code": "Family Suite"
      },
      "dates": {
        "check_in": "2025-11-24",
        "check_out": "2025-11-26",
        "nights": 2
      },
      "guests": {
        "adults": 2,
        "children": 0,
        "total": 2
      },
      "guest": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+353 87 123 4567"
      },
      "pricing": {
        "subtotal": "378.00",
        "taxes": "34.02",
        "discount": "0.00",
        "total": "412.02",
        "currency": "EUR"
      },
      "special_requests": "",
      "created_at": "2025-11-24T13:36:49.328371+00:00",
      "payment_required": false
    }
  ]
}
```

### Error Responses

**400 Bad Request** - Missing parameters
```json
{
  "error": "Either email or confirmation_number must be provided"
}
```

**404 Not Found** - No bookings found
```json
{
  "error": "No bookings found matching the provided criteria"
}
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting to prevent abuse (e.g., 10 requests per minute per IP)

2. **Email Verification**: For sensitive operations (cancellation, modifications), require email verification or booking PIN

3. **Data Exposure**: Only return bookings that match BOTH email AND confirmation number if both are provided

4. **PII Protection**: Ensure guest information is only returned to the rightful booking owner

## Frontend Integration

The frontend will use this endpoint in the **My Bookings** page:

```javascript
// User enters email or confirmation number
const lookupBooking = async (email, confirmationNumber) => {
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (confirmationNumber) params.append('confirmation_number', confirmationNumber);
  
  const response = await api.get(`/bookings/lookup/?${params.toString()}`);
  return response.data.bookings;
};
```

## Database Query Requirements

The endpoint should query the Booking model with:
- Case-insensitive email search
- Exact match on confirmation_number
- Order by created_at descending (newest first)
- Include related hotel, room, and guest information

## Testing Scenarios

1. ✅ Lookup by valid email returns all bookings for that email
2. ✅ Lookup by valid confirmation number returns that specific booking
3. ✅ Lookup with both email and confirmation returns booking only if both match
4. ❌ Lookup with invalid email returns 404
5. ❌ Lookup with invalid confirmation number returns 404
6. ❌ Lookup without parameters returns 400
7. ✅ Rate limiting triggers after excessive requests

## Additional Features (Optional)

### Booking Cancellation Endpoint
```
POST /api/bookings/lookup/cancel/
{
  "booking_id": "BK-2025-C66B9B",
  "email": "john@example.com",
  "confirmation_number": "HOT-2025-1DAE"
}
```

### Email Resend Endpoint
```
POST /api/bookings/lookup/resend-confirmation/
{
  "booking_id": "BK-2025-C66B9B",
  "email": "john@example.com"
}
```

## Implementation Checklist

- [ ] Create `/api/bookings/lookup/` GET endpoint
- [ ] Implement query parameter validation
- [ ] Add case-insensitive email search
- [ ] Include related hotel, room, and guest data
- [ ] Implement rate limiting (10 req/min per IP)
- [ ] Add comprehensive error handling
- [ ] Write unit tests for all scenarios
- [ ] Test with frontend integration
- [ ] Document API in Swagger/OpenAPI
- [ ] Add logging for security monitoring

## Related Files

**Frontend**:
- `hotelmate-frontend/src/pages/bookings/MyBookingsPage.jsx`
- `hotelmate-frontend/src/pages/bookings/BookingPaymentSuccess.jsx`
- `hotelmate-frontend/src/components/hotels/HeroSection.jsx`

**Backend** (to be created):
- `views.py` - Add `BookingLookupView`
- `urls.py` - Add `/api/bookings/lookup/` route
- `serializers.py` - Add `BookingLookupSerializer`

## Dependencies
- Backend must have Booking model with email and confirmation_number fields
- Email must be stored in plaintext or searchable format
- Confirmation numbers must be unique

## Estimated Effort
Medium (2-3 hours for basic implementation + testing)
