// src/utils/guestNotifications.jsx
import { toast } from 'react-toastify';

/**
 * Show guest message notification to all staff
 * Called from eventBus when new-guest-message event is received on hotel-level channel
 * @param {Object} data - Guest message notification data
 * @param {string} data.guest_name - Name of guest who sent message
 * @param {string} data.room_number - Room number of guest
 * @param {string} data.message_preview - Preview of message content
 * @param {string} data.conversation_id - ID of conversation
 * @param {string} data.booking_id - ID of booking
 * @param {string} data.hotel_slug - Hotel slug
 */
export function showGuestMessageNotification(data) {
  const {
    guest_name = 'Guest',
    room_number = 'Unknown',
    message_preview = 'New message',
    conversation_id,
    booking_id,
    hotel_slug
  } = data;

  // Create clickable toast notification
  toast.info(
    <div 
      style={{ 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '4px'
      }}
      onClick={() => {
        // Navigate to guest conversation when clicked
        if (conversation_id && hotel_slug) {
          // Use the existing chat window URL pattern
          window.location.href = `/chat/${hotel_slug}/conversations/${conversation_id}/messages`;
        }
        toast.dismiss();
      }}
    >
      {/* Guest Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          flexShrink: 0
        }}
      >
        🏨
      </div>

      {/* Message Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px',
          color: '#111827',
          marginBottom: '4px'
        }}>
          Guest Message - Room {room_number}
        </div>
        <div style={{ 
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          From: {guest_name}
        </div>
        <div style={{ 
          fontSize: '13px',
          color: '#374151',
          lineHeight: '1.4'
        }}>
          {message_preview}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#9ca3af',
          marginTop: '6px'
        }}>
          Click to handle this conversation
        </div>
      </div>
    </div>,
    {
      position: "top-right",
      autoClose: 8000, // 8 seconds
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: 'guest-message-toast',
      toastId: `guest-msg-${conversation_id}`, // Prevent duplicates
    }
  );

  // Play notification sound if available
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3; // Lower volume for less intrusive sound
    audio.play().catch(() => {
      // Silently fail if sound cannot play
    });
  } catch (err) {
    // Ignore audio errors
  }
}

/**
 * Show staff assignment notification 
 * Called when staff gets assigned to a guest conversation
 * @param {Object} data - Assignment notification data
 * @param {string} data.guest_name - Name of guest
 * @param {string} data.room_number - Room number
 * @param {number} data.unread_count - Number of unread messages
 * @param {string} data.conversation_id - Conversation ID
 */
export function showStaffAssignmentNotification(data) {
  const {
    guest_name = 'Guest',
    room_number = 'Unknown',
    unread_count = 0,
    conversation_id
  } = data;

  const title = `💬 Assigned to Guest Chat - Room ${room_number}`;
  const body = unread_count > 0 
    ? `You have ${unread_count} unread messages from ${guest_name}`
    : `You are now handling ${guest_name}'s conversation`;

  toast.success(
    <div style={{ padding: '4px' }}>
      <div style={{ 
        fontWeight: '600', 
        fontSize: '14px',
        color: '#059669',
        marginBottom: '4px'
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '13px',
        color: '#374151'
      }}>
        {body}
      </div>
    </div>,
    {
      position: "top-right",
      autoClose: 5000,
      toastId: `staff-assigned-${conversation_id}`,
    }
  );
}