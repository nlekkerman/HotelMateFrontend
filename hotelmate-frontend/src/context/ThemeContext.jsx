// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/services/api";

// 1) Create the context
const ThemeContext = createContext({
  mainColor: "#3498db",
  secondaryColor: "#2ecc71",
  setTheme: () => Promise.resolve(),
});

// 2) Provider that loads from API
export function ThemeProvider({ children }) {
  // fetch or initialize
  const { data, isLoading } = useQuery(
    ["theme"],
    async () => {
      const res = await api.get("/theme/");
      if (res.data.length === 0) {
        // no preference yet: create defaults
        const createRes = await api.post("/theme/", {});
        return createRes.data;
      }
      return res.data[0];
    },
    { refetchOnWindowFocus: false }
  );

  // mutation for updates
  const mutation = useMutation(
    ({ main_color, secondary_color, id }) =>
      api.patch(`/theme/${id}/`, { main_color, secondary_color }),
    {
      onSuccess: (res) => {
        // update CSS variables
        const { main_color, secondary_color } = res.data;
        document.documentElement.style.setProperty("--main-color", main_color);
        document.documentElement.style.setProperty("--secondary-color", secondary_color);
        // refetch query so data stays in sync
        queryClient.invalidateQueries(["theme"]);
      },
    }
  );

  // once loaded, inject into CSS
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
