import React from 'react';
import { Routes } from 'react-router-dom';
import { buildRoutes } from '@/routes/index';

/**
 * AppRouter — assembles <Routes> from the centralized route configs.
 *
 * Accepts layout-level context that some routes need (audio settings,
 * chat state, RegisterWithToken guard).
 */
export default function AppRouter({ audioSettings, selectedRoom, handleSelectRoom, RegisterWithToken }) {
  const routeElements = buildRoutes({
    audioSettings,
    selectedRoom,
    handleSelectRoom,
    RegisterWithToken,
  });

  return <Routes>{routeElements}</Routes>;
}
