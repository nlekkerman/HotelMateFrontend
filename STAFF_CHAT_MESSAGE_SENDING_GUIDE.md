# ✅ UNIFIED: Staff-to-Staff Chat Message Sending Guide

## Overview
This document explains how staff-to-staff messages are sent and handled using Pusher for real-time communication in the HotelMate system.

## 🔄 Message Sending Flow

### 1. Frontend Message Sending
When a staff member sends a message, the frontend follows this process:

#### **Component: MessageInput.jsx**
```javascript
// Located in: src/staff_chat/components/MessageInput.jsx
const handleSendMessage = async () => {
  try {
    // Send message via API
    const response = await sendMessage(hotelSlug, conversationId, {
      message: messageText,
      attachments: attachedFiles,
      reply_to: replyingTo?.id
    });
    
    // Clear input after successful send
    setMessageText('');
    setAttachedFiles([]);
    setReplyingTo(null);
    
    // Message will appear in UI via Pusher real-time event
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

#### **API Call: staffChatApi.js**
```javascript
// Located in: src/staff_chat/services/staffChatApi.js
export const sendMessage = async (hotelSlug, conversationId, messageData) => {
  const response = await api.post(
    `/staff_chat/${hotelSlug}/conversations/${conversationId}/send-message/`,
    {
      message: messageData.message,
      attachments: messageData.attachments || [],
      reply_to: messageData.reply_to || null
    }
  );
  return response.data;
};
```

### 2. Backend Message Processing
When the backend receives the message:

#### **Backend Flow:**
1. **Message Creation**: Backend creates message in database
2. **NotificationManager**: Triggers real-time event using unified system
3. **Pusher Event**: Sends event to all conversation participants

```python
# Backend pseudo-code
def send_message_view(request, hotel_slug, conversation_id):
    # Create message in database
    message = Message.objects.create(
        conversation=conversation,
        sender=request.user,
        message=message_text,
        attachments=attachments
    )
    
    # Send real-time notification via NotificationManager
    notification_manager.realtime_staff_chat_message_created(
        hotel_slug=hotel_slug,
        conversation_id=conversation_id,
        message_data={
            'id': message.id,
            'message': message.message,
            'sender_info': {
                'id': message.sender.id,
                'full_name': message.sender.get_full_name(),
                'avatar': message.sender.profile_image_url
            },
            'timestamp': message.created_at.isoformat(),
            'attachments': message.attachments_data
        }
    )
```

### 3. Real-time Event Distribution

#### **Channel Pattern:**
```javascript
// Pusher channel for conversation
const channelName = `hotel-${hotelSlug}.staff-chat.${conversationId}`;

// Event name from NotificationManager
const eventName = 'realtime_staff_chat_message_created';
```

#### **Event Bus Processing:**
```javascript
// Located in: src/realtime/eventBus.js
function normalizePusherEvent(channel, eventName, payload, timestamp) {
  // Staff chat event detection
  if (channel.includes('.staff-chat.')) {
    // Normalize event names
    let normalizedEventType = eventName;
    if (eventName === 'realtime_staff_chat_message_created') {
      normalizedEventType = 'message_created';
    }
    
    return {
      category: 'staff_chat',
      eventType: normalizedEventType,
      data: payload,
      timestamp,
      source: 'pusher'
    };
  }
}
```

### 4. Frontend Real-time Reception

#### **Centralized Subscription:**
```javascript
// Located in: src/realtime/channelRegistry.js
export function subscribeToStaffChatConversation(hotelSlug, conversationId) {
  const pusher = getPusherClient();
  const channelName = `hotel-${hotelSlug}.staff-chat.${conversationId}`;
  
  const channel = pusher.subscribe(channelName);
  
  // Global event handler routes to eventBus
  channel.bind_global((eventName, payload) => {
    handleIncomingRealtimeEvent({
      source: 'pusher',
      channel: channel.name,
      eventName,
      payload
    });
  });
  
  return cleanup;
}
```

#### **Chat Store Processing:**
```javascript
// Located in: src/realtime/stores/chatStore.jsx
export const chatActions = {
  handleEvent(event) {
    const eventType = event.eventType; // 'message_created'
    const payload = event.data;
    const conversationId = payload.conversation_id;
    
    switch (eventType) {
      case 'message_created': {
        globalChatDispatch({
          type: CHAT_ACTIONS.RECEIVE_MESSAGE,
          payload: {
            conversationId: parseInt(conversationId),
            message: payload
          }
        });
        break;
      }
    }
  }
};
```

#### **UI Update:**
```javascript
// Components automatically re-render when chatStore updates
const ChatWindowPopup = ({ conversation }) => {
  const chatState = useChatState();
  const messages = chatState.conversationsById[conversation.id]?.messages || [];
  
  // Messages automatically update when new message received via Pusher
  return (
    <div>
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
```

## 🔧 Key Components

### **Frontend Components:**
- **MessageInput.jsx** - Message composition and sending
- **ChatWindowPopup.jsx** - Individual chat window
- **staffChatApi.js** - API communication
- **channelRegistry.js** - Pusher subscription management
- **eventBus.js** - Event normalization and routing
- **chatStore.jsx** - State management

### **Backend Components:**
- **NotificationManager** - Unified real-time event system
- **Staff Chat Views** - Message creation and API endpoints
- **Pusher Integration** - Real-time event broadcasting

## 🚀 Message Flow Summary

1. **Staff types message** → MessageInput component
2. **Frontend sends API request** → staffChatApi.sendMessage()
3. **Backend creates message** → Database storage
4. **Backend triggers Pusher event** → NotificationManager.realtime_staff_chat_message_created()
5. **Pusher broadcasts to channel** → `hotel-{slug}.staff-chat.{conversationId}`
6. **Frontend receives event** → channelRegistry subscription
7. **Event processed** → eventBus normalization
8. **State updated** → chatStore.chatActions.handleEvent()
9. **UI updates** → ChatWindowPopup re-renders with new message

## 🎯 Key Features

- **Real-time Delivery** - Messages appear instantly for all participants
- **Unified Event System** - All events use NotificationManager architecture
- **Deduplication** - Prevents duplicate messages from multiple sources
- **Error Handling** - Graceful fallbacks if Pusher fails
- **Scalable** - Supports multiple simultaneous conversations
- **Consistent** - Same pattern for all message types (text, attachments, replies)

## 🔍 Debugging

To debug message sending issues:

1. **Check Network Tab** - Verify API call succeeds
2. **Check Pusher Connection** - Ensure Pusher is connected
3. **Check Console Logs** - Look for eventBus and chatStore logs
4. **Check Channel Subscription** - Verify correct channel name
5. **Check Event Data** - Ensure payload has required fields

This architecture ensures reliable, real-time staff-to-staff communication using the unified NotificationManager system.