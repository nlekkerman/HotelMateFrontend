import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { UIProvider } from '@/context/UIContext';
import { AuthProvider } from '@/context/AuthContext';
import RealtimeProvider from '@/realtime/RealtimeProvider';
import { ChatProvider } from '@/context/ChatContext';
import { MessengerProvider } from '@/staff_chat/context/MessengerContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ChartPreferencesProvider } from '@/context/ChartPreferencesContext';
import { StaffChatProvider } from '@/staff_chat/context/StaffChatContext';
import { BookingNotificationProvider } from '@/context/BookingNotificationContext';
import { RoomServiceNotificationProvider } from '@/context/RoomServiceNotificationContext';

const queryClient = new QueryClient();

/**
 * AppProviders — single composed provider tree.
 *
 * Provider ordering:
 *   BrowserRouter (routing)
 *   └─ QueryClientProvider (server state)
 *       └─ UIProvider (UI toggles)
 *           └─ AuthProvider (auth state — writes to authStore bridge)
 *               └─ RealtimeProvider (Pusher + all domain stores incl. Housekeeping)
 *                   └─ ChatProvider (context-level chat, uses realtime stores)
 *                       └─ MessengerProvider (staff messenger overlay)
 *                           └─ ThemeProvider (theme fetching)
 *                               └─ ChartPreferencesProvider
 *                                   └─ StaffChatProvider
 *                                       └─ BookingNotificationProvider
 *                                           └─ RoomServiceNotificationProvider
 *
 * NOTE: All realtime domain stores (Attendance, RoomService, ServiceBooking,
 *       GuestChat, StaffChatStore, Housekeeping, RoomBooking, Rooms,
 *       Notifications) live inside RealtimeProvider. DO NOT add them here.
 */
export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
        />
        <UIProvider>
          <AuthProvider>
            <RealtimeProvider>
              <ChatProvider>
                <MessengerProvider>
                  <ThemeProvider>
                    <ChartPreferencesProvider>
                      <StaffChatProvider>
                        <BookingNotificationProvider>
                          <RoomServiceNotificationProvider>
                            {children}
                          </RoomServiceNotificationProvider>
                        </BookingNotificationProvider>
                      </StaffChatProvider>
                    </ChartPreferencesProvider>
                  </ThemeProvider>
                </MessengerProvider>
              </ChatProvider>
            </RealtimeProvider>
          </AuthProvider>
        </UIProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
