import React, { useState, useEffect } from 'react';
import { useAttendanceRealtime } from '../hooks/useAttendanceRealtime';

/**
 * Debug component for testing attendance Pusher events
 * Add this component to any page during development to monitor events
 */
export default function AttendanceEventDebugger({ hotelIdentifier }) {
  const [events, setEvents] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  
  const handleEvent = (event) => {
    console.log('[AttendanceEventDebugger] Event received:', event);
    
    const timestamp = new Date().toISOString();
    const newEvent = {
      ...event,
      timestamp,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
  };
  
  // Initialize realtime connection
  useAttendanceRealtime(hotelIdentifier, handleEvent);
  
  const clearEvents = () => {
    setEvents([]);
  };
  
  const testEvent = () => {
    // Simulate a test event for debugging
    handleEvent({
      type: 'test-event',
      payload: {
        message: 'This is a test event',
        timestamp: new Date().toISOString()
      }
    });
  };
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="btn btn-sm btn-secondary position-fixed"
        style={{
          top: '10px',
          right: '10px',
          zIndex: 9999,
          opacity: 0.7
        }}
        title="Show Attendance Event Debugger"
      >
        🐛 Events
      </button>
    );
  }
  
  return (
    <div
      className="position-fixed bg-dark text-white p-3 rounded shadow"
      style={{
        top: '60px',
        right: '10px',
        width: '400px',
        maxHeight: '500px',
        zIndex: 9999,
        fontSize: '12px',
        overflow: 'auto'
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Attendance Events Debug</h6>
        <div>
          <button
            onClick={testEvent}
            className="btn btn-sm btn-primary me-2"
            title="Send test event"
          >
            Test
          </button>
          <button
            onClick={clearEvents}
            className="btn btn-sm btn-warning me-2"
            title="Clear events"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="btn btn-sm btn-outline-light"
            title="Hide debugger"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="mb-2">
        <small className="text-muted">
          Hotel: <strong>{hotelIdentifier || 'none'}</strong> | 
          Events: <strong>{events.length}</strong>
        </small>
      </div>
      
      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div className="text-muted fst-italic">No events received yet...</div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              className="border border-secondary rounded p-2 mb-2"
              style={{ fontSize: '11px' }}
            >
              <div className="d-flex justify-content-between">
                <strong className={`
                  ${event.type === 'clock-status-updated' ? 'text-success' : ''}
                  ${event.type === 'test-event' ? 'text-info' : ''}
                `}>
                  {event.type}
                </strong>
                <small className="text-muted">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </small>
              </div>
              
              {event.payload && (
                <div className="mt-1">
                  <div className="text-muted">Payload:</div>
                  <pre className="mt-1 p-1 bg-secondary rounded text-white" style={{ fontSize: '10px' }}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-2 pt-2 border-top border-secondary">
        <small className="text-muted">
          💡 Open console for detailed logs
        </small>
      </div>
    </div>
  );
}