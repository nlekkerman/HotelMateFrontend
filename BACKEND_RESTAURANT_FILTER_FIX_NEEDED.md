# Backend Fix Needed: Restaurant Filtering

## Issue
The endpoint `/bookings/{hotel_slug}/restaurants/` is returning restaurants from **all hotels** instead of filtering by the `hotel_slug` in the URL.

## Current Behavior
```
GET /bookings/hotel-killarney/restaurants/

Returns:
- Restaurant 1: hotel_slug: "the-great-southern-hotel" ❌
- Restaurant 2: hotel_slug: "hotel-killarney" ✅
- Restaurant 3: hotel_slug: "other-hotel" ❌
```

## Expected Behavior
```
GET /bookings/hotel-killarney/restaurants/

Should ONLY return:
- Restaurant 2: hotel_slug: "hotel-killarney" ✅
```

## Backend Fix Required

In your Django view for restaurant listing, add filtering by hotel slug:

```python
class RestaurantViewSet(viewsets.ModelViewSet):
    # ...
    
    def list(self, request, hotel_slug=None):
        if hotel_slug:
            # Filter restaurants by hotel slug
            queryset = Restaurant.objects.filter(
                hotel__slug=hotel_slug,
                is_active=True
            )
        else:
            queryset = Restaurant.objects.filter(is_active=True)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

Or in your URL routing, ensure the viewset is properly scoped:

```python
# In urls.py
router.register(
    r'bookings/(?P<hotel_slug>[\w-]+)/restaurants',
    RestaurantViewSet,
    basename='hotel-restaurants'
)
```

## Temporary Frontend Fix Applied

Added client-side filtering in `useRestaurants.js`:
```javascript
const filteredData = data.filter(restaurant => 
    restaurant.hotel_slug === hotelSlug
);
```

**This is a workaround.** The backend should be fixed to prevent:
- Unnecessary data transfer
- Security concerns (seeing other hotels' data)
- Performance issues with large datasets

## Related Files
- Frontend: `src/components/restaurants/hooks/useRestaurants.js`
- Backend: Check your restaurant viewset/view in Django

## Priority
**HIGH** - This is a security and data isolation issue.
