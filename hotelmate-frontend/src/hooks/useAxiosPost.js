import { useState } from "react";
import axios from "axios"; // Import raw axios
import api from "@/services/api"; // Your custom axios with interceptors

function useAxiosPost(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postData = async (postData) => {
    setLoading(true);
    setError(null);

    try {
      const client = endpoint === "staff/login/" ? axios : api;
      const baseURL = import.meta.env.VITE_API_URL;
      const response = await client.post(baseURL + endpoint, postData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setData(response.data);

      // If this is a login request, save hotel_id and hotel_name (and token etc.) to localStorage
      if (endpoint === "staff/login/") {
        const { token, username, hotel_id, hotel_name, is_staff, is_superuser } = response.data;
        const userToStore = {
          token,
          username,
          hotel_id,
          hotel_name,
          is_staff,
          is_superuser,
        };
        localStorage.setItem("user", JSON.stringify(userToStore));
        console.log("[useAxiosPost] Stored user info in localStorage:", userToStore);
      }

      return response.data;
    } catch (err) {
  console.error("[Login] Login failed with error:", err);
  if (err.response?.data?.non_field_errors) {
    setError(err.response.data.non_field_errors.join(' '));
  } else if (err.response?.data) {
    setError(JSON.stringify(err.response.data));
  } else {
    setError(err.message || "Login failed.");
  }
}
  };

  return { data, loading, error, postData };
}

export default useAxiosPost;
