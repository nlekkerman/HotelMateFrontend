import React from 'react';

export default function CategoryTransition({ 
  currentCategory, 
  nextCategory, 
  categoryNumber, 
  totalCategories,
  score 
}) {
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="card text-center">
            <div className="card-body py-5">
              {/* Completion Icon */}
              <div className="mb-4">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
              </div>
              
              {/* Category Complete */}
              <div className="mb-4">
                <h4 className="text-success">Category Complete!</h4>
                <h5 className="text-muted">{currentCategory?.name}</h5>
              </div>
              
              {/* Progress */}
              <div className="mb-4">
                <div className="badge bg-primary mb-2">
                  Category {categoryNumber} of {totalCategories} Complete
                </div>
                <h3 className="text-primary">Current Score: {score}</h3>
              </div>
              
              {/* Next Category */}
              {nextCategory && (
                <div className="mt-4">
                  <h5 className="mb-3">Up Next:</h5>
                  <div className="card bg-light">
                    <div className="card-body">
                      <h4 className="mb-2">{nextCategory.name}</h4>
                      <p className="text-muted mb-0">{nextCategory.description}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading Animation */}
              <div className="mt-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading next category...</span>
                </div>
                <p className="text-muted mt-2">Get ready for the next challenge!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
