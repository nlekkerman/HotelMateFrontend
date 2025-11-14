import React from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';

export default function QuizTimer({ timeLeft, totalTime, isWarning }) {
  const percentage = (timeLeft / totalTime) * 100;
  
  return (
    <div className="quiz-timer mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-bold">
          <i className="bi bi-clock me-2"></i>
          Time Remaining
        </span>
        <span className={`fs-4 fw-bold ${timeLeft <= 5 ? 'text-danger' : ''}`}>
          {quizGameAPI.formatTime(timeLeft)}
        </span>
      </div>
      
      <div className="progress" style={{ height: '8px' }}>
        <div
          className={`progress-bar ${
            timeLeft <= 5 
              ? 'bg-danger' 
              : timeLeft <= 10 
              ? 'bg-warning' 
              : 'bg-success'
          }`}
          role="progressbar"
          style={{ 
            width: `${percentage}%`,
            transition: 'width 1s linear'
          }}
          aria-valuenow={timeLeft}
          aria-valuemin="0"
          aria-valuemax={totalTime}
        ></div>
      </div>
    </div>
  );
}
