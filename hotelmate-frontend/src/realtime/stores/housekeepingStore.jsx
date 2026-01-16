// src/realtime/stores/housekeepingStore.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// State contexts
const HousekeepingStateContext = createContext(null);
const HousekeepingDispatchContext = createContext(null);

// Initial state
const initialState = {
  counts: {}, // Dashboard counts by status - will be computed from roomsStore
  loading: false,
  error: null,
  lastUpdatedAt: null,
};

// Actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_COUNTS: 'SET_COUNTS', // For UI-driven count updates
  CLEAR_DATA: 'CLEAR_DATA'
};

// Reducer function
function housekeepingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING: {
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };
    }

    case ACTIONS.SET_ERROR: {
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    }

    case ACTIONS.SET_COUNTS: {
      return {
        ...state,
        counts: action.payload,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    case ACTIONS.CLEAR_DATA: {
      return initialState;
    }

    default:
      return state;
  }
}

// Provider component
export function HousekeepingProvider({ children }) {
  const [state, dispatch] = useReducer(housekeepingReducer, initialState);

  // Action creators
  const actions = {
    setLoading: useCallback((loading) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error });
    }, []),

    setCounts: useCallback((counts) => {
      dispatch({ type: ACTIONS.SET_COUNTS, payload: counts });
    }, []),

    clearData: useCallback(() => {
      dispatch({ type: ACTIONS.CLEAR_DATA });
    }, [])
  };

  return (
    <HousekeepingStateContext.Provider value={state}>
      <HousekeepingDispatchContext.Provider value={actions}>
        {children}
      </HousekeepingDispatchContext.Provider>
    </HousekeepingStateContext.Provider>
  );
}

// Hooks for consuming the context
export function useHousekeepingState() {
  const context = useContext(HousekeepingStateContext);
  if (!context) {
    throw new Error('useHousekeepingState must be used within a HousekeepingProvider');
  }
  return context;
}

export function useHousekeepingActions() {
  const context = useContext(HousekeepingDispatchContext);
  if (!context) {
    throw new Error('useHousekeepingActions must be used within a HousekeepingProvider');
  }
  return context;
}

// Combined hook for convenience
export function useHousekeeping() {
  return {
    ...useHousekeepingState(),
    ...useHousekeepingActions()
  };
}