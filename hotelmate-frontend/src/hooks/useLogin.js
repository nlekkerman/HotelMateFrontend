import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  requestFirebaseNotificationPermission,
} from "@/utils/firebaseNotifications";

const LOGIN_ENDPOINT = `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/staff/login/`;

export default function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const loginUser = async (username, password, fcmToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        LOGIN_ENDPOINT,
        { username, password, fcm_token: fcmToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;
      const profileImageUrl = data.profile_image_url?.startsWith("http")
        ? data.profile_image_url
        : `${import.meta.env.VITE_CLOUDINARY_BASE}image/upload/v1753188341/${data.profile_image_url}.png`;

      console.log("✅ Backend responseasasadasdasdasdasdasdasd:", response.data);

      // Prepare user object to save
      const userToSave = {
        token: data.token,
        username: data.username,
        hotel_id: data.hotel_id,
        hotel_name: data.hotel_name,
        hotel_slug: data.hotel_slug,
        is_staff: data.is_staff,
        is_superuser: data.is_superuser,
        access_level: data.access_level,
        department: data.department,
        role: data.role,
        profile_image_url: profileImageUrl,
        hotel: {
          id: data.hotel_id,
          name: data.hotel_name,
          slug: data.hotel_slug,
        },
      };

      console.log("💾 Saving user to localStorage:", userToSave);
      localStorage.setItem("user", JSON.stringify(userToSave));

      // Prepare user object for AuthContext login
      const userForContext = {
        username: data.username,
        token: data.token,
        hotel_id: data.hotel_id,
        hotel_name: data.hotel_name,
        hotel_slug: data.hotel_slug,
        isAdmin: data.is_superuser || ['staff_admin', 'super_staff_admin'].includes(data.access_level),
        is_staff: data.is_staff,
        is_superuser: data.is_superuser,
        access_level: data.access_level,
        department: data.department,
        role: data.role,
        allowed_navs: data.allowed_navs || [],
        profile_image_url: profileImageUrl,
      };

      console.log("🔑 Logging in user (AuthContext):", userForContext);
      login(userForContext);

      console.log("✔️ User logged in successfully");

      // Register FCM token
      const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      try {
        await requestFirebaseNotificationPermission(VAPID_KEY);
        console.log("🔔 FCM token permission granted");
      } catch (notifyError) {
        console.warn("⚠️ Could not register FCM token:", notifyError);
      }

      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);

      if (err.response) {
        console.error("❌ Login error response:", err.response);
        if (err.response.data?.non_field_errors) {
          setError(err.response.data.non_field_errors.join(" "));
        } else if (err.response.data) {
          setError(JSON.stringify(err.response.data));
        } else {
          setError("Login failed due to unknown error.");
        }
      } else {
        console.error("❌ Login error:", err.message);
        setError(err.message || "Login failed. Please try again.");
      }

      throw err;
    }
  };

  return { loginUser, loading, error };
}
