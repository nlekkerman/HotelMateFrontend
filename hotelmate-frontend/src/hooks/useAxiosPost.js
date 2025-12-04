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
      // Use raw axios (no auth) for login and register endpoints
      const client = (endpoint === "staff/login/" || endpoint === "/staff/register/") ? axios : api;
      
      // Get base URL - ensure it ends with /api or /api/
      let baseURL = import.meta.env.VITE_API_URL || "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
      
      // Ensure baseURL ends with /
      if (!baseURL.endsWith('/')) {
        baseURL += '/';
      }
      
      // Remove leading slash from endpoint if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      
      console.log('🔗 API Request:', {
        baseURL,
        endpoint: cleanEndpoint,
        fullURL: `${baseURL}${cleanEndpoint}`
      });
      
      const response = await client.post(`${baseURL}${cleanEndpoint}`, postData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setData(response.data);

      // ✅ Login data persistence is handled by useLogin hook to avoid data conflicts

      return response.data;
    } catch (err) {
      console.error('❌ useAxiosPost error:', err);
      console.error('❌ Error response:', err.response?.data);
      
      if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors.join(' '));
      } else if (err.response?.data) {
        setError(JSON.stringify(err.response.data));
      } else {
        setError(err.message || "Request failed.");
      }
      // Re-throw the error so Register.jsx can catch it
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, postData };
}

export default useAxiosPost;
