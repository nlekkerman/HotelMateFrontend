import React, { useState, useEffect } from 'react';
import { Card, Button, Collapse, Badge } from 'react-bootstrap';
import { FaBug, FaChevronDown, FaChevronUp, FaTrash } from 'react-icons/fa';

/**
 * Debug Panel - Low Stock & Period Logs Only
 */
const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const addLog = (type, args) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Only capture profitability chart logs
    const keywords = [
      'profitabilitychart',
      'category labels',
      'category_name',
      'raw api items',
      'fetching with category',
      'api response'
    ];
    
    const messageLower = message.toLowerCase();
    const isRelevant = keywords.some(keyword => messageLower.includes(keyword));
    
    if (isRelevant) {
      setLogs(prev => [...prev, { type, timestamp, message }].slice(-50));
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#f48771';
      case 'warn': return '#dcdcaa';
      default: return '#4ec9b0';
    }
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'error': return 'danger';
      case 'warn': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <Button
        variant={isOpen ? 'danger' : 'outline-danger'}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}
      >
        <FaBug />
        Profitability Debug
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        {logs.length > 0 && (
          <Badge bg="light" text="dark" pill>
            {logs.length}
          </Badge>
        )}
      </Button>

      <Collapse in={isOpen}>
        <Card className="mt-3 shadow-sm" style={{ borderColor: '#dc3545' }}>
          <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
            <div>
              <FaBug className="me-2" />
              <span>Profitability Chart Debug Logs</span>
            </div>
            <Button 
              variant="light" 
              size="sm" 
              onClick={clearLogs}
              title="Clear logs"
            >
              <FaTrash />
            </Button>
          </Card.Header>

          <Card.Body>
            <div 
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: '15px',
                borderRadius: '6px',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.85rem'
              }}
            >
              {logs.length === 0 ? (
                <div className="text-center text-muted py-3">
                  No logs yet. Open Profitability Chart to see debug output.
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className="mb-2"
                    style={{
                      borderLeft: `3px solid ${getLogColor(log.type)}`,
                      paddingLeft: '10px'
                    }}
                  >
                    <div className="d-flex gap-2 align-items-start">
                      <Badge bg={getBadgeVariant(log.type)} style={{ minWidth: '60px' }}>
                        {log.type.toUpperCase()}
                      </Badge>
                      <span style={{ color: '#858585', fontSize: '0.8rem' }}>
                        {log.timestamp}
                      </span>
                    </div>
                    <pre 
                      style={{ 
                        margin: '5px 0 0 0', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word',
                        color: getLogColor(log.type),
                        background: 'transparent',
                        border: 'none',
                        padding: 0
                      }}
                    >
                      {log.message}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </Card.Body>
        </Card>
      </Collapse>
    </div>
  );
};

export default DebugPanel;
