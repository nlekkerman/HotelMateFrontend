# Issue #7 — Guest Portal Access PIN Stub

## Priority: LOW 🟢

## Title
Add "Already Staying?" PIN Access Stub at Bottom of Public Hotel Page

## Description
Add a small, non-intrusive section at the bottom of the public hotel page for guests who are already staying at the hotel. This section prompts them to access their personalized guest portal using a PIN code.

This is a **stub/placeholder** for Phase 2. It should NOT implement actual PIN validation logic yet - just the UI and a "Coming soon" state or placeholder route.

## Requirements

### Placement
- At the very bottom of the public hotel page
- Above the footer or as part of footer
- Visually separated from booking content

### Content
1. **Text prompt:** "Already staying with us?"
2. **Subtext (optional):** "Access your personalized guest portal"
3. **Button:** "Access your stay (PIN required)"

### Behavior (Phase 1 - Stub Only)
- Clicking the button should either:
  - **Option A:** Navigate to placeholder route (e.g., `/h/:hotelSlug/guest-access`)
  - **Option B:** Show a modal with "Coming soon" message
  - **Option C:** Show inline message: "Guest portal coming soon"

Do NOT implement:
- ❌ Actual PIN input
- ❌ PIN validation
- ❌ Guest authentication
- ❌ Redirect to guest dashboard

## Component Example

```jsx
// GuestPortalStub.jsx
import React, { useState } from 'react';
import { Container, Card, Button, Modal } from 'react-bootstrap';

const GuestPortalStub = ({ hotel }) => {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <section className="guest-portal-stub py-4 bg-light border-top">
        <Container>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body className="py-4">
              <h5 className="mb-2">Already staying with us?</h5>
              <p className="text-muted mb-3">
                Access your personalized guest portal with your room PIN
              </p>
              <Button 
                variant="outline-primary"
                onClick={() => setShowModal(true)}
              >
                <i className="bi bi-key me-2"></i>
                Access your stay (PIN required)
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </section>
      
      {/* Coming Soon Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Guest Portal</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <i className="bi bi-hourglass-split text-muted" style={{ fontSize: '3rem' }}></i>
          <h5 className="mt-3">Coming Soon</h5>
          <p className="text-muted">
            The guest portal will be available soon. Please contact reception for assistance.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GuestPortalStub;
```

## Alternative: Link to Placeholder Route

```jsx
// Instead of modal, link to a placeholder page
<Button 
  variant="outline-primary"
  as={Link}
  to={`/h/${hotel.slug}/guest-access`}
>
  <i className="bi bi-key me-2"></i>
  Access your stay (PIN required)
</Button>

// Create placeholder route in App.jsx:
<Route path="/h/:hotelSlug/guest-access" element={<GuestAccessPlaceholder />} />

// GuestAccessPlaceholder.jsx
const GuestAccessPlaceholder = () => {
  const { hotelSlug } = useParams();
  
  return (
    <Container className="py-5 text-center">
      <i className="bi bi-hourglass-split text-muted" style={{ fontSize: '4rem' }}></i>
      <h2 className="mt-4">Guest Portal Coming Soon</h2>
      <p className="lead text-muted mb-4">
        We're working on bringing you a personalized guest experience.
      </p>
      <Link to={`/h/${hotelSlug}`} className="btn btn-primary">
        <i className="bi bi-arrow-left me-2"></i>
        Back to Hotel Page
      </Link>
    </Container>
  );
};
```

## Design Notes
- Should NOT be visually prominent (don't distract from booking)
- Subtle styling (outline button, not solid)
- Clearly labeled as requiring PIN
- Positioned last so it doesn't interfere with booking flow

## Acceptance Criteria

- [x] "Already staying with us?" section appears at bottom of public hotel page
- [x] Section includes descriptive text about guest portal
- [x] Button labeled "Access your stay (PIN required)"
- [x] Clicking button shows "Coming soon" message (modal OR placeholder page)
- [x] Does NOT implement actual PIN validation
- [x] Visually subtle and non-intrusive
- [x] Responsive on mobile and desktop

## Future Implementation (Phase 2)
In Phase 2, this button will:
- Open a PIN input form
- Validate PIN against backend
- Authenticate guest
- Redirect to personalized guest dashboard

## Dependencies
None (can be implemented independently)

## Files to Create/Modify
- Create: `hotelmate-frontend/src/components/hotels/GuestPortalStub.jsx`
- Optional: Create placeholder route and component
- Modify: `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (render at bottom)

## Estimated Effort
Very Small (1-2 hours)
