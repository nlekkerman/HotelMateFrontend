// src/hooks/useDesktopNav.js
// Assembles RBAC-driven navigation items for the desktop compact launcher.
// Merges the synthetic Overview item with backend-driven navigation_items,
// filtered through effective_navs. No role-name checks, no hardcoded branching.
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigation } from '@/hooks/useNavigation';
import { getNavIcon } from '@/config/navIconMap';

/**
 * Build the desktop launcher navigation items.
 * Returns a flat array of { slug, name, path, icon, synthetic?, active? }.
 */
export function useDesktopNav() {
  const { user } = useAuth();
  const { effectiveNavs, isSuperUser } = usePermissions();
  const { visibleNavItems } = useNavigation();

  const hotelSlug = user?.hotel_slug || '';

  const items = useMemo(() => {
    // 1. Synthetic frontend items (not from backend business-domain)
    const overviewItem = {
      slug: 'overview',
      name: 'Overview',
      path: `/staff/${hotelSlug}/overview`,
      icon: getNavIcon('overview'),
      synthetic: true,
    };

    const homeItem = {
      slug: 'home',
      name: 'Home',
      path: `/staff/${hotelSlug}/feed`,
      icon: getNavIcon('home'),
      synthetic: true,
    };

    // 2. Filter backend nav items through RBAC
    const rbacItems = visibleNavItems
      .filter((item) => {
        // Skip home/settings — handled as synthetic or special items
        if (item.slug === 'home') return false;
        if (item.slug === 'admin_settings') return false;
        // Super users see everything; otherwise check effective_navs
        if (isSuperUser) return true;
        return effectiveNavs.includes(item.slug);
      })
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        path: item.path,
        icon: getNavIcon(item.slug),
        synthetic: false,
      }));

    // 3. Settings item — only for users with admin_settings access
    const settingsItems = [];
    if (isSuperUser || effectiveNavs.includes('admin_settings')) {
      settingsItems.push({
        slug: 'admin_settings',
        name: 'Settings',
        path: `/staff/${hotelSlug}/settings`,
        icon: getNavIcon('admin_settings'),
        synthetic: true,
      });
    }

    // 4. Assemble: Home → Overview → domain items → Settings
    return [homeItem, overviewItem, ...rbacItems, ...settingsItems];
  }, [hotelSlug, visibleNavItems, effectiveNavs, isSuperUser]);

  return { items, hotelSlug };
}
