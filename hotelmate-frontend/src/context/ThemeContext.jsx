// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ThemeContext = createContext({
  mainColor: "#3498db",
  secondaryColor: "#2ecc71",
  buttonColor: "#004faf",
  buttonTextColor: "#ffffff",
  buttonHoverColor: "#0066cc",
  setTheme: () => Promise.resolve(),
  themeLoading: true,
});

export function ThemeProvider({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;

  // 1️⃣ Fetch theme
  const { data, isLoading } = useQuery({
    queryKey: ["theme", hotelSlug],
    queryFn: async () => {
      const res = await api.get(`/common/${hotelSlug}/theme/`);
      return res.data;
    },
    enabled: !!hotelSlug,
    refetchOnWindowFocus: false,
  });

  // 2️⃣ Apply CSS variables
  const applyTheme = (theme) => {
    if (!theme) return;
    const hexToRgb = (hex) => {
      const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m
        ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
        : "";
    };

    document.documentElement.style.setProperty("--main-color", theme.main_color);
    document.documentElement.style.setProperty("--secondary-color", theme.secondary_color);
    document.documentElement.style.setProperty("--button-color", theme.button_color);
    document.documentElement.style.setProperty("--button-text-color", theme.button_text_color);
    document.documentElement.style.setProperty("--button-hover-color", theme.button_hover_color);

    document.documentElement.style.setProperty("--main-color-rgb", hexToRgb(theme.main_color));
    document.documentElement.style.setProperty("--secondary-color-rgb", hexToRgb(theme.secondary_color));
  };

  // 3️⃣ Apply on load
  useEffect(() => {
    if (!isLoading && data) {
      applyTheme(data);
      const splash = document.getElementById("splash");
      if (splash) splash.remove();
    }
  }, [isLoading, data]);

  // 4️⃣ Save
  const mutation = useMutation({
    mutationFn: (updatedTheme) =>
      api.patch(`/theme/${data.id}/`, updatedTheme),
    onSuccess: (res) => {
      applyTheme(res.data);
      queryClient.invalidateQueries({ queryKey: ["theme", hotelSlug] });
    },
  });

  const setTheme = ({
    mainColor,
    secondaryColor,
    buttonColor,
    buttonTextColor,
    buttonHoverColor,
  }) => {
    if (!data) return Promise.resolve();
    return mutation.mutateAsync({
      id: data.id,
      main_color: mainColor,
      secondary_color: secondaryColor,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      button_hover_color: buttonHoverColor,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        mainColor: data?.main_color || "#3498db",
        secondaryColor: data?.secondary_color || "#2ecc71",
        buttonColor: data?.button_color || "#004faf",
        buttonTextColor: data?.button_text_color || "#ffffff",
        buttonHoverColor: data?.button_hover_color || "#0066cc",
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
