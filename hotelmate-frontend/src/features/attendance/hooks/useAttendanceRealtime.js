import { useEffect } from 'react';

/**
 * Safe event handler that validates event structure
 * @param {Function} onEvent - Original event callback
 * @param {string} type - Event type
 * @param {*} data - Event data
 */
function safeEventHandler(onEvent, type, data) {
  if (typeof onEvent !== 'function') return;
  
  try {
    // Validate event structure
    const payload = data && typeof data === 'object' ? data : {};
    onEvent({ type, payload });
  } catch (error) {
    console.error(`[Attendance Pusher] Error handling event ${type}:`, error);
  }
}

/**
 * Hook for real-time attendance updates via Pusher
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {Function} onEvent - Callback for attendance events ({ type, payload })
 */
export function useAttendanceRealtime(hotelSlug, onEvent) {
  useEffect(() => {
    if (!hotelSlug || typeof onEvent !== 'function') return;

    // Check if Pusher environment variables are available
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;
    
    if (!pusherKey || !pusherCluster) {
      console.warn('[Attendance Pusher] Pusher configuration missing');
      return;
    }

    let pusher;
    let channel;

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
        pusher = new Pusher(pusherKey, {
          cluster: pusherCluster,
          encrypted: true,
        });

        const channelName = `hotel-${hotelSlug}`;
        console.log('[Attendance Pusher] Subscribing to channel:', channelName);
        channel = pusher.subscribe(channelName);

        // Bind event handlers with safety wrapper
        const bindSafeEvent = (eventName, eventType) => {
          channel.bind(eventName, (data) => {
            console.log(`[Attendance Pusher] ${eventType} event:`, data);
            safeEventHandler(onEvent, eventType, data);
          });
        };

        // Unrostered clock-in request - someone clocked in without being rostered
        bindSafeEvent('attendance-unrostered-request', 'unrostered-request');

        // Break warning - staff member should take a break
        bindSafeEvent('attendance-break-warning', 'break-warning');

        // Overtime warning - staff member is working overtime
        bindSafeEvent('attendance-overtime-warning', 'overtime-warning');

        // Hard limit warning - staff member reached maximum hours
        bindSafeEvent('attendance-hard-limit-warning', 'hard-limit');

        // Clock log approved - unrostered request was approved
        bindSafeEvent('clocklog-approved', 'log-approved');

        // Clock log rejected - unrostered request was rejected
        bindSafeEvent('clocklog-rejected', 'log-rejected');

        // New clock log created/updated - staff clocked in/out
        bindSafeEvent('clocklog-created', 'log-created');
        bindSafeEvent('clocklog-updated', 'log-updated');

        // Handle unknown event types safely
        channel.bind_global((eventName, data) => {
          // Only handle unknown attendance-related events
          if (eventName.startsWith('attendance-') || eventName.startsWith('clocklog-')) {
            const knownEvents = [
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
              safeEventHandler(onEvent, 'unknown-event', { eventName, ...data });
            }
          }
        });

        // Debug: Log when channel is ready
        channel.bind('pusher:subscription_succeeded', () => {
          console.log('[Attendance Pusher] ✅ Successfully subscribed to:', channelName);
        });
        
        channel.bind('pusher:subscription_error', (error) => {
          console.error('[Attendance Pusher] ❌ Subscription error:', error);
        });

        // Connection status
        pusher.connection.bind('connected', () => {
          console.log('[Attendance Pusher] ✅ Connected to Pusher');
        });

        pusher.connection.bind('error', (error) => {
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
        if (channel) {
          console.log('[Attendance Pusher] Unsubscribing from channel');
          channel.unbind_all();
        }
        if (pusher) {
          if (channel) {
            pusher.unsubscribe(`hotel-${hotelSlug}`);
          }
          pusher.disconnect();
        }
      } catch (error) {
        console.error('[Attendance Pusher] Error during cleanup:', error);
      }
    };
  }, [hotelSlug, onEvent]);
}