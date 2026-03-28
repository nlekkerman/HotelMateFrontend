/**
 * Guest Chat Portal - CANONICAL SINGLE-TOKEN CONTRACT
 * 
 * Uses only hotel_slug + token for all guest chat operations.
 * Token is the single auth credential from the booking email.
 * 
 * Route: /guest/chat?hotel_slug=...&token=...
 * 
 * Query parameters:
 * - hotel_slug (required) - Hotel identifier
 * - token (required) - Guest authentication token
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GuestChatWidget } from '../components/guest/GuestChatWidget';
import { persistGuestToken } from '@/utils/guestToken';
import './GuestChatPortal.css';

const ChatRealtimeDebugPanel = import.meta.env.DEV
  ? lazy(() => import('../realtime/debug/ChatRealtimeDebugPanel.jsx'))
  : null;

const GuestChatPortal = () => {
  const [searchParams] = useSearchParams();
  const hotelSlug = searchParams.get('hotel_slug');
  const token = searchParams.get('token');

  // Persist token so it survives page reloads
  if (token) persistGuestToken(token);
  
  useEffect(() => {
    console.log('[GuestChatPortal] Initialized with params:', {
      hotelSlug,
      hasToken: !!token,
      url: window.location.href
    });
  }, [hotelSlug, token]);
  
  // Show error if missing required parameters
  if (!hotelSlug || !token) {
    return (
      <div className="guest-chat-portal error-state">
        <div className="container-fluid vh-100 d-flex align-items-center justify-content-center">
          <div className="card shadow" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="card-header bg-danger text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Chat Unavailable
              </h5>
            </div>
            <div className="card-body">
              <div className="alert alert-danger mb-3">
                <strong>Missing Required Information:</strong>
                <ul className="mb-0 mt-2">
                  {!hotelSlug && <li>Hotel identifier</li>}
                  {!token && <li>Guest authentication token</li>}
                </ul>
              </div>
              <p className="text-muted mb-0">
                Please access this chat through the proper guest portal link provided by your hotel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="guest-chat-portal">
      <div className="container-fluid vh-100 d-flex align-items-center justify-content-center p-3">
        <div className="chat-widget-container">
          <GuestChatWidget
            hotelSlug={hotelSlug}
            token={token}
            className="shadow-lg"
            style={{
              width: '100%',
              maxWidth: '450px',
              height: '600px',
              maxHeight: '90vh'
            }}
          />
        </div>
      </div>
      {ChatRealtimeDebugPanel && (
        <Suspense fallback={null}>
          <ChatRealtimeDebugPanel />
        </Suspense>
      )}
    </div>
  );
};

export default GuestChatPortal;