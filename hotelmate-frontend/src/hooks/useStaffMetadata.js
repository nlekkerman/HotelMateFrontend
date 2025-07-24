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

  return {
    departments: data?.departments || [],
    roles: data?.roles || [],
    accessLevels: data?.access_levels || [],
    isLoading,
    isError,
    error,
  };
}
