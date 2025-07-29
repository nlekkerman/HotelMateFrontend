import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

// Fetcher function
const fetchStaffMetadata = async () => {
  const response = await api.get("/staff/metadata/");
  return response.data;
};

// Hook
export default function useStaffMetadata() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["staffMetadata"],
    queryFn: fetchStaffMetadata,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Transform departments from objects to [value, label] pairs
  const departments =
    data?.departments?.map((dept) => [
      dept.slug || dept.id || dept.value, // value to use, fallback in priority order
      dept.name || dept.label || String(dept), // label to display
    ]) || [];

  // Similarly, roles and accessLevels can be transformed if needed,
  // but usually they are fine as is unless you want to display labels.

  return {
    departments,
    roles: data?.roles || [],
    accessLevels: data?.access_levels || [],
    isLoading,
    isError,
    error,
  };
}
