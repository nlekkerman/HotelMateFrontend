import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useVoiceRecorder } from './useVoiceRecorder';
import { sendVoiceCommand } from './voiceApi';

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
      stopRecording();
    } else {
      // Start recording
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
      console.log('🎤 Sending audio to backend...', {
        size: audioBlob.size,
        type: audioBlob.type,
        stocktakeId,
      });

      // Send audio to backend
      const response = await sendVoiceCommand(audioBlob, stocktakeId, hotelSlug);

      console.log('✅ Backend response:', response);

      if (response.success && response.command) {
        // Show success briefly
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);

        // Pass command to parent for preview modal
        onCommandReceived(response.command);

        // Reset recorder
        reset();
      } else {
        throw new Error(response.error || 'Failed to process voice command');
      }
    } catch (err) {
      console.error('Voice command error:', err);
      setApiError(err.message);

      // Show error for 3 seconds then reset
      setTimeout(() => {
        setApiError(null);
        reset();
      }, 3000);
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
    <div className="voice-recorder">
      <Button
        variant={getButtonVariant()}
        onClick={handleClick}
        disabled={isLocked || isProcessing || showSuccess || !!apiError || !!recorderError}
        className={isRecording ? 'voice-recording-pulse' : ''}
        size="lg"
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>

      {isRecording && (
        <div className="text-danger small mt-1 text-center">
          <span className="recording-indicator">● REC</span>
        </div>
      )}

      {(apiError || recorderError) && (
        <div className="text-danger small mt-1 text-center">
          {apiError || recorderError}
        </div>
      )}

      <style jsx>{`
        .voice-recording-pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .recording-indicator {
          animation: blink 1s infinite;
          font-weight: bold;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
