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
      return response.data;
    } catch (err) {
      setError(err.response?.data || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, postData };
}

export default useAxiosPost;
