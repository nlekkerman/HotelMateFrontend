import React, { useState, useEffect, useRef } from 'react';

export default function QuizTimer({ 
  isRunning, 
  onTimeUpdate, 
  showWarning = true,
  warningThreshold = 10,
  initialTime = 0 
}) {
  const [seconds, setSeconds] = useState(initialTime);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const newTime = prev + 1;
          if (onTimeUpdate) {
            onTimeUpdate(newTime);
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUpdate]);

  // Reset when initialTime changes
  useEffect(() => {
    setSeconds(initialTime);
  }, [initialTime]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = showWarning && seconds >= warningThreshold;

  return (
    <div className={`timer ${isWarning ? 'timer-warning' : ''}`}>
      <i className="bi bi-clock-fill me-2"></i>
      <span className="timer-display">{formatTime(seconds)}</span>
    </div>
  );
}

// Separate component for question timer with bonus indicators
export function QuestionTimer({ 
  seconds, 
  isRunning, 
  onTimeUpdate 
}) {
  const getBonusColor = (time) => {
    if (time < 10) return 'success';
    if (time < 20) return 'warning';
    return 'secondary';
  };

  const getBonusText = (time) => {
    if (time < 10) return '1.2x Bonus';
    if (time < 20) return '1.1x Bonus';
    return 'No Bonus';
  };

  return (
    <div className="question-timer">
      <QuizTimer 
        isRunning={isRunning} 
        onTimeUpdate={onTimeUpdate}
        initialTime={seconds}
        showWarning={false}
      />
      <span className={`badge bg-${getBonusColor(seconds)} ms-2`}>
        {getBonusText(seconds)}
      </span>
    </div>
  );
}

// Simple display-only timer
export function TimerDisplay({ seconds }) {
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className="timer-display">
      <i className="bi bi-clock-fill me-1"></i>
      {formatTime(seconds)}
    </span>
  );
}
