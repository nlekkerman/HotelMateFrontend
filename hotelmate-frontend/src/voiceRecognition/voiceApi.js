import api from '@/services/api';
import { addVoiceLog } from './VoiceDebugPanel';

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

    const requestInfo = {
      endpoint: `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/`,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      stocktakeId: stocktakeId,
    };

    addVoiceLog('info', '📤 Sending audio to backend (DISABLED)', requestInfo);

    // POST to backend voice command endpoint - COMMENTED OUT
    // const response = await api.post(
    //   `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/`,
    //   formData,
    //   {
    //     headers: {
    //       'Content-Type': 'multipart/form-data',
    //     },
    //   }
    // );

    // addVoiceLog('success', '✅ Backend parsed voice command', response.data);
    // return response.data;
    
    // Return mock response for testing
    addVoiceLog('warning', '⚠️ API calls are disabled - returning mock data', {});
    return {
      success: false,
      error: 'API calls are currently disabled'
    };
  } catch (error) {
    console.error('❌ Voice command API error:', error);
    
    // Extract detailed error message from backend response
    let errorMessage = 'Failed to process voice command';
    
    if (error.response?.data) {
      const data = error.response.data;
      errorMessage = data.error 
        || data.message 
        || data.detail
        || JSON.stringify(data);
      
      addVoiceLog('error', '❌ Backend parse error', {
        error: errorMessage,
        fullResponse: error.response.data,
        status: error.response.status
      });
    } else if (error.message) {
      errorMessage = error.message;
      addVoiceLog('error', '❌ Network error', { error: errorMessage });
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
    const payload = {
      stocktake_id: stocktakeId,
      command: command
    };

    addVoiceLog('info', '📤 Confirming voice command with backend (DISABLED)', {
      endpoint: `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/confirm/`,
      payload: payload
    });

    // POST to backend confirm endpoint - COMMENTED OUT
    // const response = await api.post(
    //   `/stock_tracker/${hotelSlug}/stocktake-lines/voice-command/confirm/`,
    //   payload
    // );

    // addVoiceLog('success', '✅ Backend confirmed and updated stocktake', {
    //   response: response.data,
    //   updatedLine: response.data.line,
    //   message: response.data.message
    // });

    // return response.data;
    
    // Return mock response for testing
    addVoiceLog('warning', '⚠️ API calls are disabled - returning mock data', {});
    return {
      success: false,
      error: 'API calls are currently disabled'
    };
  } catch (error) {
    console.error('❌ Confirm command API error:', error);
    
    // Extract detailed error message from backend response
    let errorMessage = 'Failed to confirm voice command';
    
    if (error.response?.data) {
      const data = error.response.data;
      errorMessage = data.error 
        || data.message 
        || data.detail
        || JSON.stringify(data);
      
      addVoiceLog('error', '❌ Confirm failed', {
        error: errorMessage,
        fullResponse: error.response.data,
        status: error.response.status,
        sentPayload: {
          stocktake_id: stocktakeId,
          command: command
        }
      });
    } else if (error.message) {
      errorMessage = error.message;
      addVoiceLog('error', '❌ Network error during confirm', { error: errorMessage });
    }

    throw new Error(errorMessage);
  }
};
