// src/realtime/stores/overviewSignalsStore.jsx
// Lightweight store tracking unseen operational signals for the Overview landing page.
// Follows the same Context + useReducer pattern as other domain stores.
import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Modules eligible for overview signals.
// Only these canonical RBAC slugs participate in the landing decision.
// ---------------------------------------------------------------------------
export const OVERVIEW_MODULES = [
  'bookings',       // room bookings
  'room_services',  // room service orders
  'housekeeping',   // housekeeping tasks
];

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------
const OverviewSignalsStateContext = createContext(null);
const OverviewSignalsDispatchContext = createContext(null);

// ---------------------------------------------------------------------------
// Initial state — one entry per overview module
// ---------------------------------------------------------------------------
function buildInitialModuleState() {
  return { count: 0, latestAt: null, reasons: [] };
}

const initialState = Object.fromEntries(
  OVERVIEW_MODULES.map((m) => [m, buildInitialModuleState()])
);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const ACTIONS = {
  RECORD_SIGNAL: 'RECORD_SIGNAL',
  MARK_MODULE_SEEN: 'MARK_MODULE_SEEN',
  MARK_ALL_SEEN: 'MARK_ALL_SEEN',
  CLEAR_ALL: 'CLEAR_ALL',
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function overviewSignalsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.RECORD_SIGNAL: {
      const { module, reason } = action.payload;
      if (!OVERVIEW_MODULES.includes(module)) return state;

      const prev = state[module];
      const now = new Date().toISOString();
      // Cap reasons at 20 to avoid unbounded growth
      const reasons = [...prev.reasons, reason].slice(-20);

      return {
        ...state,
        [module]: {
          count: prev.count + 1,
          latestAt: now,
          reasons,
        },
      };
    }

    case ACTIONS.MARK_MODULE_SEEN: {
      const { module } = action.payload;
      if (!state[module]) return state;
      return {
        ...state,
        [module]: buildInitialModuleState(),
      };
    }

    case ACTIONS.MARK_ALL_SEEN: {
      return { ...initialState };
    }

    case ACTIONS.CLEAR_ALL: {
      return { ...initialState };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Global dispatch ref (same pattern as other stores — allows eventBus to
// dispatch without React tree access).
// ---------------------------------------------------------------------------
let globalDispatchRef = null;

export const overviewSignalsActions = {
  /**
   * Record an operational signal for a module.
   * @param {{ module: string, reason: string }} payload
   */
  recordSignal({ module, reason }) {
    if (!globalDispatchRef) return;
    globalDispatchRef({ type: ACTIONS.RECORD_SIGNAL, payload: { module, reason } });
  },

  /** Mark a single module's signals as seen (e.g. user visited that feature page). */
  markModuleSeen(module) {
    if (!globalDispatchRef) return;
    globalDispatchRef({ type: ACTIONS.MARK_MODULE_SEEN, payload: { module } });
  },

  /** Mark all modules as seen (e.g. user visited Overview). */
  markAllSeen() {
    if (!globalDispatchRef) return;
    globalDispatchRef({ type: ACTIONS.MARK_ALL_SEEN, payload: {} });
  },
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function OverviewSignalsProvider({ children }) {
  const [state, dispatch] = useReducer(overviewSignalsReducer, initialState);
  const dispatchRef = useRef(dispatch);

  useEffect(() => {
    dispatchRef.current = dispatch;
    globalDispatchRef = dispatch;
    return () => { globalDispatchRef = null; };
  }, [dispatch]);

  return (
    <OverviewSignalsStateContext.Provider value={state}>
      <OverviewSignalsDispatchContext.Provider value={dispatch}>
        {children}
      </OverviewSignalsDispatchContext.Provider>
    </OverviewSignalsStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function useOverviewSignalsState() {
  const ctx = useContext(OverviewSignalsStateContext);
  if (ctx === null) throw new Error('useOverviewSignalsState must be used inside OverviewSignalsProvider');
  return ctx;
}

export function useOverviewSignalsDispatch() {
  const ctx = useContext(OverviewSignalsDispatchContext);
  if (ctx === null) throw new Error('useOverviewSignalsDispatch must be used inside OverviewSignalsProvider');
  return ctx;
}

export function useOverviewSignals() {
  return {
    state: useOverviewSignalsState(),
    dispatch: useOverviewSignalsDispatch(),
  };
}
