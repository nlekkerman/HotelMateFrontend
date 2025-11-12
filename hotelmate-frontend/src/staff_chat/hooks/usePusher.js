import { useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import { pusherLogger } from '../utils/logger';

/**
 * Custom hook for managing Pusher real-time connections
 * Handles subscription to channels and event binding
 * 
 * @param {Object} config - Pusher configuration
 * @param {string} config.appKey - Pusher app key
 * @param {string} config.cluster - Pusher cluster
 * @param {boolean} config.enabled - Whether Pusher is enabled
 * @returns {Object} Pusher management functions
 */
const usePusher = ({ appKey, cluster = 'mt1', enabled = true }) => {
  const pusherRef = useRef(null);
  const channelsRef = useRef({});
  const eventHandlersRef = useRef({});

  /**
   * Initialize Pusher connection
   */
  useEffect(() => {
    if (!enabled || !appKey) {
      return;
    }

    try {
      // Initialize Pusher instance
      pusherRef.current = new Pusher(appKey, {
        cluster,
        encrypted: true,
        authEndpoint: '/api/pusher/auth', // Adjust based on your backend
        auth: {
          headers: {
            // Add authentication headers if needed
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      });

      // Connection state logging
      pusherRef.current.connection.bind('connected', () => {
        pusherLogger.connection('Connected');
      });

      pusherRef.current.connection.bind('disconnected', () => {
        pusherLogger.connection('Disconnected');
      });

      pusherRef.current.connection.bind('error', (err) => {
        pusherLogger.error('Connection error', err);
      });

      return () => {
        // Cleanup: unbind all events and disconnect
        if (pusherRef.current) {
          Object.keys(channelsRef.current).forEach(channelName => {
            const channel = channelsRef.current[channelName];
            if (channel) {
              channel.unbind_all();
              pusherRef.current.unsubscribe(channelName);
            }
          });
          pusherRef.current.disconnect();
          pusherRef.current = null;
          channelsRef.current = {};
          eventHandlersRef.current = {};
        }
      };
    } catch (error) {
      pusherLogger.error('Initialization failed', error);
    }
  }, [appKey, cluster, enabled]);

  /**
   * Subscribe to a channel
   * @param {string} channelName - Name of the channel to subscribe to
   * @returns {Object|null} Channel object or null
   */
  const subscribe = useCallback((channelName) => {
    if (!pusherRef.current || !channelName) {
      return null;
    }

    // Return existing channel if already subscribed
    if (channelsRef.current[channelName]) {
      return channelsRef.current[channelName];
    }

    try {
      const channel = pusherRef.current.subscribe(channelName);
      channelsRef.current[channelName] = channel;
      
      pusherLogger.channel(`Subscribed: ${channelName}`);
      return channel;
    } catch (error) {
      pusherLogger.error(`Subscribe failed: ${channelName}`, error);
      return null;
    }
  }, []);

  /**
   * Unsubscribe from a channel
   * @param {string} channelName - Name of the channel to unsubscribe from
   */
  const unsubscribe = useCallback((channelName) => {
    if (!pusherRef.current || !channelName) return;

    try {
      const channel = channelsRef.current[channelName];
      if (channel) {
        channel.unbind_all();
        pusherRef.current.unsubscribe(channelName);
        delete channelsRef.current[channelName];
        delete eventHandlersRef.current[channelName];
        pusherLogger.channel(`Unsubscribed: ${channelName}`);
      }
    } catch (error) {
      pusherLogger.error(`Unsubscribe failed: ${channelName}`, error);
    }
  }, []);

  /**
   * Bind an event handler to a channel
   * @param {string} channelName - Channel name
   * @param {string} eventName - Event name
   * @param {Function} callback - Event handler callback
   */
  const bind = useCallback((channelName, eventName, callback) => {
    if (!channelName || !eventName || !callback) {
      return;
    }

    const channel = subscribe(channelName);
    if (!channel) return;

    try {
      channel.bind(eventName, callback);
      
      // Track event handlers for cleanup
      if (!eventHandlersRef.current[channelName]) {
        eventHandlersRef.current[channelName] = {};
      }
      if (!eventHandlersRef.current[channelName][eventName]) {
        eventHandlersRef.current[channelName][eventName] = [];
      }
      eventHandlersRef.current[channelName][eventName].push(callback);
      
      pusherLogger.event(`Bound ${eventName} on ${channelName}`);
    } catch (error) {
      pusherLogger.error(`Bind failed: ${eventName} on ${channelName}`, error);
    }
  }, [subscribe]);

  /**
   * Unbind an event handler from a channel
   * @param {string} channelName - Channel name
   * @param {string} eventName - Event name
   * @param {Function} callback - Optional specific callback to unbind
   */
  const unbind = useCallback((channelName, eventName, callback = null) => {
    if (!channelName || !eventName) return;

    const channel = channelsRef.current[channelName];
    if (!channel) return;

    try {
      if (callback) {
        channel.unbind(eventName, callback);
      } else {
        channel.unbind(eventName);
      }

      // Clean up event handlers tracking
      if (eventHandlersRef.current[channelName]?.[eventName]) {
        if (callback) {
          eventHandlersRef.current[channelName][eventName] = 
            eventHandlersRef.current[channelName][eventName].filter(cb => cb !== callback);
        } else {
          delete eventHandlersRef.current[channelName][eventName];
        }
      }

      pusherLogger.event(`Unbound ${eventName} from ${channelName}`);
    } catch (error) {
      pusherLogger.error(`Unbind failed: ${eventName} from ${channelName}`, error);
    }
  }, []);

  /**
   * Get the current Pusher connection state
   * @returns {string} Connection state
   */
  const getConnectionState = useCallback(() => {
    if (!pusherRef.current) return 'disconnected';
    return pusherRef.current.connection.state;
  }, []);

  /**
   * Check if currently connected
   * @returns {boolean} True if connected
   */
  const isConnected = useCallback(() => {
    return getConnectionState() === 'connected';
  }, [getConnectionState]);

  /**
   * Get channel by name
   * @param {string} channelName - Channel name
   * @returns {Object|null} Channel object or null
   */
  const getChannel = useCallback((channelName) => {
    return channelsRef.current[channelName] || null;
  }, []);

  return {
    pusher: pusherRef.current,
    subscribe,
    unsubscribe,
    bind,
    unbind,
    getConnectionState,
    isConnected,
    getChannel
  };
};

export default usePusher;
