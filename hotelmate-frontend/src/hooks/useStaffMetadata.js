import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

const fetchStaffMetadata = async (hotelSlug) => {
  // Build URL with hotelSlug as part of the path
  const url = `/staff/${hotelSlug}/metadata/`;
  const response = await api.get(url);
  console.log("API response for staff metadata:", response.data);
  return response.data;
};

export default function useStaffMetadata(hotelSlug) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["staffMetadata", hotelSlug],
    queryFn: () => fetchStaffMetadata(hotelSlug),
    enabled: Boolean(hotelSlug),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
