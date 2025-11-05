# Chat File Operations - Backend Requirements

## Overview
This document outlines the new file operation features added to the chat system that require backend support.

## New Features Implemented (Frontend)

### 1. Delete Message Feature
- **UI**: "Delete" button with trash icon appears on hover for messages with attachments
- **Behavior**: Shows confirmation modal before deletion, displays success notification after completion
- **Scope**: Deletes the entire message including all attachments

### 2. Download Attachments Feature
- **UI**: Download button with down arrow (↓) appears on hover for messages with attachments
- **Behavior**: Shows confirmation modal before download, downloads all attachments sequentially, displays success notification
- **Scope**: Downloads all files attached to the message

## Backend API Requirements

### 1. Delete Message Endpoint

**Endpoint**: `DELETE /api/chat/{hotel_slug}/conversations/{conversation_id}/messages/{message_id}/`

**Description**: Delete a specific message and all its attachments

**Request Headers**:
```
Authorization: Token {auth_token}
X-Hotel-ID: {hotel_id}
X-Hotel-Slug: {hotel_slug}
```

**Path Parameters**:
- `hotel_slug`: The hotel's unique slug
- `conversation_id`: The conversation ID
- `message_id`: The message ID to delete

**Request Body**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "deleted_message_id": 123
}
```

**Error Responses**:
- `404 Not Found`: Message not found
- `403 Forbidden`: User not authorized to delete this message
- `400 Bad Request`: Invalid message ID

**Backend Tasks**:
1. Verify user has permission to delete the message (message author or admin)
2. Delete message record from database
3. Delete all associated attachments from Cloudinary
4. **CRITICAL**: Broadcast Pusher event to **BOTH channels** (see below)
5. Update conversation's last message if this was the last message
6. Return success response

**Pusher Events** (MUST broadcast to BOTH channels):
```javascript
// Channel 1: Conversation channel (for staff viewing the conversation)
// {hotel_slug}-conversation-{conversation_id}-chat
{
  event: "message-deleted",
  data: {
    message_id: 123,
    hard_delete: false,
    message: {
      id: 123,
      message: "[Message deleted]", // or "[File deleted]" or "[Message and file(s) deleted]"
      is_deleted: true
    }
  }
}

// Channel 2: Room channel (for guests in the room)
// {hotel_slug}-room-{room_number}-chat
{
  event: "message-deleted",
  data: {
    message_id: 123,
    hard_delete: false,
    message: {
      id: 123,
      message: "[Message deleted]", // or "[File deleted]" or "[Message and file(s) deleted]"
      is_deleted: true
    }
  }
}
```

**Why both channels?**
- Staff UI listens on conversation channel
- Guest UI listens on room channel
- Both need to see deletions in real-time

---

### 2. Message Download Endpoint (Optional)

**Note**: The frontend currently handles file downloads directly from Cloudinary URLs. However, you may want to implement a tracking endpoint for analytics.

**Endpoint**: `POST /api/chat/{hotel_slug}/conversations/{conversation_id}/messages/{message_id}/track-download/`

**Description**: Track when a message's attachments are downloaded (optional analytics)

**Request Headers**:
```
Authorization: Token {auth_token}
X-Hotel-ID: {hotel_id}
X-Hotel-Slug: {hotel_slug}
```

**Request Body**:
```json
{
  "attachment_ids": [1, 2, 3],
  "download_timestamp": "2025-11-04T12:30:00Z"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Download tracked successfully"
}
```

---

## Security Considerations

### 1. Authorization
- **Staff**: Can delete their own messages only (unless admin)
- **Guest**: Can delete their own messages within a time window (e.g., 5 minutes)
- **Admin**: Can delete any message

### 2. Cloudinary Cleanup
- When a message is deleted, ensure all associated files are removed from Cloudinary
- Use Cloudinary's admin API to delete files: `cloudinary.uploader.destroy(public_id)`
- Consider implementing soft delete with a grace period before permanent deletion

### 3. Audit Trail
- Log all message deletions with:
  - User ID who deleted
  - Message ID
  - Timestamp
  - Reason (if provided)
  - IP address

---

## Frontend Implementation Details

### Current Implementation
- **File**: `src/components/chat/ChatWindow.jsx`
- **Delete Handler**: `handleDeleteMessage()` function (lines ~1160-1185)
- **Download Handler**: `handleDownloadMessage()` function (lines ~1187-1220)
- **UI**: Hover actions appear for messages with attachments only

### API Call Examples

**Delete Message**:
```javascript
await api.delete(
  `/chat/${hotelSlug}/conversations/${conversationId}/messages/${messageId}/`
);
```

**Expected Response Handling**:
- Success: Remove message from UI, show success modal
- Error: Display error alert, keep message in UI

---

## Testing Checklist

### Backend Tests Required
- [ ] Delete message by message author (should succeed)
- [ ] Delete message by different user (should fail with 403)
- [ ] Delete message that doesn't exist (should fail with 404)
- [ ] Delete message and verify Cloudinary files are removed
- [ ] Verify Pusher event is broadcast correctly
- [ ] Test deleting the last message in a conversation (conversation last_message should update)
- [ ] Test soft delete vs hard delete behavior
- [ ] Test cascade deletion of attachments

### Integration Tests
- [ ] Frontend receives Pusher event and removes message from UI
- [ ] Multiple users in same conversation see message disappear in real-time
- [ ] Error handling when backend is unavailable
- [ ] Permission checks for different user roles

---

## Migration Notes

If implementing delete functionality:

1. **Database Changes** (if using soft delete):
```sql
ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE chat_messages ADD COLUMN deleted_by_user_id INT NULL;
```

2. **Cloudinary Setup**:
   - Ensure Cloudinary admin API credentials are configured
   - Test file deletion in staging environment first

3. **Pusher Configuration**:
   - Add `message-deleted` event to allowed events list
   - Test event delivery to all conversation participants

---

## Future Enhancements

1. **Undo Delete**: 
   - Implement 30-second undo window before permanent deletion
   - Store deleted messages in a temporary table

2. **Bulk Delete**:
   - Allow selecting multiple messages for deletion
   - Endpoint: `POST /api/chat/.../messages/bulk-delete/`

3. **Download Archive**:
   - Create ZIP archive of all conversation attachments
   - Endpoint: `GET /api/chat/.../conversations/{id}/download-archive/`

4. **Edit Message**:
   - Allow editing message text (not attachments)
   - Show "edited" indicator on message

---

## Contact

For questions or clarifications about these requirements, please contact:
- Frontend Team: [Your contact]
- Backend Team: [Backend team contact]

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**Status**: Pending Backend Implementation
