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
    
    // Create a File object from Blob with proper MIME type
    const audioFile = new File([audioBlob], 'voice-command.webm', {
      type: audioBlob.type || 'audio/webm',
      lastModified: Date.now(),
    });
    
    formData.append('audio', audioFile);
    formData.append('stocktake_id', stocktakeId.toString());

    console.log('📤 Sending voice command to backend:', {
      endpoint: `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/`,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      stocktakeId: stocktakeId,
    });

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

    console.log('✅ Backend response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Voice command API error:', error);
    console.error('Error response:', error.response?.data);
    
    // Extract detailed error message from backend response
    let errorMessage = 'Failed to process voice command';
    
    if (error.response?.data) {
      const data = error.response.data;
      errorMessage = data.error 
        || data.message 
        || data.detail
        || JSON.stringify(data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * Confirm voice command (updates database)
 * 
 * @param {Object} command - Parsed command from sendVoiceCommand
 * @param {number} stocktakeId - ID of the active stocktake
 * @param {string} hotelSlug - Hotel identifier
 * @returns {Promise<Object>} Backend response with updated line data
 */
export const confirmVoiceCommand = async (command, stocktakeId, hotelSlug) => {
  try {
    console.log('✅ Confirming voice command:', {
      endpoint: `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/confirm/`,
      command,
      stocktakeId
    });

    // POST to backend confirm endpoint
    const response = await api.post(
      `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/confirm/`,
      {
        stocktake_id: stocktakeId,
        command: command
      }
    );

    console.log('✅ Confirm response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Confirm command API error:', error);
    console.error('Error response:', error.response?.data);
    
    // Extract detailed error message from backend response
    let errorMessage = 'Failed to confirm voice command';
    
    if (error.response?.data) {
      const data = error.response.data;
      errorMessage = data.error 
        || data.message 
        || data.detail
        || JSON.stringify(data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};
