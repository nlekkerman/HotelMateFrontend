import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const LOGIN_ENDPOINT = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/staff/login/`;

export default function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const loginUser = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        LOGIN_ENDPOINT,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      // Save user data to localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          token: data.token,
          username: data.username,
          hotel_id: data.hotel_id,
          hotel_name: data.hotel_name,
          hotel_slug: data.hotel_slug,
          is_staff: data.is_staff,
          is_superuser: data.is_superuser,
        })
      );

      // Update AuthContext state
      login({
        username: data.username,
        token: data.token,
        hotel_id: data.hotel_id,
        hotel_name: data.hotel_name,
        hotel_slug: data.hotel_slug,
        isAdmin: data.is_staff || data.is_superuser,
        is_staff: data.is_staff,
        is_superuser: data.is_superuser,
      });

      setLoading(false);
      return data;
    } catch (err) {
  setLoading(false);

  if (err.response) {
    console.error("Login error response:", err.response);
    if (err.response.data?.non_field_errors) {
      setError(err.response.data.non_field_errors.join(" "));
    } else if (err.response.data) {
      setError(JSON.stringify(err.response.data));
    } else {
      setError("Login failed due to unknown error.");
    }
  } else {
    console.error("Login error:", err.message);
    setError(err.message || "Login failed. Please try again.");
  }

  throw err;
}

  };

  return { loginUser, loading, error };
}
