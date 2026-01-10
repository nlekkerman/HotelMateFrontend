import { useState } from "react";
import { staffAuthAPI } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { requestFirebaseNotificationPermission } from "@/utils/firebaseNotifications";

export default function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const loginUser = async (username, password) => {
    setLoading(true);
    setError(null);


    try {
      const { data } = await staffAuthAPI.post(
        "/staff/login/",
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );


      const profileImageUrl = data.profile_image_url?.startsWith("http")
        ? data.profile_image_url
        : `${import.meta.env.VITE_CLOUDINARY_BASE}image/upload/v1753188341/${data.profile_image_url}.png`;


      const userToSave = {
        id: data.staff_id,
        staff_id: data.staff_id, // Ensure staff_id is present for profile edit logic
        token: data.token,
        username: data.username,
        hotel_id: data.hotel_id,
        hotel_name: data.hotel_name,
        hotel_slug: data.hotel_slug,
        is_staff: data.is_staff || data.is_superuser, // Fix: Superusers should always be staff
        is_superuser: data.is_superuser,
        access_level: data.access_level,
        isAdmin: data.is_superuser || ["staff_admin", "super_staff_admin"].includes(data.access_level),
        department: data.department,
        role: data.role,
        allowed_navs: data.allowed_navs || [],
        navigation_items: data.navigation_items || [],
        profile_image_url: profileImageUrl,
        hotel: {
          id: data.hotel_id,
          name: data.hotel_name,
          slug: data.hotel_slug,
        },
      };

      console.log('🔍 Login Debug Info:');
      console.log('🔍 RAW BACKEND RESPONSE:', data);
      console.log('Backend data.is_superuser:', data.is_superuser);
      console.log('Backend data.allowed_navs:', data.allowed_navs);
      console.log('Backend data.navigation_items:', data.navigation_items);
      console.log('🔍 Final userToSave object:', userToSave);
      console.log('🔍 userToSave.is_superuser:', userToSave.is_superuser);

      // ✅ Use the same object for both localStorage and AuthContext to avoid data loss
      login(userToSave);

      // Request Firebase notification permission and get FCM token
      try {
        const fcmToken = await requestFirebaseNotificationPermission();
        if (fcmToken) {
          // Save FCM token to localStorage for debugging/reference
          localStorage.setItem('fcm_token', fcmToken);
          console.log('✅ [LOGIN] FCM token saved to localStorage:', fcmToken.substring(0, 20) + '...');
        }
      } catch (fcmError) {
        console.error("Failed to get FCM token:", fcmError);
        // Don't block login if FCM fails
      }

      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);

      if (err.response) {
        setError(
          err.response.data?.non_field_errors
            ? err.response.data.non_field_errors.join(" ")
            : JSON.stringify(err.response.data)
        );
      } else if (err.request) {
        setError("No response from server. Check your network or API URL.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }

      throw err;
    }
  };

  return { loginUser, loading, error };
}
