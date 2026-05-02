// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useCan } from "@/rbac";
import { getAuthUser } from "@/lib/authStore";

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

const ThemeProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // RBAC: PATCH /staff/hotel/{slug}/settings/ is gated by the canonical
  // `admin_settings.theme_update` action. NO tier / access_level / isAdmin.
  // TODO(backend-rbac): backend `MODULE_POLICY` does not yet expose an
  // `admin_settings` module / `theme_update` action. Until it does, this
  // capability is fail-closed. See RBAC_MISSING_BACKEND_POLICY_KEYS.md.
  // Do NOT reintroduce isAdmin / role / tier / access_level fallbacks.
  const { can } = useCan(); // eslint-disable-line no-unused-vars
  const canUpdateTheme = false;
  
  // Get hotel slug from logged-in user
  const hotelSlug = React.useMemo(() => {
    if (user?.hotel_slug) {
      return user.hotel_slug;
    }
    
    return null;
  }, [user]);

  // 1️⃣ Fetch theme from public settings (includes both content AND theme)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["theme", hotelSlug, user?.is_staff, user?.hotel_slug], // Include user state in key
    queryFn: async () => {
      // Cross-check AuthContext user against authStore bridge
      // NOTE: This intentional fallback corrects stale AuthContext state during login transitions.
      // Safe to keep until AuthContext is verified as single source of truth in all flows.
      const bridgeUser = getAuthUser() || (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
      })();
      let actualIsStaff = user?.is_staff;
      let actualHotelSlug = user?.hotel_slug;
      
      if (bridgeUser) {
        // Reconcile stale AuthContext during login transitions using ONLY canonical
        // identity flags. NO `access_level` / tier inference (banned by RBAC contract).
        const shouldBeStaff = bridgeUser.is_superuser || !!bridgeUser.staff_id;

        if (shouldBeStaff && !bridgeUser.is_staff) {
          actualIsStaff = true;
          actualHotelSlug = bridgeUser.hotel_slug;
        } else if (!user?.is_staff && bridgeUser.is_staff) {
          actualIsStaff = bridgeUser.is_staff;
          actualHotelSlug = bridgeUser.hotel_slug;
        }
      }
      
      // For staff users, use staff endpoint
      if (actualIsStaff && actualHotelSlug) {
        const res = await api.get(`/staff/hotel/${actualHotelSlug}/settings/`);
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
      try {
        const res = await api.get(`/public/hotel/${hotelSlug}/page/`);
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

      // RBAC: backend-driven authority. Fail-closed if the action key is missing.
      if (!canUpdateTheme) {
        return Promise.reject(new Error('Not permitted to update theme'));
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

    if (!canUpdateTheme) {
      throw new Error('Not permitted to update theme');
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
};

const useTheme = () => {
  return useContext(ThemeContext);
};

export { ThemeProvider, useTheme };
