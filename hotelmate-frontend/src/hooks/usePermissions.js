import { useAuth } from "@/context/AuthContext";

export function usePermissions(staffProfile) {
  const { user } = useAuth();
  const isSuperUser = user?.is_superuser;
  const role = staffProfile?.role;

  // Pass an array of allowed roles → return true/false
  const canAccess = (allowedRoles = []) => {
    if (!user) return false;
    if (isSuperUser) return true;
    return allowedRoles.includes(role);
  };

  return { canAccess };
}
