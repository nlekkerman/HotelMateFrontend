import { useState, useEffect } from 'react';
import api from '../services/api';

function useAxios(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!endpoint) return;

    setLoading(true);
    setError(null);

    api.get(endpoint)
      .then(response => {
        setData(response.data);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });

  }, [endpoint]);

  return { data, loading, error };
}

export default useAxios;
