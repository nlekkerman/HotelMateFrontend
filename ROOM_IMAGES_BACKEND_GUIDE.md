# Room Images Backend Implementation Guide

## Overview
This guide explains how to add image support for room type cards on the public hotel page.

---

## Backend Requirements

### 1. Database Model

Ensure your `RoomType` model has a field for storing the image URL:

```python
# models.py
from django.db import models

class RoomType(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='room_types')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    short_description = models.TextField(blank=True, null=True)
    
    # Image field - add this if missing
    photo_url = models.URLField(max_length=500, blank=True, null=True)
    # OR if you prefer file upload:
    # photo = models.ImageField(upload_to='rooms/', blank=True, null=True)
    
    max_occupancy = models.IntegerField(default=2)
    bed_setup = models.CharField(max_length=100, blank=True)
    starting_price_from = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, default='EUR')
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.hotel.name} - {self.name}"
```

**If you need to add this field to existing database:**
```bash
python manage.py makemigrations
python manage.py migrate
```

---

### 2. Serializer

Update your serializer to include the image field:

```python
# serializers.py
from rest_framework import serializers
from .models import RoomType

class RoomTypeSerializer(serializers.ModelSerializer):
    # If using ImageField, add this to get full URL
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomType
        fields = [
            'id',
            'name',
            'code',
            'short_description',
            'photo_url',  # ← Include this
            'max_occupancy',
            'bed_setup',
            'starting_price_from',
            'currency',
            'availability_message',  # Optional
        ]
    
    def get_photo_url(self, obj):
        """Return full URL for photo"""
        if obj.photo_url:
            return obj.photo_url
        elif hasattr(obj, 'photo') and obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None
```

---

### 3. Public Hotel API View

Ensure your public hotel endpoint includes room types with images:

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Hotel, RoomType
from .serializers import RoomTypeSerializer

class HotelPublicPageView(APIView):
    """
    Public endpoint for hotel page data
    GET /api/hotel/public/page/<slug>/
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request, slug):
        hotel = get_object_or_404(Hotel, slug=slug)
        
        # Get active room types
        room_types = RoomType.objects.filter(
            hotel=hotel,
            is_active=True  # Add this field if you want to hide certain rooms
        ).select_related('hotel')
        
        # Serialize room types
        room_types_data = RoomTypeSerializer(
            room_types, 
            many=True,
            context={'request': request}  # Important for building absolute URLs
        ).data
        
        return Response({
            'id': hotel.id,
            'name': hotel.name,
            'slug': hotel.slug,
            'short_description': hotel.short_description,
            'city': hotel.city,
            'country': hotel.country,
            'hero_image_url': hotel.hero_image_url,
            'logo_url': hotel.logo_url,
            'tagline': hotel.tagline,
            'room_types': room_types_data,  # ← Room types with images
            # ... other fields
        })
```

---

### 4. URL Configuration

```python
# urls.py
from django.urls import path
from .views import HotelPublicPageView

urlpatterns = [
    path('hotel/public/page/<slug:slug>/', HotelPublicPageView.as_view(), name='hotel-public-page'),
    # ... other URLs
]
```

---

### 5. Admin Panel (Optional)

Make it easy to manage room images in Django admin:

```python
# admin.py
from django.contrib import admin
from .models import RoomType

@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'hotel', 'max_occupancy', 'starting_price_from', 'has_photo']
    list_filter = ['hotel', 'max_occupancy']
    search_fields = ['name', 'code', 'hotel__name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('hotel', 'name', 'code', 'short_description')
        }),
        ('Image', {
            'fields': ('photo_url',)
        }),
        ('Details', {
            'fields': ('max_occupancy', 'bed_setup', 'starting_price_from', 'currency')
        }),
    )
    
    def has_photo(self, obj):
        return bool(obj.photo_url)
    has_photo.boolean = True
    has_photo.short_description = 'Has Photo'
```

---

## Expected API Response

When the frontend calls `/api/hotel/public/page/hotel-killarney/`, it should receive:

```json
{
  "id": 1,
  "name": "Hotel Killarney",
  "slug": "hotel-killarney",
  "short_description": "A favourite for families...",
  "city": "Killarney",
  "country": "Ireland",
  "hero_image_url": "https://res.cloudinary.com/.../hero.jpg",
  "room_types": [
    {
      "id": 1,
      "name": "Deluxe Double Room",
      "code": "DLX",
      "short_description": "Spacious room with king-size bed and mountain views.",
      "photo_url": "https://res.cloudinary.com/.../deluxe-room.jpg",
      "max_occupancy": 2,
      "bed_setup": "1 King Bed",
      "starting_price_from": "129.00",
      "currency": "EUR",
      "availability_message": null
    },
    {
      "id": 2,
      "name": "Standard Room",
      "code": "STD",
      "short_description": "Comfortable room with modern amenities",
      "photo_url": "https://res.cloudinary.com/.../standard-room.jpg",
      "max_occupancy": 2,
      "bed_setup": "Queen Bed",
      "starting_price_from": "89.00",
      "currency": "EUR",
      "availability_message": null
    }
  ]
}
```

---

## Testing

### 1. Test in Django Shell
```python
python manage.py shell

from apps.hotels.models import RoomType
from apps.hotels.serializers import RoomTypeSerializer

# Get a room type
room = RoomType.objects.first()

# Add an image URL
room.photo_url = "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"
room.save()

# Serialize and check output
serializer = RoomTypeSerializer(room)
print(serializer.data)
```

### 2. Test API Endpoint
```bash
curl http://localhost:8000/api/hotel/public/page/hotel-killarney/
```

Or visit in browser:
```
http://localhost:8000/api/hotel/public/page/hotel-killarney/
```

Check that `room_types` array contains `photo_url` field for each room.

---

## Adding Sample Images

### Quick Test URLs (Unsplash)
```python
# In Django shell or admin
room1 = RoomType.objects.get(code='DLX')
room1.photo_url = "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"
room1.save()

room2 = RoomType.objects.get(code='STD')
room2.photo_url = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800"
room2.save()

room3 = RoomType.objects.get(code='FAM')
room3.photo_url = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
room3.save()
```

---

## Frontend Integration

**The frontend is already ready!** Once your backend returns `photo_url` in the room_types array:

✅ Room cards on public page will display images automatically
✅ Fallback images are shown if `photo_url` is missing
✅ Error handling for broken image links
✅ Responsive design for all screen sizes

**Frontend checks for:**
- `room.photo_url` (primary)
- `room.photo` (fallback)
- Default placeholder if neither exists

---

## Summary Checklist

- [ ] Add `photo_url` field to `RoomType` model
- [ ] Run migrations if needed
- [ ] Include `photo_url` in serializer
- [ ] Ensure public API endpoint returns room_types with images
- [ ] Test API response in browser/Postman
- [ ] Add image URLs to existing room types
- [ ] Verify images appear on frontend

---

## Need Help?

If images still don't show:
1. Check browser console for errors
2. Verify API response includes `photo_url`
3. Test image URL directly in browser
4. Check CORS settings if using external images
5. Ensure URL is valid and accessible

The frontend will automatically display images once the backend provides them!
