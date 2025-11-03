import React, { useState, useEffect } from 'react';
import FirebaseService from '@/services/FirebaseService';
import { toast } from 'react-toastify';

/**
 * FCM Test Component
 * 
 * Use this component to test and debug Firebase Cloud Messaging
 * Add to any page during development: import FCMTest from '@/components/utils/FCMTest'
 */
const FCMTest = () => {
  const [status, setStatus] = useState({
    isSupported: false,
    permission: 'unknown',
    token: null,
    serviceWorker: false,
    user: null,
  });

  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[FCM Test ${timestamp}]`, message);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    addLog('Checking FCM status...', 'info');

    // Check browser support
    const isSupported = FirebaseService.isSupported();
    addLog(`Browser support: ${isSupported ? '✅ Supported' : '❌ Not supported'}`, isSupported ? 'success' : 'error');

    // Check permission
    const permission = FirebaseService.getPermissionStatus();
    addLog(`Notification permission: ${permission}`, permission === 'granted' ? 'success' : 'warning');

    // Check token
    const token = localStorage.getItem('fcm_token');
    addLog(`Saved FCM token: ${token ? '✅ Found' : '❌ Not found'}`, token ? 'success' : 'warning');

    // Check service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const hasSW = registrations.some(reg => 
        reg.active?.scriptURL.includes('firebase-messaging-sw.js')
      );
      addLog(`Service worker: ${hasSW ? '✅ Registered' : '❌ Not registered'}`, hasSW ? 'success' : 'error');
      setStatus(prev => ({ ...prev, serviceWorker: hasSW }));
    }

    // Check user
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    addLog(`User logged in: ${user ? `✅ ${user.username} (${user.role})` : '❌ Not logged in'}`, user ? 'success' : 'error');

    setStatus({
      isSupported,
      permission,
      token,
      serviceWorker: status.serviceWorker,
      user,
    });
  };

  const handleRequestPermission = async () => {
    addLog('Requesting notification permission...', 'info');
    try {
      const granted = await FirebaseService.requestPermission();
      if (granted) {
        addLog('✅ Permission granted!', 'success');
        toast.success('Notification permission granted!');
        await checkStatus();
      } else {
        addLog('❌ Permission denied', 'error');
        toast.error('Permission denied');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Failed to request permission');
    }
  };

  const handleGetToken = async () => {
    addLog('Getting FCM token...', 'info');
    try {
      const token = await FirebaseService.getFCMToken();
      if (token) {
        addLog(`✅ Token obtained: ${token.substring(0, 50)}...`, 'success');
        toast.success('FCM token obtained!');
        await checkStatus();
      } else {
        addLog('❌ Failed to get token', 'error');
        toast.error('Failed to get token');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleTestNotification = () => {
    addLog('Sending test notification...', 'info');
    try {
      FirebaseService.showTestNotification();
      addLog('✅ Test notification sent', 'success');
      toast.info('Check for notification!');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };

  const handleCheckConfig = () => {
    addLog('Checking environment configuration...', 'info');
    
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_VAPID_KEY',
    ];

    let allPresent = true;
    requiredVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (value) {
        addLog(`✅ ${varName}: ${value.substring(0, 20)}...`, 'success');
      } else {
        addLog(`❌ ${varName}: MISSING`, 'error');
        allPresent = false;
      }
    });

    if (allPresent) {
      addLog('✅ All environment variables present', 'success');
      toast.success('Configuration looks good!');
    } else {
      addLog('❌ Some environment variables are missing', 'error');
      toast.error('Missing environment variables!');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-bug me-2"></i>
          FCM Debug & Test Panel
        </h5>
      </div>
      
      <div className="card-body">
        {/* Status Summary */}
        <div className="alert alert-light border">
          <h6>Current Status:</h6>
          <ul className="mb-0 small">
            <li>Browser Support: {status.isSupported ? '✅' : '❌'}</li>
            <li>Permission: <span className={status.permission === 'granted' ? 'text-success' : 'text-warning'}>{status.permission}</span></li>
            <li>FCM Token: {status.token ? '✅ Saved' : '❌ None'}</li>
            <li>Service Worker: {status.serviceWorker ? '✅ Active' : '❌ Inactive'}</li>
            <li>User: {status.user ? `✅ ${status.user.username}` : '❌ Not logged in'}</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button className="btn btn-sm btn-primary" onClick={checkStatus}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh Status
          </button>
          
          <button className="btn btn-sm btn-success" onClick={handleRequestPermission}>
            <i className="bi bi-bell me-1"></i>
            Request Permission
          </button>
          
          <button className="btn btn-sm btn-info" onClick={handleGetToken}>
            <i className="bi bi-key me-1"></i>
            Get FCM Token
          </button>
          
          <button className="btn btn-sm btn-warning" onClick={handleTestNotification}>
            <i className="bi bi-send me-1"></i>
            Test Notification
          </button>
          
          <button className="btn btn-sm btn-secondary" onClick={handleCheckConfig}>
            <i className="bi bi-gear me-1"></i>
            Check Config
          </button>
          
          <button className="btn btn-sm btn-outline-danger" onClick={clearLogs}>
            <i className="bi bi-trash me-1"></i>
            Clear Logs
          </button>
        </div>

        {/* Logs */}
        <div className="bg-dark text-white p-3 rounded" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {logs.length === 0 ? (
            <div className="text-muted">No logs yet. Click buttons to test functionality.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={getLogColor(log.type)}>
                <span className="text-muted">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <details className="mt-3">
          <summary className="text-muted small" style={{ cursor: 'pointer' }}>
            <i className="bi bi-info-circle me-1"></i>
            Testing Instructions
          </summary>
          <div className="small mt-2 text-muted">
            <ol>
              <li>Click "Check Config" to verify .env variables are loaded</li>
              <li>Click "Request Permission" to enable notifications</li>
              <li>Click "Get FCM Token" to generate and save token</li>
              <li>Click "Test Notification" to verify browser notifications work</li>
              <li>Create an order from another browser to test real notifications</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
};

export default FCMTest;
