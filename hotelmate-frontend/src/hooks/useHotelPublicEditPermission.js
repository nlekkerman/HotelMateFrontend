import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * useHotelPublicEditPermission - Determine if current user can edit hotel's public page
 * 
 * @param {string} hotelSlug - The hotel slug to check permissions for
 * @returns {{ canEdit: boolean, loading: boolean }} - Permission status
 */
const useHotelPublicEditPermission = (hotelSlug) => {
  const { user, isStaff } = useAuth();

  const { canEdit, loading } = useMemo(() => {
    // If no user, not authenticated
    if (!user) {
      return { canEdit: false, loading: false };
    }

    // Not a staff member
    if (!isStaff) {
      return { canEdit: false, loading: false };
    }

    // Superuser can edit any hotel
    if (user.is_superuser) {
      return { canEdit: true, loading: false };
    }

    // Check if staff belongs to this hotel
    const belongsToHotel = user.hotel_slug === hotelSlug;
    
    if (!belongsToHotel) {
      return { canEdit: false, loading: false };
    }

    // Check access level - managers and admins can edit
    // Adjust these role checks based on your backend's role system
    const canEditRoles = ['admin', 'manager', 'owner'];
    const hasEditRole = canEditRoles.includes(user.role?.toLowerCase());

    // Alternative: check by access_level if you use numeric levels
    // const hasHighAccess = user.access_level >= 3; // Example threshold

    return { 
      canEdit: hasEditRole || user.is_superuser, 
      loading: false 
    };
  }, [user, isStaff, hotelSlug]);

  return { canEdit, loading };
};

export { useHotelPublicEditPermission };
export default useHotelPublicEditPermission;
