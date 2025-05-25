import { useState } from 'react';
import api from '@/services/api';

function useAxiosPost(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postData = async (postData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(endpoint, postData);
      setData(response.data);
      return response.data;  // return for immediate use if needed
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
