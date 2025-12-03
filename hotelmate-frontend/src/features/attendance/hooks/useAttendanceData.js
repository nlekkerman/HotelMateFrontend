import { useEffect, useState } from "react";
import { safeApiResponse, safeString } from "../utils/safeUtils";
import api from "@/services/api";

export function useRosterForDate(hotelSlug, date, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug || !date) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = { date: safeString(date) };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/shifts/`, { params })
      .then((response) => {
        const items = safeApiResponse(response.data);
        setState({
          loading: false,
          error: null,
          items,
        });
      })
      .catch((err) => {
        console.error("useRosterForDate error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load roster",
          items: [],
        });
      });
  }, [hotelSlug, date, department, refreshKey]);

  return state;
}

export function useClockLogsForDate(hotelSlug, date, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    items: [],
  });

  useEffect(() => {
    if (!hotelSlug || !date) {
      setState({ loading: false, error: null, items: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = { date: safeString(date) };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    api.get(`/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/`, { params })
      .then((response) => {
        const items = safeApiResponse(response.data);
        setState({
          loading: false,
          error: null,
          items,
        });
      })
      .catch((err) => {
        console.error("useClockLogsForDate error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load clock logs",
          items: [],
        });
      });
  }, [hotelSlug, date, department, refreshKey]);

  return state;
}

/**
 * Hook for fetching staff attendance summary from new API endpoint
 * @param {string} hotelSlug - Hotel slug
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (optional, defaults to fromDate)
 * @param {string} department - Department filter (optional)
 * @param {string} status - Status filter (optional: active, completed, no_log, issue)
 * @param {number} refreshKey - Refresh trigger
 */
export function useStaffAttendanceSummary(hotelSlug, fromDate, toDate, department, status, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    results: [],
    count: 0,
    dateRange: null,
    filters: {}
  });

  useEffect(() => {
    if (!hotelSlug || !fromDate) {
      setState({ 
        loading: false, 
        error: null, 
        results: [], 
        count: 0,
        dateRange: null,
        filters: {}
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = { from: safeString(fromDate) };
    if (toDate && toDate !== fromDate) {
      params.to = safeString(toDate);
    }
    if (department && department !== "all") {
      params.department = safeString(department);
    }
    if (status && status !== "all") {
      params.status = safeString(status);
    }

    api.get(`/staff/${encodeURIComponent(hotelSlug)}/attendance-summary/`, { params })
      .then((response) => {
        const data = safeApiResponse(response.data);
        setState({
          loading: false,
          error: null,
          results: data.results || [],
          count: data.count || 0,
          dateRange: data.date_range || null,
          filters: data.filters || {}
        });
      })
      .catch((err) => {
        console.error("useStaffAttendanceSummary error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load staff attendance summary",
          results: [],
          count: 0,
          dateRange: null,
          filters: {}
        });
      });
  }, [hotelSlug, fromDate, toDate, department, status, refreshKey]);

  return state;
}

/**
 * Hook for fetching department roster analytics
 * @param {string} hotelSlug - Hotel slug
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} department - Department filter (optional)
 * @param {number} refreshKey - Refresh trigger
 */
export function useDepartmentRosterAnalytics(hotelSlug, startDate, endDate, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    departmentSummaries: [],
    dailyBreakdown: [],
    weeklyBreakdown: []
  });

  useEffect(() => {
    if (!hotelSlug || !startDate || !endDate) {
      setState({ 
        loading: false, 
        error: null, 
        departmentSummaries: [],
        dailyBreakdown: [],
        weeklyBreakdown: []
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = {
      start: safeString(startDate),
      end: safeString(endDate)
    };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    const summaryPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/department-summary/`,
      { params }
    );
    
    const dailyPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/daily-by-department/`,
      { params }
    );
    
    const weeklyPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/weekly-by-department/`,
      { params }
    );

    Promise.all([summaryPromise, dailyPromise, weeklyPromise])
      .then(([summaryResponse, dailyResponse, weeklyResponse]) => {
        setState({
          loading: false,
          error: null,
          departmentSummaries: safeApiResponse(summaryResponse.data) || [],
          dailyBreakdown: safeApiResponse(dailyResponse.data) || [],
          weeklyBreakdown: safeApiResponse(weeklyResponse.data) || []
        });
      })
      .catch((err) => {
        console.error("useDepartmentRosterAnalytics error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load department analytics",
          departmentSummaries: [],
          dailyBreakdown: [],
          weeklyBreakdown: []
        });
      });
  }, [hotelSlug, startDate, endDate, department, refreshKey]);

  return state;
}

/**
 * Hook for fetching individual staff roster analytics
 * @param {string} hotelSlug - Hotel slug
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} department - Department filter (optional)
 * @param {number} refreshKey - Refresh trigger
 */
export function useStaffRosterAnalytics(hotelSlug, startDate, endDate, department, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    staffSummaries: [],
    dailyBreakdown: [],
    weeklyBreakdown: []
  });

  useEffect(() => {
    if (!hotelSlug || !startDate || !endDate) {
      setState({ 
        loading: false, 
        error: null, 
        staffSummaries: [],
        dailyBreakdown: [],
        weeklyBreakdown: []
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = {
      start: safeString(startDate),
      end: safeString(endDate)
    };
    if (department && department !== "all") {
      params.department = safeString(department);
    }

    const summaryPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/staff-summary/`,
      { params }
    );
    
    const dailyPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/daily-by-staff/`,
      { params }
    );
    
    const weeklyPromise = api.get(
      `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/roster-analytics/weekly-by-staff/`,
      { params }
    );

    Promise.all([summaryPromise, dailyPromise, weeklyPromise])
      .then(([summaryResponse, dailyResponse, weeklyResponse]) => {
        setState({
          loading: false,
          error: null,
          staffSummaries: safeApiResponse(summaryResponse.data) || [],
          dailyBreakdown: safeApiResponse(dailyResponse.data) || [],
          weeklyBreakdown: safeApiResponse(weeklyResponse.data) || []
        });
      })
      .catch((err) => {
        console.error("useStaffRosterAnalytics error:", err);
        setState({
          loading: false,
          error: safeString(err.message) || "Failed to load staff analytics",
          staffSummaries: [],
          dailyBreakdown: [],
          weeklyBreakdown: []
        });
      });
  }, [hotelSlug, startDate, endDate, department, refreshKey]);

  return state;
}
