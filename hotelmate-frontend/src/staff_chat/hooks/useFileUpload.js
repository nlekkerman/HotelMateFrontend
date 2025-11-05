import { useState } from 'react';
import { uploadFiles } from '../services/staffChatApi';

/**
 * Custom hook for file uploads
 * @param {string} hotelSlug - Hotel slug
 * @param {number} conversationId - Conversation ID
 * @param {Function} onFilesUploaded - Callback when files are uploaded
 * @returns {Object} Upload state and functions
 */
const useFileUpload = (hotelSlug, conversationId, onFilesUploaded) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // File validation constants
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    pdf: ['.pdf'],
    documents: ['.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  };

  /**
   * Validate files
   * @param {FileList|Array} files - Files to validate
   * @returns {Object} Validation result
   */
  const validateFiles = (files) => {
    const fileArray = Array.from(files);

    // Check file count
    if (fileArray.length > MAX_FILES) {
      return {
        valid: false,
        error: `Maximum ${MAX_FILES} files allowed per upload`,
      };
    }

    // Check each file
    for (const file of fileArray) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File "${file.name}" exceeds 50MB limit`,
        };
      }

      // Check file type
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const allAllowedTypes = [
        ...ALLOWED_TYPES.images,
        ...ALLOWED_TYPES.pdf,
        ...ALLOWED_TYPES.documents,
      ];

      if (!allAllowedTypes.includes(ext)) {
        return {
          valid: false,
          error: `File type "${ext}" is not supported`,
        };
      }
    }

    return { valid: true };
  };

  /**
   * Upload files
   * @param {FileList|Array} files - Files to upload
   * @param {string} messageText - Optional message text
   * @param {number} replyToId - Optional reply to message ID
   * @returns {Promise<Object|null>} Upload result or null
   */
  const upload = async (files, messageText = '', replyToId = null) => {
    const fileArray = Array.from(files);

    // Validate files
    const validation = validateFiles(fileArray);
    if (!validation.valid) {
      setError(validation.error);
      return null;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadFiles(
        hotelSlug,
        conversationId,
        fileArray,
        messageText,
        replyToId
      );

      setProgress(100);

      // Notify parent
      if (onFilesUploaded) {
        onFilesUploaded(result);
      }

      return result;
    } catch (err) {
      setError(err.message || 'Failed to upload files');
      console.error('Error uploading files:', err);
      return null;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Get file icon based on file type
   * @param {string} fileName - File name
   * @returns {string} Bootstrap icon class
   */
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();

    if (ALLOWED_TYPES.images.some(t => t.includes(ext))) {
      return 'bi-file-image';
    }
    if (ALLOWED_TYPES.pdf.some(t => t.includes(ext))) {
      return 'bi-file-pdf';
    }
    if (['.doc', '.docx'].includes('.' + ext)) {
      return 'bi-file-word';
    }
    if (['.xls', '.xlsx'].includes('.' + ext)) {
      return 'bi-file-excel';
    }
    if (ext === 'txt') {
      return 'bi-file-text';
    }
    return 'bi-file-earmark';
  };

  return {
    upload,
    uploading,
    progress,
    error,
    validateFiles,
    formatFileSize,
    getFileIcon,
    MAX_FILES,
    MAX_FILE_SIZE,
    ALLOWED_TYPES,
  };
};

export default useFileUpload;
