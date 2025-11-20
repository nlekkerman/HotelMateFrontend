import api from '@/services/api';

/**
 * Send audio recording to backend for voice command processing
 * 
 * @param {Blob} audioBlob - Audio recording in webm format
 * @param {number} stocktakeId - ID of the active stocktake
 * @param {string} hotelSlug - Hotel identifier
 * @returns {Promise<Object>} Backend response with parsed command
 */
export const sendVoiceCommand = async (audioBlob, stocktakeId, hotelSlug) => {
  try {
    // Create FormData with audio file and stocktake_id
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-command.webm');
    formData.append('stocktake_id', stocktakeId.toString());

    // POST to backend voice command endpoint
    const response = await api.post(
      `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Voice command API error:', error);
    
    // Extract error message from backend response
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message
      || error.message
      || 'Failed to process voice command';

    throw new Error(errorMessage);
  }
};
