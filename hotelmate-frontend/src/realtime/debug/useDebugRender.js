// src/realtime/debug/useDebugRender.js
// Tiny hook to log UI render markers when tracked fields change.
// Disposable: delete this file + remove calls from components.

import { useEffect, useRef } from 'react';
import { logUIRender } from './debugLogger.js';

/**
 * Log a UI render marker when `trackedValue` changes (shallow string comparison).
 *
 * @param {string} component - Component name, e.g. 'BookingList'
 * @param {string|null} fingerprint - A cheap string summary of tracked fields
 *   (e.g. `booking.status + '|' + booking.room_number`).
 *   Only logs when this string changes between renders.
 * @param {Object} [info] - Extra info: { bookingId, roomId, summary }
 */
export function useDebugRender(component, fingerprint, info = {}) {
  const prev = useRef(fingerprint);

  useEffect(() => {
    if (fingerprint == null) return; // nothing to track yet
    if (prev.current !== fingerprint) {
      prev.current = fingerprint;
      logUIRender(component, info);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
}
