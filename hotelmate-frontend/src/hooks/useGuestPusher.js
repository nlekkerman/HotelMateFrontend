import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;

/**
 * Hook to manage Pusher subscriptions for guest chat
 * @param {Array} channels - Array of channel configurations: [{ name: string, events: { eventName: handler } }]
 * @returns {Object} - { pusher, channels }
 */
export function useGuestPusher(channels) {
  const pusherRef = useRef(null);
  const channelsRef = useRef(new Map());
  const eventHandlersRef = useRef(channels);

  // Update event handlers ref when they change, but don't re-subscribe
  useEffect(() => {
    eventHandlersRef.current = channels;
  }, [channels]);

  useEffect(() => {
    // Validate input
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      console.log('⏭️ No channels provided to useGuestPusher');
      return;
    }

    // Filter out invalid channels
    const validChannels = channels.filter(ch => ch && ch.name && ch.events);
    if (validChannels.length === 0) {
      console.log('⏭️ No valid channels to subscribe to');
      return;
    }

    console.log('🔌 Initializing Pusher for guest chat');
    console.log('📡 Channels to subscribe:', validChannels.map(ch => ch.name));

    // Initialize Pusher instance (shared across all channels)
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

    // Subscribe to all channels
    validChannels.forEach((channelConfig) => {
      const { name: channelName, events: eventHandlers } = channelConfig;
      
      console.log(`📡 Subscribing to channel: ${channelName}`);
      const channel = pusherRef.current.subscribe(channelName);
      channelsRef.current.set(channelName, channel);

      // Channel subscription events
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ Successfully subscribed to: ${channelName}`);
      });

      channel.bind('pusher:subscription_error', (error) => {
        console.error(`❌ Subscription error for ${channelName}:`, error);
      });

      // Bind event handlers
      console.log(`🎧 Binding event handlers for ${channelName}:`, Object.keys(eventHandlers));
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        console.log(`🎧 Binding event listener for: "${event}" on channel "${channelName}"`);
        channel.bind(event, (data) => {
          console.log(`📨 [PUSHER EVENT] Received "${event}" on channel "${channelName}":`, data);
          console.log('📨 [PUSHER EVENT] Event data type:', typeof data);
          console.log('📨 [PUSHER EVENT] Event data keys:', Object.keys(data || {}));
          
          // Find the current channel config and call the latest version of the handler
          const currentChannelConfig = eventHandlersRef.current.find(ch => ch.name === channelName);
          if (currentChannelConfig && currentChannelConfig.events[event]) {
            console.log(`✅ [PUSHER EVENT] Calling handler for "${event}"`);
            currentChannelConfig.events[event](data);
          } else {
            console.warn(`⚠️ [PUSHER EVENT] No handler found for "${event}" on channel "${channelName}"`);
          }
        });
      });

      console.log(`✅ Guest subscribed to Pusher channel: ${channelName}`);
    });

    // Cleanup - when channels change or component unmounts
    return () => {
      console.log('🔌 Cleaning up all Pusher subscriptions');
      
      // Unsubscribe from all channels
      channelsRef.current.forEach((channel, channelName) => {
        console.log(`🔌 Cleaning up channel: ${channelName}`);
        
        // Find the channel config to get event names
        const channelConfig = eventHandlersRef.current.find(ch => ch.name === channelName);
        if (channelConfig) {
          Object.keys(channelConfig.events).forEach(event => {
            channel.unbind(event);
          });
        }
        
        channel.unbind('pusher:subscription_succeeded');
        channel.unbind('pusher:subscription_error');
        pusherRef.current.unsubscribe(channelName);
      });
      
      channelsRef.current.clear();
      
      // Disconnect Pusher instance
      if (pusherRef.current) {
        pusherRef.current.connection.unbind('connected');
        pusherRef.current.connection.unbind('error');
        pusherRef.current.disconnect();
      }
      
      console.log('🔌 Guest disconnected from all Pusher channels');
    };
  }, [JSON.stringify(channels?.map(ch => ch.name))]); // Re-subscribe only when channel names change

  return { pusher: pusherRef.current, channels: channelsRef.current };
}
