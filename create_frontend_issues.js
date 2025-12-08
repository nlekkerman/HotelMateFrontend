#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Creating Frontend Integration Issues with GitKraken...\n');

// Create labels first
const labels = [
  { name: 'integration', color: '0075ca', description: 'Backend-frontend integration work' },
  { name: 'staff-chat', color: '7057ff', description: 'Staff chat related features' },
  { name: 'real-time', color: 'e99695', description: 'Real-time/Pusher functionality' },
  { name: 'high-priority', color: 'd73a4a', description: 'High priority tasks' },
  { name: 'animations', color: 'a2eeef', description: 'UI animations and visual effects' },
  { name: 'ui-polish', color: 'f9d0c4', description: 'UI polish and user experience' },
  { name: 'fcm', color: 'c5def5', description: 'Firebase Cloud Messaging' },
  { name: 'deep-linking', color: 'bfdadc', description: 'Deep linking functionality' },
  { name: 'attendance', color: 'd4c5f9', description: 'Attendance system features' },
  { name: 'warnings', color: 'fef2c0', description: 'Warning system components' },
  { name: 'architecture', color: '0e8a16', description: 'Architecture and system design' },
  { name: 'critical', color: 'b60205', description: 'Critical priority items' },
  { name: 'eventbus', color: 'fbca04', description: 'EventBus system work' },
  { name: 'migration', color: 'd93f0b', description: 'Code migration tasks' },
  { name: 'completed-during-session', color: '28a745', description: 'Work completed during this session' }
];

console.log('Creating labels...');
labels.forEach(label => {
  try {
    const cmd = `gh label create "${label.name}" --color ${label.color} --description "${label.description}" --force`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`✅ Created label: ${label.name}`);
  } catch (error) {
    console.log(`ℹ️  Label ${label.name} already exists or created`);
  }
});

const issues = [
  {
    title: "✅ Staff Chat Unread Count: Real-time Pipeline (COMPLETED)",
    body: `## 🎯 Status: ✅ COMPLETED DURING SESSION

**This issue documents work completed during the development session on December 8, 2025.**

## 🎯 User Story
**As a staff member**, I want **real-time unread count updates in the chat widget**, so that **I see new messages immediately without opening the widget**.

## ✅ What Was Implemented
- ✅ Real-time \`unread_updated\` event handling in chatStore
- ✅ Personal notification channel subscriptions (\`hotel-{slug}.staff-{id}-notifications\`)
- ✅ Widget header color changes (green when unread > 0)
- ✅ Badge count displays correctly
- ✅ Reducer actions: \`UPDATE_CONVERSATION_UNREAD\`, \`SET_TOTAL_UNREAD\`
- ✅ StaffChatContext memoized totalUnread calculation
- ✅ MessengerWidget simplified to use direct totalUnread prop
- ✅ Debug functions for testing: \`debugRealtimeUnread()\`, \`debugTotalUnread()\`

## 🔧 Files Modified
- \`src/realtime/stores/chatActions.js\` - Added unread action constants
- \`src/realtime/stores/chatStore.jsx\` - Added unread event handling and reducer cases
- \`src/staff_chat/context/StaffChatContext.jsx\` - Added memoized totalUnread calculation
- \`src/staff_chat/components/MessengerWidget.jsx\` - Simplified unread count usage
- \`src/realtime/RealtimeProvider.jsx\` - Fixed staffId resolution for personal channels

## 🧪 Testing Completed
- ✅ Debug functions work: \`debugRealtimeUnread(91, 5)\` updates conversation unread
- ✅ Debug functions work: \`debugTotalUnread(10)\` updates total badge
- ✅ Widget header turns green when unread > 0
- ✅ Badge shows correct count
- ✅ Real-time pipeline ready for backend events

## 🔗 Backend Integration
Backend now fires \`unread_updated\` events via Django model signals (see HotelMateBackend#55).

---
**Status**: ✅ Complete  
**Type**: Integration  
**Backend Issue**: nlekkerman/HotelMateBackend#55`,
    labels: ["completed-during-session", "staff-chat", "real-time", "integration"]
  },
  
  {
    title: "Staff Chat Unread Count: Badge Animations & Visual Polish",
    body: `## 🎯 User Story
**As a staff member**, I want **animated badges and visual feedback for new messages**, so that **I notice new messages immediately and understand message priority**.

## 📝 Context
Complete the Staff Chat unread count implementation with polished UI animations, sounds, and visual indicators. Core real-time pipeline is already implemented - this adds the user experience layer.

## ✅ Current Status
- ✅ Real-time \`unread_updated\` event handling working
- ✅ Widget header color changes (green when unread > 0)
- ✅ Badge count displays correctly
- ✅ Personal notification channel subscriptions working

## ✅ Missing Features to Implement
- [ ] Badge bounce animation when new unread messages arrive
- [ ] Pulse animation for total unread badge in navigation
- [ ] Sound notifications for new messages (configurable)
- [ ] Document title updates with unread count \`(5) HotelMate Staff\`
- [ ] Conversation sorting by unread status
- [ ] Visual indicators for recently updated conversations
- [ ] Smooth badge count transitions (animate number changes)

## 🔧 Technical Implementation

### Badge Animations
\`\`\`css
/* Add to staffChat.css */
.unread-badge.animate-bounce {
  animation: unread-bounce 0.6s ease-in-out;
}

@keyframes unread-bounce {
  0%, 60%, 100% { transform: scale(1); }
  30% { transform: scale(1.15); }
}

.badge.animate-pulse {
  animation: unread-pulse 1.5s infinite;
}

@keyframes unread-pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
\`\`\`

### Sound Notifications
\`\`\`javascript
// Add to StaffChatContext.jsx
const playNotificationSound = useCallback(() => {
  if (!canShowNotifications()) return;
  
  const audio = new Audio('/sounds/message-notification.mp3');
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Audio play failed:', e));
}, []);

// Call when unread count increases
useEffect(() => {
  if (totalUnread > previousTotalUnread) {
    playNotificationSound();
  }
}, [totalUnread, previousTotalUnread, playNotificationSound]);
\`\`\`

### Document Title Updates
\`\`\`javascript
// Add to App.jsx or StaffChatContext
useEffect(() => {
  const baseTitle = 'HotelMate Staff';
  document.title = totalUnread > 0 
    ? \`(\${totalUnread}) \${baseTitle}\`
    : baseTitle;
}, [totalUnread]);
\`\`\`

## 🎨 Files to Modify
- \`src/staff_chat/staffChat.css\` - Add animation keyframes
- \`src/staff_chat/context/StaffChatContext.jsx\` - Add sound notifications
- \`src/staff_chat/components/MessengerWidget.jsx\` - Add badge animations
- \`src/App.jsx\` - Add document title updates
- \`public/sounds/\` - Add notification sound files

## 📋 Testing Checklist
- [ ] Badge bounces when debug function increases unread count
- [ ] Navigation badge pulses with animation
- [ ] Sound plays when new messages arrive (with permission)
- [ ] Document title shows unread count in browser tab
- [ ] Conversations sort with unread items at top
- [ ] Animations work on mobile devices
- [ ] Sound respects browser autoplay policies

---

**Priority**: Medium  
**Type**: Enhancement  
**Dependencies**: Real-time pipeline (✅ Complete)  
**Backend Issue**: Related to nlekkerman/HotelMateBackend#55`,
    labels: ["enhancement", "staff-chat", "animations", "ui-polish"]
  },
  
  {
    title: "FCM Chat Integration: Event Transformation & Deep Linking", 
    body: `## 🎯 User Story
**As a user**, I want **FCM notifications to work seamlessly with the chat interface**, so that **I can navigate directly to conversations and see accurate read states**.

## 📝 Context
Integrate FCM Chat Implementation with the existing eventBus system, transforming FCM events to match our normalized event format and adding deep linking functionality.

## ✅ Acceptance Criteria
- [ ] Transform FCM events to eventBus-compatible format
- [ ] Handle FCM notification clicks for deep linking to conversations
- [ ] Auto-mark messages as read when navigating from FCM notifications
- [ ] Add read receipt indicators to message bubbles
- [ ] Support FCM events for both staff chat and guest chat
- [ ] Handle file attachments from FCM notifications
- [ ] Implement message status indicators (sent, delivered, read)

## 🔧 Technical Implementation

### FCM Event Transformation
\`\`\`javascript
// Add to firebase.js or new fcmEventTransformer.js
export function transformFCMToEventBus(fcmEvent) {
  const eventMapping = {
    'staff_chat_message': {
      category: 'staff_chat',
      type: 'message_created',
      payload: {
        conversation_id: fcmEvent.conversation_id,
        message: fcmEvent.message_data,
        sender_id: fcmEvent.sender_id,
        timestamp: fcmEvent.timestamp
      }
    },
    'guest_chat_message': {
      category: 'guest_chat', 
      type: 'staff_message_created',
      payload: {
        room_number: fcmEvent.room_number,
        message: fcmEvent.message_data,
        staff_id: fcmEvent.staff_id
      }
    },
    'unread_count_update': {
      category: 'staff_chat',
      type: 'unread_updated',
      payload: {
        staff_id: fcmEvent.staff_id,
        total_unread: fcmEvent.total_unread,
        conversation_id: fcmEvent.conversation_id,
        unread_count: fcmEvent.unread_count
      }
    }
  };

  return eventMapping[fcmEvent.type] || null;
}
\`\`\`

### Deep Linking Handler
\`\`\`javascript
// Add to MessengerWidget.jsx or App.jsx
function handleFCMNotificationClick(fcmData) {
  const { conversation_id, room_number, type } = fcmData;
  
  if (type === 'staff_chat_message' && conversation_id) {
    // Navigate to staff conversation
    const searchParams = new URLSearchParams();
    searchParams.set('conversation', conversation_id);
    searchParams.set('autoOpen', 'true');
    window.location.search = searchParams.toString();
  }
  
  if (type === 'guest_chat_message' && room_number) {
    // Navigate to guest chat
    navigate(\`/guest-chat/\${room_number}\`);
  }
}
\`\`\`

### Read Receipt UI
\`\`\`jsx
// Add to MessageBubble.jsx
const ReadReceiptIndicator = ({ message, isCurrentUser }) => {
  if (!isCurrentUser) return null;
  
  const getReadStatus = () => {
    if (message.read_by_count === 0) return { icon: '✓', color: '#999', label: 'Sent' };
    if (message.read_by_count < message.recipient_count) return { icon: '✓✓', color: '#007bff', label: 'Delivered' };
    return { icon: '✓✓', color: '#28a745', label: 'Read' };
  };
  
  const status = getReadStatus();
  
  return (
    <span className="read-receipt" style={{ color: status.color }} title={status.label}>
      {status.icon}
    </span>
  );
};
\`\`\`

## 🔗 API Endpoints Needed
- \`POST /api/chat/conversations/{id}/mark-read/\` - Mark guest chat as read
- \`POST /api/staff-chat/{hotel_slug}/conversations/{id}/mark_as_read/\` - Mark staff chat as read  
- \`GET /api/staff-chat/{hotel_slug}/conversations/{id}/read-receipts/\` - Get read receipt details

## 📋 Files to Modify
- \`src/firebase.js\` - Add FCM event transformation
- \`src/realtime/eventBus.js\` - Handle transformed FCM events
- \`src/staff_chat/components/MessageBubble.jsx\` - Add read receipts
- \`src/staff_chat/components/MessengerWidget.jsx\` - Add deep linking
- \`src/App.jsx\` - Handle FCM navigation
- \`src/services/fcmService.js\` - New FCM integration service

## 📋 Testing Checklist
- [ ] FCM notifications transform correctly to eventBus events
- [ ] Clicking FCM notification opens correct conversation
- [ ] Messages auto-mark as read when opened via FCM
- [ ] Read receipts display correctly for sent messages
- [ ] File attachments work with FCM notifications
- [ ] Deep linking works on mobile devices
- [ ] Event transformation preserves all required data

---

**Priority**: High  
**Type**: Integration  
**Dependencies**: EventBus system, FCM setup  
**Backend Issue**: Related to nlekkerman/HotelMateBackend#56`,
    labels: ["integration", "fcm", "chat", "deep-linking"]
  },

  {
    title: "Auto Clock-Out UI: Warning System & Status Updates",
    body: `## 🎯 User Story
**As a staff member**, I want **to receive warnings before auto clock-out and see my session status**, so that **I can manage my time effectively and avoid unexpected clock-outs**.

## 📝 Context
Implement UI components for the Auto Clock-Out Management System, including progressive warnings, status displays, and acknowledgment options for long sessions.

## ✅ Acceptance Criteria
- [ ] Display progressive warning modals (12h, 16h, 20h markers)
- [ ] Show countdown timers for next warning/auto clock-out
- [ ] Update attendance status immediately when auto clocked out
- [ ] Add acknowledgment buttons for long session warnings
- [ ] Display current session duration in real-time
- [ ] Show manual clock-out option with warnings for long sessions
- [ ] Add notification sounds for warnings (optional)

## 🔧 Technical Implementation

### Warning Modal Component
\`\`\`jsx
// Create src/components/attendance/LongSessionWarningModal.jsx
const LongSessionWarningModal = ({ warning, onAcknowledge, onClockOut }) => {
  const getWarningMessage = (warningType, duration) => {
    switch (warningType) {
      case 'long_session_12h':
        return \`You've been clocked in for \${duration}. Consider taking a break.\`;
      case 'long_session_16h': 
        return \`Long session alert: \${duration} clocked in. Please review your time.\`;
      case 'long_session_20h':
        return \`Critical: \${duration} session. Auto clock-out in 4 hours.\`;
      default:
        return \`Session duration: \${duration}\`;
    }
  };

  return (
    <Modal show={!!warning} backdrop="static">
      <Modal.Header>
        <Modal.Title>⏰ Session Duration Warning</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{getWarningMessage(warning?.type, warning?.duration)}</p>
        <div className="session-info">
          <strong>Started:</strong> {warning?.clock_in_time} <br/>
          <strong>Duration:</strong> {warning?.duration}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onAcknowledge}>
          Acknowledge & Continue
        </Button>
        <Button variant="primary" onClick={onClockOut}>
          Clock Out Now  
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
\`\`\`

### Session Duration Display
\`\`\`jsx
// Add to AttendanceStatus component
const SessionDurationDisplay = ({ clockInTime }) => {
  const [duration, setDuration] = useState('');
  
  useEffect(() => {
    if (!clockInTime) return;
    
    const interval = setInterval(() => {
      const start = new Date(clockInTime);
      const now = new Date();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setDuration(\`\${hours}h \${minutes}m\`);
      
      // Show warning color for long sessions
      const warningClass = hours >= 20 ? 'danger' : hours >= 16 ? 'warning' : 'info';
      setDurationClass(warningClass);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [clockInTime]);
  
  if (!clockInTime) return null;
  
  return (
    <div className={\`session-duration \${durationClass}\`}>
      Session: {duration}
    </div>
  );
};
\`\`\`

### Event Handlers
\`\`\`javascript
// Add to AttendanceProvider or dedicated hook
const useAutoClockOutWarnings = (staffId, hotelSlug) => {
  const [currentWarning, setCurrentWarning] = useState(null);
  
  useEffect(() => {
    // Subscribe to personal notifications for warnings
    const channel = \`hotel-\${hotelSlug}.staff-\${staffId}-notifications\`;
    
    const handleWarning = (event) => {
      if (event.category === 'attendance' && event.type === 'long_session_warning') {
        setCurrentWarning(event.payload);
      }
      
      if (event.category === 'attendance' && event.type === 'auto_clocked_out') {
        // Show notification and update status
        showNotification('Auto Clock-Out', {
          body: \`You have been automatically clocked out after \${event.payload.duration}\`,
          tag: 'auto-clock-out'
        });
        
        // Clear any pending warnings
        setCurrentWarning(null);
      }
    };
    
    // Subscribe via eventBus
    const unsubscribe = eventBus.subscribe(channel, handleWarning);
    
    return unsubscribe;
  }, [staffId, hotelSlug]);
  
  const acknowledgeWarning = () => {
    setCurrentWarning(null);
    // Optionally call API to acknowledge
  };
  
  const clockOutNow = async () => {
    try {
      await clockOut(staffId);
      setCurrentWarning(null);
    } catch (error) {
      console.error('Failed to clock out:', error);
    }
  };
  
  return { currentWarning, acknowledgeWarning, clockOutNow };
};
\`\`\`

## 🔗 Real-time Events
- **Channel**: \`hotel-{slug}.staff-{id}-notifications\`
- **Events**: 
  - \`long_session_warning\` - Progressive warnings (12h, 16h, 20h)
  - \`auto_clocked_out\` - When auto clock-out occurs
  - \`clock_status_updated\` - General status updates

## 📋 Files to Create/Modify
- \`src/components/attendance/LongSessionWarningModal.jsx\` - New warning modal
- \`src/components/attendance/SessionDurationDisplay.jsx\` - New duration display
- \`src/hooks/useAutoClockOutWarnings.js\` - New warning management hook
- \`src/context/AttendanceContext.jsx\` - Add warning state management
- \`src/pages/attendance/AttendancePage.jsx\` - Integrate warning components

## 📋 Testing Checklist
- [ ] Warning modal appears at correct time thresholds
- [ ] Session duration updates in real-time
- [ ] Auto clock-out notification displays properly
- [ ] Acknowledgment clears warning modal
- [ ] Manual clock-out works from warning modal
- [ ] Status updates immediately reflect changes
- [ ] Warning colors change based on session length

---

**Priority**: Medium  
**Type**: Feature  
**Dependencies**: Attendance system, real-time events  
**Backend Issue**: Related to nlekkerman/HotelMateBackend#58`,
    labels: ["feature", "attendance", "warnings", "ui"]
  },

  {
    title: "EventBus Architecture: Legacy Event Migration & Error Handling",
    body: `## 🎯 User Story
**As a developer**, I want **consistent event handling across all domains**, so that **real-time features work reliably and are easy to maintain**.

## 📝 Context  
Complete the migration from legacy hyphenated events (\`message-created\`) to the new unified underscore format (\`message_created\`) and add comprehensive error handling for all real-time events.

## ✅ Current Status
- ✅ EventBus handles normalized events with \`category\` and \`type\`
- ✅ Staff chat events use new format
- ✅ Pusher system events are filtered out properly

## ✅ Missing Implementation
- [ ] Migrate remaining legacy event listeners to new format
- [ ] Add comprehensive error handling and retry logic  
- [ ] Implement event logging and debugging tools
- [ ] Add connection status monitoring
- [ ] Create fallback polling for critical events
- [ ] Add event replay functionality for missed events
- [ ] Implement rate limiting for event processing

## 🔧 Technical Implementation

### Legacy Event Migration Audit
\`\`\`javascript
// Find and replace all legacy event bindings
// OLD (search for these patterns):
channel.bind('message-created', handler);
channel.bind('attendance-update', handler);  
channel.bind('booking-confirmed', handler);

// NEW (replace with):
eventBus.subscribe('hotel-slug.domain.id', (event) => {
  if (event.type === 'message_created') handler(event.payload);
  if (event.type === 'attendance_updated') handler(event.payload);
  if (event.type === 'booking_confirmed') handler(event.payload);
});
\`\`\`

### Error Handling & Retry Logic
\`\`\`javascript
// Add to eventBus.js
class RobustEventBus {
  constructor() {
    this.connectionStatus = 'connecting';
    this.eventQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }
  
  handleEventWithRetry(event, handler) {
    try {
      handler(event);
      this.retryAttempts.delete(event.id);
    } catch (error) {
      console.error('Event handling failed:', error);
      
      const attempts = this.retryAttempts.get(event.id) || 0;
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(event.id, attempts + 1);
        setTimeout(() => this.handleEventWithRetry(event, handler), 1000 * Math.pow(2, attempts));
      } else {
        console.error('Max retries exceeded for event:', event.id);
        this.handleEventFailure(event, error);
      }
    }
  }
  
  handleEventFailure(event, error) {
    // Log to monitoring service
    // Queue for manual retry
    // Show user notification if critical
  }
}
\`\`\`

### Connection Status Monitoring
\`\`\`jsx
// Create src/components/realtime/ConnectionStatus.jsx
const ConnectionStatus = () => {
  const [status, setStatus] = useState('connecting');
  const [lastEvent, setLastEvent] = useState(null);
  
  useEffect(() => {
    const pusher = getPusherClient();
    
    pusher.connection.bind('connected', () => setStatus('connected'));
    pusher.connection.bind('disconnected', () => setStatus('disconnected'));
    pusher.connection.bind('failed', () => setStatus('failed'));
    
    // Heartbeat monitoring
    const heartbeat = setInterval(() => {
      const timeSinceLastEvent = Date.now() - (lastEvent || 0);
      if (timeSinceLastEvent > 60000 && status === 'connected') {
        setStatus('stale'); // Connected but no recent events
      }
    }, 30000);
    
    return () => {
      clearInterval(heartbeat);
      pusher.connection.unbind_all();
    };
  }, []);
  
  const statusConfig = {
    'connected': { color: 'green', text: 'Connected', icon: '🟢' },
    'connecting': { color: 'yellow', text: 'Connecting...', icon: '🟡' },
    'disconnected': { color: 'red', text: 'Disconnected', icon: '🔴' },
    'failed': { color: 'red', text: 'Connection Failed', icon: '❌' },
    'stale': { color: 'orange', text: 'Connection Stale', icon: '🟠' }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={\`connection-status status-\${status}\`}>
      <span>{config.icon} {config.text}</span>
    </div>
  );
};
\`\`\`

### Debug Tools
\`\`\`javascript
// Add to window for debugging
window.debugEventBus = {
  logLevel: 'info', // 'debug', 'info', 'warn', 'error'
  
  // Replay recent events
  replayEvents: (minutes = 5) => {
    const since = Date.now() - (minutes * 60 * 1000);
    const recentEvents = eventBus.eventHistory.filter(e => e.timestamp > since);
    console.log(\`Replaying \${recentEvents.length} events from last \${minutes} minutes\`);
    recentEvents.forEach(event => eventBus.handleEvent(event));
  },
  
  // Monitor specific event type
  monitor: (category, type) => {
    return eventBus.subscribe('debug-monitor', (event) => {
      if (event.category === category && (!type || event.type === type)) {
        console.log(\`🔍 [EventMonitor] \${category}.\${event.type}:\`, event);
      }
    });
  },
  
  // Simulate events for testing
  simulate: (category, type, payload) => {
    eventBus.handleEvent({
      category,
      type,
      payload,
      source: 'debug',
      timestamp: new Date().toISOString()
    });
  }
};
\`\`\`

## 📋 Files to Modify
- \`src/realtime/eventBus.js\` - Add error handling and retry logic
- \`src/realtime/realtimeClient.js\` - Add connection monitoring
- \`src/components/realtime/ConnectionStatus.jsx\` - New connection status component
- All existing event listeners - Migrate to new format
- \`src/App.jsx\` - Add connection status display

## 🔍 Legacy Event Audit Needed
Search codebase for these patterns and convert:
- \`channel.bind('message-created'\` → \`eventBus\` pattern
- \`channel.bind('attendance-update'\` → \`eventBus\` pattern  
- \`channel.bind('booking-confirmed'\` → \`eventBus\` pattern
- Any hyphenated event names → underscore format

## 📋 Testing Checklist
- [ ] All legacy event listeners converted to new format
- [ ] Error handling doesn't break event flow
- [ ] Connection status displays accurately
- [ ] Retry logic works for failed events
- [ ] Debug tools function properly
- [ ] Performance impact is minimal
- [ ] No event loss during connection issues

---

**Priority**: Critical  
**Type**: Architecture  
**Dependencies**: All real-time features  
**Backend Issue**: Related to nlekkerman/HotelMateBackend#57`,
    labels: ["architecture", "critical", "eventbus", "migration"]
  }
];

// Create issues using GitKraken CLI
issues.forEach((issue, index) => {
  console.log(`Creating issue ${index + 1}: ${issue.title}`);
  
  try {
    const labelsStr = issue.labels.join(',');
    const bodyFile = `issue_${index + 1}_body.md`;
    
    // Write body to temporary file to handle multiline content
    require('fs').writeFileSync(bodyFile, issue.body);
    
    const cmd = `gh issue create --title "${issue.title}" --body-file ${bodyFile} --label ${labelsStr}`;
    
    const result = execSync(cmd, { encoding: 'utf-8' });
    console.log(`✅ Created: ${result.trim()}`);
    
    // Clean up temp file
    require('fs').unlinkSync(bodyFile);
    
  } catch (error) {
    console.error(`❌ Failed to create issue ${index + 1}:`, error.message);
  }
});

console.log('\n🎉 All frontend integration issues created!');
console.log('\n📊 Summary:');
console.log('✅ 1 completed issue documenting session work');
console.log('🔄 3 remaining issues for future implementation');
console.log('🏷️  Labels created for organization');
console.log('\nNext steps:');
console.log('1. Assign remaining issues to team members');
console.log('2. Set milestones and priorities');  
console.log('3. Link to backend issues for reference');
console.log('4. Close the completed issue');
console.log('5. Begin work on remaining features');