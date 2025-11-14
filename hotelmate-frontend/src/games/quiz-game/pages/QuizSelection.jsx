import React, { useState, useEffect } from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';
import QuizCategoryCard from '../components/QuizCategoryCard';
import QuizCard from '../components/QuizCard';

export default function QuizSelection({ onQuizSelect }) {
  const [categories, setCategories] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('categories'); // 'categories' | 'quizzes'

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await quizGameAPI.getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError('Failed to load quiz categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    try {
      setLoading(true);
      setSelectedCategory(category);
      const data = await quizGameAPI.getQuizzes(category.id);
      setQuizzes(data);
      setView('quizzes');
      setError(null);
    } catch (err) {
      setError('Failed to load quizzes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'quizzes') {
      setView('categories');
      setSelectedCategory(null);
      setQuizzes([]);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
        <button className="btn btn-primary" onClick={loadCategories}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {view === 'categories' && 'Select Quiz Category'}
          {view === 'quizzes' && selectedCategory?.name}
        </h2>
        {view === 'quizzes' && (
          <button className="btn btn-outline-secondary" onClick={handleBack}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Categories
          </button>
        )}
      </div>

      {/* Categories View */}
      {view === 'categories' && (
        <div className="row g-4">
          {categories.length === 0 ? (
            <div className="col-12 text-center text-muted">
              <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
              <p>No quiz categories available yet.</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="col-md-4 col-lg-3">
                <QuizCategoryCard 
                  category={category} 
                  onClick={handleCategorySelect} 
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Quizzes View */}
      {view === 'quizzes' && (
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="col-12 text-center text-muted">
              <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
              <p>No quizzes available in this category.</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="col-md-6 col-lg-4">
                <QuizCard 
                  quiz={quiz} 
                  onClick={onQuizSelect} 
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
