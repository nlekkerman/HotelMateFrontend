import { useState, useCallback } from "react";
import { safeApiResponse, safeString } from "../utils/safeUtils";
import api from "@/services/api";

/**
 * Hook for comprehensive period management operations
 * @param {string} hotelSlug - Hotel slug
 */
export function usePeriodManagement(hotelSlug) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createWeeklyPeriod = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/create-for-week/`,
        { date: safeString(date) }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to create weekly period";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const createCustomPeriod = useCallback(async (periodData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/create-custom-period/`,
        {
          title: safeString(periodData.title),
          start_date: safeString(periodData.startDate),
          end_date: safeString(periodData.endDate),
          copy_from_period: periodData.copyFromPeriod || null
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to create custom period";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const duplicatePeriod = useCallback(async (periodId, newData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/${periodId}/duplicate-period/`,
        {
          new_start_date: safeString(newData.newStartDate),
          new_title: newData.newTitle ? safeString(newData.newTitle) : undefined
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to duplicate period";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const copyEntirePeriod = useCallback(async (copyData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/shift-copy/copy-entire-period/`,
        {
          source_period_id: copyData.sourcePeriodId,
          target_start_date: safeString(copyData.targetStartDate),
          target_title: copyData.targetTitle ? safeString(copyData.targetTitle) : undefined,
          create_new_period: copyData.createNewPeriod !== false,
          copy_options: copyData.copyOptions || {}
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to copy period";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const deletePeriod = useCallback(async (periodId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.delete(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/periods/${periodId}/`
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to delete period";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  return {
    loading,
    error,
    createWeeklyPeriod,
    createCustomPeriod,
    duplicatePeriod,
    copyEntirePeriod,
    deletePeriod
  };
}

/**
 * Hook for advanced copy operations
 * @param {string} hotelSlug - Hotel slug
 */
export function useAdvancedCopyOperations(hotelSlug) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const copyDepartmentDay = useCallback(async (copyData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/advanced-copy/copy-department-day/`,
        {
          department_slug: safeString(copyData.departmentSlug),
          source_date: safeString(copyData.sourceDate),
          target_dates: copyData.targetDates.map(d => safeString(d)),
          include_roles: copyData.includeRoles || [],
          exclude_staff: copyData.excludeStaff || [],
          preserve_locations: copyData.preserveLocations !== false,
          check_availability: copyData.checkAvailability !== false
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to copy department day";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const copyDepartmentWeek = useCallback(async (copyData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/advanced-copy/copy-department-week/`,
        {
          department_slug: safeString(copyData.departmentSlug),
          source_period_id: copyData.sourcePeriodId,
          target_period_ids: copyData.targetPeriodIds,
          copy_options: copyData.copyOptions || {},
          skip_weekends: copyData.skipWeekends || false
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to copy department week";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  const smartCopy = useCallback(async (copyData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/advanced-copy/smart-copy/`,
        {
          source_period_id: copyData.sourcePeriodId,
          target_period_id: copyData.targetPeriodId,
          check_availability: copyData.checkAvailability !== false,
          resolve_overlaps: copyData.resolveOverlaps !== false,
          balance_workload: copyData.balanceWorkload || false,
          max_hours_per_staff: copyData.maxHoursPerStaff,
          auto_assign_alternatives: copyData.autoAssignAlternatives || false
        }
      );
      
      setLoading(false);
      return safeApiResponse(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to perform smart copy";
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
  }, [hotelSlug]);

  return {
    loading,
    error,
    copyDepartmentDay,
    copyDepartmentWeek,
    smartCopy
  };
}