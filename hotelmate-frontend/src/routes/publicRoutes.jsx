import React from 'react';
import HotelsLandingPage from '@/pages/hotels/HotelsLandingPage';
import HotelPublicPage from '@/pages/hotels/HotelPublicPage';
import SectionBasedPublicPage from '@/pages/sections/SectionBasedPublicPage';
import ShootARPage from '@/shootar/ShootARPage.jsx';
import Restaurant from '@/components/restaurants/Restaurant';
import GoodToKnow from '@/components/hotel_info/GoodToKnow';
import NotFound from '@/components/offline/NotFound';
import HotelPortalPage from '@/pages/HotelPortalPage';

/**
 * Public route configs — accessible without authentication.
 *
 * IMPORTANT: /:hotelSlug and /* MUST remain at the very end of all routes
 * (handled by route builder ordering in index.jsx).
 */

/** Public routes that come EARLY in ordering (specific paths). */
export const publicRoutesEarly = [
  { path: '/', element: <HotelsLandingPage /> },
  { path: '/hotel/:slug', element: <HotelPublicPage /> },
  { path: '/hotel/:slug/sections', element: <SectionBasedPublicPage /> },
  { path: '/hotels/:hotelSlug/restaurants/:restaurantSlug', element: <Restaurant /> },
  { path: '/good_to_know/:hotel_slug/:slug', element: <GoodToKnow /> },
  { path: '/shootar', element: <ShootARPage /> },
];

/** Public routes that MUST come LAST (catch-all patterns). */
export const publicRoutesLate = [
  { path: '/:hotelSlug', element: <HotelPortalPage /> },
  { path: '*', element: <NotFound /> },
];
