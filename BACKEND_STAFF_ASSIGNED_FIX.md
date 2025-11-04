# Backend Issue: `staff-assigned` Pusher Event Firing Too Frequently

## Problem
The `staff-assigned` Pusher event is being sent with **every staff message**, causing the guest to see "Staff joined the chat" system message repeatedly.

## Expected Behavior
The `staff-assigned` Pusher event should **only** be sent when:
1. A staff member **first opens/selects** a conversation (initial assignment)
2. A staff member **takes over** from another staff member (handoff/reassignment)

## Current Incorrect Behavior
The event appears to be triggered:
- ❌ With every message sent by staff
- ❌ Multiple times during the same conversation with the same staff member

## What to Check in Backend

### 1. Conversation Assignment Endpoint
**Endpoint:** `POST /chat/{hotelSlug}/conversations/{conversationId}/assign-staff/`

This endpoint should:
- Check if the current staff is already assigned to this conversation
- Only broadcast `staff-assigned` Pusher event if the staff member is **different** from the currently assigned staff
- Store the `current_staff_handler` on the conversation model

**Example logic:**
```python
# Only send Pusher event if staff is changing
if conversation.current_staff_handler_id != current_staff.id:
    conversation.current_staff_handler = current_staff
    conversation.save()
    
    # Send Pusher event
    pusher_client.trigger(
        f'{hotel_slug}-room-{room_number}-chat',
        'staff-assigned',
        {
            'staff_name': f'{staff.first_name} {staff.last_name}',
            'staff_role': staff.role,
            'staff_profile_image': staff.profile_image.url if staff.profile_image else None
        }
    )
```

### 2. Message Send Endpoint
**Endpoint:** `POST /chat/{hotelSlug}/conversations/{conversationId}/messages/send`

This endpoint should:
- ❌ **NOT** trigger `staff-assigned` event
- ✅ Only send `new-staff-message` or `new-message` event
- ✅ Include `staff_info` in the message payload (this is fine and working correctly)

## Pusher Events Summary

| Event Name | When to Trigger | Channel |
|------------|----------------|---------|
| `staff-assigned` | Only when staff member changes | `{hotelSlug}-room-{roomNumber}-chat` |
| `new-staff-message` | Every staff message | `{hotelSlug}-room-{roomNumber}-chat` |
| `new-message` | Every message (general) | `{hotelSlug}-conversation-{conversationId}-chat` |
| `messages-read-by-staff` | When staff views messages | `{hotelSlug}-room-{roomNumber}-chat` |
| `messages-read-by-guest` | When guest views messages | `{hotelSlug}-conversation-{conversationId}-chat` |

## Summary
Please ensure `staff-assigned` Pusher event is **only** broadcast when a staff member is actually being assigned/reassigned to a conversation, not with every message.

## Frontend Safeguard
We've added a frontend check to prevent duplicate "joined" messages, but it's better to fix this at the source (backend) to avoid unnecessary Pusher events.
