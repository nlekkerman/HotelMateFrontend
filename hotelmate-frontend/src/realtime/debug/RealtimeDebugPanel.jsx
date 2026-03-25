// src/realtime/debug/RealtimeDebugPanel.jsx
// Disposable floating debug panel for booking/room realtime events.
// Mount once. Delete src/realtime/debug/ folder to remove entirely.

import React, { useState, useEffect, useCallback } from 'react';
import { subscribe, clearDebugState, getDebugState } from './realtimeDebugStore';

const PANEL_STYLE = {
  position: 'fixed',
  bottom: 8,
  right: 8,
  width: 420,
  maxHeight: '70vh',
  background: '#1a1a2e',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: 11,
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

const HEADER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  background: '#16213e',
  borderBottom: '1px solid #444',
  borderRadius: '6px 6px 0 0',
  cursor: 'pointer',
  userSelect: 'none',
};

const BADGE = (color) => ({
  display: 'inline-block',
  padding: '1px 5px',
  borderRadius: 3,
  fontSize: 9,
  fontWeight: 700,
  marginLeft: 3,
  background: color,
  color: '#fff',
});

const BTN = {
  background: 'transparent',
  border: '1px solid #666',
  color: '#ccc',
  borderRadius: 3,
  padding: '2px 8px',
  cursor: 'pointer',
  fontSize: 10,
  marginLeft: 4,
};

function ts(iso) {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function EventCard({ evt }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '5px 8px',
      borderBottom: '1px solid #333',
      background: evt.error ? '#3a1515' : evt.ignored ? '#2a2a1a' : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <span style={{ color: '#8ab4f8' }}>{ts(evt.timestamp)}</span>
        <span style={{ color: '#aaa', fontSize: 10 }}>{evt.channel}</span>
      </div>
      <div style={{ marginTop: 2 }}>
        <strong style={{ color: '#f0c674' }}>{evt.rawEventName}</strong>
        {evt.normalizedType && evt.normalizedType !== evt.rawEventName && (
          <span style={{ color: '#888', marginLeft: 6 }}>→ {evt.normalizedType}</span>
        )}
      </div>
      <div style={{ marginTop: 2 }}>
        {evt.bookingId && <span style={{ color: '#81c784', marginRight: 6 }}>B:{evt.bookingId}</span>}
        {evt.roomId && <span style={{ color: '#64b5f6', marginRight: 6 }}>R:{evt.roomId}</span>}
        {evt.normalizedCategory && <span style={{ color: '#ce93d8', marginRight: 6 }}>cat:{evt.normalizedCategory}</span>}
      </div>
      <div style={{ marginTop: 3 }}>
        <span style={BADGE('#2e7d32')}>rcv</span>
        {evt.routed && <span style={BADGE('#1565c0')}>routed</span>}
        {evt.dispatchedToStore && <span style={BADGE('#6a1b9a')}>dispatched</span>}
        {evt.invalidatedQueries?.length > 0 && <span style={BADGE('#e65100')}>invalidated</span>}
        {evt.ignored && <span style={BADGE('#616161')}>ignored</span>}
        {evt.error && <span style={BADGE('#b71c1c')}>error</span>}
      </div>
      {evt.invalidatedQueries?.length > 0 && (
        <div style={{ color: '#ffab40', fontSize: 10, marginTop: 2 }}>
          queries: {evt.invalidatedQueries.join(', ')}
        </div>
      )}
      {evt.error && (
        <div style={{ color: '#ef5350', fontSize: 10, marginTop: 2 }}>{evt.error}</div>
      )}
      <div style={{ marginTop: 3 }}>
        <button
          style={{ ...BTN, fontSize: 9 }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'hide payload' : 'show payload'}
        </button>
      </div>
      {expanded && (
        <pre style={{
          marginTop: 4,
          padding: 4,
          background: '#0d1117',
          borderRadius: 3,
          fontSize: 10,
          maxHeight: 180,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {JSON.stringify(evt.rawPayload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function RealtimeDebugPanel() {
  const [state, setState] = useState(getDebugState);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    return subscribe(setState);
  }, []);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    clearDebugState();
  }, []);

  const c = state.counters;

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 99999,
          background: '#16213e', border: '1px solid #444', borderRadius: 6,
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'monospace',
          fontSize: 11, color: '#8ab4f8', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        }}
        onClick={() => setCollapsed(false)}
      >
        RT Debug ({c.receivedCount})
      </div>
    );
  }

  const activeChannels = state.subscribedChannels.filter(ch => !ch.unsubscribedAt);

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div style={HEADER_STYLE} onClick={() => setCollapsed(true)}>
        <div>
          <strong style={{ color: '#8ab4f8' }}>Realtime Debug</strong>
          {state.hotelSlug && (
            <span style={{ color: '#888', marginLeft: 8 }}>{state.hotelSlug}</span>
          )}
        </div>
        <div>
          <button style={BTN} onClick={handleClear}>Clear</button>
          <button style={BTN} onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}>_</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        {/* Subscribed Channels */}
        <div style={{ padding: '5px 8px', borderBottom: '1px solid #333' }}>
          <div style={{ color: '#aaa', fontWeight: 700, marginBottom: 3 }}>Channels ({activeChannels.length})</div>
          {activeChannels.length === 0 && <div style={{ color: '#666' }}>none</div>}
          {activeChannels.map(ch => (
            <div key={ch.name} style={{ fontSize: 10, color: '#81c784' }}>
              {ch.name} <span style={{ color: '#666' }}>@ {ts(ch.subscribedAt)}</span>
            </div>
          ))}
        </div>

        {/* Counters */}
        <div style={{
          padding: '5px 8px', borderBottom: '1px solid #333',
          display: 'flex', flexWrap: 'wrap', gap: 8,
        }}>
          <span>rcv:<strong>{c.receivedCount}</strong></span>
          <span>routed:<strong>{c.routedCount}</strong></span>
          <span>dispatched:<strong>{c.dispatchedCount}</strong></span>
          <span>invalidated:<strong>{c.invalidatedCount}</strong></span>
          <span style={{ color: c.ignoredCount ? '#ffa726' : undefined }}>ignored:<strong>{c.ignoredCount}</strong></span>
          <span style={{ color: c.errorCount ? '#ef5350' : undefined }}>errors:<strong>{c.errorCount}</strong></span>
        </div>

        {/* Event Log */}
        <div>
          {state.events.length === 0 && (
            <div style={{ padding: 12, color: '#666', textAlign: 'center' }}>
              Waiting for booking/room events...
            </div>
          )}
          {state.events.map(evt => (
            <EventCard key={evt.id} evt={evt} />
          ))}
        </div>

        {/* Errors */}
        {state.errors.length > 0 && (
          <div style={{ padding: '5px 8px', borderTop: '1px solid #b71c1c' }}>
            <div style={{ color: '#ef5350', fontWeight: 700, marginBottom: 3 }}>Errors ({state.errors.length})</div>
            {state.errors.slice(0, 10).map((err, i) => (
              <div key={i} style={{ fontSize: 10, color: '#ef9a9a', marginBottom: 2 }}>
                [{ts(err.timestamp)}] {err.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
