# Issue #5 — Leisure Activities & Facilities Section

## Priority: MEDIUM 🟡

## Title
Implement Leisure Activities and Facilities Section

## Description
Create a section showcasing the hotel's leisure activities and facilities. This section helps guests understand what amenities and activities are available during their stay.

## Data Structure (from API)

```javascript
leisure_activities: [
  {
    id: 1,
    name: "Spa & Wellness Center",
    category: "Wellness",
    short_description: "Full-service spa with massage, sauna, and steam rooms",
    icon_url: null, // optional
    image_url: "..." // optional
  },
  {
    id: 2,
    name: "Kids Club",
    category: "Family",
    short_description: "Supervised activities for children ages 4-12",
    icon_url: null,
    image_url: "..."
  }
]
```

## Categories
Expected category values:
- **Wellness** (spa, gym, yoga)
- **Family** (kids club, playground)
- **Dining** (restaurants, bars)
- **Recreation** (pool, sports, activities)
- **Business** (meeting rooms, business center)
- **Other**

## Requirements

### Section Layout
- Section title: "Leisure & Facilities" or "What We Offer"
- Grid or list layout depending on design preference
- Icon-based design with category grouping (optional)

### Activity Card Components
Each activity must display:

1. **Icon/Image**
   - If `icon_url` exists, use icon
   - Else if `image_url` exists, use thumbnail image
   - Else use default icon based on `category`

2. **Activity Name**
   - `name` field as title

3. **Category Badge**
   - Display `category` as a small label/badge
   - Use color coding per category:
     - Wellness → purple
     - Family → orange
     - Dining → green
     - Recreation → blue
     - Business → gray

4. **Description**
   - `short_description` field

### Interaction (Optional Enhancement)
- Simple read-only cards OR
- Expandable/accordion for more details (future enhancement)

### Empty State
- If no leisure activities, hide section OR
- Show message: "Contact us to learn about our facilities"

## Component Example

```jsx
// LeisureActivitiesSection.jsx
import React from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';

const LeisureActivitiesSection = ({ hotel }) => {
  const activities = hotel.leisure_activities || [];
  
  if (activities.length === 0) return null;
  
  const getCategoryColor = (category) => {
    const colors = {
      Wellness: 'purple',
      Family: 'orange',
      Dining: 'success',
      Recreation: 'primary',
      Business: 'secondary',
    };
    return colors[category] || 'info';
  };
  
  const getCategoryIcon = (category) => {
    const icons = {
      Wellness: 'heart-pulse',
      Family: 'people',
      Dining: 'cup-hot',
      Recreation: 'water',
      Business: 'briefcase',
    };
    return icons[category] || 'star';
  };
  
  return (
    <section className="leisure-activities-section py-5">
      <Container>
        <div className="text-center mb-5">
          <h2 className="mb-2">Leisure & Facilities</h2>
          <p className="text-muted">Explore what makes your stay special</p>
        </div>
        
        <Row xs={1} md={2} lg={3} className="g-4">
          {activities.map((activity) => (
            <Col key={activity.id}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-start mb-3">
                    <div 
                      className="activity-icon me-3"
                      style={{ 
                        fontSize: '2rem',
                        color: `var(--bs-${getCategoryColor(activity.category)})`
                      }}
                    >
                      <i className={`bi bi-${getCategoryIcon(activity.category)}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <Card.Title className="h5 mb-2">{activity.name}</Card.Title>
                      <Badge 
                        bg={getCategoryColor(activity.category)}
                        className="mb-2"
                      >
                        {activity.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <Card.Text className="text-muted">
                    {activity.short_description}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default LeisureActivitiesSection;
```

## Alternative Layout Option: Icon Grid

```jsx
// More compact icon-based layout
<Row xs={2} md={3} lg={4} className="g-3">
  {activities.map((activity) => (
    <Col key={activity.id}>
      <div className="text-center p-3 border rounded hover-bg-light">
        <i className={`bi bi-${getCategoryIcon(activity.category)} fs-1 mb-2`}></i>
        <h6 className="mb-1">{activity.name}</h6>
        <small className="text-muted d-block">{activity.category}</small>
      </div>
    </Col>
  ))}
</Row>
```

## Icon Mapping Strategy

If `icon_url` is not provided, map categories to Bootstrap Icons:

| Category | Icon |
|----------|------|
| Wellness | `heart-pulse`, `spa` |
| Family | `people`, `balloon-heart` |
| Dining | `cup-hot`, `egg-fried` |
| Recreation | `water`, `bicycle` |
| Business | `briefcase`, `building` |
| Other | `star`, `building-check` |

## Acceptance Criteria

- [x] "Leisure & Facilities" section displays after offers
- [x] Each activity shows icon/image, name, category, and description
- [x] Category badges use consistent color coding
- [x] Default icons used when no icon_url provided
- [x] Grid layout is responsive (1-2-3 columns)
- [x] Section hidden if no activities exist
- [x] Cards have subtle shadow and clean design
- [x] No errors if optional fields (icon_url, image_url) are missing

## Dependencies
- Issue #1 completed (API endpoint with `leisure_activities` data)

## Files to Create/Modify
- Create: `hotelmate-frontend/src/components/hotels/LeisureActivitiesSection.jsx`
- Modify: `hotelmate-frontend/src/sections/GuestHotelHome.jsx` (import and render)

## Estimated Effort
Small-Medium (2-3 hours)
