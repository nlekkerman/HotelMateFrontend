/**
 * Message Download Utilities
 * 
 * Handles downloading message attachments and content including:
 * - Single file downloads
 * - Bulk attachment downloads
 * - Message text copying
 * - Download progress tracking
 */

/**
 * Helper: Build full Cloudinary URL if needed
 * @param {string} url - The URL or path to convert
 * @param {string} cloudinaryBase - The Cloudinary base URL
 * @returns {string} - Full Cloudinary URL
 */
export const getCloudinaryUrl = (url, cloudinaryBase = "https://res.cloudinary.com/dg0ssec7u/") => {
  if (!url) return '';
  
  // If already a Cloudinary URL, return as-is
  if (url.includes('res.cloudinary.com')) {
    return url;
  }
  
  // If it's a backend URL (not Cloudinary), we need to fix it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.warn('⚠️ Backend returned non-Cloudinary URL:', url);
    console.warn('⚠️ Backend needs CLOUDINARY_URL configured in .env');
    return url;
  }
  
  // If it's a relative path, prefix with Cloudinary base
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${cloudinaryBase}${cleanPath}`;
};

/**
 * Downloads a single file from a URL
 * @param {string} fileUrl - The URL of the file to download
 * @param {string} fileName - The name to save the file as
 * @returns {Promise<boolean>} - Success status
 */
export const downloadFile = async (fileUrl, fileName) => {
  try {
    console.log(`⬇️ Downloading: ${fileName} from ${fileUrl}`);
    
    // Fetch file
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    console.log(`✅ Downloaded: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${fileName}:`, error);
    throw error;
  }
};

/**
 * Downloads all attachments from a message
 * @param {Array} attachments - Array of attachment objects
 * @param {string} cloudinaryBase - The Cloudinary base URL
 * @returns {Promise<{success: number, failed: number, errors: Array}>} - Download results
 */
export const downloadAllAttachments = async (attachments, cloudinaryBase) => {
  if (!attachments || attachments.length === 0) {
    console.warn('⚠️ No attachments to download');
    return { success: 0, failed: 0, errors: [] };
  }
  
  let successCount = 0;
  let failedCount = 0;
  const errors = [];
  
  for (const attachment of attachments) {
    try {
      const fullFileUrl = getCloudinaryUrl(attachment.file_url, cloudinaryBase);
      await downloadFile(fullFileUrl, attachment.file_name);
      successCount++;
      
      // Small delay between downloads if multiple files
      if (attachments.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      failedCount++;
      errors.push({
        fileName: attachment.file_name,
        error: error.message
      });
    }
  }
  
  return { success: successCount, failed: failedCount, errors };
};

/**
 * Handles downloading message content and attachments
 * @param {Object} message - The message to download from
 * @param {string} cloudinaryBase - The Cloudinary base URL
 * @param {Function} onSuccess - Callback on successful download
 * @param {Function} onError - Callback on error
 */
export const handleMessageDownload = async (
  message,
  cloudinaryBase,
  onSuccess,
  onError
) => {
  if (!message) {
    onError && onError('No message to download');
    return;
  }
  
  try {
    console.log('💾 Downloading attachments from message:', message.id);
    
    // Download all attachments if present
    if (message.attachments && message.attachments.length > 0) {
      const results = await downloadAllAttachments(message.attachments, cloudinaryBase);
      
      if (results.success > 0) {
        const successMsg = `Downloaded ${results.success} file(s) successfully`;
        onSuccess && onSuccess(successMsg);
        
        // Report any failures
        if (results.failed > 0) {
          console.error(`⚠️ Failed to download ${results.failed} file(s)`);
          results.errors.forEach(err => {
            console.error(`  - ${err.fileName}: ${err.error}`);
          });
        }
      } else {
        throw new Error('All downloads failed');
      }
    } else if (message.message) {
      // If no attachments, copy message text to clipboard
      await navigator.clipboard.writeText(message.message);
      onSuccess && onSuccess('Message text copied to clipboard');
    } else {
      onError && onError('Nothing to download from this message.');
    }
    
    console.log('✅ Download completed');
  } catch (error) {
    console.error('❌ Failed to download:', error);
    onError && onError('Failed to download. Please try again.');
  }
};

/**
 * React component for download button with confirmation
 */
export const DownloadButton = ({ message, onClick, disabled = false }) => {
  const hasAttachments = message?.attachments && message.attachments.length > 0;
  const title = hasAttachments 
    ? `Download ${message.attachments.length} attachment(s)`
    : 'Copy message text';
  
  return (
    <button
      className="btn btn-sm d-flex align-items-center gap-1"
      style={{ 
        fontSize: '0.85rem',
        background: 'none',
        border: 'none',
        color: '#4CAF50',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '2px 6px',
        fontWeight: '500',
        opacity: disabled ? 0.5 : 1
      }}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span style={{ fontSize: '0.75rem' }}>⬇️</span>
      <span>↓</span>
    </button>
  );
};

/**
 * Creates a downloadable JSON file of the message (for archiving)
 * @param {Object} message - The message to export
 * @returns {boolean} - Success status
 */
export const exportMessageAsJSON = (message) => {
  try {
    const jsonData = JSON.stringify(message, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `message-${message.id}-${Date.now()}.json`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    console.log('✅ Message exported as JSON');
    return true;
  } catch (error) {
    console.error('❌ Failed to export message as JSON:', error);
    return false;
  }
};

/**
 * Batch downloads multiple messages' attachments
 * @param {Array} messages - Array of message objects
 * @param {string} cloudinaryBase - The Cloudinary base URL
 * @returns {Promise<Object>} - Download statistics
 */
export const batchDownloadMessages = async (messages, cloudinaryBase) => {
  const stats = {
    totalMessages: messages.length,
    totalFiles: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
    errors: []
  };
  
  for (const message of messages) {
    if (message.attachments && message.attachments.length > 0) {
      stats.totalFiles += message.attachments.length;
      const results = await downloadAllAttachments(message.attachments, cloudinaryBase);
      stats.successfulDownloads += results.success;
      stats.failedDownloads += results.failed;
      stats.errors.push(...results.errors);
    }
  }
  
  return stats;
};
 
