// src/realtime/debug/ChatRealtimeDebugPanel.jsx
// Floating debug panel for guest↔staff chat realtime events.
// Visually matches RealtimeDebugPanel but shows chat-specific diagnostics.
// Mount once (e.g. in RealtimeProvider or GuestChatPortal). Delete to remove.

import React, { useState, useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  getSnapshot,
  clearChatDebugState,
  setCollapsed,
  clearDiagnostics,
} from './chatDebugStore';

// ─── Shared inline styles (matches booking debug panel) ───

const PANEL_STYLE = {
  position: 'fixed',
  bottom: 8,
  left: 8,
  width: 440,
  maxHeight: '75vh',
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
  background: '#0e2a1e',
  borderBottom: '1px solid #444',
  borderRadius: '6px 6px 0 0',
  cursor: 'pointer',
  userSelect: 'none',
};

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

const TAB_BTN = (active) => ({
  ...BTN,
  background: active ? '#1a3a2a' : 'transparent',
  border: active ? '1px solid #4caf50' : '1px solid #555',
  color: active ? '#81c784' : '#aaa',
  marginLeft: 0,
  marginRight: 4,
});

function ts(iso) {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

// ─── Outcome badge colors ───
const OUTCOME_COLORS = {
  received: '#555',
  processed: '#2e7d32',
  ignored: '#616161',
  deduped: '#ff8f00',
  dropped: '#b71c1c',
  error: '#d32f2f',
};

const SOURCE_COLORS = {
  pusher: '#1565c0',
  api: '#00838f',
  'local optimistic': '#e65100',
  sync: '#6a1b9a',
  ui: '#7b1fa2',
  dedup: '#ff8f00',
  drop: '#b71c1c',
  store: '#0d47a1',
};

const DOMAIN_COLORS = {
  'guest-private': '#1b5e20',
  'staff-chat': '#0d47a1',
  'guest-broadcast': '#e65100',
  'guest-notifications': '#6a1b9a',
  unknown: '#555',
};

const DOMAIN_LABELS = {
  'guest-private': 'GUEST',
  'staff-chat': 'STAFF',
  'guest-broadcast': 'BCAST',
  'guest-notifications': 'NOTIF',
  unknown: '?',
};

// ─── Sub-components ───

function ChannelRow({ ch }) {
  return (
    <div style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
      <span style={BADGE(DOMAIN_COLORS[ch.domain] || '#555')}>
        {DOMAIN_LABELS[ch.domain] || '?'}
      </span>
      <span style={{ color: ch.status === 'connected' ? '#81c784' : ch.status === 'error' ? '#ef5350' : '#ffa726' }}>
        {ch.name}
      </span>
      <span style={{ color: '#666', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        {ch.sourceClient !== 'unknown' && <span style={{ color: '#8ab4f8' }}>{ch.sourceClient} </span>}
        @ {ts(ch.subscribedAt)}
        {ch.lastEventAt && <span> last:{ts(ch.lastEventAt)}</span>}
      </span>
    </div>
  );
}

function ChatEventCard({ evt }) {
  const [expanded, setExpanded] = useState(false);
  const outcomeColor = OUTCOME_COLORS[evt.outcome] || '#555';
  const sourceColor = SOURCE_COLORS[evt.source] || '#555';

  return (
    <div style={{
      padding: '4px 8px',
      borderBottom: '1px solid #333',
      background: evt.outcome === 'error' ? '#3a1515'
        : evt.outcome === 'dropped' ? '#3a1515'
        : evt.outcome === 'deduped' ? '#2a2a1a'
        : 'transparent',
    }}>
      {/* Row 1: timestamp + source + channel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ color: '#8ab4f8' }}>{ts(evt.timestamp)}</span>
        <span style={BADGE(sourceColor)}>{evt.source}</span>
        {evt.channel && <span style={{ color: '#aaa', fontSize: 10 }}>{evt.channel}</span>}
      </div>

      {/* Row 2: event name + outcome */}
      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <strong style={{ color: '#f0c674' }}>{evt.rawEventName || '(no event)'}</strong>
        <span style={BADGE(outcomeColor)}>{evt.outcome}</span>
        {evt.normalizedCategory && (
          <span style={{ color: '#888', fontSize: 9 }}>cat:{evt.normalizedCategory}</span>
        )}
      </div>

      {/* Row 3: IDs */}
      {(evt.conversationId || evt.messageId || evt.clientMessageId || evt.eventId || evt.bookingId) && (
        <div style={{ marginTop: 2, fontSize: 10, fontFamily: 'monospace', color: '#bbb' }}>
          {evt.conversationId && <span style={{ color: '#81c784' }}>conv:{evt.conversationId} </span>}
          {evt.bookingId && <span style={{ color: '#a5d6a7' }}>bk:{evt.bookingId} </span>}
          {evt.messageId && <span style={{ color: '#90caf9' }}>msg:{evt.messageId} </span>}
          {evt.clientMessageId && <span style={{ color: '#ce93d8' }}>cid:{evt.clientMessageId} </span>}
          {evt.eventId && <span style={{ color: '#ffcc80' }}>eid:{evt.eventId}</span>}
        </div>
      )}

      {/* Row 4: detail */}
      {evt.detail && (
        <div style={{ marginTop: 2, fontSize: 10, color: '#999', wordBreak: 'break-all' }}>
          {evt.detail}
        </div>
      )}

      {/* Expandable payload */}
      {evt.payloadPreview && (
        <div style={{ marginTop: 3 }}>
          <button style={{ ...BTN, fontSize: 9 }} onClick={() => setExpanded(e => !e)}>
            {expanded ? 'hide' : 'payload'}
          </button>
          {expanded && (
            <pre style={{
              marginTop: 4, padding: 4, background: '#0d1117', borderRadius: 3,
              fontSize: 10, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {evt.payloadPreview}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function DiagnosticCard({ diag }) {
  const sevColor = diag.severity === 'error' ? '#ef5350' : diag.severity === 'warning' ? '#ffa726' : '#8ab4f8';
  return (
    <div style={{
      padding: '3px 8px', borderBottom: '1px solid #333',
      background: diag.severity === 'error' ? '#3a1515' : diag.severity === 'warning' ? '#2a2a0a' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: sevColor, fontWeight: 700, fontSize: 10 }}>
          {diag.severity === 'error' ? '✖' : diag.severity === 'warning' ? '⚠' : 'ℹ'}
        </span>
        <span style={{ color: sevColor, fontSize: 10 }}>{diag.message}</span>
        <span style={{ color: '#666', fontSize: 9, marginLeft: 'auto' }}>{ts(diag.detectedAt)}</span>
      </div>
      {diag.detail && (
        <div style={{ fontSize: 9, color: '#888', marginLeft: 14 }}>{diag.detail}</div>
      )}
    </div>
  );
}

function SnapshotSection({ snap }) {
  if (!snap.conversationId && !snap.channelName && !snap.uiMode) {
    return <div style={{ padding: '6px 8px', color: '#666' }}>No active conversation</div>;
  }
  const rows = [
    ['conversation_id', snap.conversationId],
    ['booking_id', snap.bookingId],
    ['channel_name', snap.channelName],
    ['bound:message_created', snap.boundMessageCreated],
    ['bound:message_read', snap.boundMessageRead],
    ['connection', snap.connectionState],
    ['confirmed msgs', snap.confirmedCount],
    ['optimistic msgs', snap.optimisticCount],
    ['last confirmed id', snap.lastConfirmedId],
    ['last optimistic cid', snap.lastOptimisticClientId],
    ['data_source', snap.dataSource],
    ['ui_mode', snap.uiMode],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <div style={{ padding: '4px 8px' }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 1 }}>
          <span style={{ color: '#888' }}>{label}</span>
          <span style={{
            color: label === 'connection'
              ? (value === 'connected' ? '#81c784' : value === 'failed' ? '#ef5350' : '#ffa726')
              : '#e0e0e0',
            fontFamily: 'monospace',
            maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tabs ───
const TABS = ['events', 'channels', 'state', 'diagnostics'];

// ─── Main Panel ───

export default function ChatRealtimeDebugPanel() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const [activeTab, setActiveTab] = useState('events');

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    clearChatDebugState();
    clearDiagnostics();
  }, []);

  const c = state.counters;
  const activeChannels = state.channels.filter(ch => !ch.unsubscribedAt);
  const diagCount = state.diagnostics.length;

  // ─── Collapsed state ───
  if (state.collapsed) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 99999,
          background: '#0e2a1e', border: '1px solid #444', borderRadius: 6,
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'monospace',
          fontSize: 11, color: '#81c784', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
        onClick={() => setCollapsed(false)}
      >
        Chat Debug ({c.rcv}/{c.dispatched}/{c.errors})
        {diagCount > 0 && <span style={BADGE('#b71c1c')}>{diagCount}</span>}
      </div>
    );
  }

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div style={HEADER_STYLE} onClick={() => setCollapsed(true)}>
        <div>
          <strong style={{ color: '#81c784' }}>Chat RT Debug</strong>
          {diagCount > 0 && (
            <span style={BADGE('#b71c1c')}>{diagCount} diag</span>
          )}
        </div>
        <div>
          <button style={BTN} onClick={handleClear}>Clear</button>
          <button style={BTN} onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}>_</button>
        </div>
      </div>

      {/* Counters bar */}
      <div style={{
        padding: '4px 8px', borderBottom: '1px solid #333',
        display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10,
      }}>
        <span>sub:<strong>{c.subscribed}</strong></span>
        <span>rcv:<strong>{c.rcv}</strong></span>
        <span>routed:<strong>{c.routed}</strong></span>
        <span>disp:<strong>{c.dispatched}</strong></span>
        <span style={{ color: c.deduped ? '#ffa726' : undefined }}>dedup:<strong>{c.deduped}</strong></span>
        <span style={{ color: c.dropped ? '#ef5350' : undefined }}>drop:<strong>{c.dropped}</strong></span>
        <span style={{ color: c.optimistic ? '#e65100' : undefined }}>opt:<strong>{c.optimistic}</strong></span>
        <span style={{ color: c.reconciled ? '#00838f' : undefined }}>recon:<strong>{c.reconciled}</strong></span>
        <span style={{ color: c.syncOk ? '#6a1b9a' : undefined }}>sync:<strong>{c.syncOk}</strong></span>
        <span style={{ color: c.apiSendOk ? '#0277bd' : undefined }}>send:<strong>{c.apiSendOk}</strong></span>
        <span style={{ color: c.errors ? '#ef5350' : undefined }}>err:<strong>{c.errors}</strong></span>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #333', display: 'flex' }}>
        {TABS.map(tab => (
          <button key={tab} style={TAB_BTN(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab}
            {tab === 'diagnostics' && diagCount > 0 && (
              <span style={{ ...BADGE('#b71c1c'), marginLeft: 4 }}>{diagCount}</span>
            )}
            {tab === 'channels' && (
              <span style={{ color: '#888', marginLeft: 3 }}>({activeChannels.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        {/* ─── Events tab ─── */}
        {activeTab === 'events' && (
          <div>
            {state.events.length === 0 && (
              <div style={{ padding: 12, color: '#666', textAlign: 'center' }}>
                Waiting for chat events...
              </div>
            )}
            {state.events.map(evt => <ChatEventCard key={evt.id} evt={evt} />)}
          </div>
        )}

        {/* ─── Channels tab ─── */}
        {activeTab === 'channels' && (
          <div style={{ padding: '5px 8px' }}>
            <div style={{ color: '#aaa', fontWeight: 700, marginBottom: 4 }}>
              Active Channels ({activeChannels.length})
            </div>
            {activeChannels.length === 0 && <div style={{ color: '#666' }}>No chat channels subscribed</div>}
            {activeChannels.map(ch => <ChannelRow key={ch.name} ch={ch} />)}

            {/* Also show recently unsubscribed */}
            {state.channels.some(c => c.unsubscribedAt) && (
              <>
                <div style={{ color: '#666', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>
                  Recently Unsubscribed
                </div>
                {state.channels.filter(c => c.unsubscribedAt).slice(0, 5).map(ch => (
                  <div key={ch.name + ch.subscribedAt} style={{ fontSize: 10, color: '#666' }}>
                    {ch.name} <span>unsub @ {ts(ch.unsubscribedAt)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ─── State tab ─── */}
        {activeTab === 'state' && (
          <div>
            <div style={{ padding: '4px 8px', color: '#aaa', fontWeight: 700, borderBottom: '1px solid #333' }}>
              Conversation Snapshot
            </div>
            <SnapshotSection snap={state.conversationSnapshot} />
          </div>
        )}

        {/* ─── Diagnostics tab ─── */}
        {activeTab === 'diagnostics' && (
          <div>
            {state.diagnostics.length === 0 && (
              <div style={{ padding: 12, color: '#666', textAlign: 'center' }}>
                No issues detected
              </div>
            )}
            {state.diagnostics.map(d => <DiagnosticCard key={d.id} diag={d} />)}

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
        )}
      </div>
    </div>
  );
}
