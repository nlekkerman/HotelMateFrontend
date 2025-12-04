// src/realtime/stores/notificationsStore.js
import React, { createContext, useContext, useReducer } from 'react';

// Notification actions
const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
const MARK_READ = 'MARK_READ';
const MARK_ALL_READ = 'MARK_ALL_READ';

// Initial state
const initialState = {
  items: []
};

// Reducer
function notificationsReducer(state, action) {
  switch (action.type) {
    case ADD_NOTIFICATION:
      const newNotification = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        ...action.payload,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      // Keep max 200 notifications, remove oldest
      const updatedItems = [newNotification, ...state.items].slice(0, 200);
      
      return {
        ...state,
        items: updatedItems
      };

    case MARK_READ:
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, read: true } : item
        )
      };

    case MARK_ALL_READ:
      return {
        ...state,
        items: state.items.map(item => ({ ...item, read: true }))
      };

    default:
      return state;
  }
}

// Context
const NotificationsContext = createContext(null);

// Provider component
export function NotificationsProvider({ children }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  const addNotification = (notification) => {
    dispatch({ type: ADD_NOTIFICATION, payload: notification });
  };

  const markAsRead = (id) => {
    dispatch({ type: MARK_READ, payload: { id } });
  };

  const markAllAsRead = () => {
    dispatch({ type: MARK_ALL_READ });
  };

  const value = {
    notifications: state.items,
    unreadCount: state.items.filter(item => !item.read).length,
    addNotification,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

// Helper function for eventBus to add notifications
export function addNotificationFromEvent(normalizedEvent) {
  // This will be called from eventBus.js
  // Since we can't access React context from outside components,
  // we'll use a global callback pattern set by the provider
  if (window.addNotificationCallback) {
    window.addNotificationCallback({
      category: normalizedEvent.category,
      title: normalizedEvent.title,
      message: normalizedEvent.message,
      level: normalizedEvent.level,
      meta: {
        eventType: normalizedEvent.eventType,
        source: normalizedEvent.source,
        data: normalizedEvent.data
      }
    });
  }
}

// Enhanced provider that sets up the global callback
export function NotificationsProviderWithCallback({ children }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  const addNotification = (notification) => {
    dispatch({ type: ADD_NOTIFICATION, payload: notification });
  };

  const markAsRead = (id) => {
    dispatch({ type: MARK_READ, payload: { id } });
  };

  const markAllAsRead = () => {
    dispatch({ type: MARK_ALL_READ });
  };

  // Set up global callback for eventBus
  React.useEffect(() => {
    window.addNotificationCallback = addNotification;
    
    return () => {
      delete window.addNotificationCallback;
    };
  }, []);

  const value = {
    notifications: state.items,
    unreadCount: state.items.filter(item => !item.read).length,
    addNotification,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}