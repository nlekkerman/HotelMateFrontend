// ShootAR — On-screen debug console for mobile testing
// Captures console.log / warn / error and displays them as a scrollable overlay.

import React, { useState, useEffect, useRef, useCallback } from "react";

const MAX_LINES = 40;

// Global log buffer so non-React code (EnemyManager etc.) can push to it
let _listeners = [];
const _logBuffer = [];

export function debugLog(...args) {
  const msg = args.map(a =>
    typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)
  ).join(" ");
  const entry = { type: "log", msg, ts: Date.now() };
  _logBuffer.push(entry);
  if (_logBuffer.length > MAX_LINES) _logBuffer.shift();
  _listeners.forEach(fn => fn(entry));
}

export function debugWarn(...args) {
  const msg = args.map(a =>
    typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)
  ).join(" ");
  const entry = { type: "warn", msg, ts: Date.now() };
  _logBuffer.push(entry);
  if (_logBuffer.length > MAX_LINES) _logBuffer.shift();
  _listeners.forEach(fn => fn(entry));
}

export function debugError(...args) {
  const msg = args.map(a =>
    typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)
  ).join(" ");
  const entry = { type: "error", msg, ts: Date.now() };
  _logBuffer.push(entry);
  if (_logBuffer.length > MAX_LINES) _logBuffer.shift();
  _listeners.forEach(fn => fn(entry));
}

const colors = {
  log: "#0f0",
  warn: "#ff0",
  error: "#f44",
};

export default function DebugConsole() {
  const [lines, setLines] = useState(() => [..._logBuffer]);
  const [visible, setVisible] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handler = () => setLines([..._logBuffer]);
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter(fn => fn !== handler);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleClear = useCallback(() => {
    _logBuffer.length = 0;
    setLines([]);
  }, []);

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); setVisible(v => !v); }}
        style={{
          position: "absolute",
          top: 48,
          left: 16,
          zIndex: 100,
          background: "rgba(0,0,0,0.7)",
          color: "#0f0",
          border: "1px solid #0f0",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: "0.7rem",
          fontFamily: "monospace",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        {visible ? "HIDE DBG" : "SHOW DBG"}
      </button>

      {visible && (
        <div
          ref={scrollRef}
          style={{
            position: "absolute",
            bottom: 130,
            left: 8,
            right: 8,
            maxHeight: "35vh",
            overflowY: "auto",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid #0f0",
            borderRadius: 6,
            padding: 6,
            zIndex: 100,
            pointerEvents: "auto",
            fontFamily: "monospace",
            fontSize: "0.65rem",
            lineHeight: "1.3",
            userSelect: "text",
          }}
        >
          {/* Clear button */}
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleClear(); }}
            style={{
              position: "sticky",
              top: 0,
              float: "right",
              background: "#333",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: 3,
              padding: "2px 8px",
              fontSize: "0.6rem",
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            CLR
          </button>

          {lines.map((entry, i) => (
            <div key={i} style={{ color: colors[entry.type] || "#fff", wordBreak: "break-all" }}>
              {entry.msg}
            </div>
          ))}

          {lines.length === 0 && (
            <div style={{ color: "#666" }}>No logs yet — shoot to spawn enemies</div>
          )}
        </div>
      )}
    </>
  );
}
