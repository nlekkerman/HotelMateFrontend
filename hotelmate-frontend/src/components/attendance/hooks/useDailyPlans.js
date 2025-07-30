import { useState, useEffect } from 'react';
import api from '@/services/api';

export function useDailyPlans(hotelSlug, departmentSlug, date) {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug || !departmentSlug || !date) {
      setDailyPlan(null);
      return;
    }

    setLoading(true);
    setError(null);

    const url = `/attendance/${hotelSlug}/departments/${departmentSlug}/daily-plans/prepare-daily-plan/?date=${date}`;

    api.get(url)
      .then(response => {
        setDailyPlan(response.data);
      })
      .catch(err => {
        setError(err);
        setDailyPlan(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hotelSlug, departmentSlug, date]);

  return { dailyPlan, loading, error };
}
