# URGENT: Backend Fix Required - Guest Deletion Sync Issue

## Problem Statement

**Issue**: When staff deletes a message/image, the deletion appears in the staff UI but NOT in the guest UI.

**Root Cause**: Backend is only broadcasting `message-deleted` event to the **conversation channel**, but guests listen on the **room channel**.

---

## Current Backend Behavior (INCORRECT)

When a message is deleted via `DELETE /api/chat/messages/{message_id}/delete/`:

```python
# ❌ CURRENT (WRONG) - Only broadcasts to conversation channel
pusher_client.trigger(
    f'{hotel_slug}-conversation-{conversation_id}-chat',
    'message-deleted',
    {
        'message_id': message.id,
        'hard_delete': False,
        'message': {
            'id': message.id,
            'message': '[Message deleted]',
            'is_deleted': True
        }
    }
)
```

**Result**: 
- ✅ Staff (listening on conversation channel) see the deletion
- ❌ Guests (listening on room channel) do NOT see the deletion

---

## Required Fix (CORRECT)

When a message is deleted, broadcast to **BOTH channels**:

```python
# ✅ CORRECT - Broadcast to BOTH channels

# 1. Broadcast to conversation channel (for staff)
pusher_client.trigger(
    f'{hotel_slug}-conversation-{conversation_id}-chat',
    'message-deleted',
    {
        'message_id': message.id,
        'hard_delete': False,
        'message': {
            'id': message.id,
            'message': deletion_text,  # "[Message deleted]", "[File deleted]", etc.
            'is_deleted': True
        }
    }
)

# 2. Broadcast to room channel (for guests)
room_number = conversation.room_number  # Get room number from conversation
pusher_client.trigger(
    f'{hotel_slug}-room-{room_number}-chat',
    'message-deleted',
    {
        'message_id': message.id,
        'hard_delete': False,
        'message': {
            'id': message.id,
            'message': deletion_text,  # "[Message deleted]", "[File deleted]", etc.
            'is_deleted': True
        }
    }
)
```

---

## Why Two Channels?

### Staff UI Subscription
Staff members subscribe to the **conversation channel**:
- Channel: `{hotel_slug}-conversation-{conversation_id}-chat`
- Events: `new-message`, `message-deleted`, `messages-read-by-guest`

### Guest UI Subscription
Guests subscribe to the **room channel**:
- Channel: `{hotel_slug}-room-{room_number}-chat`
- Events: `new-staff-message`, `new-message`, `staff-assigned`, `message-deleted`

---

## Testing Instructions

### Before Fix
1. Open chat as guest (room 101)
2. Staff sends message with image
3. Staff deletes the message
4. **BUG**: Guest UI still shows the message/image ❌

### After Fix
1. Open chat as guest (room 101)
2. Staff sends message with image
3. Staff deletes the message
4. **EXPECTED**: Guest UI updates in real-time, message disappears ✅

### Console Logs to Verify

**Guest browser console should show**:
```
🗑️ [GUEST PUSHER] Message deleted event received: {message_id: 123, ...}
🗑️ [GUEST PUSHER] Processing deletion for message ID: 123
✅ [GUEST PUSHER] Message deletion handled successfully for ID: 123
```

If these logs appear, the fix is working!

---

## Code Location

**Backend file to modify**: 
- Message deletion endpoint (likely in `views.py` or `api.py`)
- Function: `delete_message()` or similar

**What to change**:
1. Find where you trigger Pusher event after deleting a message
2. Add a second `pusher_client.trigger()` call for the room channel
3. Ensure you have access to `room_number` from the conversation object

---

## Priority

**HIGH** - This affects real-time communication between guests and staff. Guests cannot see when staff delete messages, leading to confusion.

---

## Questions?

Contact frontend team if you need:
- Example guest session tokens
- Help testing the fix
- Clarification on channel naming

**Document Version**: 1.0  
**Date**: November 5, 2025  
**Status**: Pending Backend Implementation
