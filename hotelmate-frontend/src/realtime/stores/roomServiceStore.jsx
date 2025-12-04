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
  handleEvent(normalizedEvt) {
    if (!dispatchRef) {
      console.warn("[roomServiceStore] handleEvent called before store is ready");
      return;
    }

    const { eventType, data, timestamp, channelName } = normalizedEvt;

    // Deduplication logic
    const dedupeKey = `order:${data?.id || data?.orderId || 'unknown'}:${eventType}`;
    const lastTimestamp = roomServiceActions._lastEventTimestamps?.[dedupeKey];
    
    if (lastTimestamp && timestamp && timestamp <= lastTimestamp) {
      console.log("[roomServiceStore] Ignoring duplicate event:", dedupeKey, timestamp);
      return;
    }

    // Update timestamp (simple cleanup after 10 seconds)
    if (!roomServiceActions._lastEventTimestamps) {
      roomServiceActions._lastEventTimestamps = {};
    }
    roomServiceActions._lastEventTimestamps[dedupeKey] = timestamp;
    
    setTimeout(() => {
      if (roomServiceActions._lastEventTimestamps) {
        delete roomServiceActions._lastEventTimestamps[dedupeKey];
      }
    }, 10000);

    console.log("[roomServiceStore] Processing event:", eventType, data);

    switch (eventType) {
      case "order_created":
      case "new_room_service_order":
      case "new_breakfast_order":
        dispatchRef({
          type: ACTIONS.ORDER_CREATED,
          payload: { order: data },
        });
        break;

      case "order_updated":
      case "order_status_changed":
      case "order_accepted":
      case "order_preparing":
      case "order_ready":
      case "order_delivered":
      case "order_cancelled":
        dispatchRef({
          type: ACTIONS.ORDER_STATUS_CHANGED,
          payload: { order: data, orderId: data?.id || data?.orderId },
        });
        break;

      case "order_deleted":
        dispatchRef({
          type: ACTIONS.ORDER_DELETED,
          payload: { orderId: data?.id || data?.orderId },
        });
        break;

      default:
        if (import.meta.env && !import.meta.env.PROD) {
          console.log("[roomServiceStore] Ignoring eventType:", eventType, normalizedEvt);
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