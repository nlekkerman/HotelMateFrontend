import { useState, useCallback, useEffect } from 'react';
import quizGameAPI from '@/services/quizGameAPI';

export default function useQuizSession() {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Initialize quiz session from start screen data
  const initializeSession = useCallback((quizData) => {
    if (quizData && quizData.session && quizData.questions) {
      setSession(quizData.session);
      setQuestions(quizData.questions);
      setCategories(quizData.categories || []);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setQuizStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setError(null);
      
      // Store session ID in localStorage for recovery
      localStorage.setItem('current_quiz_session', JSON.stringify({
        sessionId: quizData.session.id,
        startTime: Date.now()
      }));
    }
  }, []);

  // Load existing session (for recovery after refresh)
  const loadExistingSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      const sessionData = await quizGameAPI.getSessionDetail(sessionId);
      setSession(sessionData);
      setAnswers(sessionData.answers || []);
      setCurrentQuestionIndex(sessionData.current_question_index || 0);
      
      // Note: Questions aren't stored in session detail, would need to fetch again
      // For now, we'll just show error and force new quiz
      throw new Error('Session recovery not fully supported. Please start a new quiz.');
    } catch (err) {
      setError(err.message || 'Failed to load session');
      localStorage.removeItem('current_quiz_session');
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit answer for current question
  const submitAnswer = useCallback(async (selectedAnswer) => {
    if (!session || !questions[currentQuestionIndex]) {
      setError('No active question');
      return null;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const timeSeconds = questionStartTime 
      ? Math.floor((Date.now() - questionStartTime) / 1000)
      : null;

    try {
      setLoading(true);
      setError(null);

      const result = await quizGameAPI.submitAnswer(
        session.id,
        currentQuestion.id,
        selectedAnswer,
        timeSeconds
      );

      // Store answer locally
      setAnswers(prev => [...prev, result]);

      // Reset question timer for next question
      setQuestionStartTime(Date.now());

      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to submit answer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, questions, currentQuestionIndex, questionStartTime]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
      return true;
    }
    return false;
  }, [currentQuestionIndex, questions.length]);

  // Move to previous question (for review)
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      return true;
    }
    return false;
  }, [currentQuestionIndex]);

  // Complete the quiz session
  const completeSession = useCallback(async () => {
    if (!session) {
      setError('No active session');
      return null;
    }

    const totalTimeSeconds = quizStartTime 
      ? Math.floor((Date.now() - quizStartTime) / 1000)
      : null;

    try {
      setLoading(true);
      setError(null);

      const completedSession = await quizGameAPI.completeSession(
        session.id,
        totalTimeSeconds
      );

      // Clear stored session
      localStorage.removeItem('current_quiz_session');

      return completedSession;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to complete session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, quizStartTime]);

  // Reset session for new quiz
  const resetSession = useCallback(() => {
    setSession(null);
    setQuestions([]);
    setCategories([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setQuizStartTime(null);
    setQuestionStartTime(null);
    setError(null);
    localStorage.removeItem('current_quiz_session');
  }, []);

  // Get current question
  const currentQuestion = questions[currentQuestionIndex] || null;

  // Check if quiz is complete
  const isQuizComplete = currentQuestionIndex >= questions.length - 1 && answers.length === questions.length;

  // Get progress percentage
  const progressPercentage = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;

  // Get time elapsed for current question
  const currentQuestionTime = questionStartTime 
    ? Math.floor((Date.now() - questionStartTime) / 1000)
    : 0;

  // Get total quiz time
  const totalQuizTime = quizStartTime 
    ? Math.floor((Date.now() - quizStartTime) / 1000)
    : 0;

  return {
    // State
    session,
    questions,
    categories,
    currentQuestion,
    currentQuestionIndex,
    answers,
    loading,
    error,
    isQuizComplete,
    progressPercentage,
    currentQuestionTime,
    totalQuizTime,

    // Actions
    initializeSession,
    loadExistingSession,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    completeSession,
    resetSession,
    setError
  };
}
