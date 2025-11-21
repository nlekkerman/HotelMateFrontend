import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FaMicrophone, FaTimes } from 'react-icons/fa';

// Global log storage
let voiceLogs = [];
let logListeners = [];

// Callback to auto-expand panel on errors
let autoExpandCallback = null;

/**
 * Add a log entry to the voice debug panel
 * @param {string} type - 'info', 'success', 'error', 'warning'
 * @param {string} message - Log message
 * @param {object} data - Additional data to log
 */
export const addVoiceLog = (type, message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const log = {
    id: Date.now(),
    timestamp,
    type,
    message,
    data: data ? JSON.stringify(data, null, 2) : null,
  };

  voiceLogs = [log, ...voiceLogs].slice(0, 50); // Keep last 50 logs
  
  // Notify all listeners
  logListeners.forEach(listener => listener(voiceLogs));
  
  // Auto-expand panel on errors
  if (type === 'error' && autoExpandCallback) {
    autoExpandCallback();
  }
  
  // Console log with emoji
  const emoji = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || '📝';
  
  console.log(`${emoji} [Voice] ${message}`, data || '');
};

/**
 * Voice Debug Panel Component
 * Shows real-time logs of voice recognition activity
 */
export const VoiceDebugPanel = () => {
  const [logs, setLogs] = useState(voiceLogs);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to log updates
    const listener = (newLogs) => setLogs(newLogs);
    logListeners.push(listener);

    // Set auto-expand callback for errors
    autoExpandCallback = () => setIsExpanded(true);

    return () => {
      // Unsubscribe on unmount
      logListeners = logListeners.filter(l => l !== listener);
      autoExpandCallback = null;
    };
  }, []);

  const clearLogs = () => {
    voiceLogs = [];
    setLogs([]);
    addVoiceLog('info', 'Logs cleared');
  };

  const getBadgeVariant = (type) => {
    const variants = {
      info: 'primary',
      success: 'success',
      error: 'danger',
      warning: 'warning',
    };
    return variants[type] || 'secondary';
  };

  const getTypeIcon = (type) => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
    };
    return icons[type] || '📝';
  };

  if (logs.length === 0) {
    return null; // Hide panel when no logs
  }

  return (
    <>
      {/* Floating Button - Collapsed State */}
      {!isExpanded && (
        <div
          style={{
            position: 'fixed',
            top: '120px',
            right: '20px',
            zIndex: 9999,
          }}
        >
          <Button
            variant={logs.some(log => log.type === 'error') ? 'danger' : 'info'}
            size="sm"
            className="shadow-lg position-relative"
            onClick={() => setIsExpanded(true)}
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '20px',
            }}
          >
            <FaMicrophone size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Debug</span>
            {logs.length > 0 && (
              <Badge
                bg="light"
                text="dark"
                pill
                style={{
                  fontSize: '0.7rem',
                  minWidth: '20px',
                }}
              >
                {logs.length}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            top: '120px',
            right: '20px',
            width: '500px',
            maxHeight: '600px',
            zIndex: 9999,
          }}
        >
          <Card className="border-info shadow-lg" style={{ backgroundColor: 'rgba(13, 110, 253, 0.05)' }}>
            <Card.Header 
              className="d-flex justify-content-between align-items-center bg-info text-white"
              style={{ cursor: 'move' }}
            >
              <div>
                <FaMicrophone className="me-2" />
                <strong>Voice Debug</strong>
                <Badge bg="light" text="dark" className="ms-2">
                  {logs.length}
                </Badge>
              </div>
              <div className="d-flex gap-2">
                {logs.length > 0 && (
                  <Button 
                    variant="light" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearLogs();
                    }}
                  >
                    <FaTimes className="me-1" /> Clear
                  </Button>
                )}
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  ▼
                </Button>
              </div>
            </Card.Header>

            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <div className="voice-logs">
                {logs.map(log => (
                  <div 
                    key={log.id} 
                    className="log-entry mb-2 p-2 border-start border-3"
                    style={{ 
                      borderColor: `var(--bs-${getBadgeVariant(log.type)})`,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '4px'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-1">
                          <span className="me-2">{getTypeIcon(log.type)}</span>
                          <Badge bg={getBadgeVariant(log.type)} className="me-2">
                            {log.type.toUpperCase()}
                          </Badge>
                          <small className="text-muted">{log.timestamp}</small>
                        </div>
                        <div className="log-message">
                          {log.message}
                        </div>
                        {log.data && (
                          <pre 
                            className="mt-2 mb-0 p-2 border rounded" 
                            style={{ 
                              fontSize: '0.75rem',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              backgroundColor: log.type === 'error' ? 'rgba(220, 53, 69, 0.1)' : '#f8f9fa',
                              borderColor: log.type === 'error' ? 'var(--bs-danger)' : '#dee2e6',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {log.data}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </>
  );
};

export default VoiceDebugPanel;
