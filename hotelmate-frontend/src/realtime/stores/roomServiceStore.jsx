// src/realtime/stores/roomServiceStore.jsx
import React, { createContext, useContext, useReducer } from 'react';

// State contexts
const RoomServiceStateContext = createContext(null);
const RoomServiceDispatchContext = createContext(null);

// Initial state
const initialState = {
  ordersById: {}, // { [orderId]: { id, room_number, status, items, created_at, ... } }
  pendingOrders: [], // Array of pending order IDs for quick access
  activeOrderId: null, // Currently selected order ID
  lastEventTimestamps: {}, // for deduplication: { [key]: timestamp }
};

// Actions
const ACTIONS = {
  INIT_ORDERS_FROM_API: 'INIT_ORDERS_FROM_API',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  ORDER_DELETED: 'ORDER_DELETED',
  SET_ACTIVE_ORDER: 'SET_ACTIVE_ORDER',
};

// Reducer function
function roomServiceReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INIT_ORDERS_FROM_API: {
      const { orders } = action.payload;
      
      // Convert orders array to ordersById map
      let ordersById = {};
      let pendingOrders = [];
      
      if (Array.isArray(orders)) {
        orders.forEach(order => {
          if (order && order.id) {
            ordersById[order.id] = order;
            
            // Track pending orders for quick access
            if (order.status === 'pending' || order.status === 'preparing') {
              pendingOrders.push(order.id);
            }
          }
        });
      }

      return {
        ...state,
        ordersById: { ...state.ordersById, ...ordersById },
        pendingOrders,
      };
    }

    case ACTIONS.ORDER_CREATED: {
      const { order } = action.payload;
      
      if (!order || !order.id) {
        console.warn('[roomServiceStore] ORDER_CREATED: Invalid order data', order);
        return state;
      }

      const newOrdersById = {
        ...state.ordersById,
        [order.id]: order,
      };

      // Add to pending orders if applicable
      const newPendingOrders = [...state.pendingOrders];
      if ((order.status === 'pending' || order.status === 'preparing') && 
          !newPendingOrders.includes(order.id)) {
        newPendingOrders.push(order.id);
      }

      return {
        ...state,
        ordersById: newOrdersById,
        pendingOrders: newPendingOrders,
      };
    }

    case ACTIONS.ORDER_UPDATED:
    case ACTIONS.ORDER_STATUS_CHANGED: {
      const { order, orderId } = action.payload;
      const targetOrderId = order?.id || orderId;
      
      if (!targetOrderId || !state.ordersById[targetOrderId]) {
        console.warn('[roomServiceStore] ORDER_UPDATED: Order not found', targetOrderId);
        return state;
      }

      const existingOrder = state.ordersById[targetOrderId];
      const updatedOrder = order ? { ...existingOrder, ...order } : existingOrder;

      const newOrdersById = {
        ...state.ordersById,
        [targetOrderId]: updatedOrder,
      };

      // Update pending orders list based on new status
      let newPendingOrders = [...state.pendingOrders];
      const isPending = updatedOrder.status === 'pending' || updatedOrder.status === 'preparing';
      const isCurrentlyPending = newPendingOrders.includes(targetOrderId);

      if (isPending && !isCurrentlyPending) {
        newPendingOrders.push(targetOrderId);
      } else if (!isPending && isCurrentlyPending) {
        newPendingOrders = newPendingOrders.filter(id => id !== targetOrderId);
      }

      return {
        ...state,
        ordersById: newOrdersById,
        pendingOrders: newPendingOrders,
      };
    }

    case ACTIONS.ORDER_DELETED: {
      const { orderId } = action.payload;
      
      if (!orderId || !state.ordersById[orderId]) {
        console.warn('[roomServiceStore] ORDER_DELETED: Order not found', orderId);
        return state;
      }

      const { [orderId]: deletedOrder, ...remainingOrders } = state.ordersById;
      const newPendingOrders = state.pendingOrders.filter(id => id !== orderId);

      return {
        ...state,
        ordersById: remainingOrders,
        pendingOrders: newPendingOrders,
        activeOrderId: state.activeOrderId === orderId ? null : state.activeOrderId,
      };
    }

    case ACTIONS.SET_ACTIVE_ORDER: {
      const { orderId } = action.payload;
      
      return {
        ...state,
        activeOrderId: orderId,
      };
    }

    default:
      console.warn('[roomServiceStore] Unknown action type:', action.type);
      return state;
  }
}

// Action creators and handlers for external use
let dispatchRef = null;

// Provider component
export const RoomServiceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomServiceReducer, initialState);

  // Save dispatch reference for roomServiceActions
  dispatchRef = dispatch;

  return (
    <RoomServiceStateContext.Provider value={state}>
      <RoomServiceDispatchContext.Provider value={dispatch}>
        {children}
      </RoomServiceDispatchContext.Provider>
    </RoomServiceStateContext.Provider>
  );
};

// Hook to use room service state
export const useRoomServiceState = () => {
  const state = useContext(RoomServiceStateContext);
  if (state === null) {
    throw new Error('useRoomServiceState must be used within a RoomServiceProvider');
  }
  return state;
};

// Hook to use room service dispatch
export const useRoomServiceDispatch = () => {
  const dispatch = useContext(RoomServiceDispatchContext);
  if (dispatch === null) {
    throw new Error('useRoomServiceDispatch must be used within a RoomServiceProvider');
  }
  return dispatch;
};

// Actions object for handling events from eventBus
export const roomServiceActions = {
  _processedEventIds: new Set(), // Event ID-based deduplication

  handleEvent(event) {
    if (!dispatchRef) {
      console.warn("[roomServiceStore] handleEvent called before store is ready");
      return;
    }

    // ✅ NEW: Handle unified backend event format {category, type, payload, meta}
    let eventType, payload, eventId;
    
    if (event.category && event.type && event.payload) {
      // New format from backend
      eventType = event.type;
      payload = event.payload;
      eventId = event.meta?.event_id;
    } else {
      // Legacy format for backward compatibility
      eventType = event.eventType;
      payload = event.data;
      eventId = null;
    }

    // ✅ Event deduplication using event.meta.event_id (preferred) or timestamp window
    let deduplicationKey;
    if (eventId) {
      deduplicationKey = eventId;
    } else {
      deduplicationKey = `order:${payload?.order_id || payload?.id || 'unknown'}:${eventType}`;
    }

    if (roomServiceActions._processedEventIds.has(deduplicationKey)) {
      console.log("[roomServiceStore] Duplicate event detected, skipping:", deduplicationKey);
      return;
    }

    // Store event ID to prevent duplicates
    roomServiceActions._processedEventIds.add(deduplicationKey);

    // Clean up old event IDs (keep only last 1000)
    if (roomServiceActions._processedEventIds.size > 1000) {
      const eventIds = Array.from(roomServiceActions._processedEventIds);
      const toDelete = eventIds.slice(0, 500);
      toDelete.forEach(id => roomServiceActions._processedEventIds.delete(id));
    }

    console.log("[roomServiceStore] Processing event:", eventType, payload);

    // ✅ Handle events from the guide
    switch (eventType) {
      case "order_created":
        dispatchRef({
          type: ACTIONS.ORDER_CREATED,
          payload: { order: payload },
        });
        break;

      case "order_updated":
        dispatchRef({
          type: ACTIONS.ORDER_STATUS_CHANGED,
          payload: { order: payload, orderId: payload?.order_id || payload?.id },
        });
        break;

      // Legacy event types (for backward compatibility)
      case "new_room_service_order":
      case "new_breakfast_order":
        dispatchRef({
          type: ACTIONS.ORDER_CREATED,
          payload: { order: payload },
        });
        break;

      case "order_status_changed":
      case "order_accepted":
      case "order_preparing":
      case "order_ready":
      case "order_delivered":
      case "order_cancelled":
        dispatchRef({
          type: ACTIONS.ORDER_STATUS_CHANGED,
          payload: { order: payload, orderId: payload?.id || payload?.orderId },
        });
        break;

      case "order_deleted":
        dispatchRef({
          type: ACTIONS.ORDER_DELETED,
          payload: { orderId: payload?.id || payload?.orderId },
        });
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[roomServiceStore] Ignoring eventType:", eventType, event);
        }
        break;
    }
  },

  // Helper to initialize from API data
  initFromAPI(orders) {
    if (!dispatchRef) {
      console.warn("[roomServiceStore] initFromAPI called before store is ready");
      return;
    }
    
    dispatchRef({
      type: ACTIONS.INIT_ORDERS_FROM_API,
      payload: { orders }
    });
  },

  // Helper to set active order
  setActiveOrder(orderId) {
    if (!dispatchRef) {
      console.warn("[roomServiceStore] setActiveOrder called before store is ready");
      return;
    }
    
    dispatchRef({
      type: ACTIONS.SET_ACTIVE_ORDER,
      payload: { orderId }
    });
  }
};

// Export the store actions for use in eventBus
export { ACTIONS };