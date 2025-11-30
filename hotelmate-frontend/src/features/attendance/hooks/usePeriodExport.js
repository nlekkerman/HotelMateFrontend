import api from "@/services/api";
import { safeString, safeNumber, isValidPeriodId } from "../utils/safeUtils";

/**
 * Hook for exporting attendance period data
 * @param {string} hotelSlug - Hotel slug identifier
 */
export function usePeriodExport(hotelSlug) {
  async function downloadExport(periodId, format = "csv") {
    // Validate inputs
    if (!hotelSlug || !isValidPeriodId(periodId)) {
      console.warn("usePeriodExport: Invalid hotelSlug or periodId", { hotelSlug, periodId });
      return { success: false, error: "Invalid parameters" };
    }

    const safePeriodId = safeNumber(periodId);
    const safeFormat = safeString(format).toLowerCase();
    
    // Validate format
    if (!["csv", "xlsx"].includes(safeFormat)) {
      console.warn("usePeriodExport: Invalid format", safeFormat);
      return { success: false, error: "Invalid format. Use 'csv' or 'xlsx'" };
    }

    try {
      // Construct export URL – backend endpoint for period export
      const url = `/attendance/${encodeURIComponent(hotelSlug)}/periods/${safePeriodId}/export/`;
      
      // Make request with format parameter
      const response = await api.get(url, {
        params: { format: safeFormat },
        responseType: 'blob', // Important for file downloads
        timeout: 30000, // 30 second timeout for exports
      });

      // Validate response
      if (!response || !response.data) {
        throw new Error("No data received from export endpoint");
      }

      // Create blob URL and trigger download
      const mimeType = safeFormat === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

      const blob = new Blob([response.data], { type: mimeType });
      
      // Check if blob has content
      if (blob.size === 0) {
        throw new Error("Export file is empty");
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename based on format and period
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `attendance-period-${safePeriodId}-${timestamp}.${safeFormat}`;
      
      // Trigger download safely
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        } catch (cleanupError) {
          console.warn("Error during export cleanup:", cleanupError);
        }
      }, 100);
      
      return { success: true };
      
    } catch (error) {
      console.error('usePeriodExport error:', error);
      
      let errorMessage = "Failed to download export";
      if (error?.response?.status === 404) {
        errorMessage = "Export not found or period does not exist";
      } else if (error?.response?.status === 403) {
        errorMessage = "Not authorized to export this period";
      } else if (error?.code === 'ECONNABORTED') {
        errorMessage = "Export timeout - please try again";
      } else if (error?.message) {
        errorMessage = safeString(error.message);
      }
      
      return { success: false, error: errorMessage };
    }
  }

  return { downloadExport };
}