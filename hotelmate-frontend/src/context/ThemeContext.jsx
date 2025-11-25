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
  
  // Get hotel slug from either logged-in user OR guest session
  const hotelSlug = React.useMemo(() => {
    // First check if staff user is logged in
    if (user?.hotel_slug) {
      return user.hotel_slug;
    }
    
    // If no user, check for guest session
    try {
      const guestSession = localStorage.getItem('hotelmate_guest_chat_session');
      if (guestSession) {
        const session = JSON.parse(guestSession);
        return session.hotel_slug;
      }
    } catch (err) {
      console.error('Failed to parse guest session:', err);
    }
    
    return null;
  }, [user]);

  // 1️⃣ Fetch theme from public settings (includes both content AND theme)
  const { data, isLoading } = useQuery({
    queryKey: ["theme", hotelSlug],
    queryFn: async () => {
      console.log('[ThemeContext] Fetching theme for:', hotelSlug);
      // For staff users, use staff endpoint
      if (user?.hotel_slug) {
        const res = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
        console.log('[ThemeContext] Staff settings response:', res.data);
        // Map to ThemeContext format with ALL colors
        return {
          main_color: res.data.primary_color || '#3498db',
          secondary_color: res.data.secondary_color || '#10B981',
          accent_color: res.data.accent_color || '#F59E0B',
          button_color: res.data.button_color || '#3B82F6',
          button_text_color: res.data.button_text_color || '#ffffff',
          button_hover_color: res.data.button_hover_color || '#0066cc',
          text_color: res.data.text_color || '#333333',
          background_color: res.data.background_color || '#FFFFFF',
          border_color: res.data.border_color || '#e5e7eb',
          link_color: res.data.link_color || '#007bff',
          link_hover_color: res.data.link_hover_color || '#0056b3',
        };
      }
      // For guests, use public endpoint
      const res = await api.get(`/public/hotels/${hotelSlug}/settings/`);
      console.log('[ThemeContext] Public settings response:', res.data);
      return {
        main_color: res.data.primary_color || '#3498db',
        secondary_color: res.data.secondary_color || '#10B981',
        accent_color: res.data.accent_color || '#F59E0B',
        button_color: res.data.button_color || '#3B82F6',
        button_text_color: res.data.button_text_color || '#ffffff',
        button_hover_color: res.data.button_hover_color || '#0066cc',
        text_color: res.data.text_color || '#333333',
        background_color: res.data.background_color || '#FFFFFF',
        border_color: res.data.border_color || '#e5e7eb',
        link_color: res.data.link_color || '#007bff',
        link_hover_color: res.data.link_hover_color || '#0056b3',
      };
    },
    enabled: !!hotelSlug,
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once
    onError: (error) => {
      console.warn('Theme fetch failed, using defaults:', error);
    }
  });

  // 2️⃣ Apply CSS variables - ALL theme colors
  const applyTheme = (theme) => {
    if (!theme) return;
    console.log('[ThemeContext] Applying theme:', theme);
    
    const hexToRgb = (hex) => {
      if (!hex) return "";
      const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m
        ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
        : "";
    };

    // Primary colors
    if (theme.main_color) {
      document.documentElement.style.setProperty("--main-color", theme.main_color);
      document.documentElement.style.setProperty("--primary-color", theme.main_color);
      document.documentElement.style.setProperty("--main-color-rgb", hexToRgb(theme.main_color));
    }
    
    if (theme.secondary_color) {
      document.documentElement.style.setProperty("--secondary-color", theme.secondary_color);
      document.documentElement.style.setProperty("--secondary-color-rgb", hexToRgb(theme.secondary_color));
    }
    
    if (theme.accent_color) {
      document.documentElement.style.setProperty("--accent-color", theme.accent_color);
    }
    
    // Button colors
    if (theme.button_color) document.documentElement.style.setProperty("--button-color", theme.button_color);
    if (theme.button_text_color) document.documentElement.style.setProperty("--button-text-color", theme.button_text_color);
    if (theme.button_hover_color) document.documentElement.style.setProperty("--button-hover-color", theme.button_hover_color);
    
    // Text and background
    if (theme.text_color) document.documentElement.style.setProperty("--text-color", theme.text_color);
    if (theme.background_color) document.documentElement.style.setProperty("--background-color", theme.background_color);
    if (theme.border_color) document.documentElement.style.setProperty("--border-color", theme.border_color);
    
    // Links
    if (theme.link_color) document.documentElement.style.setProperty("--link-color", theme.link_color);
    if (theme.link_hover_color) document.documentElement.style.setProperty("--link-hover-color", theme.link_hover_color);
  };

  // 3️⃣ Apply on load
useEffect(() => {
  if (!user || (!isLoading && data)) {
    if (data) applyTheme(data);
    const splash = document.getElementById("splash");
    if (splash) splash.remove();
  }
}, [isLoading, data, user]);


  // 4️⃣ Save - Update to use settings endpoint
  const mutation = useMutation({
    mutationFn: (updatedTheme) => {
      if (!user?.hotel_slug) {
        return Promise.reject(new Error('Not authorized to update theme'));
      }
      // Map back to primary_color for backend
      return api.patch(`/staff/hotel/${hotelSlug}/settings/`, {
        primary_color: updatedTheme.main_color,
        secondary_color: updatedTheme.secondary_color,
        button_color: updatedTheme.button_color,
      });
    },
    onSuccess: (res) => {
      // Map response back with ALL colors
      const mappedData = {
        main_color: res.data.primary_color,
        secondary_color: res.data.secondary_color,
        accent_color: res.data.accent_color || '#F59E0B',
        button_color: res.data.button_color,
        button_text_color: res.data.button_text_color || '#ffffff',
        button_hover_color: res.data.button_hover_color || '#0066cc',
        text_color: res.data.text_color || '#333333',
        background_color: res.data.background_color || '#FFFFFF',
        border_color: res.data.border_color || '#e5e7eb',
        link_color: res.data.link_color || '#007bff',
        link_hover_color: res.data.link_hover_color || '#0056b3',
      };
      applyTheme(mappedData);
      queryClient.invalidateQueries({ queryKey: ["theme", hotelSlug] });
      queryClient.invalidateQueries({ queryKey: ["hotelPublicSettings", hotelSlug] });
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
