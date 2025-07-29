import React, { useState, useEffect } from "react";

import {
  getKpis,
  getStaffSummary,
  getDepartmentSummary,
  getDailyTotals,
  getWeeklyTotals,
} from "@/services/analytics";

function formatDate(date) {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d)) return undefined;
  return d.toISOString().split("T")[0];
}

export function useAnalytics(hotelSlug, params = {}) {
  const [data, setData] = React.useState({
    kpis: null,
    staffSummary: [],
    departmentSummary: [],
    dailyTotals: [],
    weeklyTotals: [],
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const formattedParams = React.useMemo(() => ({
    start: formatDate(params.startDate),
    end: formatDate(params.endDate),
    department: params.selectedDepartment || undefined,
  }), [params.startDate, params.endDate, params.selectedDepartment]);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
console.log("Fetching KPIs with params:", formattedParams);
      let slug = "";
      if (typeof hotelSlug === "string") {
        slug = hotelSlug;
      } else if (hotelSlug && typeof hotelSlug === "object") {
        slug = hotelSlug.slug || hotelSlug.id || "";
      }

      if (!slug) {
        setError("Invalid hotelSlug");
        setLoading(false);
        return;
      }

      try {
        const [
          kpisRes,
          staffRes,
          deptRes,
          dailyRes,
          weeklyRes,
        ] = await Promise.all([
          getKpis(slug, formattedParams),
          getStaffSummary(slug, formattedParams),
          getDepartmentSummary(slug, formattedParams),
          getDailyTotals(slug, formattedParams),
          getWeeklyTotals(slug, formattedParams),
        ]);

        setData({
          kpis: kpisRes.data,
          staffSummary: staffRes.data,
          departmentSummary: deptRes.data,
          dailyTotals: dailyRes.data,
          weeklyTotals: weeklyRes.data,
        });
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (hotelSlug) {
      fetchData();
    }
  }, [hotelSlug, formattedParams, params.refreshKey]);

  return {
    ...data,
    loading,
    error,
  };
}
