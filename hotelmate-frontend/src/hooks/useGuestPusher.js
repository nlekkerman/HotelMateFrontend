import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;

export function useGuestPusher(channelName, eventHandlers) {
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

    console.log(`✅ Guest subscribed to Pusher channel: ${channelName}`);

    // Cleanup
    return () => {
      if (channelRef.current) {
        Object.keys(eventHandlers).forEach(event => {
          channelRef.current.unbind(event);
        });
        pusherRef.current.unsubscribe(channelName);
      }
      pusherRef.current?.disconnect();
      console.log(`🔌 Guest disconnected from Pusher channel: ${channelName}`);
    };
  }, [channelName]);

  return { pusher: pusherRef.current, channel: channelRef.current };
}
