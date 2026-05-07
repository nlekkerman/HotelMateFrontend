import React, { useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import '@/styles/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import AppProviders from '@/components/app/AppProviders';
import GlobalErrorBoundary from '@/components/app/GlobalErrorBoundary';
import AppLayoutShell from '@/components/app/AppLayoutShell';
import NetworkHandler from '@/components/offline/NetworkHandler';
import MessengerWidget from '@/staff_chat/components/MessengerWidget';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 991 });

  return (
    <AppProviders>
      <GlobalErrorBoundary>
        <div
          role="note"
          aria-label="Demo disclaimer"
          style={{
            width: '100%',
            height: 'var(--demo-banner-h, 36px)',
            background: '#ffffff',
            color: 'rgba(220, 38, 38, 0.6)',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 16px',
            fontSize: '12px',
            lineHeight: 1.3,
            textAlign: 'center',
            position: 'relative',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <strong>HotelsMates</strong> is a self-directed SaaS concept built for portfolio review.
          {' '}Demo data only — no real hotel, guest, staff, or payment data.
        </div>
        <NetworkHandler />
        <MessengerWidget position="bottom-right" />
        <AppLayoutShell
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
        />
      </GlobalErrorBoundary>
    </AppProviders>
  );
}
