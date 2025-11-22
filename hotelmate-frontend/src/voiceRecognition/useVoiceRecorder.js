import { useState, useRef, useCallback } from 'react';
import { addVoiceLog } from './VoiceDebugPanel';

/**
 * Hook for recording audio using MediaRecorder API
 * Returns audio Blob in webm format for backend processing
 * Automatically stops recording after 2 seconds of silence
 */
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);

      // Request microphone access with optimized settings for speech
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm/opus codec (best compatibility with OpenAI Whisper)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000  // Higher bitrate for better quality
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Create Blob when recording stops
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);

        addVoiceLog('success', '✅ Recording complete', {
          size: `${(blob.size / 1024).toFixed(2)} KB`,
          type: blob.type,
          chunks: audioChunksRef.current.length
        });

        // Cleanup audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Set up silence detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.9;  // More smoothing for stable detection
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = Date.now();
      const SILENCE_THRESHOLD = 15; // Lower threshold to be less sensitive to background noise (0-255)
      const SILENCE_DURATION = 4000; // Stop after 4 seconds of silence to allow full sentences

      const checkAudioLevel = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

        if (average < SILENCE_THRESHOLD) {
          // Silence detected
          if (Date.now() - silenceStart > SILENCE_DURATION) {
            console.log('🔇 Silence detected for 4 seconds, auto-stopping...');
            addVoiceLog('info', '🔇 Silence detected - auto-stopping recording', {
              duration: '4 seconds',
              threshold: SILENCE_THRESHOLD
            });
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return;
          }
        } else {
          // Sound detected, reset silence timer
          silenceStart = Date.now();
        }

        // Continue checking
        silenceTimeoutRef.current = setTimeout(checkAudioLevel, 100);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      addVoiceLog('success', '🎙️ Recording started - speak now!', {
        mimeType: mimeType,
        bitrate: '128kbps',
        silenceDetection: 'enabled (4s timeout)',
        audioEnhancements: 'noise suppression, echo cancellation, auto gain'
      });

      // Start silence detection after 2 seconds (allow initial speech and pauses)
      setTimeout(() => {
        silenceStart = Date.now();
        checkAudioLevel();
      }, 2000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Microphone access denied');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Clear silence detection timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // isRecording will be set to false in onstop handler
    }
  }, [isRecording]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    setIsProcessing(false);
    audioChunksRef.current = [];

    // Clear silence detection timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop any active recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Stop stream if still active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    reset,
    setIsProcessing,
  };
};
