// src/services/analytics.js
import api, { buildStaffURL } from "@/services/api";

function logRequest(name, hotelSlug, params, url) {
  // Log request details in development mode only
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `%c[API] ${name}`,
      "color:#09f;font-weight:bold;",
      { hotelSlug, params, url }
    );
  }
}

function logSuccess(name, res) {
  // Log success details in development mode only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${name} -> status:`, res.status);
    console.log(`[API] ${name} -> payload:`, res.data);
  }
}

function logError(name, err) {
  // Log errors in development mode only
  if (process.env.NODE_ENV === 'development') {
    console.error(`[API] ${name} error:`, err);
  }
}

export const getKpis = async (hotelSlug, params) => {
  const url = buildStaffURL(hotelSlug, "attendance", "roster-analytics/kpis/");
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
  const url = buildStaffURL(hotelSlug, "attendance", "roster-analytics/staff-summary/");
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
  const url = buildStaffURL(hotelSlug, "attendance", "roster-analytics/department-summary/");
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
  const url = buildStaffURL(hotelSlug, "attendance", "roster-analytics/daily-totals/");
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
  const url = buildStaffURL(hotelSlug, "attendance", "roster-analytics/weekly-totals/");
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
