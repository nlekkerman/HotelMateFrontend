import React, { useState, useEffect } from 'react';
import FirebaseService from '@/services/FirebaseService';

/**
 * FCMTestPanel Component
 * Testing panel for Firebase Cloud Messaging (FCM) notifications
 * Shows permission status, token, and allows sending test notifications
 */
const FCMTestPanel = () => {
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info, success, error

  useEffect(() => {
    checkStatus();
    
    // Setup foreground message listener
    const unsubscribe = FirebaseService.setupForegroundMessageListener((payload) => {
      // console.log('🔔 Foreground notification received:', payload);
      showMessage(`Received: ${payload.notification?.title || 'Notification'}`, 'success');
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const checkStatus = () => {
    const supported = FirebaseService.isSupported();
    setIsSupported(supported);

    if (supported) {
      const permission = FirebaseService.getPermissionStatus();
      setPermissionStatus(permission);

      const savedToken = localStorage.getItem('fcm_token');
      setFcmToken(savedToken);
    } else {
      setPermissionStatus('unsupported');
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    showMessage('Requesting notification permission...', 'info');

    try {
      const granted = await FirebaseService.requestPermission();
      
      if (granted) {
        showMessage('Permission granted! Getting FCM token...', 'success');
        setPermissionStatus('granted');
        
        // Get token after permission is granted
        setTimeout(() => handleGetToken(), 500);
      } else {
        showMessage('Permission denied or dismissed', 'error');
        setPermissionStatus(Notification.permission);
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetToken = async () => {
    setLoading(true);
    showMessage('Getting FCM token...', 'info');

    try {
      const token = await FirebaseService.getFCMToken();
      
      if (token) {
        setFcmToken(token);
        showMessage('FCM token obtained and saved to backend!', 'success');
        
        // Check backend response
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // console.log('✅ FCM Token saved for staff:', user.staff_id);
        // console.log('📝 Token:', token);
      } else {
        showMessage('Failed to get FCM token. Check console for errors.', 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleShowTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      showMessage('Permission not granted. Cannot show test notification.', 'error');
      return;
    }

    try {
      await FirebaseService.showTestNotification();
      showMessage('Test notification sent!', 'success');
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    }
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      showMessage('Token copied to clipboard!', 'success');
    }
  };

  const handleDeleteToken = async () => {
    if (!confirm('Are you sure you want to delete the FCM token?')) {
      return;
    }

    setLoading(true);
    try {
      await FirebaseService.deleteFCMToken();
      setFcmToken(null);
      showMessage('FCM token deleted', 'success');
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReinitialize = async () => {
    setLoading(true);
    showMessage('Reinitializing FCM...', 'info');

    try {
      const success = await FirebaseService.initialize();
      
      if (success) {
        checkStatus();
        showMessage('FCM reinitialized successfully!', 'success');
      } else {
        showMessage('FCM initialization failed', 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'success';
      case 'denied': return 'danger';
      case 'default': return 'warning';
      case 'unsupported': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted': return 'bi-check-circle-fill';
      case 'denied': return 'bi-x-circle-fill';
      case 'default': return 'bi-question-circle-fill';
      case 'unsupported': return 'bi-exclamation-triangle-fill';
      default: return 'bi-hourglass-split';
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-bell-fill me-2"></i>
          FCM Notification Testing Panel
        </h5>
      </div>
      
      <div className="card-body">
        {/* Alert Message */}
        {message && (
          <div className={`alert alert-${messageType === 'error' ? 'danger' : messageType} alert-dismissible fade show`} role="alert">
            <i className={`bi bi-${messageType === 'success' ? 'check-circle' : messageType === 'error' ? 'exclamation-circle' : 'info-circle'} me-2`}></i>
            {message}
            <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
          </div>
        )}

        {/* Browser Support */}
        <div className="mb-4">
          <h6 className="fw-bold">Browser Support</h6>
          <div className="d-flex align-items-center">
            <span className={`badge bg-${isSupported ? 'success' : 'danger'} me-2`}>
              <i className={`bi bi-${isSupported ? 'check' : 'x'}-lg me-1`}></i>
              {isSupported ? 'Supported' : 'Not Supported'}
            </span>
            {!isSupported && (
              <small className="text-muted">
                FCM requires a modern browser with service worker support
              </small>
            )}
          </div>
        </div>

        {/* Permission Status */}
        <div className="mb-4">
          <h6 className="fw-bold">Permission Status</h6>
          <div className="d-flex align-items-center mb-2">
            <span className={`badge bg-${getStatusBadgeColor()} me-2`}>
              <i className={`bi ${getStatusIcon()} me-1`}></i>
              {permissionStatus.toUpperCase()}
            </span>
          </div>
          
          {permissionStatus === 'default' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleRequestPermission}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Requesting...
                </>
              ) : (
                <>
                  <i className="bi bi-bell me-2"></i>
                  Request Permission
                </>
              )}
            </button>
          )}
          
          {permissionStatus === 'denied' && (
            <div className="alert alert-warning mb-0">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Permission denied. Please enable notifications in your browser settings.
            </div>
          )}
        </div>

        {/* FCM Token */}
        <div className="mb-4">
          <h6 className="fw-bold">FCM Token</h6>
          {fcmToken ? (
            <div>
              <div className="input-group mb-2">
                <input 
                  type="text" 
                  className="form-control form-control-sm font-monospace" 
                  value={fcmToken}
                  readOnly
                  style={{ fontSize: '11px' }}
                />
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleCopyToken}
                  title="Copy token"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <small className="text-success">
                <i className="bi bi-check-circle me-1"></i>
                Token saved to backend
              </small>
            </div>
          ) : (
            <div>
              <p className="text-muted mb-2">No token available</p>
              {permissionStatus === 'granted' && (
                <button 
                  className="btn btn-success btn-sm"
                  onClick={handleGetToken}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Getting Token...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-key me-2"></i>
                      Get FCM Token
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-wrap gap-2">
          <button 
            className="btn btn-info btn-sm"
            onClick={handleShowTestNotification}
            disabled={permissionStatus !== 'granted' || loading}
            title="Show a test browser notification"
          >
            <i className="bi bi-bell-fill me-2"></i>
            Test Notification
          </button>
          
          <button 
            className="btn btn-warning btn-sm"
            onClick={handleReinitialize}
            disabled={loading}
            title="Reinitialize FCM service"
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Reinitialize FCM
          </button>
          
          {fcmToken && (
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleDeleteToken}
              disabled={loading}
              title="Delete FCM token from backend and localStorage"
            >
              <i className="bi bi-trash me-2"></i>
              Delete Token
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-3 border-top">
          <h6 className="fw-bold">Testing Instructions</h6>
          <ol className="small mb-0">
            <li>Click "Request Permission" if permission is not granted</li>
            <li>Click "Get FCM Token" to obtain and save the token to backend</li>
            <li>Click "Test Notification" to verify browser notifications work</li>
            <li>Send a message from another user to test real FCM notifications</li>
            <li>Check browser console (F12) for detailed FCM logs</li>
          </ol>
        </div>

        {/* Current User Info */}
        <div className="mt-3 pt-3 border-top">
          <h6 className="fw-bold">Current User</h6>
          {(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return (
              <div className="small">
                <div><strong>Staff ID:</strong> {user.staff_id || 'N/A'}</div>
                <div><strong>Username:</strong> {user.username || 'N/A'}</div>
                <div><strong>Hotel:</strong> {user.hotel_slug || 'N/A'}</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default FCMTestPanel;
