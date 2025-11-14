import React from 'react';

export default function QuizQuestion({ 
  question, 
  selectedAnswer, 
  isAnswered, 
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  lastAnswerFeedback
}) {
  if (!question) return null;

  // Get question text
  const questionText = question.text;

  const renderAnswers = () => {
    if (!question.answers || !Array.isArray(question.answers)) return null;

    return question.answers.map((answer, index) => {
      const isSelected = selectedAnswer?.id === answer.id || selectedAnswer?.text === answer.text;

      return (
        <button
          key={answer.id || index}
          className={`btn w-100 p-3 mb-2 text-start answer-btn ${
            isAnswered
              ? isSelected
                ? 'btn-primary' // Show selected answer
                : 'btn-outline-secondary'
              : 'btn-outline-primary'
          }`}
          onClick={() => !isAnswered && onAnswerSelect(answer)}
          disabled={isAnswered}
        >
          <span className="fw-bold me-2">{String.fromCharCode(65 + index)}.</span>
          {answer.text || answer}
        </button>
      );
    });
  };

  return (
    <div className="quiz-question-container">
      {/* Question Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="badge bg-primary">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        
        <h4 className="mb-3">{questionText}</h4>
        
        {question.image_url && (
          <div className="mb-3">
            <img 
              src={question.image_url} 
              alt="Question" 
              className="img-fluid rounded"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="answers-container">
        {renderAnswers()}
      </div>

      {/* Detailed Answer Feedback with Turbo Mode Scoring */}
      {isAnswered && lastAnswerFeedback && (
        <div className={`alert ${
          lastAnswerFeedback.timeout 
            ? 'alert-danger' 
            : lastAnswerFeedback.isCorrect 
              ? 'alert-success' 
              : 'alert-warning'
        } mt-3`}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0">
              {lastAnswerFeedback.timeout ? (
                <>
                  <i className="bi bi-clock-fill me-2"></i>
                  TIME'S UP!
                </>
              ) : lastAnswerFeedback.isCorrect ? (
                <>
                  <i className="bi bi-check-circle-fill me-2"></i>
                  CORRECT!
                </>
              ) : (
                <>
                  <i className="bi bi-x-circle-fill me-2"></i>
                  WRONG!
                </>
              )}
            </h5>
            {lastAnswerFeedback.pointsAwarded > 0 && (
              <span className="badge bg-success fs-5">
                +{lastAnswerFeedback.pointsAwarded} pts
              </span>
            )}
          </div>
          
          {/* Show Selected vs Correct Answer for wrong answers */}
          {!lastAnswerFeedback.isCorrect && (
            <div className="mb-3">
              {lastAnswerFeedback.selectedAnswer && (
                <div className="mb-2">
                  <span className="text-danger text-decoration-line-through">
                    <strong>You selected:</strong> {lastAnswerFeedback.selectedAnswer}
                  </span>
                </div>
              )}
              {lastAnswerFeedback.correctAnswer && (
                <div className="p-2 bg-success bg-opacity-10 border border-success rounded">
                  <strong className="text-success">
                    <i className="bi bi-check-circle me-2"></i>
                    Correct answer: {lastAnswerFeedback.correctAnswer}
                  </strong>
                </div>
              )}
            </div>
          )}
          
          {/* Scoring Breakdown */}
          <div className="d-flex gap-3 text-sm flex-wrap">
            <div>
              <i className="bi bi-stopwatch me-1"></i>
              <strong>Time:</strong> {lastAnswerFeedback.timeTaken}s
            </div>
            <div>
              <i className="bi bi-star me-1"></i>
              <strong>Base:</strong> {lastAnswerFeedback.basePoints} pts
            </div>
            <div>
              <i className="bi bi-lightning-charge me-1"></i>
              <strong>Multiplier:</strong> {lastAnswerFeedback.multiplierUsed}x
            </div>
            <div>
              <i className="bi bi-calculator me-1"></i>
              <strong>Earned:</strong> {lastAnswerFeedback.pointsAwarded} pts
            </div>
          </div>
          
          {/* Streak Status */}
          {lastAnswerFeedback.streakBroken ? (
            <div className="mt-2 text-danger fw-bold">
              <i className="bi bi-fire me-1"></i>
              💔 STREAK BROKEN - Multiplier reset to 1x
            </div>
          ) : lastAnswerFeedback.isCorrect && (
            <div className="mt-2 text-success fw-bold">
              <i className="bi bi-fire me-1"></i>
              🔥 Streak continues! Next multiplier: {lastAnswerFeedback.multiplierUsed * 2}x
            </div>
          )}
        </div>
      )}
    </div>
  );
}
