import React from 'react';
import { Navigate } from 'react-router-dom';
import RoomService from '@/components/rooms/RoomService';
import Breakfast from '@/components/rooms/Breakfast';
import DinnerBookingForm from '@/components/bookings/DinnerBookingForm';
import DinnerBookingList from '@/components/bookings/DinnerBookingList';
import ChatWindow from '@/components/chat/ChatWindow';
import GuestRoomBookingPage from '@/pages/bookings/GuestRoomBookingPage';
import GuestPrecheckinPage from '@/pages/guest/GuestPrecheckinPage';
import GuestSurveyPage from '@/pages/guest/GuestSurveyPage';
import GuestChatPortal from '@/pages/GuestChatPortal.jsx';
import BookingConfirmation from '@/pages/bookings/BookingConfirmation';
import BookingPaymentSuccess from '@/pages/bookings/BookingPaymentSuccess';
import BookingPaymentCancel from '@/pages/bookings/BookingPaymentCancel';
import BookingStatusPage from '@/pages/bookings/BookingStatusPage';
import FaceClockInPage from '@/features/faceAttendance/pages/FaceClockInPage';

/**
 * Guest route configs — booking flows, guest chat, etc.
 * None of these use ProtectedRoute (they have their own auth mechanisms).
 */
const guestRoutes = [
  // Guest services
  {
    path: '/room_services/:hotelIdentifier/room/:roomNumber/menu',
    element: <RoomService />,
  },
  {
    path: '/room_services/:hotelIdentifier/room/:roomNumber/breakfast/',
    element: <Breakfast />,
  },
  {
    path: '/guest-booking/:hotelSlug/restaurant/:restaurantSlug/',
    element: <DinnerBookingList />,
  },
  {
    path: '/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/',
    element: <DinnerBookingForm />,
  },
  {
    path: '/chat/:hotelSlug/conversations/:conversationId/messages/send',
    element: <ChatWindow />,
  },
  { path: '/chat/:hotelSlug/conversations/:conversationId/messages', element: <ChatWindow /> },

  // Face clock-in — INTENTIONALLY PUBLIC (no ProtectedRoute wrapper).
  // Business reason: These are kiosk/tablet-facing pages where staff authenticate
  // via facial recognition, not via login credentials. The face recognition itself
  // serves as the identity verification mechanism. Protecting these routes with
  // staff login would defeat the purpose of contactless clock-in.
  // Security note: The backend validates face data server-side; the frontend page
  // only captures and submits the image. No sensitive data is exposed on load.
  { path: '/face/:hotelSlug/clock-in', element: <FaceClockInPage /> },
  { path: '/camera-clock-in/:hotelSlug', element: <FaceClockInPage /> },

  // Guest booking flow
  { path: '/:hotelSlug/book', element: <GuestRoomBookingPage /> },
  { path: '/guest/hotel/:hotelSlug/precheckin', element: <GuestPrecheckinPage /> },
  { path: '/guest/hotel/:hotelSlug/survey', element: <GuestSurveyPage /> },
  { path: '/guest/chat', element: <GuestChatPortal /> },
  { path: '/booking/:hotelSlug', element: <GuestRoomBookingPage /> },
  { path: '/booking/confirmation/:bookingId', element: <BookingConfirmation /> },
  { path: '/booking/status/:hotelSlug/:bookingId', element: <BookingStatusPage /> },
  { path: '/booking/:hotelSlug/payment/success', element: <BookingPaymentSuccess /> },
  { path: '/booking/:hotelSlug/payment/cancel', element: <BookingPaymentCancel /> },
  // Legacy routes without hotel slug
  { path: '/booking/payment/success', element: <BookingPaymentSuccess /> },
  { path: '/booking/payment/cancel', element: <BookingPaymentCancel /> },
];

export default guestRoutes;
