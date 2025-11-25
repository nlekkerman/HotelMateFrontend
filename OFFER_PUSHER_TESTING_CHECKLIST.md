# 🧪 Offer Pusher Implementation - Testing Checklist

## ✅ Pre-Testing Setup

### **Environment Variables**
Verify these are set in `.env`:
```env
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=eu  # or your cluster
VITE_API_URL=http://localhost:8000/api
```

### **Backend Requirements**
- [ ] Backend has Pusher configured in `chat/utils.py`
- [ ] Backend has all 4 methods implemented (see `BACKEND_OFFER_PUSHER_GUIDE.md`)
- [ ] Django server running on `http://localhost:8000`

### **Frontend Setup**
- [ ] Run `npm install` (if not already done)
- [ ] Run `npm run dev`
- [ ] Login as staff member

---

## 🔬 Test Cases

### **Test 1: Create Offer (Basic)**

**Setup**: Open Staff Settings → Offers & Packages

**Steps**:
1. Click "Add Offer" button
2. Fill in required fields:
   - Title: "Test Weekend Package"
   - Short Description: "Great weekend deal"
   - Valid From: (today)
   - Valid To: (next week)
3. Toggle "Active" ON
4. Click "Create Offer"

**Expected Results**:
- ✅ Modal closes
- ✅ New offer appears in list immediately
- ✅ Success toast: "Offer created successfully!"
- ✅ Console log: `[SectionOffers] ✅ Offer created:`

---

### **Test 2: Create Offer with Image**

**Steps**:
1. Click "Add Offer"
2. Fill required fields
3. Select an image file (JPG/PNG, < 10MB)
4. See badge: "Image will upload when you save"
5. Click "Create Offer"

**Expected Results**:
- ✅ Offer created with image
- ✅ Image displays in offer card
- ✅ Photo URL present in response
- ✅ No upload-image API call (bundled with create)

---

### **Test 3: Multi-Tab Real-Time Create**

**Setup**: 
- Open Staff Settings in **Browser Tab 1**
- Open Staff Settings in **Browser Tab 2** (same hotel, logged in)

**Steps**:
1. In **Tab 1**: Create a new offer "Summer Special"
2. Watch **Tab 2**

**Expected Results in Tab 2**:
- ✅ Offer appears automatically (no refresh needed)
- ✅ Toast notification: "New offer: Summer Special"
- ✅ Console log: `[SectionOffers] ✅ Offer created:`
- ✅ Offer shows at top of list

---

### **Test 4: Update Offer**

**Setup**: Have at least one existing offer

**Steps**:
1. Click "Edit" on an offer
2. Change title to "Updated Weekend Package"
3. Change short description
4. Click "Save Changes"

**Expected Results**:
- ✅ Offer updates immediately
- ✅ Success toast: "Offer updated successfully!"
- ✅ Changes visible in card
- ✅ Console log: `[SectionOffers] 🔄 Offer updated:`

---

### **Test 5: Multi-Tab Real-Time Update**

**Setup**: Two tabs with Staff Settings open

**Steps**:
1. In **Tab 1**: Edit offer "Summer Special"
2. Change title to "Super Summer Special"
3. Save
4. Watch **Tab 2**

**Expected Results in Tab 2**:
- ✅ Offer title updates automatically
- ✅ No toast (silent update for edits)
- ✅ Console log: `[SectionOffers] 🔄 Offer updated:`

---

### **Test 6: Upload Image to Existing Offer**

**Setup**: Edit an existing offer

**Steps**:
1. Click "Edit" on an offer
2. Select a new image file
3. Click "Upload Now" button
4. Wait for upload to complete
5. Click "Save Changes" or "Cancel"

**Expected Results**:
- ✅ Progress spinner shows during upload
- ✅ Image preview updates after upload
- ✅ Success toast: "Image uploaded successfully!"
- ✅ Photo URL updates in form
- ✅ Console log: `[SectionOffers] 🖼️ Offer image updated:`

---

### **Test 7: Multi-Tab Image Upload**

**Setup**: Two tabs with Staff Settings open

**Steps**:
1. In **Tab 1**: Edit offer, upload new image
2. Wait for "Image uploaded successfully!"
3. Watch **Tab 2**

**Expected Results in Tab 2**:
- ✅ Offer image updates automatically
- ✅ No page refresh needed
- ✅ Console log: `[SectionOffers] 🖼️ Offer image updated:`

---

### **Test 8: Delete Offer**

**Steps**:
1. Click trash icon on an offer
2. Confirm deletion in dialog
3. Click "OK"

**Expected Results**:
- ✅ Offer removed from list immediately
- ✅ Success toast: "Offer deleted successfully!"
- ✅ Console log: `[SectionOffers] 🗑️ Offer deleted:`

---

### **Test 9: Multi-Tab Real-Time Delete**

**Setup**: Two tabs with Staff Settings open

**Steps**:
1. In **Tab 1**: Delete offer "Test Package"
2. Watch **Tab 2**

**Expected Results in Tab 2**:
- ✅ Offer disappears automatically
- ✅ Toast notification: "Offer deleted: Test Package"
- ✅ Console log: `[SectionOffers] 🗑️ Offer deleted:`

---

### **Test 10: Public Page Real-Time Updates**

**Setup**:
- **Tab 1**: Public hotel page at `http://localhost:5173/{hotel-slug}`
- **Tab 2**: Staff Settings

**Steps**:
1. In **Tab 2**: Create new offer
2. Watch **Tab 1** (public page)
3. In **Tab 2**: Update offer title
4. Watch **Tab 1**
5. In **Tab 2**: Delete offer
6. Watch **Tab 1**

**Expected Results in Tab 1 (Public Page)**:
- ✅ New offer appears in Offers Section
- ✅ Offer title updates
- ✅ Offer disappears when deleted
- ✅ All changes happen without page refresh
- ✅ Console logs: `[OffersSection] ✅/🔄/🗑️ ...`

---

### **Test 11: Image Upload via URL**

**Steps**:
1. Click "Add Offer" or "Edit"
2. Paste image URL in "Or paste image URL directly" field
3. Image preview should show
4. Save offer

**Expected Results**:
- ✅ Image preview loads from URL
- ✅ Offer saves with photo_url
- ✅ Image displays in card

---

### **Test 12: Validation Errors**

**Steps**:
1. Click "Add Offer"
2. Try to save without required fields
3. Try uploading file > 10MB
4. Try uploading non-image file

**Expected Results**:
- ✅ Save button disabled until required fields filled
- ✅ Error toast for oversized file: "Image size must be less than 10MB"
- ✅ Error toast for invalid file: "Please select an image file"

---

### **Test 13: Network Error Handling**

**Steps**:
1. Stop Django backend server
2. Try to create/update/delete offer
3. Start backend again

**Expected Results**:
- ✅ Error toast shows appropriate message
- ✅ Operation doesn't crash the app
- ✅ After backend restart, operations work again

---

### **Test 14: Duplicate Prevention**

**Setup**: Two tabs open with same offer visible

**Steps**:
1. In **Tab 1**: Create new offer
2. Quickly create same offer again (or simulate duplicate event)
3. Watch **Tab 2**

**Expected Results**:
- ✅ Offer doesn't appear twice
- ✅ Duplicate check prevents multiple entries
- ✅ Console shows event received but not added

---

### **Test 15: Pusher Disconnection**

**Steps**:
1. Open browser DevTools → Network
2. Throttle network to "Offline"
3. Wait 10 seconds
4. Restore network to "Online"
5. In another tab, create offer

**Expected Results**:
- ✅ Pusher reconnects automatically
- ✅ New offer appears after reconnection
- ✅ No permanent errors

---

## 🐛 Debugging Checklist

If tests fail, check these:

### **Console Logs**
```javascript
// Should see these in browser console:
[SectionOffers] ✅ Offer created: {...}
[SectionOffers] 🔄 Offer updated: {...}
[SectionOffers] 🗑️ Offer deleted: {...}
[SectionOffers] 🖼️ Offer image updated: {...}

[OffersSection] ✅ Offer created: {...}
[OffersSection] 🔄 Offer updated: {...}
[OffersSection] 🗑️ Offer deleted: {...}
[OffersSection] 🖼️ Offer image updated: {...}
```

### **Network Tab**
```
✅ POST   /api/staff/hotel/{slug}/offers/
✅ PATCH  /api/staff/hotel/{slug}/offers/{id}/
✅ DELETE /api/staff/hotel/{slug}/offers/{id}/
✅ POST   /api/staff/hotel/{slug}/offers/{id}/upload-image/
```

### **Backend Console**
```python
# Should see in Django console:
[Pusher] Broadcast offer-created for offer 1
[Pusher] Broadcast offer-updated for offer 1
[Pusher] Broadcast offer-deleted for offer 1
[Pusher] Broadcast offer-image-updated for offer 1
```

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| No Pusher events | Missing credentials | Check `.env` has `VITE_PUSHER_KEY` and `VITE_PUSHER_CLUSTER` |
| 404 on API calls | Wrong endpoint | Verify `/api/staff/hotel/{slug}/offers/` (not `/staff/hotel/{slug}/staff/offers/`) |
| Image upload fails | Wrong field name | Backend expects `photo`, not `image` |
| Duplicate offers | No duplicate check | Implementation includes check, verify it's in code |
| Backend not broadcasting | Missing backend code | See `BACKEND_OFFER_PUSHER_GUIDE.md` |

---

## 📊 Performance Testing

### **Test 16: Rapid Fire Operations**

**Steps**:
1. Quickly create 5 offers
2. Quickly edit 3 offers
3. Quickly delete 2 offers

**Expected Results**:
- ✅ All operations complete successfully
- ✅ UI stays responsive
- ✅ No race conditions or duplicates
- ✅ All Pusher events received

---

### **Test 17: Large Image Upload**

**Steps**:
1. Upload 9.9MB image (just under limit)
2. Time the upload
3. Check responsiveness

**Expected Results**:
- ✅ Upload succeeds
- ✅ Progress indicator shows during upload
- ✅ UI doesn't freeze
- ✅ Upload completes in reasonable time (< 30s)

---

## ✅ Sign-Off Checklist

Before considering implementation complete:

- [ ] All 17 test cases passed
- [ ] Multi-tab sync works perfectly
- [ ] Public page updates in real-time
- [ ] No console errors
- [ ] No 404 or 500 errors in Network tab
- [ ] Pusher events visible in console
- [ ] Backend logs show Pusher broadcasts
- [ ] Image uploads work (both methods)
- [ ] Validation works correctly
- [ ] Error handling graceful
- [ ] Performance acceptable

---

## 🎉 Success Criteria

**Implementation is successful when**:
1. ✅ All CRUD operations work
2. ✅ All operations broadcast Pusher events
3. ✅ Multi-tab sync is instant
4. ✅ Public page updates in real-time
5. ✅ No errors in any scenario
6. ✅ Performance is smooth

---

## 📞 Support

If any test fails:
1. Check `OFFER_PUSHER_IMPLEMENTATION_COMPLETE.md` for details
2. Check `BACKEND_OFFER_PUSHER_GUIDE.md` for backend setup
3. Review console logs for specific errors
4. Verify Pusher credentials

**Status**: ✅ Ready for testing!
