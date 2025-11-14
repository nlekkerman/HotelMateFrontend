import React from 'react';
import QuizTimer from '../components/QuizTimer';
import QuizProgress from '../components/QuizProgress';
import QuizQuestion from '../components/QuizQuestion';

export default function QuizPlay({ 
  currentCategory,
  currentCategoryIndex,
  totalCategories,
  currentQuestion,
  currentQuestionIndex,
  questions,
  selectedAnswer,
  isAnswered,
  lastAnswerFeedback,
  timeLeft,
  score,
  consecutiveCorrect,
  isTurboActive,
  totalQuestionsAnswered,
  onAnswerSelect
}) {
  const timePerQuestion = 5; // Always 5 seconds

  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Quiz Header */}
          <div className="card mb-4 border-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="badge bg-primary text-white mb-2">
                    Category {currentCategoryIndex + 1} of {totalCategories}
                  </div>
                  <h3 className="mb-0">{currentCategory?.name || 'Quiz Challenge'}</h3>
                  <p className="text-muted mb-0">{currentCategory?.description || ''}</p>
                </div>
                <div className="text-end">
                  <div className="badge bg-info mb-1">
                    Question {totalQuestionsAnswered + 1} / 50
                  </div>
                  {isTurboActive && (
                    <div className="badge bg-danger">
                      <i className="bi bi-lightning-charge-fill me-1"></i>
                      TURBO MODE! 2x
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <QuizProgress
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
            consecutiveCorrect={consecutiveCorrect}
            isTurboActive={isTurboActive}
          />

          {/* Timer */}
          <QuizTimer
            timeLeft={timeLeft}
            totalTime={timePerQuestion}
            isWarning={timeLeft <= 5}
          />

          {/* Question Card */}
          <div className="card">
            <div className="card-body p-4">
              {currentQuestion ? (
                <QuizQuestion
                  question={currentQuestion}
                  selectedAnswer={selectedAnswer}
                  isAnswered={isAnswered}
                  onAnswerSelect={onAnswerSelect}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={questions.length}
                  lastAnswerFeedback={lastAnswerFeedback}
                />
              ) : (
                <div className="text-center text-muted">
                  <i className="bi bi-hourglass-split fs-1 mb-3 d-block"></i>
                  <p>Loading question...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
