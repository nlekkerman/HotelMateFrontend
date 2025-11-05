# Deletion Channel Implementation

## Overview
Implemented support for dedicated deletion channel to ensure reliable message deletion sync between staff and guest UIs with contextual deletion messages.

## Backend Architecture

### Channels for Guests (3 channels)
1. **Room Chat**: `{hotel}-room-{number}-chat`
   - Events: `new-message`, `message-delivered`, `messages-read-by-staff`
   - Legacy: `message-deleted`, `message-removed` (kept for backward compatibility)

2. **Conversation Chat**: `{hotel}-conversation-{id}-chat`
   - Events: `new-message`, `message-delivered`, `messages-read-by-staff`

3. **Deletion Channel** (NEW): `{hotel}-room-{number}-deletions`
   - Events: `content-deleted`, `attachment-deleted`
   - Purpose: Dedicated channel for reliable deletion event delivery

### Channels for Staff (1 channel)
1. **Conversation Chat**: `{hotel}-conversation-{id}-chat`
   - Events: All message lifecycle events including deletions

## Event Payloads

### content-deleted Event
```json
{
  "message_id": 123,
  "timestamp": "2024-01-15T10:30:00Z",
  "deleted_by": "staff",        // "staff" or "guest"
  "original_sender": "guest",   // "staff" or "guest"
  "staff_id": 456,              // Present if deleted_by === "staff"
  "staff_name": "John Doe",     // Present if deleted_by === "staff"
  "soft_delete": true
}
```

### attachment-deleted Event
```json
{
  "message_id": 123,
  "attachment_id": 789,
  "timestamp": "2024-01-15T10:30:00Z",
  "deleted_by": "staff",
  "original_sender": "guest",
  "staff_id": 456,
  "staff_name": "John Doe"
}
```

## Contextual Deletion Messages

The frontend displays different messages based on who deleted what:

### Guest View (isGuestView = true)
| Scenario | deleted_by | original_sender | Message Displayed |
|----------|-----------|----------------|-------------------|
| Guest deletes own message | `"guest"` | `"guest"` | "You deleted this message" |
| Staff deletes guest message | `"staff"` | `"guest"` | "Message removed by staff" |
| Staff deletes own message | `"staff"` | `"staff"` | "Message deleted" |

### Staff View (isGuestView = false)
| Scenario | deleted_by | original_sender | Message Displayed |
|----------|-----------|----------------|-------------------|
| Guest deletes own message | `"guest"` | `"guest"` | "Message deleted by guest" |
| Staff deletes guest message | `"staff"` | `"guest"` | "You removed this message" or "Message deleted by {name}" |
| Staff deletes own message | `"staff"` | `"staff"` | "You deleted this message" or "Message deleted by {name}" |

## Frontend Implementation

### Files Modified

#### 1. `src/components/chat/utils/messageDelete.js`
- Added `isGuest` parameter to `handlePusherDeletion()`
- Created `getContextualDeletionText()` function
- Returns appropriate deletion text based on context

```javascript
export const getContextualDeletionText = (deleted_by, original_sender, staff_name, isGuestView) => {
  // Logic for contextual messages...
}
```

#### 2. `src/components/chat/ChatWindow.jsx`

**Guest Setup (3 channels)**:
```javascript
const guestDeletionChannel = `${hotelSlug}-room-${roomNumber}-deletions`;

const guestPusherChannels = [
  {
    name: guestRoomChannel,
    events: { /* ... */ }
  },
  {
    name: guestConversationChannel,
    events: { /* ... */ }
  },
  {
    name: guestDeletionChannel,
    events: {
      'content-deleted': handleContentDeleted,
      'attachment-deleted': handleAttachmentDeleted
    }
  }
];
```

**Event Handlers**:
```javascript
const handleContentDeleted = useCallback((data) => {
  console.log('🗑️ [GUEST] content-deleted event:', data);
  handlePusherDeletion(data, setMessages, setMessageStatuses, true);
}, []);

const handleAttachmentDeleted = useCallback((data) => {
  console.log('📎❌ [GUEST] attachment-deleted event:', data);
  // Handle attachment-specific deletion
}, []);
```

**Staff Setup**:
```javascript
const handleDeletion = (data) => {
  handlePusherDeletion(data, setMessages, setMessageStatuses, false); // isGuest = false
};
```

## Testing Scenarios

### Test Case 1: Guest Deletes Own Message
1. Guest sends message
2. Guest deletes message
3. **Guest sees**: "You deleted this message"
4. **Staff sees**: "Message deleted by guest"

### Test Case 2: Staff Deletes Guest Message (Moderation)
1. Guest sends message
2. Staff deletes guest's message
3. **Guest sees**: "Message removed by staff"
4. **Staff sees**: "You removed this message"

### Test Case 3: Staff Deletes Own Message
1. Staff sends message
2. Staff deletes message
3. **Guest sees**: "Message deleted"
4. **Staff sees**: "You deleted this message"

### Test Case 4: Attachment Deletion
1. Guest uploads image
2. Staff deletes attachment via deletion channel
3. Both UIs update to remove attachment
4. Contextual message displayed

## Benefits

1. **Reliable Delivery**: Dedicated channel ensures deletion events aren't missed
2. **No Conflicts**: Separate channel eliminates subscription conflicts
3. **Clear Context**: Users understand who deleted what and why
4. **Better UX**: Contextual messages are more informative than generic "Message deleted"
5. **Moderation Clarity**: Guests understand when staff removed inappropriate content

## Debug Logging

Enhanced logging for troubleshooting:
```javascript
console.log('🔧 [CHATWINDOW] Setting up Pusher hook with channels:', {
  isGuest,
  channelCount: guestPusherChannels.length,
  channels: guestPusherChannels.map(ch => ch.name),
  roomChannel: guestRoomChannel,
  conversationChannel: guestConversationChannel,
  deletionChannel: guestDeletionChannel,
  roomChannelEvents: [...],
  conversationChannelEvents: [...],
  deletionChannelEvents: ['content-deleted', 'attachment-deleted']
});
```

## Backward Compatibility

- Legacy `message-deleted` and `message-removed` events still work on room/conversation channels
- Deletion channel is additive, doesn't break existing functionality
- Graceful degradation if backend doesn't send context fields

## Next Steps

1. Test all deletion scenarios (guest deletes, staff deletes, attachment deletion)
2. Verify contextual messages display correctly in both UIs
3. Monitor Pusher logs for successful channel subscriptions
4. Test with network interruptions to confirm reliable delivery
5. Consider adding deletion reason field for moderation (future enhancement)

## Related Documentation

- `CHANNEL_ARCHITECTURE.md` - Backend channel design
- `CHAT_WINDOW_REFACTORING.md` - Utility extraction
- `src/components/chat/utils/README.md` - Utility documentation
