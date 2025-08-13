import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { requestFirebaseNotificationPermission } from "@/utils/firebaseNotifications";

const LOGIN_ENDPOINT = `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/staff/login/`;

export default function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const loginUser = async (username, password, fcmToken) => {
    setLoading(true);
    setError(null);

    console.log("📡 Sending login request...");
    console.log("🔗 Endpoint:", LOGIN_ENDPOINT);
    console.log("📝 Payload:", { username, password, fcm_token: fcmToken });

    try {
      const { data } = await axios.post(
        LOGIN_ENDPOINT,
        { username, password, fcm_token: fcmToken },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("✅ Backend response:", data);

      const profileImageUrl = data.profile_image_url?.startsWith("http")
        ? data.profile_image_url
        : `${import.meta.env.VITE_CLOUDINARY_BASE}image/upload/v1753188341/${data.profile_image_url}.png`;

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

      const userForContext = {
        username: data.username,
        token: data.token,
        hotel_id: data.hotel_id,
        hotel_name: data.hotel_name,
        hotel_slug: data.hotel_slug,
        isAdmin:
          data.is_superuser || ["staff_admin", "super_staff_admin"].includes(data.access_level),
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

      // Request FCM token
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
      console.error("❌ Login error:", err);

      if (err.response) {
        console.error("❌ Response data:", err.response.data);
        setError(
          err.response.data?.non_field_errors
            ? err.response.data.non_field_errors.join(" ")
            : JSON.stringify(err.response.data)
        );
      } else if (err.request) {
        console.error("❌ No response received. Request:", err.request);
        setError("No response from server. Check your network or API URL.");
      } else {
        console.error("❌ Error message:", err.message);
        setError(err.message || "Login failed. Please try again.");
      }

      throw err;
    }
  };

  return { loginUser, loading, error };
}
