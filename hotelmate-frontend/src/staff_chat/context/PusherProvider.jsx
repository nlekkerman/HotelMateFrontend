import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import usePusher from '../hooks/usePusher';

/**
 * PusherContext - Provides Pusher instance and methods throughout the app
 */
const PusherContext = createContext(null);

/**
 * Custom hook to access Pusher context
 * @returns {Object} Pusher context value
 * @throws {Error} If used outside PusherProvider
 */
export const usePusherContext = () => {
  const context = useContext(PusherContext);
  if (!context) {
    throw new Error('usePusherContext must be used within a PusherProvider');
  }
  return context;
};

/**
 * PusherProvider Component
 * Wraps the app with Pusher real-time functionality
 * 
 * Usage:
 * ```jsx
 * <PusherProvider appKey="your-app-key" cluster="mt1" enabled={true}>
 *   <App />
 * </PusherProvider>
 * ```
 */
const PusherProvider = ({ 
  children, 
  appKey, 
  cluster = 'mt1', 
  enabled = true 
}) => {
  const [isReady, setIsReady] = useState(false);
  const pusherMethods = usePusher({ appKey, cluster, enabled });

  // Set ready state when Pusher is connected (not just initialized)
  useEffect(() => {
    if (!enabled || !appKey || !pusherMethods.pusher) {
      setIsReady(false);
      return;
    }

    // Check initial connection state
    const checkConnection = () => {
      const state = pusherMethods.getConnectionState();
      console.log('🔌 [PusherProvider] Connection state:', state);
      setIsReady(state === 'connected');
    };

    // Bind to connection state changes
    const handleConnected = () => {
      console.log('✅ [PusherProvider] Pusher connected - isReady = true');
      setIsReady(true);
    };

    const handleDisconnected = () => {
      console.log('❌ [PusherProvider] Pusher disconnected - isReady = false');
      setIsReady(false);
    };

    if (pusherMethods.pusher) {
      pusherMethods.pusher.connection.bind('connected', handleConnected);
      pusherMethods.pusher.connection.bind('disconnected', handleDisconnected);
      
      // Check initial state
      checkConnection();
    }

    // Cleanup
    return () => {
      if (pusherMethods.pusher) {
        pusherMethods.pusher.connection.unbind('connected', handleConnected);
        pusherMethods.pusher.connection.unbind('disconnected', handleDisconnected);
      }
    };
  }, [enabled, appKey, pusherMethods.pusher, pusherMethods.getConnectionState]);

  const contextValue = {
    ...pusherMethods,
    isReady,
    enabled
  };

  return (
    <PusherContext.Provider value={contextValue}>
      {children}
    </PusherContext.Provider>
  );
};

PusherProvider.propTypes = {
  /** Child components */
  children: PropTypes.node.isRequired,
  /** Pusher app key */
  appKey: PropTypes.string.isRequired,
  /** Pusher cluster (default: 'mt1') */
  cluster: PropTypes.string,
  /** Enable/disable Pusher */
  enabled: PropTypes.bool
};

PusherProvider.defaultProps = {
  cluster: 'mt1',
  enabled: true
};

export default PusherProvider;
