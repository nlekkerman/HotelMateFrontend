import { useState } from "react";
import api, { publicAPI } from "@/services/api"; // Centralized API services

function useAxiosPost(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postData = async (postData) => {
    setLoading(true);
    setError(null);

    try {
      // Use publicAPI for unauthenticated endpoints (login/register), otherwise use api
      const client = (endpoint === "staff/login/" || endpoint === "/staff/register/") ? publicAPI : api;
      
      // Ensure endpoint starts with / for proper API routing
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      console.log('🔗 API Request:', {
        client: client === publicAPI ? 'publicAPI' : 'api',
        endpoint: cleanEndpoint
      });
      
      const response = await client.post(cleanEndpoint, postData, {
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
