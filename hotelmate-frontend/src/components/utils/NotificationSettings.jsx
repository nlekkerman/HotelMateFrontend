import React, { useState, useEffect } from 'react';
import FirebaseService from '@/services/FirebaseService';
import { toast } from 'react-toastify';

/**
 * NotificationSettings Component
 * 
 * Allows staff members to:
 * - Check notification permission status
 * - Request notification permissions
 * - Test notifications
 * - View FCM token
 */
const NotificationSettings = () => {
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = () => {
    setIsSupported(FirebaseService.isSupported());
    setPermissionStatus(FirebaseService.getPermissionStatus());
    
    const savedToken = localStorage.getItem('fcm_token');
    setFcmToken(savedToken);
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await FirebaseService.requestPermission();
      
      if (granted) {
        toast.success('Notification permission granted!');
        await handleGetToken();
      } else {
        toast.error('Notification permission denied. Please enable it in browser settings.');
      }
      
      checkNotificationStatus();
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const handleGetToken = async () => {
    try {
      const token = await FirebaseService.getFCMToken();
      
      if (token) {
        setFcmToken(token);
        toast.success('FCM token obtained and saved!');
      } else {
        toast.error('Failed to get FCM token');
      }
    } catch (error) {
      console.error('Error getting token:', error);
      toast.error('Failed to get FCM token');
    }
  };

  const handleTestNotification = () => {
    FirebaseService.showTestNotification();
    toast.info('Test notification sent!');
  };

  const handleDeleteToken = async () => {
    try {
      await FirebaseService.deleteFCMToken();
      setFcmToken(null);
      toast.success('FCM token deleted');
    } catch (error) {
      console.error('Error deleting token:', error);
      toast.error('Failed to delete FCM token');
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <span className="badge bg-success">Enabled</span>;
      case 'denied':
        return <span className="badge bg-danger">Blocked</span>;
      case 'default':
        return <span className="badge bg-warning">Not Requested</span>;
      case 'unsupported':
        return <span className="badge bg-secondary">Not Supported</span>;
      default:
        return <span className="badge bg-secondary">Unknown</span>;
    }
  };

  if (!isSupported) {
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">
            <i className="bi bi-bell-slash me-2"></i>
            Push Notifications
          </h5>
          <div className="alert alert-warning" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Push notifications are not supported in this browser. 
            Please use a modern browser like Chrome, Firefox, or Edge.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">
          <i className="bi bi-bell me-2"></i>
          Push Notifications
        </h5>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span>Status:</span>
            {getPermissionBadge()}
          </div>
          
          {fcmToken && (
            <div className="mb-2">
              <small className="text-muted">
                <i className="bi bi-check-circle me-1"></i>
                Token registered with backend
              </small>
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2">
          {permissionStatus === 'default' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleRequestPermission}
            >
              <i className="bi bi-bell me-1"></i>
              Enable Notifications
            </button>
          )}
          
          {permissionStatus === 'granted' && !fcmToken && (
            <button 
              className="btn btn-success btn-sm"
              onClick={handleGetToken}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Get Token
            </button>
          )}
          
          {permissionStatus === 'granted' && fcmToken && (
            <>
              <button 
                className="btn btn-info btn-sm"
                onClick={handleTestNotification}
              >
                <i className="bi bi-send me-1"></i>
                Test Notification
              </button>
              
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={handleDeleteToken}
              >
                <i className="bi bi-trash me-1"></i>
                Remove Token
              </button>
            </>
          )}
          
          {permissionStatus === 'denied' && (
            <div className="alert alert-danger mb-0 w-100" role="alert">
              <small>
                <i className="bi bi-exclamation-triangle me-1"></i>
                Notifications are blocked. Please enable them in your browser settings:
                <br />
                <strong>Chrome/Edge:</strong> Settings → Privacy and security → Site Settings → Notifications
                <br />
                <strong>Firefox:</strong> Settings → Privacy & Security → Permissions → Notifications
              </small>
            </div>
          )}
        </div>

        {fcmToken && (
          <details className="mt-3">
            <summary className="text-muted small" style={{ cursor: 'pointer' }}>
              <i className="bi bi-code-slash me-1"></i>
              Show FCM Token
            </summary>
            <div className="mt-2">
              <pre className="bg-light p-2 rounded" style={{ fontSize: '0.7rem', maxHeight: '100px', overflow: 'auto' }}>
                {fcmToken}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
