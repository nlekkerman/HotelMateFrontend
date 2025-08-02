export function usePermissions() {
  // Parse user object from localStorage safely
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem("user"));
  } catch {
    storedUser = null;
  }

  const role = storedUser?.role?.toLowerCase(); // Normalize role string
  const isSuperUser = storedUser?.is_superuser;

  const canAccess = (allowedRoles = []) => {
    if (!storedUser || !role) {
      return false;
    }
    if (isSuperUser) {
      return true;
    }
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
    return normalizedAllowedRoles.includes(role);
  };

  return { canAccess };
}
