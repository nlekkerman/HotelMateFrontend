import { useEffect } from 'react';
import Pusher from 'pusher-js';

/**
 * Hook for real-time attendance updates via Pusher
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {Function} onEvent - Callback for attendance events ({ type, payload })
 */
export function useAttendanceRealtime(hotelSlug, onEvent) {
  useEffect(() => {
    if (!hotelSlug) return;

    // Initialize Pusher using the same pattern as other features
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      encrypted: true,
    });

    const channelName = `hotel-${hotelSlug}`;
    console.log('[Attendance Pusher] Subscribing to channel:', channelName);
    const channel = pusher.subscribe(channelName);

    // Unrostered clock-in request - someone clocked in without being rostered
    channel.bind('attendance-unrostered-request', (data) => {
      console.log('[Attendance Pusher] 🚨 Unrostered request:', data);
      onEvent?.({ type: 'unrostered-request', payload: data });
    });

    // Break warning - staff member should take a break
    channel.bind('attendance-break-warning', (data) => {
      console.log('[Attendance Pusher] ⏰ Break warning:', data);
      onEvent?.({ type: 'break-warning', payload: data });
    });

    // Overtime warning - staff member is working overtime
    channel.bind('attendance-overtime-warning', (data) => {
      console.log('[Attendance Pusher] ⏰ Overtime warning:', data);
      onEvent?.({ type: 'overtime-warning', payload: data });
    });

    // Hard limit warning - staff member reached maximum hours
    channel.bind('attendance-hard-limit-warning', (data) => {
      console.log('[Attendance Pusher] 🔴 Hard limit warning:', data);
      onEvent?.({ type: 'hard-limit', payload: data });
    });

    // Clock log approved - unrostered request was approved
    channel.bind('clocklog-approved', (data) => {
      console.log('[Attendance Pusher] ✅ Clock log approved:', data);
      onEvent?.({ type: 'log-approved', payload: data });
    });

    // Clock log rejected - unrostered request was rejected
    channel.bind('clocklog-rejected', (data) => {
      console.log('[Attendance Pusher] ❌ Clock log rejected:', data);
      onEvent?.({ type: 'log-rejected', payload: data });
    });

    // New clock log created/updated - staff clocked in/out
    channel.bind('clocklog-created', (data) => {
      console.log('[Attendance Pusher] 🔄 Clock log created:', data);
      onEvent?.({ type: 'log-created', payload: data });
    });

    channel.bind('clocklog-updated', (data) => {
      console.log('[Attendance Pusher] 🔄 Clock log updated:', data);
      onEvent?.({ type: 'log-updated', payload: data });
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

    // Cleanup
    return () => {
      console.log('[Attendance Pusher] Unsubscribing from channel:', channelName);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [hotelSlug, onEvent]);
}