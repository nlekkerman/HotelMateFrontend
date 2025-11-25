# Backend Image Upload Fixes - Implementation Guide

## Overview
This guide provides **exact code changes** needed in the backend to fix image upload issues for the HotelMate frontend.

---

## Priority 1: Gallery Image Upload Endpoint

### File: `hotel/staff_views.py`

Add this new view after the existing `HotelPublicSettingsStaffView`:

```python
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import cloudinary.uploader

@method_decorator(csrf_exempt, name='dispatch')
class HotelGalleryImageUploadView(APIView):
    """
    Upload single gallery image to Cloudinary
    Returns URL to be added to gallery JSONField
    """
    permission_classes = [IsAuthenticated, IsStaffMember, IsSameHotel]
    
    def post(self, request, hotel_slug):
        # Verify staff belongs to this hotel
        staff = request.user.staff_profile
        if staff.hotel.slug != hotel_slug:
            return Response(
                {'error': 'You do not have permission to upload images for this hotel'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if image file is provided
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Allowed types: JPG, PNG, WEBP, GIF'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if image_file.size > max_size:
            return Response(
                {'error': 'File size exceeds 5MB limit'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                image_file,
                folder=f"hotels/{hotel_slug}/gallery",
                resource_type="image",
                allowed_formats=['jpg', 'jpeg', 'png', 'webp', 'gif'],
            )
            
            return Response({
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'width': result.get('width'),
                'height': result.get('height'),
                'format': result.get('format'),
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### File: `hotel/staff_urls.py`

Add this route to the urlpatterns:

```python
from hotel.staff_views import HotelGalleryImageUploadView

urlpatterns = [
    # ... existing routes ...
    
    # Gallery image upload
    path('hotel/<str:hotel_slug>/settings/gallery/upload/', 
         HotelGalleryImageUploadView.as_view(), 
         name='gallery-image-upload'),
]
```

### Frontend Usage After Fix

```javascript
// Upload gallery image
const uploadGalleryImage = async (hotelSlug, file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post(
    `/staff/hotel/${hotelSlug}/settings/gallery/upload/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data.url; // Add this URL to gallery array
};

// Then update gallery array
const updateGallery = async (hotelSlug, newUrl) => {
  const currentSettings = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
  const updatedGallery = [...currentSettings.data.gallery, newUrl];
  
  await api.patch(`/staff/hotel/${hotelSlug}/settings/`, {
    gallery: updatedGallery
  });
};
```

---

## Priority 2: Fix Room Type Image Upload Path

### Current Issue
Route is: `/api/staff/hotel/<slug>/hotel/staff/room-types/{id}/upload-image/`
Should be: `/api/staff/hotel/<slug>/room-types/{id}/upload-image/`

### File: `hotel/staff_urls.py`

**Find this section:**
```python
# Current (WRONG) - causes double "hotel" in path
path('hotel/<str:hotel_slug>/<app>/', include(f'{app}.urls'))
```

**Replace with:**
```python
# Remove the app-wrapping pattern that causes "hotel/staff" duplication
# Instead, register room types router directly:

from rest_framework.routers import DefaultRouter
from hotel.staff_views import RoomTypeViewSet

room_types_router = DefaultRouter()
room_types_router.register(r'room-types', RoomTypeViewSet, basename='room-type')

urlpatterns = [
    # Settings
    path('hotel/<str:hotel_slug>/settings/', 
         HotelPublicSettingsStaffView.as_view(), 
         name='hotel-settings'),
    
    # Gallery upload
    path('hotel/<str:hotel_slug>/settings/gallery/upload/', 
         HotelGalleryImageUploadView.as_view(), 
         name='gallery-image-upload'),
    
    # Room Types - Clean path
    path('hotel/<str:hotel_slug>/', include(room_types_router.urls)),
    
    # ... other routes
]
```

**Result:** 
- Upload endpoint becomes: `/api/staff/hotel/<slug>/room-types/{id}/upload-image/`

---

## Priority 3: Clarify Hero/Landing Image Strategy

### Recommended Approach: Use ONLY `HotelPublicSettings`

#### Option A: Deprecate Hotel Model Fields (RECOMMENDED)

**File: `hotel/serializers.py`**

Update `HotelPublicPageSerializer` to ONLY use settings fields:

```python
class HotelPublicPageSerializer(serializers.ModelSerializer):
    # ... other fields ...
    
    hero_image_url = serializers.SerializerMethodField()
    landing_page_image_url = serializers.SerializerMethodField()
    
    def get_hero_image_url(self, obj):
        """Use ONLY HotelPublicSettings.hero_image"""
        try:
            settings = obj.public_settings
            if settings and settings.hero_image:
                return settings.hero_image.url
        except HotelPublicSettings.DoesNotExist:
            pass
        return None
    
    def get_landing_page_image_url(self, obj):
        """Use ONLY HotelPublicSettings.landing_page_image"""
        try:
            settings = obj.public_settings
            if settings and settings.landing_page_image:
                return settings.landing_page_image.url
        except HotelPublicSettings.DoesNotExist:
            pass
        return None
```

**Migration Plan:**
1. Copy existing `Hotel.hero_image` and `Hotel.landing_page_image` to `HotelPublicSettings`
2. Update serializers to use only settings fields
3. Mark Hotel model fields as deprecated
4. Remove Hotel model fields in future release

---

## Priority 4: Add Gallery Management Endpoints

### File: `hotel/staff_views.py`

Add these methods to `HotelPublicSettingsStaffView`:

```python
class HotelGalleryManagementView(APIView):
    """Manage gallery images"""
    permission_classes = [IsAuthenticated, IsStaffMember, IsSameHotel]
    
    def delete(self, request, hotel_slug):
        """Remove image from gallery"""
        url = request.data.get('url')
        if not url:
            return Response({'error': 'URL is required'}, status=400)
        
        staff = request.user.staff_profile
        if staff.hotel.slug != hotel_slug:
            return Response({'error': 'Permission denied'}, status=403)
        
        try:
            settings = HotelPublicSettings.objects.get(hotel__slug=hotel_slug)
            gallery = settings.gallery or []
            
            if url not in gallery:
                return Response({'error': 'URL not found in gallery'}, status=404)
            
            # Remove URL from gallery
            gallery.remove(url)
            settings.gallery = gallery
            settings.save()
            
            # Optional: Delete from Cloudinary
            # Extract public_id from URL and call cloudinary.uploader.destroy()
            
            return Response({'gallery': gallery}, status=200)
            
        except HotelPublicSettings.DoesNotExist:
            return Response({'error': 'Settings not found'}, status=404)
    
    def post(self, request, hotel_slug):
        """Reorder gallery images"""
        new_order = request.data.get('gallery')
        if not isinstance(new_order, list):
            return Response({'error': 'Gallery must be an array'}, status=400)
        
        staff = request.user.staff_profile
        if staff.hotel.slug != hotel_slug:
            return Response({'error': 'Permission denied'}, status=403)
        
        try:
            settings = HotelPublicSettings.objects.get(hotel__slug=hotel_slug)
            settings.gallery = new_order
            settings.save()
            
            return Response({'gallery': new_order}, status=200)
            
        except HotelPublicSettings.DoesNotExist:
            return Response({'error': 'Settings not found'}, status=404)
```

### File: `hotel/staff_urls.py`

```python
urlpatterns = [
    # ... existing routes ...
    
    # Gallery management
    path('hotel/<str:hotel_slug>/settings/gallery/manage/', 
         HotelGalleryManagementView.as_view(), 
         name='gallery-manage'),
]
```

---

## Testing Checklist

### Test Gallery Upload
```bash
# Upload image
curl -X POST http://localhost:8000/api/staff/hotel/test-hotel/settings/gallery/upload/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"

# Expected response:
{
  "url": "https://res.cloudinary.com/.../image.jpg",
  "public_id": "hotels/test-hotel/gallery/abc123"
}
```

### Test Room Type Image Upload
```bash
# Upload room image
curl -X POST http://localhost:8000/api/staff/hotel/test-hotel/room-types/1/upload-image/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "photo=@/path/to/room.jpg"

# Expected response:
{
  "id": 1,
  "photo_url": "https://res.cloudinary.com/.../room.jpg"
}
```

### Test Gallery Management
```bash
# Remove from gallery
curl -X DELETE http://localhost:8000/api/staff/hotel/test-hotel/settings/gallery/manage/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://res.cloudinary.com/.../image.jpg"}'

# Reorder gallery
curl -X POST http://localhost:8000/api/staff/hotel/test-hotel/settings/gallery/manage/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gallery": ["url1", "url2", "url3"]}'
```

---

## Summary of API Endpoints After Fixes

### New Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/staff/hotel/<slug>/settings/gallery/upload/` | Upload gallery image |
| DELETE | `/api/staff/hotel/<slug>/settings/gallery/manage/` | Remove from gallery |
| POST | `/api/staff/hotel/<slug>/settings/gallery/manage/` | Reorder gallery |

### Fixed Endpoints
| Method | Endpoint | What Changed |
|--------|----------|--------------|
| POST | `/api/staff/hotel/<slug>/room-types/{id}/upload-image/` | Removed redundant `/hotel/staff/` |

### Clarified Strategy
- **Hero Image**: Use `HotelPublicSettings.hero_image` ONLY
- **Landing Image**: Use `HotelPublicSettings.landing_page_image` ONLY
- Deprecate `Hotel.hero_image` and `Hotel.landing_page_image`

---

## Implementation Order

1. ✅ **Add gallery upload endpoint** (Priority 1) - BLOCKER
2. ✅ **Fix room type URL routing** (Priority 2) - IMPROVEMENT
3. ✅ **Clarify hero/landing strategy** (Priority 3) - DOCUMENTATION
4. ⏳ **Add gallery management** (Priority 4) - ENHANCEMENT

---

## Notes for Backend Developer

- All image uploads should go to Cloudinary
- Use folder structure: `hotels/{hotel_slug}/gallery/`, `hotels/{hotel_slug}/rooms/`
- Validate file types: JPG, PNG, WEBP, GIF
- Validate file size: Max 5MB
- Always verify staff permissions before upload
- Return Cloudinary secure_url in response
- Consider adding image optimization/resizing

---

**Last Updated**: November 25, 2025
**Status**: Ready for Backend Implementation
