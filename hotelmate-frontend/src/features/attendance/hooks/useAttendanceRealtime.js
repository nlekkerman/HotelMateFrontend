import { useEffect, useRef } from 'react';

/**
 * Safe event handler that validates event structure and normalizes backend data
 * @param {Function} onEvent - Original event callback
 * @param {string} type - Event type
 * @param {*} data - Event data from backend
 */
function safeEventHandler(onEvent, type, data) {
  console.log(`[Attendance Pusher] 📨 safeEventHandler called for ${type}:`, {
    hasOnEvent: typeof onEvent === 'function',
    dataType: typeof data,
    data,
    timestamp: new Date().toISOString()
  });
  
  if (typeof onEvent !== 'function') {
    console.warn(`[Attendance Pusher] ⚠️ No onEvent callback provided for ${type}`);
    return;
  }
  
  try {
    // Normalize backend data into our expected payload structure
    const payload = data && typeof data === 'object' ? data : {};
    
    const normalizedEvent = { type, payload };
    
    console.log(`[Attendance Pusher] ✅ Normalized ${type} event, calling handler:`, {
      event: normalizedEvent,
      hasPayload: Object.keys(payload).length > 0,
      timestamp: new Date().toISOString()
    });
    
    // Call with normalized { type, payload } structure
    onEvent(normalizedEvent);
    
    console.log(`[Attendance Pusher] 🎯 Successfully dispatched ${type} event to handler`);
  } catch (error) {
    console.error(`[Attendance Pusher] ❌ Error handling event ${type}:`, error);
  }
}

/**
 * Hook for real-time attendance updates via Pusher
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {Function} onEvent - Callback for attendance events ({ type, payload })
 */
export function useAttendanceRealtime(hotelSlug, onEvent) {
  // Use ref to avoid dependency on onEvent changing
  const handlerRef = useRef(onEvent);
  
  // Event deduplication to prevent processing the same event multiple times
  const processedEventsRef = useRef(new Set());
  const eventTimeoutRef = useRef(new Map());
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  
  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const hookId = Math.random().toString(36).substr(2, 9);
    console.log(`[Attendance Pusher] 🚀 useAttendanceRealtime called [${hookId}]:`, {
      hotelSlug,
      hasOnEvent: typeof onEvent === 'function',
      timestamp: new Date().toISOString()
    });

    if (!hotelSlug || typeof onEvent !== 'function') {
      console.warn(`[Attendance Pusher] ⚠️ Missing requirements [${hookId}]:`, {
        hotelSlug,
        onEventType: typeof onEvent
      });
      return;
    }

    // Clean up any existing connection first
    if (channelRef.current) {
      console.log(`[Attendance Pusher] 🧹 Cleaning up existing subscription [${hookId}]`);
      channelRef.current.unbind_all();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }

    // Check if Pusher environment variables are available
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;
    
    console.log('[Attendance Pusher] 🔧 Environment check:', {
      hasPusherKey: !!pusherKey,
      pusherKeyLength: pusherKey ? pusherKey.length : 0,
      pusherCluster,
      timestamp: new Date().toISOString()
    });
    
    if (!pusherKey || !pusherCluster) {
      console.warn('[Attendance Pusher] ❌ Pusher configuration missing:', {
        pusherKey: pusherKey ? 'present' : 'missing',
        pusherCluster: pusherCluster || 'missing'
      });
      return;
    }

    const initializePusher = async () => {
      try {
        // Dynamic import with fallback
        let Pusher;
        try {
          Pusher = (await import('pusher-js')).default;
        } catch (importError) {
          console.warn('[Attendance Pusher] Pusher not available:', importError);
          return;
        }

        // Initialize Pusher
        pusherRef.current = new Pusher(pusherKey, {
          cluster: pusherCluster,
          encrypted: true,
        });

        // ✅ Backend uses format: hotel-{hotel_slug} (e.g., hotel-hotel-killarney)
        const channelName = `hotel-${hotelSlug}`;
        console.log('[Attendance Pusher] 📡 Subscribing to channel:', {
          channelName,
          hotelSlug,
          timestamp: new Date().toISOString()
        });
        channelRef.current = pusherRef.current.subscribe(channelName);

        // Bind event handlers with safety wrapper - use ref to avoid re-subscription
        const bindSafeEvent = (eventName, eventType) => {
          channelRef.current.bind(eventName, (data) => {
            console.log(`[Attendance Pusher] ${eventType} event received:`, {
              eventName,
              data,
              timestamp: new Date().toISOString()
            });
            safeEventHandler(handlerRef.current, eventType, data);
          });
        };

        // ✅ MAIN EVENT: Real-time clock status updates (clock in/out, break start/end)
        // Backend sends: { staff_id, user_id, duty_status, current_status, ... }
        channelRef.current.bind('clock-status-updated', (data) => {
          // Create unique event ID for deduplication
          const eventId = `${data?.staff_id}-${data?.user_id}-${data?.action}-${data?.timestamp || Date.now()}`;
          
          // Check if we've already processed this event recently
          if (processedEventsRef.current.has(eventId)) {
            console.log('[Attendance Pusher] 🔄 Duplicate event detected, skipping:', eventId);
            return;
          }
          
          console.log('[Attendance Pusher] 📡 MAIN EVENT clock-status-updated received:', {
            eventId,
            data,
            hasStaffId: !!data?.staff_id,
            hasUserId: !!data?.user_id,
            dutyStatus: data?.duty_status,
            hasCurrentStatus: !!data?.current_status,
            timestamp: new Date().toISOString()
          });
          
          // Mark event as processed
          processedEventsRef.current.add(eventId);
          
          // Remove from processed events after 5 seconds to allow future legitimate events
          const timeoutId = setTimeout(() => {
            processedEventsRef.current.delete(eventId);
            eventTimeoutRef.current.delete(eventId);
          }, 5000);
          
          eventTimeoutRef.current.set(eventId, timeoutId);
          
          // ✅ PURE: Just normalize and call the handler - no side effects
          safeEventHandler(handlerRef.current, 'clock-status-updated', data);
        });

        // Unrostered clock-in request - someone clocked in without being rostered
        bindSafeEvent('attendance-unrostered-request', 'unrostered-request');

        // Break warning - staff member should take a break
        bindSafeEvent('attendance-break-warning', 'break-warning');

        // Overtime warning - staff member is working overtime
        bindSafeEvent('attendance-overtime-warning', 'overtime-warning');

        // Hard limit warning - staff member reached maximum hours
        bindSafeEvent('attendance-hard-limit-warning', 'hard-limit');

        // Clock log approved - unrostered request was approved
        channelRef.current.bind('clocklog-approved', (data) => {
          console.log('[Attendance Pusher] clocklog-approved received:', data);
          safeEventHandler(handlerRef.current, 'log-approved', data);
        });

        // Clock log rejected - unrostered request was rejected
        bindSafeEvent('clocklog-rejected', 'log-rejected');

        // New clock log created/updated - staff clocked in/out
        channelRef.current.bind('clocklog-created', (data) => {
          console.log('[Attendance Pusher] clocklog-created received:', data);
          safeEventHandler(handlerRef.current, 'log-created', data);
        });
        
        channelRef.current.bind('clocklog-updated', (data) => {
          console.log('[Attendance Pusher] clocklog-updated received:', data);
          safeEventHandler(handlerRef.current, 'log-updated', data);
        });

        // Handle unknown event types safely
        channelRef.current.bind_global((eventName, data) => {
          // Only handle unknown attendance-related events
          if (eventName.startsWith('attendance-') || eventName.startsWith('clocklog-')) {
            const knownEvents = [
              'clock-status-updated',
              'attendance-unrostered-request',
              'attendance-break-warning', 
              'attendance-overtime-warning',
              'attendance-hard-limit-warning',
              'clocklog-approved',
              'clocklog-rejected',
              'clocklog-created',
              'clocklog-updated'
            ];
            
            if (!knownEvents.includes(eventName) && !eventName.startsWith('pusher:')) {
              console.warn(`[Attendance Pusher] Unknown event type: ${eventName}`, data);
              safeEventHandler(handlerRef.current, 'unknown-event', { eventName, ...data });
            }
          }
        });

        // Debug: Log when channel is ready
        channelRef.current.bind('pusher:subscription_succeeded', () => {
          console.log('[Attendance Pusher] ✅ Successfully subscribed to:', channelName);
        });
        
        channelRef.current.bind('pusher:subscription_error', (error) => {
          console.error('[Attendance Pusher] ❌ Subscription error:', error);
        });

        // Connection status
        pusherRef.current.connection.bind('connected', () => {
          console.log('[Attendance Pusher] ✅ Connected to Pusher');
        });

        pusherRef.current.connection.bind('error', (error) => {
          console.error('[Attendance Pusher] ❌ Connection error:', error);
        });

      } catch (error) {
        console.error('[Attendance Pusher] Failed to initialize:', error);
      }
    };

    // Initialize Pusher asynchronously
    initializePusher();

    // Cleanup function
    return () => {
      try {
        console.log(`[Attendance Pusher] 🧹 Cleaning up subscription for: hotel-${hotelSlug} [${hookId}]`);
        if (channelRef.current) {
          console.log(`[Attendance Pusher] Unbinding all events from channel [${hookId}]`);
          channelRef.current.unbind_all();
          channelRef.current = null;
        }
        if (pusherRef.current) {
          console.log(`[Attendance Pusher] Unsubscribing and disconnecting from Pusher [${hookId}]`);
          pusherRef.current.unsubscribe(`hotel-${hotelSlug}`);
          pusherRef.current.disconnect();
          pusherRef.current = null;
        }
        
        // Clear event deduplication timeouts
        eventTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        eventTimeoutRef.current.clear();
        processedEventsRef.current.clear();
      } catch (error) {
        console.error(`[Attendance Pusher] Error during cleanup [${hookId}]:`, error);
      }
    };
  }, [hotelSlug]); // ONLY depends on hotelSlug now, not onEvent!
}