import React from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';

export default function QuizCategoryCard({ category, onClick }) {
  return (
    <div
      className="card h-100 quiz-category-card"
      onClick={() => onClick(category)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div className="card-body text-center">
        <i className="bi bi-collection fs-1 mb-3 text-primary"></i>
        <h5 className="card-title">{category.name}</h5>
        {category.description && (
          <p className="card-text text-muted small">{category.description}</p>
        )}
      </div>
    </div>
  );
}
