// src/utils/downloadHelpers.js
// Utility functions for downloading PDF and Excel files from the backend
// Based on: docs/FRONTEND_PDF_DOWNLOAD_GUIDE.md

/**
 * Download a file from the API with proper error handling
 * @param {string} url - The API endpoint URL
 * @param {string} defaultFilename - Default filename if Content-Disposition not provided
 * @param {Function} apiGet - The API get function (e.g., api.get)
 * @returns {Promise<void>}
 */
export const downloadFile = async (url, defaultFilename, apiGet) => {
  try {
    const response = await apiGet(url, { responseType: 'blob' });

    // Handle specific status codes
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to download this report.');
    }
    if (response.status === 404) {
      throw new Error('Report not found.');
    }
    if (response.status === 500) {
      throw new Error('Server error. Please try again later.');
    }

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFilename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    // Verify content type
    const contentType = response.headers['content-type'];
    if (!contentType?.includes('application/pdf') && 
        !contentType?.includes('spreadsheet') &&
        !contentType?.includes('excel')) {
      throw new Error('Invalid file type received');
    }

    // Create blob and trigger download
    const blob = new Blob([response.data], {
      type: contentType
    });
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup with timeout to ensure download starts
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 100);

  } catch (error) {
    console.error('Download error:', error);
    
    // User-friendly error messages
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.');
    }
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          throw new Error('Authentication required. Please log in again.');
        case 403:
          throw new Error('You do not have permission to download this report.');
        case 404:
          throw new Error('Report not found.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(error.response.data?.error || 'Download failed');
      }
    }
    
    throw error;
  }
};

/**
 * Download stocktake PDF
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {Function} apiGet - The API get function
 */
export const downloadStocktakePDF = async (hotelSlug, stocktakeId, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/download-pdf/`;
  await downloadFile(url, `Stocktake_${stocktakeId}.pdf`, apiGet);
};

/**
 * Download stocktake Excel
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {Function} apiGet - The API get function
 */
export const downloadStocktakeExcel = async (hotelSlug, stocktakeId, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/download-excel/`;
  await downloadFile(url, `Stocktake_${stocktakeId}.xlsx`, apiGet);
};

/**
 * Download period PDF
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID
 * @param {boolean} includeCocktails - Include cocktail data
 * @param {Function} apiGet - The API get function
 */
export const downloadPeriodPDF = async (hotelSlug, periodId, includeCocktails, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/periods/${periodId}/download-pdf/?include_cocktails=${includeCocktails}`;
  await downloadFile(url, `Period_${periodId}.pdf`, apiGet);
};

/**
 * Download period Excel
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID
 * @param {boolean} includeCocktails - Include cocktail data
 * @param {Function} apiGet - The API get function
 */
export const downloadPeriodExcel = async (hotelSlug, periodId, includeCocktails, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/periods/${periodId}/download-excel/?include_cocktails=${includeCocktails}`;
  await downloadFile(url, `Period_${periodId}.xlsx`, apiGet);
};

/**
 * Download combined report PDF (Stocktake + Period)
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {boolean} includeCocktails - Include cocktail data
 * @param {Function} apiGet - The API get function
 */
export const downloadCombinedPDF = async (hotelSlug, stocktakeId, includeCocktails, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/download-combined-pdf/?include_cocktails=${includeCocktails}`;
  await downloadFile(url, `Combined_Report_${stocktakeId}.pdf`, apiGet);
};

/**
 * Download combined report Excel (Stocktake + Period)
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} stocktakeId - Stocktake ID
 * @param {boolean} includeCocktails - Include cocktail data
 * @param {Function} apiGet - The API get function
 */
export const downloadCombinedExcel = async (hotelSlug, stocktakeId, includeCocktails, apiGet) => {
  const url = `/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/download-combined-excel/?include_cocktails=${includeCocktails}`;
  await downloadFile(url, `Combined_Report_${stocktakeId}.xlsx`, apiGet);
};
