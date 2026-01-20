# Real-time New Booking Highlighting - Implementation Suggestions

## 🎯 Overview
Suggestions for highlighting newly created bookings in booking lists with real-time updates using your existing Pusher/realtime infrastructure.

## 🏗️ Current Architecture Analysis

### Existing Real-time Infrastructure
- **Room Bookings**: `roomBookingStore.jsx` - handles `booking_created` events
- **Service Bookings**: `serviceBookingStore.jsx` - handles service booking creation
- **Event System**: Pusher events via `eventBus.js` and `realtimeClient.js`
- **Toast Notifications**: Already implemented for new bookings

### Key Components Needing Enhancement
- `BookingList.jsx` (Staff booking management)
- `RestaurantBookings.jsx` (Service bookings)
- `DinnerBookingList.jsx` (Restaurant-specific bookings)
- `BookingTable.jsx` (Booking display component)

## 🎨 Visual Highlighting Strategies

### 1. **Glow Effect Animation** ⭐ (Recommended)
```css
.booking-row-new {
  animation: newBookingGlow 3s ease-out;
  border-left: 4px solid #28a745;
}

@keyframes newBookingGlow {
  0% {
    background-color: #d4edda;
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.5);
  }
  50% {
    background-color: #d4edda;
    box-shadow: 0 0 30px rgba(40, 167, 69, 0.7);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
```

### 2. **Color-Coded Badges**
```jsx
{booking.isNewlyCreated && (
  <span className="badge bg-success ms-2 animate-pulse">
    🆕 NEW
  </span>
)}
```

### 3. **Progress Bar Fade**
```css
.new-booking-fade {
  position: relative;
  overflow: hidden;
}

.new-booking-fade::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #28a745, transparent);
  animation: slideHighlight 2s ease-out;
}

@keyframes slideHighlight {
  100% { left: 100%; }
}
```

### 4. **Icon Indicators**
```jsx
{booking.isNewlyCreated && (
  <i className="bi bi-star-fill text-warning me-2 animate-bounce"></i>
)}
```

## 🔧 Implementation Approaches

### Approach 1: Store-Level Tracking (Recommended)

#### A. Enhance Booking Stores
```javascript
// In roomBookingStore.jsx and serviceBookingStore.jsx
const initialState = {
  byBookingId: {},
  list: [],
  newlyCreated: new Set(), // Track newly created booking IDs
  lastEventTimestamps: {},
};

// Add action for marking as seen
const ACTIONS = {
  // ... existing actions
  MARK_BOOKING_AS_SEEN: 'MARK_BOOKING_AS_SEEN',
  CLEAR_NEW_BOOKINGS: 'CLEAR_NEW_BOOKINGS',
};

// In reducer
case ACTIONS.ROOM_BOOKING_CREATED: {
  const newState = {
    ...state,
    byBookingId: newByBookingId,
    list: newList,
    newlyCreated: new Set([...state.newlyCreated, bookingId]), // Mark as new
  };
  
  // Auto-clear after 30 seconds
  setTimeout(() => {
    dispatch({
      type: ACTIONS.MARK_BOOKING_AS_SEEN,
      payload: { bookingId }
    });
  }, 30000);
  
  return newState;
}
```

#### B. Update BookingTable Component
```jsx
// In BookingTable.jsx
const BookingTable = ({ bookings, newBookingIds, onBookingSeen }) => {
  const isNewBooking = (bookingId) => newBookingIds?.has(bookingId);
  
  return (
    <table className="table">
      <tbody>
        {bookings.map(booking => (
          <tr 
            key={booking.id}
            className={`booking-row ${isNewBooking(booking.id) ? 'booking-row-new' : ''}`}
            onClick={() => onBookingSeen?.(booking.id)}
          >
            <td>
              {isNewBooking(booking.id) && (
                <span className="badge bg-success me-2 animate-pulse">
                  🆕 NEW
                </span>
              )}
              {booking.guest_name}
            </td>
            {/* ... other columns */}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### Approach 2: Component-Level Timing

#### A. Track Creation Time
```jsx
// In booking components
const [recentBookings, setRecentBookings] = useState(new Set());
const HIGHLIGHT_DURATION = 30000; // 30 seconds

useEffect(() => {
  // Listen for new bookings from store
  const checkForNewBookings = () => {
    const currentTime = Date.now();
    const newBookingIds = bookings
      .filter(booking => {
        const createdAt = new Date(booking.created_at).getTime();
        return currentTime - createdAt < HIGHLIGHT_DURATION;
      })
      .map(booking => booking.id);
    
    setRecentBookings(new Set(newBookingIds));
  };
  
  checkForNewBookings();
  const interval = setInterval(checkForNewBookings, 5000);
  
  return () => clearInterval(interval);
}, [bookings]);
```

### Approach 3: Real-time Event Enhancement

#### A. Enhanced Event Handling
```javascript
// In roomBookingStore.jsx
case "booking_created":
  const booking = payload;
  const bookingId = booking.id;
  
  // Add timestamp and highlight flag
  const enhancedBooking = {
    ...booking,
    _highlightUntil: Date.now() + 30000, // 30 seconds from now
    _isNewlyCreated: true
  };
  
  dispatchRef({
    type: ACTIONS.ROOM_BOOKING_CREATED,
    payload: { booking: enhancedBooking, bookingId },
  });
  
  // Show toast with enhanced styling
  this.maybeShowToast('success', `🆕 New booking: ${booking.guest_name}`, event);
  break;
```

## 📋 Specific Component Modifications

### 1. BookingList.jsx Enhancements
```jsx
// Add new booking tracking
const [newBookings, setNewBookings] = useState(new Set());
const roomBookingState = useRoomBookingState();

// Monitor for new bookings
useEffect(() => {
  const currentNewBookings = new Set();
  
  Object.values(roomBookingState.byBookingId).forEach(booking => {
    if (booking._isNewlyCreated && booking._highlightUntil > Date.now()) {
      currentNewBookings.add(booking.id);
    }
  });
  
  setNewBookings(currentNewBookings);
}, [roomBookingState]);

// Pass to BookingTable
<BookingTable
  bookings={bookings}
  newBookingIds={newBookings}
  onBookingSeen={(bookingId) => {
    setNewBookings(prev => {
      const updated = new Set(prev);
      updated.delete(bookingId);
      return updated;
    });
  }}
  // ... other props
/>
```

### 2. RestaurantBookings.jsx Enhancements
```jsx
// Track newly created service bookings
const [highlightedBookings, setHighlightedBookings] = useState(new Set());
const bookingState = useServiceBookingState();

// Auto-highlight logic
useEffect(() => {
  const newHighlighted = new Set();
  const now = Date.now();
  
  storeBookings.forEach(booking => {
    const createdAt = new Date(booking.created_at).getTime();
    if (now - createdAt < 30000) { // 30 seconds
      newHighlighted.add(booking.id);
    }
  });
  
  setHighlightedBookings(newHighlighted);
}, [storeBookings]);

// Enhanced row rendering
const renderRow = (booking) => {
  const isHighlighted = highlightedBookings.has(booking.id);
  
  return (
    <tr
      key={booking.id}
      className={`${isHighlighted ? 'booking-row-new' : ''}`}
      onClick={() => {
        setSelectedBooking(booking);
        if (isHighlighted) {
          setHighlightedBookings(prev => {
            const updated = new Set(prev);
            updated.delete(booking.id);
            return updated;
          });
        }
      }}
    >
      <td>
        {isHighlighted && (
          <span className="badge bg-success me-2">NEW</span>
        )}
        {booking.guest?.full_name || "—"}
      </td>
      {/* ... other columns */}
    </tr>
  );
};
```

## 🎛️ Configuration Options

### Environment-Based Settings
```javascript
// In config/
export const HIGHLIGHT_CONFIG = {
  DURATION: process.env.NODE_ENV === 'development' ? 60000 : 30000, // 1min dev, 30s prod
  ANIMATION_TYPE: 'glow', // 'glow', 'slide', 'pulse', 'bounce'
  AUTO_CLEAR: true,
  SOUND_NOTIFICATION: false,
  SHOW_BADGE: true,
  SHOW_ICON: true,
};
```

### User Preference Settings
```jsx
// In settings context or local storage
const [highlightPreferences, setHighlightPreferences] = useLocalStorage('booking-highlight-prefs', {
  enabled: true,
  duration: 30000,
  animationType: 'glow',
  showBadge: true,
  playSound: false,
});
```

## 🔊 Audio/Visual Enhancements

### Sound Notifications
```javascript
// In booking store event handlers
const playNotificationSound = () => {
  const audio = new Audio('/sounds/new-booking.mp3');
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Audio play failed:', e));
};

// Call on booking_created
this.maybeShowToast('success', `New booking created for ${payload.guest_name}`, event);
if (HIGHLIGHT_CONFIG.SOUND_NOTIFICATION) {
  playNotificationSound();
}
```

### Desktop Notifications
```javascript
// Request permission and show notification
const showDesktopNotification = (booking) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('New Booking Created', {
      body: `${booking.guest_name} - Room ${booking.assigned_room_number}`,
      icon: '/favicon.ico',
      tag: `booking-${booking.id}`,
    });
  }
};
```

## 🧪 Testing Scenarios

### Manual Testing Checklist
- [ ] Create new booking via staff interface → Should highlight immediately
- [ ] Create booking via guest interface → Should appear in staff list highlighted  
- [ ] Multiple rapid bookings → Each should highlight independently
- [ ] Click highlighted booking → Should remove highlight
- [ ] Wait 30 seconds → Highlight should auto-fade
- [ ] Page refresh → Highlights should persist for remaining duration
- [ ] Different booking types → Room vs Service bookings both work

### Automated Testing
```javascript
// Jest test example
describe('New Booking Highlighting', () => {
  test('should highlight newly created bookings', () => {
    const { getByTestId } = render(<BookingTable bookings={bookings} newBookingIds={new Set([1])} />);
    expect(getByTestId('booking-row-1')).toHaveClass('booking-row-new');
  });
});
```

## 📈 Performance Considerations

### Optimization Tips
1. **Debounce highlight updates** to avoid excessive re-renders
2. **Use CSS transitions** instead of JavaScript animations when possible  
3. **Limit highlight duration** to prevent memory leaks
4. **Clean up timers** in component unmount
5. **Use Set for O(1) lookup** instead of array.includes()

### Memory Management
```javascript
// Clean up timers and highlights on unmount
useEffect(() => {
  return () => {
    // Clear any pending timeouts
    clearTimeout(highlightTimeoutRef.current);
    // Clear highlights
    setNewBookings(new Set());
  };
}, []);
```

## 🎨 CSS Framework Integration

### Bootstrap 5 Classes
```css
.booking-row-new {
  @extend .border-start;
  @extend .border-success;
  @extend .border-3;
  background-color: var(--bs-success-bg-subtle);
}
```

### Tailwind CSS Classes
```jsx
className={`
  ${isNew ? 'border-l-4 border-green-500 bg-green-50 animate-pulse' : ''}
  transition-all duration-300
`}
```

## 🔄 Integration with Existing Toast System

### Enhanced Toast for New Bookings
```javascript
// In roomBookingStore.jsx
this.maybeShowToast('success', 
  `🆕 NEW BOOKING: ${booking.guest_name}`, 
  event,
  {
    autoClose: 8000, // Longer duration for new bookings
    className: 'toast-new-booking',
    onClick: () => {
      // Navigate to booking details
      window.location.href = `/staff/bookings?highlight=${booking.id}`;
    }
  }
);
```

## 🎯 Priority Implementation Order

1. **High Priority** - Store-level tracking with Set for new bookings
2. **Medium Priority** - Visual CSS animations and badges
3. **Low Priority** - Sound notifications and desktop alerts
4. **Future Enhancement** - User preference settings and advanced animations

## 🚀 Quick Start Implementation

For fastest implementation, start with:

1. Add `newlyCreated` Set to both booking stores
2. Mark bookings as new on creation events
3. Add basic CSS glow animation
4. Update BookingTable to show NEW badge
5. Auto-clear highlights after 30 seconds

This gives you immediate visual feedback with minimal code changes!