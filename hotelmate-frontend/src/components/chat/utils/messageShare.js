/**
 * Message Sharing Utilities
 * 
 * Handles message sharing functionality including:
 * - Share to clipboard
 * - Share via Web Share API
 * - Share formatting
 * - Share with attachments
 * 
 * Note: Currently stubbed - ready for future implementation
 */

/**
 * Formats a message for sharing
 * @param {Object} message - The message to format
 * @returns {string} - Formatted text for sharing
 */
export const formatMessageForSharing = (message) => {
  if (!message) return '';
  
  let shareText = '';
  
  // Add sender info
  const senderName = message.sender_type === 'staff' 
    ? (message.staff_name || 'Staff')
    : (message.guest_name || 'Guest');
  
  shareText += `From: ${senderName}\n`;
  
  // Add timestamp if available
  if (message.timestamp || message.created_at) {
    const date = new Date(message.timestamp || message.created_at);
    shareText += `Date: ${date.toLocaleString()}\n`;
  }
  
  shareText += '\n';
  
  // Add message text
  if (message.message && message.message.trim()) {
    shareText += message.message;
  }
  
  // Add attachment info
  if (message.attachments && message.attachments.length > 0) {
    shareText += '\n\nAttachments:\n';
    message.attachments.forEach((att, idx) => {
      shareText += `${idx + 1}. ${att.file_name} (${att.file_size_display || 'Unknown size'})\n`;
    });
  }
  
  return shareText;
};

/**
 * Copies message to clipboard
 * @param {Object} message - The message to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyMessageToClipboard = async (message) => {
  try {
    const shareText = formatMessageForSharing(message);
    await navigator.clipboard.writeText(shareText);
    console.log('✅ Message copied to clipboard');
    return true;
  } catch (error) {
    console.error('❌ Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Shares message using Web Share API (if available)
 * @param {Object} message - The message to share
 * @returns {Promise<boolean>} - Success status
 */
export const shareMessageViaWebShare = async (message) => {
  // Check if Web Share API is available
  if (!navigator.share) {
    console.warn('⚠️ Web Share API not available');
    return false;
  }
  
  try {
    const shareText = formatMessageForSharing(message);
    
    const shareData = {
      title: 'Chat Message',
      text: shareText
    };
    
    // Add URL if message has attachments
    if (message.attachments && message.attachments.length > 0) {
      // For now, we'll include the first attachment URL
      // In a full implementation, you might create a temporary share page
      shareData.url = message.attachments[0].file_url;
    }
    
    await navigator.share(shareData);
    console.log('✅ Message shared successfully');
    return true;
  } catch (error) {
    // User cancelled or error occurred
    if (error.name === 'AbortError') {
      console.log('ℹ️ Share cancelled by user');
    } else {
      console.error('❌ Error sharing message:', error);
    }
    return false;
  }
};

/**
 * Main share handler - tries Web Share API, falls back to clipboard
 * @param {Object} message - The message to share
 * @param {Function} onSuccess - Callback on successful share
 * @param {Function} onError - Callback on error
 */
export const handleMessageShare = async (message, onSuccess, onError) => {
  console.log('📤 Attempting to share message:', message.id);
  
  // Try Web Share API first (if available and on mobile)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile && navigator.share) {
    const success = await shareMessageViaWebShare(message);
    if (success) {
      onSuccess && onSuccess('Message shared successfully');
      return;
    }
  }
  
  // Fallback to clipboard copy
  const copied = await copyMessageToClipboard(message);
  if (copied) {
    onSuccess && onSuccess('Message copied to clipboard');
  } else {
    onError && onError('Failed to share message');
  }
};

/**
 * Creates a shareable link for a message (placeholder for future implementation)
 * @param {Object} message - The message to create a link for
 * @param {string} conversationId - The conversation ID
 * @param {string} hotelSlug - The hotel slug
 * @returns {string|null} - The shareable link or null
 */
export const createShareableLink = (message, conversationId, hotelSlug) => {
  // Placeholder for future implementation
  // This would create a temporary public link to the message
  // Requires backend support
  
  console.log('ℹ️ createShareableLink not yet implemented');
  console.log('ℹ️ Message:', message.id, 'Conversation:', conversationId, 'Hotel:', hotelSlug);
  
  return null;
};

/**
 * Exports message and attachments as a file (placeholder for future implementation)
 * @param {Object} message - The message to export
 * @returns {Promise<boolean>} - Success status
 */
export const exportMessageAsFile = async (message) => {
  // Placeholder for future implementation
  // This would create a formatted file (JSON, text, or PDF) with the message and attachments
  
  console.log('ℹ️ exportMessageAsFile not yet implemented');
  console.log('ℹ️ Message:', message.id);
  
  return false;
};
