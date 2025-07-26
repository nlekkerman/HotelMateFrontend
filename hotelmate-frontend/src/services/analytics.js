// src/services/analytics.js
import api from "@/services/api";

function logRequest(name, hotelSlug, params, url) {
  console.groupCollapsed(
    `%c[API] ${name}`,
    "color:#09f;font-weight:bold;",
    { hotelSlug, params, url }
  );
}

function logSuccess(name, res) {
  console.log(`[API] ${name} -> status:`, res.status);
  console.log(`[API] ${name} -> payload:`, res.data);
  console.groupEnd();
}

function logError(name, err) {
  console.error(`[API] ${name} error:`, err);
  console.groupEnd();
}

export const getKpis = async (hotelSlug, params) => {
  const url = `/attendance/${hotelSlug}/roster-analytics/kpis/`;
  const name = "getKpis";
  logRequest(name, hotelSlug, params, url);
  try {
    const res = await api.get(url, { params });
    logSuccess(name, res);
    return res;
  } catch (err) {
    logError(name, err);
    throw err;
  }
};

export const getStaffSummary = async (hotelSlug, params) => {
  const url = `/attendance/${hotelSlug}/roster-analytics/staff-summary/`;
  const name = "getStaffSummary";
  logRequest(name, hotelSlug, params, url);
  try {
    const res = await api.get(url, { params });
    logSuccess(name, res);
    return res;
  } catch (err) {
    logError(name, err);
    throw err;
  }
};

export const getDepartmentSummary = async (hotelSlug, params) => {
  const url = `/attendance/${hotelSlug}/roster-analytics/department-summary/`;
  const name = "getDepartmentSummary";
  logRequest(name, hotelSlug, params, url);
  try {
    const res = await api.get(url, { params });
    logSuccess(name, res);
    return res;
  } catch (err) {
    logError(name, err);
    throw err;
  }
};

export const getDailyTotals = async (hotelSlug, params) => {
  const url = `/attendance/${hotelSlug}/roster-analytics/daily-totals/`;
  const name = "getDailyTotals";
  logRequest(name, hotelSlug, params, url);
  try {
    const res = await api.get(url, { params });
    logSuccess(name, res);
    return res;
  } catch (err) {
    logError(name, err);
    throw err;
  }
};

export const getWeeklyTotals = async (hotelSlug, params) => {
  const url = `/attendance/${hotelSlug}/roster-analytics/weekly-totals/`;
  const name = "getWeeklyTotals";
  logRequest(name, hotelSlug, params, url);
  try {
    const res = await api.get(url, { params });
    logSuccess(name, res);
    return res;
  } catch (err) {
    logError(name, err);
    throw err;
  }
};
