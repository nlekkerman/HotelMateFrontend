import React from 'react';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import RegistrationSuccess from '@/components/auth/RegistrationSuccess';
import ForgotPassword from '@/components/auth/ForgotPassword';
import ResetPassword from '@/components/auth/ResetPassword';
import Logout from '@/components/auth/Logout';
import NoInternet from '@/components/offline/NoInternet';

/**
 * Auth route configs — login, registration, password reset, etc.
 * None of these require authentication.
 */
const authRoutes = [
  { path: '/login', element: <Login /> },
  { path: '/logout', element: <Logout /> },
  {
    path: '/register',
    // RegisterWithToken guard is handled in AppLayoutShell (needs useLocation)
    element: 'REGISTER_WITH_TOKEN',
  },
  { path: '/registration-success', element: <RegistrationSuccess /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password/:uid/:token/', element: <ResetPassword /> },
  { path: '/no-internet', element: <NoInternet /> },
];

export default authRoutes;
