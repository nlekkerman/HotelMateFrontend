import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ThemeContext = createContext({
  mainColor: "#3498db",
  secondaryColor: "#2ecc71",
  setTheme: () => Promise.resolve(),
});

export function ThemeProvider({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;

  const { data, isLoading } = useQuery({
    queryKey: ["theme", hotelSlug],
    queryFn: async () => {
      const res = await api.get(`/common/${hotelSlug}/theme/`);
      return res.data;
    },
    enabled: !!hotelSlug, // only run when hotelSlug is defined
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: ({ main_color, secondary_color, id }) =>
      api.patch(`/theme/${id}/`, { main_color, secondary_color }),
    onSuccess: (res) => {
      const { main_color, secondary_color } = res.data;
      document.documentElement.style.setProperty("--main-color", main_color);
      document.documentElement.style.setProperty("--secondary-color", secondary_color);
      queryClient.invalidateQueries({ queryKey: ["theme", hotelSlug] });
    },
  });

  useEffect(() => {
    if (!isLoading && data) {
      document.documentElement.style.setProperty("--main-color", data.main_color);
      document.documentElement.style.setProperty("--secondary-color", data.secondary_color);
    }
  }, [data, isLoading]);

  const setTheme = ({ mainColor, secondaryColor }) => {
    if (!data) return Promise.resolve();
    return mutation.mutateAsync({
      id: data.id,
      main_color: mainColor,
      secondary_color: secondaryColor,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        mainColor: data?.main_color || "#3498db",
        secondaryColor: data?.secondary_color || "#2ecc71",
        setTheme,
        themeLoading: isLoading || mutation.isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
