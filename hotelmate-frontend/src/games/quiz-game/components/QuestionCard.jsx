import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function QuestionCard({ 
  question, 
  questionNumber, 
  totalQuestions,
  selectedAnswer, 
  onAnswerSelect, 
  showFeedback,
  isCorrect,
  disabled 
}) {
  const { mainColor } = useTheme();

  if (!question) return null;

  const options = [
    { label: 'A', text: question.option_a },
    { label: 'B', text: question.option_b },
    { label: 'C', text: question.option_c },
    { label: 'D', text: question.option_d }
  ].filter(opt => opt.text); // Only show options that have text

  const getDifficultyBadge = () => {
    const colors = {
      easy: 'success',
      medium: 'warning',
      hard: 'danger'
    };
    return colors[question.difficulty] || 'secondary';
  };

  const getCategoryColor = () => {
    // You can enhance this with actual category colors from API
    return question.category_color || '#6c757d';
  };

  const getOptionButtonClass = (optionLabel) => {
    if (!showFeedback) {
      return selectedAnswer === optionLabel 
        ? 'btn-primary' 
        : 'btn-outline-primary';
    }
    
    // Show feedback colors
    if (selectedAnswer === optionLabel) {
      return isCorrect ? 'btn-success' : 'btn-danger';
    }
    
    return 'btn-outline-secondary';
  };

  const getOptionIcon = (optionLabel) => {
    if (!showFeedback || selectedAnswer !== optionLabel) return null;
    
    return isCorrect 
      ? <i className="bi bi-check-circle-fill me-2"></i>
      : <i className="bi bi-x-circle-fill me-2"></i>;
  };

  return (
    <div className="card shadow-lg border-0">
      <div className="card-header bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className="badge bg-secondary me-2">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className={`badge bg-${getDifficultyBadge()}`}>
              {question.difficulty_display || question.difficulty}
            </span>
          </div>
          <div>
            {question.category_name && (
              <span 
                className="badge rounded-pill"
                style={{ 
                  backgroundColor: getCategoryColor(),
                  fontSize: '0.9rem'
                }}
              >
                {question.category_icon && <span className="me-1">{question.category_icon}</span>}
                {question.category_name}
              </span>
            )}
            <span className="badge bg-info ms-2">
              {question.points} pts
            </span>
          </div>
        </div>
      </div>

      <div className="card-body p-4">
        <h4 className="card-title mb-4">{question.question_text}</h4>

        <div className="d-grid gap-3">
          {options.map((option) => (
            <button
              key={option.label}
              className={`btn btn-lg text-start ${getOptionButtonClass(option.label)}`}
              style={
                !showFeedback && selectedAnswer === option.label
                  ? { backgroundColor: mainColor, borderColor: mainColor }
                  : {}
              }
              onClick={() => onAnswerSelect(option.label)}
              disabled={disabled}
            >
              <div className="d-flex align-items-center">
                <span className="badge bg-dark me-3" style={{ minWidth: '30px' }}>
                  {option.label}
                </span>
                {getOptionIcon(option.label)}
                <span className="flex-grow-1">{option.text}</span>
              </div>
            </button>
          ))}
        </div>

        {showFeedback && (
          <div className={`alert alert-${isCorrect ? 'success' : 'danger'} mt-4 mb-0`}>
            <div className="d-flex align-items-center">
              <i className={`bi bi-${isCorrect ? 'check-circle' : 'x-circle'} me-2`} style={{ fontSize: '1.5rem' }}></i>
              <div>
                <strong>{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                {!isCorrect && question.correct_option_text && (
                  <div className="mt-1">
                    The correct answer was: <strong>{question.correct_option_text}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
