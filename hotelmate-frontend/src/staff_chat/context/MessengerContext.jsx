import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * MessengerContext - Provides methods to control the MessengerWidget
 * Allows opening chat windows from anywhere in the app
 */
const MessengerContext = createContext(null);

/**
 * Custom hook to access Messenger context
 * @returns {Object} Messenger context value
 * @throws {Error} If used outside MessengerProvider
 */
export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within a MessengerProvider');
  }
  return context;
};

/**
 * MessengerProvider Component
 * Wraps the app to provide messenger control methods
 */
export const MessengerProvider = ({ children }) => {
  const [openChatHandler, setOpenChatHandler] = useState(null);

  /**
   * Register the handler to open chat windows
   * Called by MessengerWidget on mount
   */
  const registerOpenChatHandler = useCallback((handler) => {
    console.log('📱 [MessengerContext] Registering openChat handler');
    setOpenChatHandler(() => handler);
  }, []);

  /**
   * Open a chat window
   * @param {Object} conversation - Conversation object
   * @param {Object} staff - Staff object (for 1-on-1 chats)
   */
  const openChat = useCallback((conversation, staff) => {
    console.log('📱 [MessengerContext] openChat called:', { conversation, staff });
    if (openChatHandler) {
      openChatHandler(conversation, staff);
    } else {
      console.warn('⚠️ [MessengerContext] No openChat handler registered');
    }
  }, [openChatHandler]);

  const contextValue = {
    openChat,
    registerOpenChatHandler,
    isReady: !!openChatHandler
  };

  return (
    <MessengerContext.Provider value={contextValue}>
      {children}
    </MessengerContext.Provider>
  );
};

MessengerProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default MessengerProvider;
