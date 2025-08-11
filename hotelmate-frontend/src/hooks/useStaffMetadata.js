import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

const fetchStaffMetadata = async (hotelSlug) => {
  const response = await api.get("/staff/metadata/", {
    params: { hotel_slug: hotelSlug },
  });
  return response.data;
};

export default function useStaffMetadata(hotelSlug) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["staffMetadata", hotelSlug],
    queryFn: () => fetchStaffMetadata(hotelSlug),
    enabled: Boolean(hotelSlug),
    staleTime: 1000 * 60 * 5,
  });

  // Extract unique departments from the results array
  const departments = data?.results
    ? Array.from(
        data.results.reduce((map, item) => {
          const dept = item.department_detail;
          if (dept && !map.has(dept.id)) {
            map.set(dept.id, [dept.slug || dept.id, dept.name]);
          }
          return map;
        }, new Map())
      ).map(([, value]) => value)
    : [];

  return {
    departments,
    roles: [],         // You may need to extract roles similarly
    accessLevels: [],  // Same for access levels
    isLoading,
    isError,
    error,
  };
}

