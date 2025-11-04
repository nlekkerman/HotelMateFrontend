import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;

export function useGuestPusher(channelName, eventHandlers) {
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const eventHandlersRef = useRef(eventHandlers);

  // Update event handlers ref when they change, but don't re-subscribe
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    if (!channelName) return;

    console.log('🔌 Initializing Pusher for guest chat');
    console.log('📡 Channel:', channelName);

    // Initialize Pusher (only once per channel)
    pusherRef.current = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      encrypted: true
    });

    // Connection event listeners
    pusherRef.current.connection.bind('connected', () => {
      console.log('✅ Pusher connected successfully');
    });

    pusherRef.current.connection.bind('error', (err) => {
      console.error('❌ Pusher connection error:', err);
    });

    // Subscribe to channel
    channelRef.current = pusherRef.current.subscribe(channelName);

    // Channel subscription events
    channelRef.current.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ Successfully subscribed to: ${channelName}`);
    });

    channelRef.current.bind('pusher:subscription_error', (error) => {
      console.error('❌ Subscription error:', error);
    });

    // Bind event handlers using stable references
    console.log('🎧 Binding event handlers:', Object.keys(eventHandlersRef.current));
    Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
      console.log(`🎧 Binding event listener for: "${event}"`);
      channelRef.current.bind(event, (data) => {
        console.log(`📨 [PUSHER EVENT] Received "${event}" on channel "${channelName}":`, data);
        console.log('📨 [PUSHER EVENT] Event data type:', typeof data);
        console.log('📨 [PUSHER EVENT] Event data keys:', Object.keys(data || {}));
        
        // Call the latest version of the handler
        if (eventHandlersRef.current[event]) {
          console.log(`✅ [PUSHER EVENT] Calling handler for "${event}"`);
          eventHandlersRef.current[event](data);
        } else {
          console.warn(`⚠️ [PUSHER EVENT] No handler found for "${event}"`);
        }
      });
    });

    console.log(`✅ Guest subscribed to Pusher channel: ${channelName}`);

    // Cleanup - only when channel changes or component unmounts
    return () => {
      console.log(`🔌 Cleaning up Pusher subscription for: ${channelName}`);
      
      if (channelRef.current) {
        // Unbind all events
        Object.keys(eventHandlersRef.current).forEach(event => {
          channelRef.current.unbind(event);
        });
        channelRef.current.unbind('pusher:subscription_succeeded');
        channelRef.current.unbind('pusher:subscription_error');
        
        // Unsubscribe from channel
        pusherRef.current.unsubscribe(channelName);
      }
      
      // Disconnect Pusher instance
      if (pusherRef.current) {
        pusherRef.current.connection.unbind('connected');
        pusherRef.current.connection.unbind('error');
        pusherRef.current.disconnect();
      }
      
      console.log(`🔌 Guest disconnected from Pusher channel: ${channelName}`);
    };
  }, [channelName]); // Only re-subscribe when channel name changes

  return { pusher: pusherRef.current, channel: channelRef.current };
}
