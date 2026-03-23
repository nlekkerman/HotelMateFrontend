import React, { useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import '@/games/whack-a-mole/styles/InterfaceStyles.css';
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
