import React from 'react';

export default function QuizProgress({ 
  currentQuestion, 
  totalQuestions, 
  score,
  consecutiveCorrect,
  isTurboActive
}) {
  const progress = ((currentQuestion) / totalQuestions) * 100;

  return (
    <div className="quiz-progress-bar mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span className="text-muted small">Progress</span>
          <span className="ms-2 fw-bold">
            {currentQuestion} / {totalQuestions}
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          {/* Turbo Mode Status */}
          {isTurboActive && (
            <div className="text-end">
              <span className="badge bg-danger fs-6">
                <i className="bi bi-lightning-charge-fill me-1"></i>
                TURBO 2x
              </span>
            </div>
          )}
          {/* Streak Counter */}
          {consecutiveCorrect > 0 && (
            <div className="text-end">
              <span className="text-muted small d-block">Streak</span>
              <span className="badge bg-warning text-dark fs-6">
                🔥 {consecutiveCorrect}
              </span>
            </div>
          )}
          {/* Score */}
          <div className="text-end">
            <span className="text-muted small d-block">Score</span>
            <span className="fw-bold text-primary fs-5">{score}</span>
          </div>
        </div>
      </div>
      
      <div className="progress" style={{ height: '12px' }}>
        <div
          className="progress-bar bg-primary"
          role="progressbar"
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
    </div>
  );
}
