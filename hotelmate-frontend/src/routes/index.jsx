import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import authRoutes from './authRoutes';
import { publicRoutesEarly, publicRoutesLate } from './publicRoutes';
import guestRoutes from './guestRoutes';
import staffRoutes from './staffRoutes';
import gameRoutes from './gameRoutes';

// Dynamic imports for components needing layout-level props
import Register from '@/components/auth/Register';
import WhackAMolePage from '@/games/whack-a-mole/pages/GamePage';
import ChatHomePage from '@/pages/chat/ChatHomePage';

/**
 * buildRoutes — single place where config objects become <Route> elements.
 *
 * Route ordering mirrors the original App.jsx to prevent regressions:
 *   1. Auth routes (specific paths — /login, /register, etc.)
 *   2. Public routes early (/ , /hotel/:slug, etc.)
 *   3. Staff routes (all ProtectedRoute-wrapped)
 *   4. Guest routes (PIN-protected and booking flows)
 *   5. Game routes (ProtectedRoute-wrapped)
 *   6. Public routes late (/:hotelSlug catch-all, * not-found)
 *
 * @param {Object} ctx — layout-level state/callbacks injected from AppLayoutShell
 * @param {Object} ctx.audioSettings
 * @param {Object} ctx.selectedRoom
 * @param {Function} ctx.handleSelectRoom
 * @param {Function} ctx.RegisterWithToken — guarded Register component
 */
export function buildRoutes(ctx) {
  const allConfigs = [
    ...resolveSpecial(authRoutes, ctx),
    ...publicRoutesEarly,
    ...resolveSpecial(staffRoutes, ctx),
    ...guestRoutes,
    ...resolveSpecial(gameRoutes, ctx),
    ...publicRoutesLate,
  ];

  return allConfigs.map((cfg) => {
    let element = cfg.element;

    // Wrap with ProtectedRoute when flagged
    if (cfg.protected) {
      element = (
        <ProtectedRoute
          mode={cfg.mode || 'auth'}
          requiredSlug={cfg.requiredSlug}
        >
          {element}
        </ProtectedRoute>
      );
    }

    return <Route key={cfg.path} path={cfg.path} element={element} />;
  });
}

/**
 * Resolve special sentinel strings to actual elements that need
 * layout-level props or guards.
 */
function resolveSpecial(configs, ctx) {
  return configs.map((cfg) => {
    if (cfg.element === 'REGISTER_WITH_TOKEN') {
      return { ...cfg, element: ctx.RegisterWithToken };
    }
    if (cfg.element === 'WHACK_A_MOLE') {
      return { ...cfg, element: <WhackAMolePage audioSettings={ctx.audioSettings} /> };
    }
    if (cfg.element === 'CHAT_HOME_PAGE') {
      return {
        ...cfg,
        element: (
          <ChatHomePage
            selectedRoom={ctx.selectedRoom}
            onSelectRoom={ctx.handleSelectRoom}
          />
        ),
      };
    }
    return cfg;
  });
}
