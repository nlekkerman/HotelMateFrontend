# 📱 Frontend Guest Chat Implementation Guide

## Overview
This guide shows how to implement real-time chat for unauthenticated guests using QR codes, local storage sessions, and Pusher notifications.

---

## 🔑 Key Concepts

1. **Guest scans QR code** → Goes to chat page
2. **Guest enters PIN** → Backend creates session token
3. **Token stored in localStorage** → Persists across page refreshes
4. **Guest subscribes to Pusher** → Receives real-time messages
5. **Staff info displayed** → Guest sees who's helping them

---

## 📦 Required Dependencies

```bash
npm install pusher-js
# or
yarn add pusher-js
```

---

## 🏗️ Project Structure

```
src/
├── utils/
│   └── guestChatSession.js       # Session management
├── components/
│   ├── GuestChat.jsx              # Main chat component
│   ├── PinEntry.jsx               # PIN input screen
│   ├── MessageList.jsx            # Display messages
│   └── MessageInput.jsx           # Send messages
└── hooks/
    └── usePusher.js               # Pusher hook
```

---

## 🔧 Step 1: Guest Session Manager

Create `src/utils/guestChatSession.js`:

```javascript
const SESSION_KEY = 'hotelmate_guest_chat_session';

export class GuestChatSession {
  constructor(hotelSlug, roomNumber) {
    this.hotelSlug = hotelSlug;
    this.roomNumber = roomNumber;
    this.sessionData = this.loadFromLocalStorage();
    this.apiBase = '/api/chat'; // Adjust to your API URL
  }

  /**
   * Initialize new session with PIN
   */
  async initialize(pin) {
    try {
      const response = await fetch(
        `${this.apiBase}/${this.hotelSlug}/guest-session/room/${this.roomNumber}/initialize/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin,
            session_token: this.sessionData?.session_token // Send existing token if available
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid PIN');
      }

      const data = await response.json();
      this.saveToLocalStorage(data);
      return data;
    } catch (error) {
      console.error('Session initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate existing session on page load
   */
  async validate() {
    if (!this.sessionData?.session_token) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.apiBase}/guest-session/${this.sessionData.session_token}/validate/`
      );

      if (!response.ok) {
        this.clearSession();
        return false;
      }

      const data = await response.json();
      if (data.valid) {
        this.saveToLocalStorage(data);
        return true;
      }
      
      this.clearSession();
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Check for new messages (for polling backup)
   */
  async checkUnreadMessages() {
    if (!this.sessionData?.session_token) {
      return { unread_count: 0 };
    }

    try {
      const response = await fetch(
        `${this.apiBase}/guest-session/${this.sessionData.session_token}/unread-count/`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to check unread messages:', error);
      return { unread_count: 0 };
    }
  }

  /**
   * Save session data to localStorage
   */
  saveToLocalStorage(data) {
    this.sessionData = {
      ...this.sessionData,
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionData));
  }

  /**
   * Load session data from localStorage
   */
  loadFromLocalStorage() {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear session (logout)
   */
  clearSession() {
    this.sessionData = null;
    localStorage.removeItem(SESSION_KEY);
  }

  // Getters
  getToken() {
    return this.sessionData?.session_token;
  }

  getConversationId() {
    return this.sessionData?.conversation_id;
  }

  getCurrentStaffHandler() {
    return this.sessionData?.current_staff_handler;
  }

  getPusherChannel() {
    return this.sessionData?.pusher_channel;
  }

  getHotelSlug() {
    return this.sessionData?.hotel_slug || this.hotelSlug;
  }

  getRoomNumber() {
    return this.sessionData?.room_number || this.roomNumber;
  }
}
```

---

## 🎣 Step 2: Pusher Hook

Create `src/hooks/usePusher.js`:

```javascript
import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY; // Add to .env
const PUSHER_CLUSTER = process.env.REACT_APP_PUSHER_CLUSTER; // Add to .env

export function usePusher(channelName, eventHandlers) {
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!channelName) return;

    // Initialize Pusher
    pusherRef.current = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      encrypted: true
    });

    // Subscribe to channel
    channelRef.current = pusherRef.current.subscribe(channelName);

    // Bind event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      channelRef.current.bind(event, handler);
    });

    console.log(`✅ Subscribed to Pusher channel: ${channelName}`);

    // Cleanup
    return () => {
      if (channelRef.current) {
        Object.keys(eventHandlers).forEach(event => {
          channelRef.current.unbind(event);
        });
        pusherRef.current.unsubscribe(channelName);
      }
      pusherRef.current?.disconnect();
      console.log(`🔌 Disconnected from Pusher channel: ${channelName}`);
    };
  }, [channelName]);

  return { pusher: pusherRef.current, channel: channelRef.current };
}
```

---

## 💬 Step 3: Main Chat Component

Create `src/components/GuestChat.jsx`:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { GuestChatSession } from '../utils/guestChatSession';
import { usePusher } from '../hooks/usePusher';
import PinEntry from './PinEntry';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function GuestChat({ hotelSlug, roomNumber }) {
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [hotelSlug, roomNumber]);

  async function initializeSession() {
    const guestSession = new GuestChatSession(hotelSlug, roomNumber);
    sessionRef.current = guestSession;
    
    // Try to validate existing session
    const isValid = await guestSession.validate();
    
    if (isValid) {
      console.log('✅ Existing session validated');
      setSession(guestSession);
      setIsAuthenticated(true);
      setCurrentStaff(guestSession.getCurrentStaffHandler());
      await loadMessages(guestSession.getConversationId());
    } else {
      console.log('❌ No valid session, showing PIN entry');
      setSession(guestSession);
    }
    
    setIsLoading(false);
  }

  async function handlePinSubmit(pin) {
    try {
      await sessionRef.current.initialize(pin);
      setIsAuthenticated(true);
      setCurrentStaff(sessionRef.current.getCurrentStaffHandler());
      await loadMessages(sessionRef.current.getConversationId());
    } catch (error) {
      alert(error.message || 'Invalid PIN');
    }
  }

  async function loadMessages(conversationId) {
    try {
      const response = await fetch(
        `/api/chat/${hotelSlug}/conversations/${conversationId}/messages/`
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;

    try {
      const response = await fetch(
        `/api/chat/${hotelSlug}/conversations/${session.getConversationId()}/messages/send/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            session_token: session.getToken()
          })
        }
      );
      
      const data = await response.json();
      
      // Update staff handler if changed
      if (data.staff_info) {
        setCurrentStaff(data.staff_info);
        session.saveToLocalStorage({ current_staff_handler: data.staff_info });
      }
      
      // Message will be added via Pusher, but add optimistically
      setMessages(prev => [...prev, data.message]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  }

  function handleNewStaffMessage(data) {
    console.log('📨 New staff message received:', data);
    
    // Add message to list (check for duplicates)
    setMessages(prev => {
      if (prev.find(m => m.id === data.id)) {
        return prev; // Already have this message
      }
      return [...prev, data];
    });
    
    // Update current staff handler
    if (data.staff_info) {
      setCurrentStaff(data.staff_info);
      session.saveToLocalStorage({ current_staff_handler: data.staff_info });
    }
    
    // Show notification if tab not focused
    if (document.hidden) {
      showBrowserNotification(data);
    }
    
    // Play sound
    playNotificationSound();
  }

  function handleNewMessage(data) {
    console.log('💬 New message received:', data);
    
    // Add message if not already present
    setMessages(prev => {
      if (prev.find(m => m.id === data.id)) {
        return prev;
      }
      return [...prev, data];
    });
  }

  function showBrowserNotification(messageData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const staffName = messageData.staff_info?.name || 'Hotel Staff';
      const notification = new Notification(`Message from ${staffName}`, {
        body: messageData.message.substring(0, 100),
        icon: messageData.staff_info?.profile_image || '/hotel-icon.png',
        tag: `chat-${messageData.id}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  function playNotificationSound() {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play sound:', e));
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Setup Pusher when authenticated
  usePusher(
    isAuthenticated ? session?.getPusherChannel() : null,
    {
      'new-staff-message': handleNewStaffMessage,
      'new-message': handleNewMessage,
    }
  );

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <PinEntry onSubmit={handlePinSubmit} roomNumber={roomNumber} />;
  }

  return (
    <div className="guest-chat">
      <div className="chat-header">
        <h2>Chat with Reception</h2>
        <p className="room-info">Room {roomNumber}</p>
        
        {currentStaff && (
          <div className="current-staff">
            {currentStaff.profile_image && (
              <img 
                src={currentStaff.profile_image} 
                alt={currentStaff.name}
                className="staff-avatar"
              />
            )}
            <div className="staff-details">
              <strong>{currentStaff.name}</strong>
              <span className="staff-role">{currentStaff.role}</span>
            </div>
          </div>
        )}
      </div>
      
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

---

## 📝 Step 4: PIN Entry Component

Create `src/components/PinEntry.jsx`:

```javascript
import React, { useState } from 'react';

export default function PinEntry({ onSubmit, roomNumber }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pin.length < 4) return;
    
    setLoading(true);
    try {
      await onSubmit(pin);
    } catch (error) {
      setLoading(false);
    }
  }

  return (
    <div className="pin-entry">
      <h1>Welcome to Room {roomNumber}</h1>
      <p>Enter your PIN to access chat</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="6"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          autoFocus
          disabled={loading}
        />
        <button type="submit" disabled={loading || pin.length < 4}>
          {loading ? 'Verifying...' : 'Access Chat'}
        </button>
      </form>
    </div>
  );
}
```

---

## 💬 Step 5: Message List Component

Create `src/components/MessageList.jsx`:

```javascript
import React, { useEffect, useRef } from 'react';

export default function MessageList({ messages }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`message ${msg.sender_type === 'guest' ? 'guest' : 'staff'}`}
        >
          {msg.sender_type === 'staff' && msg.staff_info && (
            <div className="message-header">
              {msg.staff_info.profile_image && (
                <img 
                  src={msg.staff_info.profile_image} 
                  alt={msg.staff_info.name}
                  className="message-avatar"
                />
              )}
              <span className="message-sender">
                {msg.staff_info.name} ({msg.staff_info.role})
              </span>
            </div>
          )}
          
          <div className="message-bubble">
            {msg.message}
          </div>
          
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

## ✍️ Step 6: Message Input Component

Create `src/components/MessageInput.jsx`:

```javascript
import React, { useState } from 'react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        autoFocus
      />
      <button type="submit" disabled={!text.trim()}>
        Send
      </button>
    </form>
  );
}
```

---

## 🎨 Step 7: Basic CSS

Add to your stylesheet:

```css
.guest-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
}

.chat-header {
  padding: 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.current-staff {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.staff-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
}

.message.guest {
  text-align: right;
}

.message.staff {
  text-align: left;
}

.message-bubble {
  display: inline-block;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  max-width: 70%;
}

.message.guest .message-bubble {
  background: #007bff;
  color: white;
}

.message.staff .message-bubble {
  background: #e9ecef;
  color: #333;
}

.message-input {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #ddd;
  gap: 0.5rem;
}

.message-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
}

.message-input button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
```

---

## 🔧 Step 8: Environment Variables

Create `.env` file:

```env
REACT_APP_PUSHER_KEY=your_pusher_key
REACT_APP_PUSHER_CLUSTER=your_cluster
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 🚀 Usage in Your App

```javascript
import GuestChat from './components/GuestChat';

function App() {
  // Parse from QR code URL
  const hotelSlug = 'my-hotel';
  const roomNumber = 102;

  return <GuestChat hotelSlug={hotelSlug} roomNumber={roomNumber} />;
}
```

---

## ✅ Testing Checklist

1. ✅ Scan QR code → Shows PIN entry
2. ✅ Enter correct PIN → Session created, chat opens
3. ✅ Refresh page → Session persists, no PIN needed
4. ✅ Send message as guest → Staff receives notification
5. ✅ Staff replies → Guest sees message IMMEDIATELY (no refresh)
6. ✅ Browser notification works when tab not focused
7. ✅ Shows current staff member handling chat
8. ✅ Session expires after 7 days

---

## 🔍 Debugging

Check browser console for:
```
✅ Subscribed to Pusher channel: my-hotel-room-102-chat
📨 New staff message received: {...}
```

Check Network tab for:
- POST `/guest-session/room/102/initialize/` → Returns session_token
- GET `/guest-session/{token}/validate/` → Returns valid: true

Check Pusher Dashboard for:
- Channel: `my-hotel-room-102-chat`
- Event: `new-staff-message`
- Subscribers: 1 (guest) + connections

---

## 🎯 Key Points

1. **Pusher channel**: `{hotel-slug}-room-{room-number}-chat`
2. **Event to listen**: `new-staff-message`
3. **Session token**: Stored in localStorage
4. **Staff info**: Included in every staff message
5. **Real-time**: No polling needed, instant delivery

This implementation ensures guests receive messages **instantly without refreshing**! 🚀
