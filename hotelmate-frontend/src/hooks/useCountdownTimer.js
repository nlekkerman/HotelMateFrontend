import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Countdown Timer Hook
 * 
 * Pure UI hook for displaying countdown timers based on expiration time.
 * Updates every second and provides formatted output.
 * 
 * @param {string|Date|null} expiresAt - ISO string, Date object, or null
 * @param {Function} onExpire - Callback when timer reaches 0 (called only once)
 * @returns {{secondsLeft: number, mmss: string, isExpired: boolean}}
 */
export const useCountdownTimer = (expiresAt, onExpire) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef(null);
  const hasCalledExpire = useRef(false);
  
  // Memoized expire callback to prevent unnecessary re-renders
  const handleExpire = useCallback(() => {
    if (!hasCalledExpire.current && onExpire) {
      hasCalledExpire.current = true;
      onExpire();
    }
  }, [onExpire]);
  
  // Calculate seconds remaining
  const calculateSecondsLeft = useCallback(() => {
    if (!expiresAt) return 0;
    
    const now = new Date();
    const expiration = new Date(expiresAt);
    
    // Handle invalid dates
    if (isNaN(expiration.getTime())) {
      return 0;
    }
    
    const diff = expiration.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  }, [expiresAt]);
  
  // Initialize and update timer
  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      setIsExpired(false); // Don't mark as expired if no expiration time is set
      return; // Don't call handleExpire when there's no expiration time
    }
    
    // Reset expiration state when expiresAt changes
    hasCalledExpire.current = false;
    setIsExpired(false);
    
    // Calculate initial seconds left
    const initialSeconds = calculateSecondsLeft();
    setSecondsLeft(initialSeconds);
    
    // If already expired at mount, handle immediately
    if (initialSeconds === 0) {
      setIsExpired(true);
      handleExpire();
      return;
    }
    
    // Set up interval to update every second
    intervalRef.current = setInterval(() => {
      const remaining = calculateSecondsLeft();
      setSecondsLeft(remaining);
      
      if (remaining === 0) {
        setIsExpired(true);
        handleExpire();
        clearInterval(intervalRef.current);
      }
    }, 1000);
    
    // Cleanup interval on unmount or dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [expiresAt, calculateSecondsLeft, handleExpire]);
  
  // Format seconds as MM:SS
  const formatAsMMSS = useCallback((seconds) => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    secondsLeft,
    mmss: formatAsMMSS(secondsLeft),
    isExpired
  };
};

export default useCountdownTimer;