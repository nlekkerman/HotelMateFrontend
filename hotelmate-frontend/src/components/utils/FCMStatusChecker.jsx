import React, { useState } from 'react';
import FirebaseService from '@/services/FirebaseService';

/**
 * Simple FCM Status Checker
 * Shows current status without needing Firebase credentials
 */
const FCMStatusChecker = () => {
  const [status, setStatus] = useState(null);

  const checkEverything = () => {
    const checks = {
      browserSupport: FirebaseService.isSupported(),
      notificationAPI: 'Notification' in window,
      serviceWorkerAPI: 'serviceWorker' in navigator,
      permission: FirebaseService.getPermissionStatus(),
      savedToken: localStorage.getItem('fcm_token'),
      userLoggedIn: localStorage.getItem('user') !== null,
      userObject: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
      envVarsLoaded: {
        apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        vapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
        apiBaseUrl: !!import.meta.env.VITE_API_BASE_URL,
      }
    };

    setStatus(checks);
    console.log('FCM Status Check:', checks);
  };

  React.useEffect(() => {
    checkEverything();
  }, []);

  if (!status) {
    return <div>Loading...</div>;
  }

  return (
    <div className="card">
      <div className="card-header bg-info text-white">
        <h6 className="mb-0">
          <i className="bi bi-clipboard-check me-2"></i>
          FCM Implementation Status
        </h6>
      </div>
      <div className="card-body">
        <h6 className="mb-3">Browser Compatibility</h6>
        <ul className="list-unstyled mb-4">
          <li>
            {status.browserSupport ? '✅' : '❌'} FCM Supported
          </li>
          <li>
            {status.notificationAPI ? '✅' : '❌'} Notification API Available
          </li>
          <li>
            {status.serviceWorkerAPI ? '✅' : '❌'} Service Worker API Available
          </li>
        </ul>

        <h6 className="mb-3">Environment Configuration</h6>
        <ul className="list-unstyled mb-4">
          <li>
            {status.envVarsLoaded.apiKey ? '✅' : '❌'} Firebase API Key {!status.envVarsLoaded.apiKey && <span className="text-danger">(Missing in .env)</span>}
          </li>
          <li>
            {status.envVarsLoaded.authDomain ? '✅' : '❌'} Auth Domain {!status.envVarsLoaded.authDomain && <span className="text-danger">(Missing in .env)</span>}
          </li>
          <li>
            {status.envVarsLoaded.projectId ? '✅' : '❌'} Project ID {!status.envVarsLoaded.projectId && <span className="text-danger">(Missing in .env)</span>}
          </li>
          <li>
            {status.envVarsLoaded.vapidKey ? '✅' : '❌'} VAPID Key {!status.envVarsLoaded.vapidKey && <span className="text-danger">(Missing in .env)</span>}
          </li>
          <li>
            {status.envVarsLoaded.apiBaseUrl ? '✅' : '❌'} API Base URL {!status.envVarsLoaded.apiBaseUrl && <span className="text-danger">(Missing in .env)</span>}
          </li>
        </ul>

        <h6 className="mb-3">User Status</h6>
        <ul className="list-unstyled mb-4">
          <li>
            {status.userLoggedIn ? '✅' : '❌'} User Logged In
          </li>
          {status.userObject && (
            <>
              <li className="ms-3">
                <small>
                  Username: <strong>{status.userObject.username}</strong>
                </small>
              </li>
              <li className="ms-3">
                <small>
                  Role: <strong>{status.userObject.role}</strong>
                </small>
              </li>
              <li className="ms-3">
                <small>
                  Has Token: <strong>{status.userObject.token ? 'Yes' : 'No'}</strong>
                </small>
              </li>
            </>
          )}
        </ul>

        <h6 className="mb-3">Notification Status</h6>
        <ul className="list-unstyled mb-4">
          <li>
            Permission: <strong className={status.permission === 'granted' ? 'text-success' : 'text-warning'}>
              {status.permission}
            </strong>
          </li>
          <li>
            FCM Token Saved: {status.savedToken ? '✅ Yes' : '❌ No'}
          </li>
        </ul>

        {!status.envVarsLoaded.apiKey && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Action Required:</strong> Create <code>.env</code> file with Firebase credentials.
            <br />
            See <code>TEST_NOW.md</code> for instructions.
          </div>
        )}

        {status.envVarsLoaded.apiKey && !status.userLoggedIn && (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Next Step:</strong> Login to test FCM token generation.
          </div>
        )}

        {status.envVarsLoaded.apiKey && status.userLoggedIn && status.permission !== 'granted' && (
          <div className="alert alert-success">
            <i className="bi bi-check-circle me-2"></i>
            <strong>Ready!</strong> Use the FCM Debug Panel below to request permissions and get token.
          </div>
        )}

        <button className="btn btn-sm btn-primary" onClick={checkEverything}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default FCMStatusChecker;
