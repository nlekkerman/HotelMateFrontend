import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const LOGIN_ENDPOINT = `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/staff/login/`;

export default function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const loginUser = async (username, password) => {
    setLoading(true);
    setError(null);


    try {
      const { data } = await axios.post(
        LOGIN_ENDPOINT,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );


      const profileImageUrl = data.profile_image_url?.startsWith("http")
        ? data.profile_image_url
        : `${import.meta.env.VITE_CLOUDINARY_BASE}image/upload/v1753188341/${data.profile_image_url}.png`;

      const userToSave = {
        id: data.staff_id,
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

      localStorage.setItem("user", JSON.stringify(userToSave));

      const userForContext = {
        id: data.staff_id,
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

      login(userForContext);

      // Note: Firebase FCM token functionality has been removed
      // Alternative push notification systems can be implemented here if needed

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
