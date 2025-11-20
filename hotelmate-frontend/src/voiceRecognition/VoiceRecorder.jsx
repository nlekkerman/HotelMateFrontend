import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useVoiceRecorder } from './useVoiceRecorder';
import { sendVoiceCommand } from './voiceApi';
import { addVoiceLog } from './VoiceDebugPanel';

/**
 * Voice recording button for stocktake voice commands
 * Records audio, sends to backend, and triggers preview modal
 */
export const VoiceRecorder = ({ stocktakeId, hotelSlug, onCommandReceived, isLocked }) => {
  const {
    isRecording,
    isProcessing,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    reset,
    setIsProcessing,
  } = useVoiceRecorder();

  const [apiError, setApiError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle recording button click
  const handleClick = async () => {
    if (isLocked) {
      return; // Don't allow recording on locked stocktakes
    }

    if (isRecording) {
      // Stop recording
      addVoiceLog('info', '⏸️ Stopping audio recording...');
      stopRecording();
    } else {
      // Start recording
      addVoiceLog('info', '🎙️ Starting audio recording...');
      setApiError(null);
      setShowSuccess(false);
      await startRecording();
    }
  };

  // Process audio when recording stops
  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      processAudio();
    }
  }, [audioBlob, isRecording]);

  const processAudio = async () => {
    setIsProcessing(true);
    setApiError(null);

    try {
      const audioInfo = {
        size: audioBlob.size,
        sizeKB: (audioBlob.size / 1024).toFixed(2),
        type: audioBlob.type,
        stocktakeId,
        hotelSlug,
      };
      
      console.log('🎤 Sending audio to backend...', audioInfo);
      addVoiceLog('info', '📤 Sending audio to backend...', audioInfo);

      // Send audio to backend
      const response = await sendVoiceCommand(audioBlob, stocktakeId, hotelSlug);

      console.log('✅ Backend response:', response);

      // Check if backend returned success
      if (response.success === false) {
        // Backend returned error in response
        const errorDetails = {
          error: response.error,
          transcription: response.transcription || 'No transcription available',
          details: response.details || 'No additional details',
        };
        
        addVoiceLog('error', '❌ Backend returned error', errorDetails);
        
        // Create user-friendly error message
        let userMessage = response.error || 'Backend processing failed';
        
        // If no action keyword found, show transcription and helpful tip
        if (response.error?.includes('No action keyword')) {
          userMessage = `Could not understand command. I heard: "${response.transcription}". Try saying "count", "set", "purchase", or "waste" followed by product name and quantity.`;
        }
        
        throw new Error(userMessage);
      }

      if (!response.command) {
        addVoiceLog('error', '❌ Invalid backend response - no command data', response);
        throw new Error('Invalid response from backend - no command data');
      }

      addVoiceLog('success', '✅ Backend transcription complete', {
        transcription: response.command.transcription,
        action: response.command.action,
        product: response.command.item_identifier,
        value: response.command.value,
      });

      // Show success briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Pass command to parent for preview modal
      onCommandReceived(response.command);

      // Reset recorder
      reset();

    } catch (err) {
      console.error('❌ Voice command error:', err);
      
      // Create detailed error log
      const errorDetails = {
        message: err.message,
        type: err.name || 'Error',
      };

      // Add response data if available
      if (err.response) {
        errorDetails.status = err.response.status;
        errorDetails.statusText = err.response.statusText;
        errorDetails.responseData = err.response.data;
      }

      // Add request data if available
      if (err.config) {
        errorDetails.endpoint = err.config.url;
        errorDetails.method = err.config.method;
      }

      addVoiceLog('error', '❌ Voice command failed', errorDetails);
      
      // Show user-friendly error message
      const displayError = err.message.length > 150 
        ? err.message.substring(0, 150) + '...' 
        : err.message;
      
      setApiError(displayError);

      // Show error for 8 seconds then reset
      setTimeout(() => {
        setApiError(null);
        reset();
      }, 8000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine button state and styling
  const getButtonVariant = () => {
    if (showSuccess) return 'success';
    if (apiError || recorderError) return 'danger';
    if (isRecording) return 'danger';
    if (isProcessing) return 'warning';
    return 'primary';
  };

  const getButtonIcon = () => {
    if (showSuccess) return <FaCheckCircle className="me-2" />;
    if (apiError || recorderError) return <FaExclamationTriangle className="me-2" />;
    if (isProcessing) return <Spinner animation="border" size="sm" className="me-2" />;
    if (isRecording) return <FaStop className="me-2" />;
    return <FaMicrophone className="me-2" />;
  };

  const getButtonText = () => {
    if (showSuccess) return 'Success!';
    if (apiError || recorderError) return 'Error';
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Stop Recording';
    return 'Voice Command';
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLocked || isProcessing || showSuccess || !!apiError || !!recorderError}
        className={`voice-floating-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''} ${showSuccess ? 'success' : ''} ${(apiError || recorderError) ? 'error' : ''}`}
        aria-label="Voice Button"
        title={getButtonText()}
      >
        {getButtonIcon()}
        {isRecording && <span className="rec-badge">REC</span>}
      </button>

      {(apiError || recorderError) && (
        <div 
          className="voice-error-tooltip"
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            maxWidth: '400px',
            minWidth: '250px',
            fontSize: '12px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'normal',
            lineHeight: '1.4',
          }}
        >
          {apiError || recorderError}
        </div>
      )}

      <style>{`
        .voice-floating-button {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.3);
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(52, 152, 219, 0.6);
          transition: all 0.3s ease;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
        }

        .voice-floating-button:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }

        .voice-floating-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .voice-floating-button.recording {
          background: linear-gradient(135deg, #f85032 0%, #e73827 100%);
          animation: pulse-recording 1.5s infinite;
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
        }

        .voice-floating-button.processing {
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
          box-shadow: 0 6px 20px rgba(255, 193, 7, 0.4);
        }

        .voice-floating-button.success {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        .voice-floating-button.error {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
        }

        @keyframes pulse-recording {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 8px 30px rgba(220, 53, 69, 0.8);
          }
        }

        .rec-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #fff;
          color: #dc3545;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 12px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 768px) {
          .voice-floating-button {
            width: 56px;
            height: 56px;
            font-size: 24px;
            bottom: 20px;
            right: 20px;
          }
        }
      `}</style>
    </>
  );
};
