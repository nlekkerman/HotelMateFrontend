import api from "@/services/api";

/**
 * Hook for exporting attendance period data
 * @param {string} hotelSlug - Hotel slug identifier
 */
export function usePeriodExport(hotelSlug) {
  async function downloadExport(periodId, format = "csv") {
    if (!hotelSlug || !periodId) return;

    try {
      // Construct export URL – backend endpoint for period export
      const url = `/attendance/${hotelSlug}/periods/${periodId}/export/`;
      
      // Make request with format parameter
      const response = await api.get(url, {
        params: { format },
        responseType: 'blob', // Important for file downloads
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], {
        type: format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      });
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename based on format and period
      const extension = format === 'xlsx' ? 'xlsx' : 'csv';
      link.download = `attendance-period-${periodId}.${extension}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Failed to download export:', error);
      // You could add toast notification here if available
    }
  }

  return { downloadExport };
}