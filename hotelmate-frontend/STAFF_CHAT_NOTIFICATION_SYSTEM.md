# Staff Chat Real-Time Notification System

## Overview
Complete real-time notification system for staff chat that displays blinking notification buttons in the quick actions bar and shows toast notifications on mobile devices.

## Features Implemented

### 1. **Real-Time Pusher Integration** ✅
- **Personal Notification Channel**: `{hotelSlug}-staff-{staffId}-notifications`
- **Events Monitored**:
  - `new-message` - New message in any conversation
  - `mention` - User was @mentioned
  - `file-uploaded` - File attachment shared
  - `messages-read` - Read receipts
  - `user-typing` - Typing indicators

### 2. **Quick Notification Buttons** ✅
Located in the contextual quick actions bar (below navbar), displays:
- **Blinking red buttons** for each notification type
- **Count badge** showing number of new items (99+ for large counts)
- **From label** showing sender name
- **Custom colors** by notification type:
  - 🔵 Blue (#3498db) - Regular messages
  - 🟠 Orange (#f39c12) - @Mentions
  - 🟣 Purple (#9b59b6) - File attachments
- **Dismiss button** (X) to remove individual notifications
- **Auto-dismiss** after 5 minutes

### 3. **Toast Notifications** ✅
Mobile-friendly toast popups using `react-toastify`:
- **Message preview** with sender avatar
- **Clickable** - Opens conversation on tap
- **Auto-close** after 5 seconds (7s for mentions)
- **Different styles** for mentions vs regular messages
- **Throttled** - Max one per conversation per 3 seconds

### 4. **Navigation Badge Updates** ✅
- **Staff Chat nav item** shows unread count
- **Auto-refresh** every 30 seconds
- **Real-time updates** when messages arrive
- **Integrates** with existing badge system

## Files Created

### Hooks
1. **`useStaffChatNotifications.js`** - Toast notification handler
   - Listens to personal Pusher channel
   - Shows toast with sender info
   - Throttles notifications
   - Handles navigation to conversations

2. **`useQuickNotifications.js`** - Quick action button manager
   - Tracks notifications by type and conversation
   - Auto-removes old notifications (5 min)
   - Manages notification counts
   - Provides dismiss methods

3. **`useUnreadCount.js`** - Global unread counter (existing, enhanced)
   - Tracks total unread across all conversations
   - Auto-refresh every 30 seconds
   - Increment/decrement helpers

### Components
1. **`QuickNotificationButtons.jsx`** - Blinking notification buttons
   - Renders individual notification buttons
   - Handles click to navigate
   - Dismiss functionality
   - Responsive design

2. **`StaffChatNotificationProvider.jsx`** - Global notification wrapper
   - Wraps app with PusherProvider
   - Initializes notification hooks
   - Manages notification state

### Styles
1. **`QuickNotifications.css`** - Notification button styles
   - Blinking animation
   - Glow effects
   - Color variations
   - Responsive adjustments

## Integration Points

### Desktop Sidebar Navbar
```jsx
// In DesktopSidebarNavbar.jsx
import useQuickNotifications from "@/staff_chat/hooks/useQuickNotifications";
import QuickNotificationButtons from "@/staff_chat/components/QuickNotificationButtons";

const {
  notifications: quickNotifications,
  removeNotification
} = useQuickNotifications({
  hotelSlug: hotelIdentifier,
  staffId: user?.id
});

// In quick actions bar render
<QuickNotificationButtons
  notifications={quickNotifications}
  onNotificationDismiss={removeNotification}
  hotelSlug={hotelIdentifier}
  mainColor={mainColor}
/>
```

### Navigation Items
```javascript
// In useNavigation.js
{ 
  slug: 'staff-chat', 
  name: 'Staff Chat', 
  path: '/{hotelSlug}/staff-chat', 
  icon: 'people-fill' 
}
```

### Staff Chat Unread Badge
```jsx
// Shows unread count in navigation badge
const { totalUnread: staffChatUnread } = useUnreadCount(hotelIdentifier, 30000);
if (item.slug === "staff-chat") orderCount = staffChatUnread;
```

## Notification Flow

### Desktop (Quick Actions Bar)
```
1. User receives message via Pusher
   ↓
2. useQuickNotifications hook captures event
   ↓
3. New blinking button appears in quick actions bar
   ↓
4. Button shows: [Icon] "John Doe" [5]
   ↓
5. User clicks → navigates to conversation
   ↓
6. Notification auto-dismissed
```

### Mobile (Toast)
```
1. User receives message via Pusher
   ↓
2. useStaffChatNotifications hook captures event
   ↓
3. Toast appears with sender avatar & preview
   ↓
4. User taps toast → opens conversation
   ↓
5. Toast auto-closes after 5 seconds
```

## Notification Types

### 1. Regular Message
- **Icon**: chat-left-text-fill
- **Color**: Blue (#3498db)
- **Channel**: `{hotelSlug}-staff-{staffId}-notifications`
- **Event**: `new-message`
- **Action**: Navigate to conversation

### 2. @Mention
- **Icon**: at (@)
- **Color**: Orange (#f39c12)
- **Channel**: `{hotelSlug}-staff-{staffId}-notifications`
- **Event**: `mention`
- **Action**: Navigate to conversation with mention highlighted

### 3. File Upload
- **Icon**: paperclip
- **Color**: Purple (#9b59b6)
- **Channel**: `{hotelSlug}-staff-{staffId}-notifications`
- **Event**: `file-uploaded`
- **Action**: Navigate to conversation with file

## Configuration

### Environment Variables
```env
VITE_PUSHER_APP_KEY=your-pusher-app-key
VITE_PUSHER_CLUSTER=mt1
```

### Pusher Setup
- Ensure backend broadcasts to personal channels
- Format: `{hotel_slug}-staff-{staff_id}-notifications`
- Include sender info (name, avatar) in event data

## User Experience

### Visual Feedback
- ✨ **Blinking animation** draws attention
- 🔴 **Red badges** for urgent items
- 🟠 **Orange** for mentions (priority)
- 📊 **Count badges** show volume
- ⏱️ **Auto-dismiss** prevents clutter

### Interactions
- **Click button** → Open conversation
- **Click X** → Dismiss notification
- **Hover button** → Stop blinking
- **Click toast** → Open conversation

### Performance
- **Throttled** - Max 1 notification per conversation per 3s
- **Auto-cleanup** - Removes after 5 minutes
- **Efficient** - Only re-renders affected components
- **Lightweight** - Small memory footprint

## Testing

### Test Scenarios
1. **New Message**
   - Send message from another user
   - Verify blinking button appears
   - Check count increments
   - Click to open conversation

2. **@Mention**
   - Send message with @username
   - Verify orange button with @ icon
   - Check toast shows "mentioned you"
   - Navigate to conversation

3. **Multiple Notifications**
   - Receive messages from different users
   - Verify separate buttons for each
   - Check dismiss works individually
   - Verify auto-cleanup after 5 min

4. **Mobile Toast**
   - Use responsive view
   - Send message to mobile user
   - Verify toast appears
   - Check avatar loads
   - Tap to navigate

## Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS/Android)
- ⚠️ Requires JavaScript enabled
- ⚠️ Requires notification permissions (optional sound)

## Future Enhancements
- [ ] Sound notifications (optional)
- [ ] Desktop notifications API
- [ ] Notification preferences (mute specific conversations)
- [ ] Group multiple notifications by conversation
- [ ] Smart batching (combine similar notifications)
- [ ] Priority levels (urgent vs normal)
- [ ] Snooze functionality

## Troubleshooting

### Notifications Not Appearing
1. Check Pusher connection in console
2. Verify personal channel subscription
3. Check staffId is correct
4. Verify backend is broadcasting events

### Buttons Not Blinking
1. Check CSS is loaded
2. Verify `blink-animation` class applied
3. Check browser animations not disabled
4. Inspect element for animation styles

### Toast Not Showing
1. Check `react-toastify` imported in App.jsx
2. Verify `<ToastContainer />` rendered
3. Check notification permissions
4. Look for console errors

### Count Not Updating
1. Verify useUnreadCount hook initialized
2. Check auto-refresh interval (30s)
3. Verify backend API returns correct count
4. Check network tab for API calls

## Dependencies
- `react-toastify` - Toast notifications
- `pusher-js` - Real-time events
- `react-router-dom` - Navigation
- `bootstrap-icons` - Icons

## Backend Requirements
The backend must broadcast events to personal channels with this structure:

```python
# Django Pusher broadcast example
pusher_client.trigger(
    f'{hotel_slug}-staff-{staff_id}-notifications',
    'new-message',
    {
        'type': 'staff_chat_message',
        'conversation_id': conversation.id,
        'message_type': 'text',
        'content': message.content,
        'sender': {
            'id': sender.id,
            'username': sender.username,
            'first_name': sender.first_name,
            'last_name': sender.last_name,
            'profile_image_url': sender.profile_image_url
        }
    }
)
```

## Summary
The staff chat notification system provides comprehensive real-time alerts through:
- **Quick action buttons** (desktop) - Blinking, color-coded, dismissible
- **Toast notifications** (mobile) - Avatar, preview, clickable
- **Navigation badges** - Unread count in sidebar
- **Auto-management** - Throttling, cleanup, efficient updates

All notifications are tied to Pusher real-time events and automatically update the UI without page refresh. The system is responsive, performant, and provides clear visual feedback for all staff chat activity.
