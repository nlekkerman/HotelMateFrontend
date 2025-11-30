import { useEffect, useCallback } from 'react';
import api from '@/services/api';
import { updateStaffStatusDisplay, updateClockButton, updateNavigationBadges } from './statusUpdates';

/**
 * Hook for real-time staff status polling (fallback for Pusher)
 * Polls staff status every 30 seconds and updates UI components
 * @param {string} hotelSlug - Hotel slug identifier
 * @param {boolean} enabled - Whether polling is enabled
 */
export function useStaffStatusPolling(hotelSlug, enabled = true) {
  const fetchAndUpdateStatus = useCallback(async () => {
    if (!hotelSlug || !enabled) return;
    
    try {
      const response = await api.get(`/staff/${hotelSlug}/me/`);
      const staff = response.data;
      
      if (staff.current_status) {
        // Update UI components
        updateStaffStatusDisplay(staff);
        updateClockButton(staff);
        updateNavigationBadges(staff);
      }
    } catch (error) {
      console.error('[StatusPolling] Failed to fetch staff status:', error);
    }
  }, [hotelSlug, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchAndUpdateStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchAndUpdateStatus, 30000);

    return () => clearInterval(interval);
  }, [fetchAndUpdateStatus, enabled]);

  return { fetchAndUpdateStatus };
}