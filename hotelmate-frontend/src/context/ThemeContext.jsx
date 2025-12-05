// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ThemeContext = createContext({
  mainColor: "#3498db",
  secondaryColor: "#2ecc71",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  borderColor: "#dddddd",
  buttonColor: "#004faf",
  buttonTextColor: "#ffffff",
  buttonHoverColor: "#0066cc",
  linkColor: "#007bff",
  linkHoverColor: "#0056b3",
  setTheme: () => Promise.resolve(),
  updateTheme: () => Promise.resolve(),
  themeLoading: true,
  settings: null,
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
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["theme", hotelSlug, user?.is_staff, user?.hotel_slug], // Include user state in key
    queryFn: async () => {
      console.log('[ThemeContext] Fetching theme for:', hotelSlug);
      console.log('[ThemeContext] User is staff:', user?.is_staff, 'User hotel_slug:', user?.hotel_slug);
      
      // For staff users, use staff endpoint
      if (user?.is_staff && user?.hotel_slug) {
        console.log('[ThemeContext] Using STAFF endpoint for theme');
        const res = await api.get(`/staff/hotel/${user.hotel_slug}/settings/`);
        console.log('[ThemeContext] Staff settings response:', res.data);
        // Map to ThemeContext format with ALL colors
        return {
          ...res.data, // Include all settings data
          main_color: res.data.main_color || res.data.primary_color || '#3498db',
          secondary_color: res.data.secondary_color || '#2ecc71',
          button_color: res.data.button_color || '#2980b9',
          button_text_color: res.data.button_text_color || '#ffffff',
          button_hover_color: res.data.button_hover_color || '#1f6391',
          text_color: res.data.text_color || '#333333',
          background_color: res.data.background_color || '#ffffff',
          border_color: res.data.border_color || '#dddddd',
          link_color: res.data.link_color || '#2980b9',
          link_hover_color: res.data.link_hover_color || '#1f6391',
        };
      }
      // For guests, try public hotel page endpoint which might have theme data
      console.log('[ThemeContext] Using PUBLIC hotel page endpoint for theme');
      try {
        const res = await api.get(`/public/hotel/${hotelSlug}/page/`);
        console.log('[ThemeContext] Public hotel page response:', res.data);
        return {
          ...res.data,
          main_color: res.data.main_color || res.data.primary_color || '#3498db',
          secondary_color: res.data.secondary_color || '#2ecc71',
          button_color: res.data.button_color || '#2980b9',
          button_text_color: res.data.button_text_color || '#ffffff',
          button_hover_color: res.data.button_hover_color || '#1f6391',
          text_color: res.data.text_color || '#333333',
          background_color: res.data.background_color || '#ffffff',
          border_color: res.data.border_color || '#dddddd',
          link_color: res.data.link_color || '#2980b9',
          link_hover_color: res.data.link_hover_color || '#1f6391',
        };
      } catch (error) {
        console.warn('[ThemeContext] Public hotel page not found, using default theme');
        // Return default theme if public endpoint doesn't exist
        return {
          main_color: '#3498db',
          secondary_color: '#2ecc71',
          button_color: '#2980b9',
          button_text_color: '#ffffff',
          button_hover_color: '#1f6391',
          text_color: '#333333',
          background_color: '#ffffff',
          border_color: '#dddddd',
          link_color: '#2980b9',
          link_hover_color: '#1f6391',
        };
      }
    },
    enabled: !!hotelSlug,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on failure
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    onError: (error) => {
      console.warn('Theme fetch failed, using defaults:', error);
      // Remove splash screen even on error
      const splash = document.getElementById("splash");
      if (splash) splash.remove();
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
    if (data) {
      applyTheme(data);
    }
    
    // Always remove splash screen after theme attempt (even if it fails)
    if (!isLoading) {
      const splash = document.getElementById("splash");
      if (splash) splash.remove();
    }
}, [isLoading, data]);


  // 4️⃣ Save - Update to use settings endpoint
  const mutation = useMutation({
    mutationFn: (updatedTheme) => {
      if (!user?.hotel_slug) {
        return Promise.reject(new Error('Not authorized to update theme'));
      }
      // Send all theme colors to backend
      return api.patch(`/staff/hotel/${hotelSlug}/settings/`, updatedTheme);
    },
    onSuccess: (res) => {
      // Map response back with ALL colors
      const mappedData = {
        ...res.data,
        main_color: res.data.main_color || res.data.primary_color || '#3498db',
        secondary_color: res.data.secondary_color || '#2ecc71',
        button_color: res.data.button_color || '#2980b9',
        button_text_color: res.data.button_text_color || '#ffffff',
        button_hover_color: res.data.button_hover_color || '#1f6391',
        text_color: res.data.text_color || '#333333',
        background_color: res.data.background_color || '#ffffff',
        border_color: res.data.border_color || '#dddddd',
        link_color: res.data.link_color || '#2980b9',
        link_hover_color: res.data.link_hover_color || '#1f6391',
      };
      applyTheme(mappedData);
      queryClient.invalidateQueries({ queryKey: ["theme", hotelSlug] });
      queryClient.invalidateQueries({ queryKey: ["hotelPublicSettings", hotelSlug] });
    },
  });

  // 5️⃣ Simple update function for direct theme updates
  const updateTheme = async (updates) => {
    if (!user?.hotel_slug) {
      throw new Error('Not authorized to update theme');
    }
    const result = await mutation.mutateAsync(updates);
    return result;
  };

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
        backgroundColor: data?.background_color || "#ffffff",
        textColor: data?.text_color || "#333333",
        borderColor: data?.border_color || "#dddddd",
        buttonColor: data?.button_color || "#2980b9",
        buttonTextColor: data?.button_text_color || "#ffffff",
        buttonHoverColor: data?.button_hover_color || "#1f6391",
        linkColor: data?.link_color || "#2980b9",
        linkHoverColor: data?.link_hover_color || "#1f6391",
        setTheme,
        updateTheme,
        refetchTheme: refetch,
        themeLoading: isLoading || mutation.isLoading,
        settings: data,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
