// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ThemeContext = createContext({
  mainColor: "#000000ff",
  secondaryColor: "#2ecc71",
  setTheme: () => Promise.resolve(),
  themeLoading: true,
});

export function ThemeProvider({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;

  // 1️⃣ Fetch the theme for this hotel
  const { data, isLoading } = useQuery({
    queryKey: ["theme", hotelSlug],
    queryFn: async () => {
      const res = await api.get(`/common/${hotelSlug}/theme/`);
      return res.data;
    },
    enabled: !!hotelSlug,
    refetchOnWindowFocus: false,
  });

  // 2️⃣ Mutation to update the theme
  const mutation = useMutation({
    mutationFn: ({ main_color, secondary_color, id }) =>
      api.patch(`/theme/${id}/`, { main_color, secondary_color }),
    onSuccess: (res) => {
      const { main_color, secondary_color } = res.data;
      document.documentElement.style.setProperty("--main-color", main_color);
      document.documentElement.style.setProperty("--secondary-color", secondary_color);

      const hexToRgb = (hex) => {
        const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m
          ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
          : "";
      };

      document.documentElement.style.setProperty(
        "--main-color-rgb",
        hexToRgb(main_color)
      );
      document.documentElement.style.setProperty(
        "--secondary-color-rgb",
        hexToRgb(secondary_color)
      );

      queryClient.invalidateQueries({ queryKey: ["theme", hotelSlug] });
    },
  });

  // 3️⃣ When the theme data initially loads, apply it & remove the splash
  useEffect(() => {
    if (isLoading) return;
    if (data) {
      const hexToRgb = (hex) => {
        const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m
          ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
          : "";
      };

      document.documentElement.style.setProperty("--main-color", data.main_color);
      document.documentElement.style.setProperty(
        "--secondary-color",
        data.secondary_color
      );
      document.documentElement.style.setProperty(
        "--main-color-rgb",
        hexToRgb(data.main_color)
      );
      document.documentElement.style.setProperty(
        "--secondary-color-rgb",
        hexToRgb(data.secondary_color)
      );
    }
    const splash = document.getElementById("splash");
    if (splash) splash.remove();
  }, [isLoading, data]);

  // 4️⃣ Expose a setter for updating theme
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

export function useTheme() {
  return useContext(ThemeContext);
}
