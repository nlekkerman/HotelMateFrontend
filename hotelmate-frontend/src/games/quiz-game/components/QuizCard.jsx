import React from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';

export default function QuizCard({ quiz, onClick }) {
  const difficultyColor = quizGameAPI.getDifficultyColor(quiz.difficulty_level);
  const difficultyLabel = quizGameAPI.getDifficultyLabel(quiz.difficulty_level);
  const difficultyIcon = quizGameAPI.getDifficultyIcon(quiz.difficulty_level);

  return (
    <div
      className="card h-100 quiz-card"
      onClick={() => onClick(quiz)}
      style={{ 
        cursor: 'pointer', 
        transition: 'transform 0.2s',
        borderLeft: `4px solid ${difficultyColor}`
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{quiz.title}</h5>
          <i className={`${difficultyIcon} fs-4`} style={{ color: difficultyColor }}></i>
        </div>
        
        {quiz.description && (
          <p className="card-text text-muted small mb-3">{quiz.description}</p>
        )}
        
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <span 
              className="badge" 
              style={{ backgroundColor: difficultyColor }}
            >
              {difficultyLabel}
            </span>
            {quiz.is_daily && (
              <span className="badge bg-warning text-dark">
                <i className="bi bi-star-fill me-1"></i>Daily Quiz
              </span>
            )}
          </div>
          
          <div className="small text-muted">
            <i className="bi bi-question-circle me-1"></i>
            {quiz.max_questions || 10} Questions
          </div>
          
          {quiz.time_per_question_seconds && (
            <div className="small text-muted">
              <i className="bi bi-clock me-1"></i>
              {quiz.time_per_question_seconds}s per question
            </div>
          )}
          
          {quiz.enable_background_music && (
            <div className="small text-muted">
              <i className="bi bi-music-note me-1"></i>
              Background Music
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
