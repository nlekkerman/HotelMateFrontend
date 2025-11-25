# 🔧 Backend Implementation Guide - Offer Pusher Events

## ⚠️ IMPORTANT
The frontend is now fully implemented and ready. The backend needs these changes to enable real-time updates.

---

## 📍 Location
**File**: `hotel/staff_views.py`  
**Class**: `StaffOfferViewSet` (around line 36)

---

## ✅ Step 1: Add Upload Image Action

Add this method to `StaffOfferViewSet`:

```python
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from chat.utils import pusher_client

@action(detail=True, methods=['post'], url_path='upload-image')
def upload_image(self, request, pk=None, hotel_slug=None):
    """
    Upload or update offer image with Pusher broadcasting.
    
    POST /api/staff/hotel/{slug}/offers/{id}/upload-image/
    
    Body (multipart/form-data):
    - photo: file upload
    """
    try:
        offer = self.get_object()
        
        # Check for file upload
        if 'photo' not in request.FILES:
            return Response(
                {'error': 'No photo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        photo_file = request.FILES['photo']
        
        try:
            # Upload to Cloudinary
            offer.photo = photo_file
            offer.save()
            
            # Get photo URL
            photo_url = None
            if offer.photo:
                try:
                    photo_url = offer.photo.url
                except Exception:
                    photo_url = str(offer.photo)
            
            # ✅ Broadcast update via Pusher
            try:
                hotel_slug = self.request.user.staff_profile.hotel.slug
                pusher_client.trigger(
                    f'hotel-{hotel_slug}',
                    'offer-image-updated',
                    {
                        'offer_id': offer.id,
                        'offer_title': offer.title,
                        'photo_url': photo_url,
                        'timestamp': str(offer.created_at)
                    }
                )
                print(f"[Pusher] Broadcast offer-image-updated for offer {offer.id}")
            except Exception as e:
                print(f"[Pusher] Broadcast failed: {e}")
                pass  # Don't fail if Pusher fails
            
            return Response({
                'message': 'Image uploaded successfully',
                'photo_url': photo_url
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Upload failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'error': f'Request failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

## ✅ Step 2: Override perform_create

Add/update this method in `StaffOfferViewSet`:

```python
def perform_create(self, serializer):
    """Automatically set hotel and broadcast creation"""
    staff = self.request.user.staff_profile
    offer = serializer.save(hotel=staff.hotel)
    
    # Broadcast new offer creation
    try:
        from hotel.serializers import OfferStaffSerializer
        serializer_data = OfferStaffSerializer(offer).data
        pusher_client.trigger(
            f'hotel-{staff.hotel.slug}',
            'offer-created',
            {
                'offer': serializer_data,
                'action': 'created'
            }
        )
        print(f"[Pusher] Broadcast offer-created for offer {offer.id}")
    except Exception as e:
        print(f"[Pusher] Broadcast failed: {e}")
```

---

## ✅ Step 3: Override perform_update

Add this method to `StaffOfferViewSet`:

```python
def perform_update(self, serializer):
    """Broadcast offer updates"""
    offer = serializer.save()
    
    # Broadcast update
    try:
        from hotel.serializers import OfferStaffSerializer
        staff = self.request.user.staff_profile
        serializer_data = OfferStaffSerializer(offer).data
        pusher_client.trigger(
            f'hotel-{staff.hotel.slug}',
            'offer-updated',
            {
                'offer': serializer_data,
                'action': 'updated'
            }
        )
        print(f"[Pusher] Broadcast offer-updated for offer {offer.id}")
    except Exception as e:
        print(f"[Pusher] Broadcast failed: {e}")
```

---

## ✅ Step 4: Override perform_destroy

Add this method to `StaffOfferViewSet`:

```python
def perform_destroy(self, instance):
    """Broadcast offer deletion"""
    offer_id = instance.id
    offer_title = instance.title
    hotel_slug = instance.hotel.slug
    
    instance.delete()
    
    # Broadcast deletion
    try:
        pusher_client.trigger(
            f'hotel-{hotel_slug}',
            'offer-deleted',
            {
                'offer_id': offer_id,
                'offer_title': offer_title,
                'action': 'deleted'
            }
        )
        print(f"[Pusher] Broadcast offer-deleted for offer {offer_id}")
    except Exception as e:
        print(f"[Pusher] Broadcast failed: {e}")
```

---

## 📦 Complete ViewSet Reference

Here's what the complete `StaffOfferViewSet` should look like:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from hotel.models import Offer
from hotel.serializers import OfferStaffSerializer
from hotel.permissions import IsStaffMember, IsSameHotel
from chat.utils import pusher_client


class StaffOfferViewSet(viewsets.ModelViewSet):
    """
    Staff CRUD for hotel offers.
    Scoped to staff's hotel only.
    Real-time updates via Pusher.
    """
    serializer_class = OfferStaffSerializer
    permission_classes = [IsAuthenticated, IsStaffMember, IsSameHotel]
    
    def get_queryset(self):
        """Only return offers for staff's hotel"""
        staff = self.request.user.staff_profile
        return Offer.objects.filter(hotel=staff.hotel).order_by('sort_order', '-created_at')
    
    def perform_create(self, serializer):
        """Automatically set hotel and broadcast creation"""
        staff = self.request.user.staff_profile
        offer = serializer.save(hotel=staff.hotel)
        
        # Broadcast new offer creation
        try:
            serializer_data = OfferStaffSerializer(offer).data
            pusher_client.trigger(
                f'hotel-{staff.hotel.slug}',
                'offer-created',
                {
                    'offer': serializer_data,
                    'action': 'created'
                }
            )
            print(f"[Pusher] Broadcast offer-created for offer {offer.id}")
        except Exception as e:
            print(f"[Pusher] Broadcast failed: {e}")
    
    def perform_update(self, serializer):
        """Broadcast offer updates"""
        offer = serializer.save()
        
        # Broadcast update
        try:
            staff = self.request.user.staff_profile
            serializer_data = OfferStaffSerializer(offer).data
            pusher_client.trigger(
                f'hotel-{staff.hotel.slug}',
                'offer-updated',
                {
                    'offer': serializer_data,
                    'action': 'updated'
                }
            )
            print(f"[Pusher] Broadcast offer-updated for offer {offer.id}")
        except Exception as e:
            print(f"[Pusher] Broadcast failed: {e}")
    
    def perform_destroy(self, instance):
        """Broadcast offer deletion"""
        offer_id = instance.id
        offer_title = instance.title
        hotel_slug = instance.hotel.slug
        
        instance.delete()
        
        # Broadcast deletion
        try:
            pusher_client.trigger(
                f'hotel-{hotel_slug}',
                'offer-deleted',
                {
                    'offer_id': offer_id,
                    'offer_title': offer_title,
                    'action': 'deleted'
                }
            )
            print(f"[Pusher] Broadcast offer-deleted for offer {offer_id}")
        except Exception as e:
            print(f"[Pusher] Broadcast failed: {e}")
    
    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_image(self, request, pk=None, hotel_slug=None):
        """
        Upload or update offer image with Pusher broadcasting.
        
        POST /api/staff/hotel/{slug}/offers/{id}/upload-image/
        
        Body (multipart/form-data):
        - photo: file upload
        """
        try:
            offer = self.get_object()
            
            # Check for file upload
            if 'photo' not in request.FILES:
                return Response(
                    {'error': 'No photo file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            photo_file = request.FILES['photo']
            
            try:
                # Upload to Cloudinary
                offer.photo = photo_file
                offer.save()
                
                # Get photo URL
                photo_url = None
                if offer.photo:
                    try:
                        photo_url = offer.photo.url
                    except Exception:
                        photo_url = str(offer.photo)
                
                # ✅ Broadcast update via Pusher
                try:
                    hotel_slug = self.request.user.staff_profile.hotel.slug
                    pusher_client.trigger(
                        f'hotel-{hotel_slug}',
                        'offer-image-updated',
                        {
                            'offer_id': offer.id,
                            'offer_title': offer.title,
                            'photo_url': photo_url,
                            'timestamp': str(offer.created_at)
                        }
                    )
                    print(f"[Pusher] Broadcast offer-image-updated for offer {offer.id}")
                except Exception as e:
                    print(f"[Pusher] Broadcast failed: {e}")
                    pass  # Don't fail if Pusher fails
                
                return Response({
                    'message': 'Image uploaded successfully',
                    'photo_url': photo_url
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                return Response({
                    'error': f'Upload failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({
                'error': f'Request failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

## 🧪 Testing Backend

### **1. Check Pusher Configuration**

Verify in `chat/utils.py`:
```python
import pusher

pusher_client = pusher.Pusher(
    app_id=settings.PUSHER_APP_ID,
    key=settings.PUSHER_KEY,
    secret=settings.PUSHER_SECRET,
    cluster=settings.PUSHER_CLUSTER,
    ssl=True
)
```

### **2. Test API Endpoints**

```bash
# Test create offer
curl -X POST http://localhost:8000/api/staff/hotel/killarney/offers/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Offer","short_description":"Test","is_active":true}'

# Test upload image
curl -X POST http://localhost:8000/api/staff/hotel/killarney/offers/1/upload-image/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "photo=@/path/to/image.jpg"

# Test update offer
curl -X PATCH http://localhost:8000/api/staff/hotel/killarney/offers/1/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}'

# Test delete offer
curl -X DELETE http://localhost:8000/api/staff/hotel/killarney/offers/1/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### **3. Check Console Logs**

After each operation, you should see in Django console:
```
[Pusher] Broadcast offer-created for offer 1
[Pusher] Broadcast offer-image-updated for offer 1
[Pusher] Broadcast offer-updated for offer 1
[Pusher] Broadcast offer-deleted for offer 1
```

---

## 📊 Pusher Events Reference

| Event | Triggered By | Payload |
|-------|--------------|---------|
| `offer-created` | `perform_create()` | `{ offer: {...}, action: 'created' }` |
| `offer-updated` | `perform_update()` | `{ offer: {...}, action: 'updated' }` |
| `offer-deleted` | `perform_destroy()` | `{ offer_id, offer_title, action: 'deleted' }` |
| `offer-image-updated` | `upload_image()` action | `{ offer_id, offer_title, photo_url, timestamp }` |

**Channel**: `hotel-{hotel_slug}`

---

## ✅ Verification Checklist

- [ ] Added `upload_image` action method
- [ ] Overridden `perform_create` with Pusher broadcast
- [ ] Overridden `perform_update` with Pusher broadcast
- [ ] Overridden `perform_destroy` with Pusher broadcast
- [ ] Imported `pusher_client` from `chat.utils`
- [ ] Imported `OfferStaffSerializer` where needed
- [ ] Tested all 4 operations
- [ ] Verified Pusher logs in console
- [ ] Checked frontend receives events

---

## 🚨 Troubleshooting

### **Issue: Pusher import error**
```python
# Add at top of file
from chat.utils import pusher_client
```

### **Issue: Serializer import error**
```python
# Add at top of file
from hotel.serializers import OfferStaffSerializer
```

### **Issue: No broadcasts happening**
- Check Pusher credentials in `settings.py`
- Check `chat/utils.py` has `pusher_client` initialized
- Check Django console for error messages

### **Issue: Wrong channel name**
- Channel must be: `f'hotel-{hotel_slug}'`
- NOT: `f'hotel_{hotel_slug}'` or `hotel-123`

---

## 📝 Summary

**Status**: Backend changes needed (frontend ready)

**Files to Modify**:
1. `hotel/staff_views.py` - Add 4 methods to `StaffOfferViewSet`

**Total Lines to Add**: ~150 lines

**Time Estimate**: 15-20 minutes

**Impact**: Enables real-time collaboration for offers across all users

---

**Once implemented, the entire offer system will have live updates! 🚀**
