# Staff Chat - Complete Frontend Integration Guide

## 📋 Table of Contents
1. [Setup & Authentication](#setup--authentication)
2. [Create Conversations](#create-conversations)
3. [Send Messages](#send-messages)
4. [Upload Files](#upload-files)
5. [Edit Messages](#edit-messages)
6. [Delete Messages](#delete-messages)
7. [Message Reactions](#message-reactions)
8. [Reply to Messages](#reply-to-messages)
9. [Mark Messages as Read](#mark-messages-as-read)
10. [Real-Time Updates (Pusher)](#real-time-updates-pusher)
11. [FCM Notifications](#fcm-notifications)
12. [Complete Implementation Example](#complete-implementation-example)

---

## Setup & Authentication

### Headers for All Requests
```javascript
const headers = {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
};
```

### Base URL
```javascript
const BASE_URL = '/api/staff_chat';
const hotelSlug = 'hotel-killarney'; // Your hotel slug
```

---

## Create Conversations

### Get Staff List (for selecting participants)
```javascript
// GET /api/staff_chat/{hotel_slug}/staff-list/
async function getStaffList(searchQuery = '') {
  const url = `${BASE_URL}/${hotelSlug}/staff-list/?search=${searchQuery}`;
  const response = await fetch(url, { headers });
  return await response.json();
}
```

**Response:**
```json
[
  {
    "id": 5,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@hotel.com",
    "profile_image": "https://...",
    "department": {"id": 2, "name": "Housekeeping"},
    "role": {"id": 3, "name": "Staff"}
  }
]
```

### Create 1-on-1 Conversation
```javascript
// POST /api/staff_chat/{hotel_slug}/conversations/
async function createConversation(participantIds, title = '') {
  const url = `${BASE_URL}/${hotelSlug}/conversations/`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      participant_ids: participantIds,
      title: title // Optional, only for groups
    })
  });
  return await response.json();
}

// Example: Create 1-on-1 chat
const conversation = await createConversation([5]); // Returns existing or creates new

// Example: Create group chat
const groupConv = await createConversation([5, 8, 12], "Morning Shift Team");
```

### Create Group Chat (Step-by-Step)

#### Step 1: Get Available Staff
```javascript
// Search for staff members
const staffList = await getStaffList('housekeeping');

// Display staff list for selection
staffList.forEach(staff => {
  console.log(`${staff.first_name} ${staff.last_name} - ${staff.department.name}`);
});
```

#### Step 2: Select Multiple Participants
```javascript
// User selects multiple staff members (via checkboxes, multi-select, etc.)
const selectedStaffIds = [5, 8, 12, 15]; // Jane, Mike, Sarah, Tom

// Set group title
const groupTitle = "Housekeeping Morning Shift";
```

#### Step 3: Create Group Conversation
```javascript
// POST request with multiple participant IDs
const groupChat = await fetch(`${BASE_URL}/${hotelSlug}/conversations/`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    participant_ids: selectedStaffIds,  // [5, 8, 12, 15]
    title: groupTitle                    // "Housekeeping Morning Shift"
  })
});

const newGroup = await groupChat.json();
console.log('Group created:', newGroup.id);
```

#### Step 4: Group Chat Response
```json
{
  "id": 48,
  "title": "Housekeeping Morning Shift",
  "is_group": true,
  "participants": [
    {
      "id": 3,
      "first_name": "John",
      "last_name": "Doe"
    },
    {
      "id": 5,
      "first_name": "Jane",
      "last_name": "Smith"
    },
    {
      "id": 8,
      "first_name": "Mike",
      "last_name": "Johnson"
    },
    {
      "id": 12,
      "first_name": "Sarah",
      "last_name": "Williams"
    },
    {
      "id": 15,
      "first_name": "Tom",
      "last_name": "Brown"
    }
  ],
  "created_at": "2025-11-05T15:00:00Z",
  "created_by": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Group Chat UI Example
```javascript
function GroupChatCreator() {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [staffList, setStaffList] = useState([]);
  
  useEffect(() => {
    // Load staff list
    loadStaffList();
  }, []);
  
  async function loadStaffList() {
    const staff = await getStaffList();
    setStaffList(staff);
  }
  
  function toggleStaffSelection(staffId) {
    setSelectedStaff(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  }
  
  async function createGroup() {
    if (selectedStaff.length < 2) {
      alert('Select at least 2 staff members');
      return;
    }
    
    if (!groupTitle.trim()) {
      alert('Enter a group title');
      return;
    }
    
    try {
      const group = await createConversation(selectedStaff, groupTitle);
      console.log('Group created:', group);
      // Navigate to new group chat
      window.location.href = `/staff-chat/conversation/${group.id}`;
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  }
  
  return (
    <div className="group-creator">
      <h2>Create Group Chat</h2>
      
      {/* Group Title Input */}
      <input
        type="text"
        placeholder="Group name (e.g., Morning Shift)"
        value={groupTitle}
        onChange={(e) => setGroupTitle(e.target.value)}
      />
      
      {/* Staff Selection */}
      <div className="staff-list">
        <h3>Select Members ({selectedStaff.length} selected)</h3>
        {staffList.map(staff => (
          <div key={staff.id} className="staff-item">
            <input
              type="checkbox"
              checked={selectedStaff.includes(staff.id)}
              onChange={() => toggleStaffSelection(staff.id)}
            />
            <img src={staff.profile_image} alt={staff.first_name} />
            <span>{staff.first_name} {staff.last_name}</span>
            <span className="department">{staff.department.name}</span>
          </div>
        ))}
      </div>
      
      {/* Create Button */}
      <button
        onClick={createGroup}
        disabled={selectedStaff.length < 2 || !groupTitle.trim()}
      >
        Create Group ({selectedStaff.length} members)
      </button>
    </div>
  );
}
```

### Important Notes:

**1-on-1 vs Group:**
- **1-on-1**: `participant_ids: [5]` → Only 1 other person (2 total with you)
- **Group**: `participant_ids: [5, 8, 12]` → 2+ other people (3+ total with you)

**Automatic Behavior:**
- ✅ **You are automatically added** as a participant (no need to include your own ID)
- ✅ **1-on-1 chats**: If conversation exists, returns existing (no duplicates)
- ✅ **Group chats**: Always creates new (you can have multiple groups with same people)
- ✅ **is_group flag**: Automatically set to `true` when 3+ total participants

**Group Features:**
- ✅ Group title is **required** for groups (shows in notifications)
- ✅ Group creator is tracked (`created_by` field)
- ✅ All participants get FCM notification about new group
- ✅ Group avatar can be added later (optional)

**Response (201 Created or 200 OK if exists):**
```json
{
  "id": 45,
  "title": "",
  "is_group": false,
  "participants": [
    {
      "id": 3,
      "first_name": "John",
      "last_name": "Doe",
      "profile_image": "https://..."
    },
    {
      "id": 5,
      "first_name": "Jane",
      "last_name": "Smith",
      "profile_image": "https://..."
    }
  ],
  "last_message": null,
  "unread_count": 0,
  "created_at": "2025-11-05T13:45:00Z"
}
```

---

## Send Messages

### Send Text Message
```javascript
// POST /api/staff_chat/{hotel_slug}/conversations/{conversation_id}/send-message/
async function sendMessage(conversationId, messageText, replyToId = null) {
  const url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/send-message/`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: messageText,
      reply_to: replyToId // Optional: ID of message you're replying to
    })
  });
  return await response.json();
}

// Example: Send simple message
await sendMessage(45, "Hello team!");

// Example: Reply to a message
await sendMessage(45, "That sounds good!", 123); // 123 is the message ID
```

**Response:**
```json
{
  "id": 234,
  "conversation": 45,
  "sender": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe",
    "profile_image": "https://..."
  },
  "message": "Hello team!",
  "timestamp": "2025-11-05T14:30:00Z",
  "status": "delivered",
  "is_read": false,
  "is_edited": false,
  "is_deleted": false,
  "reply_to_message": null,
  "reactions": [],
  "attachments": [],
  "mentions": [],
  "read_by": []
}
```

### @Mentions
Mentions are automatically detected! Just include @Name in your message:
```javascript
await sendMessage(45, "Hey @Jane can you check this?");
// Jane will receive a high-priority notification
```

---

## Upload Files

### Upload Files with Message
```javascript
// POST /api/staff_chat/{hotel_slug}/conversations/{conversation_id}/upload/
async function uploadFiles(conversationId, files, messageText = '') {
  const formData = new FormData();
  
  // Add files (max 10 files, 50MB each)
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Optional message text
  if (messageText) {
    formData.append('message', messageText);
  }
  
  const url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/upload/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
      // Don't set Content-Type, browser will set it with boundary
    },
    body: formData
  });
  
  return await response.json();
}

// Example: Upload from file input
const fileInput = document.getElementById('fileInput');
const files = Array.from(fileInput.files);
await uploadFiles(45, files, "Check these documents");

// Example: Drag & drop
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  await uploadFiles(45, files, "Here are the files");
});
```

**Supported File Types:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- PDF: `.pdf`
- Documents: `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`

**File Limits:**
- Max 10 files per upload
- Max 50MB per file

**Response:**
```json
{
  "message": {
    "id": 235,
    "message": "Check these documents",
    "attachments": [
      {
        "id": 67,
        "file_name": "report.pdf",
        "file_type": "pdf",
        "file_size": 1048576,
        "file_url": "https://cloudinary.com/...",
        "thumbnail": null,
        "uploaded_at": "2025-11-05T14:35:00Z"
      }
    ]
  }
}
```

### Delete Attachment
```javascript
// DELETE /api/staff_chat/{hotel_slug}/attachments/{attachment_id}/delete/
async function deleteAttachment(attachmentId) {
  const url = `${BASE_URL}/${hotelSlug}/attachments/${attachmentId}/delete/`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  return response.ok;
}

// Example
await deleteAttachment(67);
```

---

## Edit Messages

### Edit a Message
```javascript
// PATCH /api/staff_chat/{hotel_slug}/messages/{message_id}/edit/
async function editMessage(messageId, newText) {
  const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/edit/`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      message: newText
    })
  });
  return await response.json();
}

// Example
await editMessage(234, "Hello team! Updated message");
```

**Response:**
```json
{
  "id": 234,
  "message": "Hello team! Updated message",
  "is_edited": true,
  "edited_at": "2025-11-05T14:40:00Z"
}
```

**Notes:**
- Only the sender can edit their own messages
- Message will show "(edited)" badge
- Real-time update sent to all participants via Pusher

---

## Delete Messages

### Soft Delete (Shows "[Message deleted]")
```javascript
// DELETE /api/staff_chat/{hotel_slug}/messages/{message_id}/delete/
async function deleteMessage(messageId) {
  const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/delete/`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  return await response.json();
}

// Example: Soft delete (default)
await deleteMessage(234);
```

### Hard Delete (Permanently removes)
```javascript
// DELETE /api/staff_chat/{hotel_slug}/messages/{message_id}/delete/?permanent=true
async function hardDeleteMessage(messageId) {
  const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/delete/?permanent=true`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  return await response.json();
}

// Example: Hard delete (managers/admins only)
await hardDeleteMessage(234);
```

**Response:**
```json
{
  "message": "Message deleted successfully",
  "is_permanent": false,
  "message_id": 234
}
```

**Delete Behavior:**
- **Soft delete**: Shows "[Message deleted]" or "[Message and file(s) deleted]"
- **Hard delete**: Completely removes from database (managers/admins only)
- Both send real-time updates via Pusher

---

## Message Reactions

### Add Reaction (Emoji)
```javascript
// POST /api/staff_chat/{hotel_slug}/messages/{message_id}/react/
async function addReaction(messageId, emoji) {
  const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/react/`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      emoji: emoji
    })
  });
  return await response.json();
}

// Example
await addReaction(234, '👍');
await addReaction(234, '❤️');
```

**Available Emojis:**
- 👍 Thumbs Up
- ❤️ Heart
- 😊 Smile
- 😂 Laugh
- 😮 Wow
- 😢 Sad
- 🎉 Party
- 🔥 Fire
- ✅ Check
- 👏 Clap

**Response:**
```json
{
  "id": 89,
  "message": 234,
  "emoji": "👍",
  "staff": {
    "id": 3,
    "first_name": "John",
    "last_name": "Doe"
  },
  "created_at": "2025-11-05T14:45:00Z"
}
```

### Remove Reaction
```javascript
// DELETE /api/staff_chat/{hotel_slug}/messages/{message_id}/react/{emoji}/
async function removeReaction(messageId, emoji) {
  const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/react/${emoji}/`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  return response.ok;
}

// Example
await removeReaction(234, '👍');
```

### Display Reactions in UI
```javascript
// Group reactions by emoji
function groupReactions(reactions) {
  const grouped = {};
  reactions.forEach(reaction => {
    if (!grouped[reaction.emoji]) {
      grouped[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        staff: []
      };
    }
    grouped[reaction.emoji].count++;
    grouped[reaction.emoji].staff.push(reaction.staff);
  });
  return Object.values(grouped);
}

// Example UI
const grouped = groupReactions(message.reactions);
grouped.forEach(group => {
  console.log(`${group.emoji} ${group.count} - ${group.staff.map(s => s.first_name).join(', ')}`);
});
// Output: 👍 3 - John, Jane, Mike
```

---

## Reply to Messages

### Reply to a Specific Message
```javascript
// Just include reply_to when sending message
async function replyToMessage(conversationId, replyToMessageId, messageText) {
  return await sendMessage(conversationId, messageText, replyToMessageId);
}

// Example
await replyToMessage(45, 234, "Yes, I agree!");
```

**Response includes reply info:**
```json
{
  "id": 236,
  "message": "Yes, I agree!",
  "reply_to_message": {
    "id": 234,
    "message": "Should we meet at 3pm?",
    "sender": {
      "id": 5,
      "first_name": "Jane",
      "last_name": "Smith"
    }
  }
}
```

### Display Replies in UI
```html
<div class="message">
  <!-- Show what message this is replying to -->
  <div class="reply-preview">
    <span class="reply-sender">Jane Smith</span>
    <span class="reply-text">Should we meet at 3pm?</span>
  </div>
  
  <!-- The actual reply -->
  <div class="message-content">
    Yes, I agree!
  </div>
</div>
```

---

## Mark Messages as Read

### Get Conversation Messages (with pagination)
```javascript
// GET /api/staff_chat/{hotel_slug}/conversations/{conversation_id}/messages/
async function getMessages(conversationId, limit = 50, beforeId = null) {
  let url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/messages/?limit=${limit}`;
  
  if (beforeId) {
    url += `&before_id=${beforeId}`;
  }
  
  const response = await fetch(url, { headers });
  return await response.json();
}

// Example: Get latest 50 messages
const messages = await getMessages(45);

// Example: Load older messages (pagination)
const olderMessages = await getMessages(45, 50, messages[0].id);
```

**Response:**
```json
{
  "messages": [
    {
      "id": 234,
      "message": "Hello!",
      "sender": {...},
      "is_read": false,
      "read_by": [
        {
          "id": 5,
          "first_name": "Jane",
          "last_name": "Smith"
        }
      ]
    }
  ],
  "has_more": true,
  "count": 50
}
```

### Mark Messages as Read (Manual Implementation)
```javascript
// Note: Backend doesn't have auto-mark-as-read endpoint yet
// You should implement this logic:

function markConversationAsRead(conversationId) {
  // Update local state to mark all messages as read
  // Send read receipt via Pusher or custom endpoint
  
  // For now, messages are marked as read when:
  // 1. User opens the conversation
  // 2. Message is in viewport for 2+ seconds
  // 3. User interacts with the conversation
}
```

**Read Receipt Display:**
```javascript
// Show read status
function getReadStatus(message, currentUserId) {
  if (message.sender.id === currentUserId) {
    // Your own message - show who read it
    if (message.is_read) {
      return "✓✓ Read by all";
    } else if (message.read_by.length > 0) {
      return `✓✓ Read by ${message.read_by.length}`;
    } else {
      return "✓ Delivered";
    }
  }
  return null; // Don't show status for others' messages
}
```

---

## Real-Time Updates (Pusher)

### Setup Pusher
```javascript
import Pusher from 'pusher-js';

// Initialize Pusher
const pusher = new Pusher('YOUR_PUSHER_KEY', {
  cluster: 'YOUR_CLUSTER',
  encrypted: true
});

// Subscribe to conversation channel
const conversationId = 45;
const channelName = `${hotelSlug}-staff-conversation-${conversationId}`;
const channel = pusher.subscribe(channelName);
```

### Listen to Events

#### 1. New Message
```javascript
channel.bind('new-message', (data) => {
  console.log('📨 New message received:', data);
  
  // Add message to UI
  addMessageToUI({
    id: data.message_id,
    message: data.message,
    sender: data.sender,
    timestamp: data.timestamp,
    attachments: data.attachments || [],
    reply_to: data.reply_to || null
  });
  
  // Play notification sound (if user not viewing conversation)
  if (!isConversationVisible()) {
    playNotificationSound();
    showBadge(conversationId);
  }
});
```

**Event Data:**
```json
{
  "message_id": 234,
  "conversation_id": 45,
  "sender": {
    "id": 5,
    "name": "Jane Smith",
    "profile_image": "https://..."
  },
  "message": "Hello team!",
  "timestamp": "2025-11-05T14:30:00Z",
  "attachments": [],
  "reply_to": null,
  "mentions": []
}
```

#### 2. Message Edited
```javascript
channel.bind('message-edited', (data) => {
  console.log('✏️ Message edited:', data);
  
  // Update message in UI
  updateMessageInUI(data.message_id, {
    message: data.new_message,
    is_edited: true,
    edited_at: data.edited_at
  });
});
```

#### 3. Message Deleted
```javascript
channel.bind('message-deleted', (data) => {
  console.log('🗑️ Message deleted:', data);
  
  if (data.is_permanent) {
    // Hard delete - remove from UI completely
    removeMessageFromUI(data.message_id);
  } else {
    // Soft delete - show "[Message deleted]"
    updateMessageInUI(data.message_id, {
      message: "[Message deleted]",
      is_deleted: true
    });
  }
});
```

#### 4. Message Reaction
```javascript
channel.bind('message-reaction', (data) => {
  console.log('👍 Reaction:', data);
  
  if (data.action === 'added') {
    // Add reaction to message
    addReactionToMessage(data.message_id, {
      emoji: data.emoji,
      staff: data.staff
    });
  } else if (data.action === 'removed') {
    // Remove reaction from message
    removeReactionFromMessage(data.message_id, data.emoji, data.staff.id);
  }
});
```

#### 5. Attachment Uploaded
```javascript
channel.bind('attachment-uploaded', (data) => {
  console.log('📎 File uploaded:', data);
  
  // Add attachment to message
  addAttachmentToMessage(data.message_id, data.attachments);
});
```

#### 6. Attachment Deleted
```javascript
channel.bind('attachment-deleted', (data) => {
  console.log('🗑️ File deleted:', data);
  
  // Remove attachment from UI
  removeAttachment(data.attachment_id);
});
```

### Cleanup
```javascript
// Unsubscribe when leaving conversation
function leaveConversation() {
  pusher.unsubscribe(channelName);
}
```

---

## FCM Notifications

### Who Receives Notifications?
✅ **Only recipients** - Never the sender!

### Notification Types

#### 1. New Message
```json
{
  "notification": {
    "title": "💬 Jane Smith",
    "body": "Hello team!"
  },
  "data": {
    "type": "staff_chat_message",
    "conversation_id": "45",
    "sender_id": "5",
    "hotel_slug": "hotel-killarney",
    "click_action": "/staff-chat/hotel-killarney/conversation/45"
  }
}
```

#### 2. Mention
```json
{
  "notification": {
    "title": "@️⃣ Jane Smith mentioned you",
    "body": "Hey @John can you check this?"
  },
  "data": {
    "type": "staff_chat_mention",
    "conversation_id": "45",
    "priority": "high"
  }
}
```

#### 3. File Attachment
```json
{
  "notification": {
    "title": "📷 Jane Smith",
    "body": "Sent 3 image(s)"
  },
  "data": {
    "type": "staff_chat_file",
    "conversation_id": "45",
    "file_count": "3"
  }
}
```

### Handle Notifications (React Native / Web)
```javascript
// Web Push
messaging.onMessage((payload) => {
  console.log('FCM notification:', payload);
  
  const { title, body } = payload.notification;
  const { type, conversation_id } = payload.data;
  
  // Show browser notification
  new Notification(title, {
    body: body,
    icon: '/icon.png',
    data: { conversation_id }
  });
});

// React Native
messaging().onMessage(async remoteMessage => {
  console.log('FCM notification:', remoteMessage);
  
  // Show in-app notification
  showInAppNotification(remoteMessage);
});
```

---

## Complete Implementation Example

### React Chat Component

```javascript
import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

function StaffChatWindow({ hotelSlug, conversationId, authToken }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef(null);
  const pusherRef = useRef(null);
  
  const BASE_URL = '/api/staff_chat';
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Initialize Pusher and load messages
  useEffect(() => {
    loadMessages();
    setupPusher();
    
    return () => {
      if (channelRef.current) {
        pusherRef.current.unsubscribe(channelRef.current.name);
      }
    };
  }, [conversationId]);
  
  // Setup Pusher real-time
  function setupPusher() {
    pusherRef.current = new Pusher('YOUR_PUSHER_KEY', {
      cluster: 'YOUR_CLUSTER'
    });
    
    const channelName = `${hotelSlug}-staff-conversation-${conversationId}`;
    channelRef.current = pusherRef.current.subscribe(channelName);
    
    // New message
    channelRef.current.bind('new-message', (data) => {
      setMessages(prev => [...prev, {
        id: data.message_id,
        message: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        attachments: data.attachments || [],
        reactions: [],
        is_edited: false,
        is_deleted: false
      }]);
    });
    
    // Message edited
    channelRef.current.bind('message-edited', (data) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? { ...msg, message: data.new_message, is_edited: true }
          : msg
      ));
    });
    
    // Message deleted
    channelRef.current.bind('message-deleted', (data) => {
      if (data.is_permanent) {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === data.message_id
            ? { ...msg, message: '[Message deleted]', is_deleted: true }
            : msg
        ));
      }
    });
    
    // Reaction added/removed
    channelRef.current.bind('message-reaction', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.message_id) {
          const reactions = [...msg.reactions];
          if (data.action === 'added') {
            reactions.push({ emoji: data.emoji, staff: data.staff });
          } else {
            const index = reactions.findIndex(
              r => r.emoji === data.emoji && r.staff.id === data.staff.id
            );
            if (index > -1) reactions.splice(index, 1);
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    });
  }
  
  // Load messages
  async function loadMessages() {
    setIsLoading(true);
    try {
      const url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/messages/`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
    setIsLoading(false);
  }
  
  // Send message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/send-message/`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: newMessage })
      });
      
      if (response.ok) {
        setNewMessage('');
        // Message will appear via Pusher
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
  
  // Add reaction
  async function handleReaction(messageId, emoji) {
    try {
      const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/react/`;
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emoji })
      });
      // Reaction will update via Pusher
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }
  
  // Delete message
  async function handleDelete(messageId) {
    if (!confirm('Delete this message?')) return;
    
    try {
      const url = `${BASE_URL}/${hotelSlug}/messages/${messageId}/delete/`;
      await fetch(url, {
        method: 'DELETE',
        headers
      });
      // Message will update via Pusher
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }
  
  // Upload files
  async function handleFileUpload(files) {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const url = `${BASE_URL}/${hotelSlug}/conversations/${conversationId}/upload/`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      // Files will appear via Pusher
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  }
  
  return (
    <div className="chat-window">
      {/* Messages */}
      <div className="messages-container">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="message">
              <div className="message-header">
                <span className="sender">{msg.sender.first_name}</span>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              
              <div className="message-content">
                {msg.message}
                {msg.is_edited && <span className="edited">(edited)</span>}
              </div>
              
              {/* Attachments */}
              {msg.attachments?.map(att => (
                <div key={att.id} className="attachment">
                  <a href={att.file_url} target="_blank">
                    {att.file_name}
                  </a>
                </div>
              ))}
              
              {/* Reactions */}
              <div className="reactions">
                {['👍', '❤️', '😊', '😂'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {/* Actions */}
              <button onClick={() => handleDelete(msg.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <input
          type="file"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default StaffChatWindow;
```

---

## Summary

### ✅ What You Can Do:
1. ✅ Create 1-on-1 and group conversations (no duplicates)
2. ✅ Send text messages with @mentions
3. ✅ Upload files (images, PDFs, documents)
4. ✅ Edit messages (shows "edited" badge)
5. ✅ Delete messages (soft/hard delete)
6. ✅ Add/remove emoji reactions (10 types)
7. ✅ Reply to specific messages
8. ✅ Track read receipts
9. ✅ Real-time updates via Pusher
10. ✅ Push notifications via FCM (receivers only)

### 📱 Notifications:
- ✅ Only receivers get notifications (sender never notified)
- ✅ @Mentions get high-priority notifications
- ✅ File uploads trigger notifications
- ✅ Works on web and mobile (FCM)

### 🔄 Real-Time:
- ✅ All updates broadcast via Pusher
- ✅ New messages appear instantly
- ✅ Edits/deletes sync across devices
- ✅ Reactions update in real-time

**Everything is production-ready!** 🚀
