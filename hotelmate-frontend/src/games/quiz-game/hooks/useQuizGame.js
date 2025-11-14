import { useState, useEffect, useCallback, useRef } from 'react';
import { quizGameAPI } from '@/services/quizGameAPI';
import useQuizAudio from './useQuizAudio';

/**
 * New Quiz Game Hook - Matches Backend API
 * Complete game flow: start_session -> 50 questions across 5 categories -> complete_session
 */
export default function useQuizGame(playerName, isTournamentMode = false, tournamentSlug = null) {
  // Session state
  const [session, setSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // Category progression
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentCategory, setCurrentCategory] = useState(null);
  
  // Question state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5); // Always 5 seconds per question
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState(null);
  
  // Score and progress
  const [score, setScore] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [isTurboActive, setIsTurboActive] = useState(false);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  
  // Game state
  const [gameState, setGameState] = useState('initializing'); // 'initializing' | 'playing' | 'category-transition' | 'finished'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isResumed, setIsResumed] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(null);
  
  // Audio
  const { playCorrect, playWrong, playTimeout, playFinish } = useQuizAudio();

  // Initialize game session
  useEffect(() => {
    if (playerName) {
      initializeGame();
    }
  }, [playerName, isTournamentMode, tournamentSlug]);

  const initializeGame = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎮 Starting quiz session...');
      
      // Start session - returns first category and questions
      // If session already exists with this token, backend returns existing session (resumed=true)
      const sessionData = await quizGameAPI.startSession(
        playerName,
        isTournamentMode,
        tournamentSlug
      );
      
      const sessionResumed = sessionData.resumed === true;
      setIsResumed(sessionResumed);
      
      if (sessionResumed) {
        console.log('📂 Resuming existing session:', sessionData.session);
        
        // Resume existing session state
        setSession(sessionData.session);
        setSessionId(sessionData.session.id);
        setScore(sessionData.session.score);
        setConsecutiveCorrect(sessionData.session.consecutive_correct);
        setIsTurboActive(sessionData.session.is_turbo_active);
        
        // Resume from current position
        const resumeCategoryIndex = sessionData.session.current_category_index || 0;
        const resumeQuestionIndex = sessionData.session.current_question_index || 0;
        
        setCurrentCategory(sessionData.current_category);
        setCategories([sessionData.current_category]);
        setCurrentCategoryIndex(resumeCategoryIndex);
        
        // Set up questions with shuffled answers
        const questionsWithShuffledAnswers = sessionData.questions.map(q => ({
          ...q,
          answers: quizGameAPI.shuffleArray(q.answers)
        }));
        setQuestions(questionsWithShuffledAnswers);
        setCurrentQuestionIndex(resumeQuestionIndex);
        setCurrentQuestion(questionsWithShuffledAnswers[resumeQuestionIndex]);
        
        // Calculate total questions answered so far
        setTotalQuestionsAnswered((resumeCategoryIndex * 10) + resumeQuestionIndex);
        
        console.log(`📍 Resuming at Category ${resumeCategoryIndex + 1}, Question ${resumeQuestionIndex + 1}`);
      } else {
        console.log('✅ New session started:', sessionData.session);
        
        // New session - start from beginning
        setSession(sessionData.session);
        setSessionId(sessionData.session.id);
        setScore(sessionData.session.score);
        setConsecutiveCorrect(sessionData.session.consecutive_correct);
        setIsTurboActive(sessionData.session.is_turbo_active);
        
        // Set up categories
        setCurrentCategory(sessionData.current_category);
        setCategories([sessionData.current_category]);
        setCurrentCategoryIndex(0);
        
        // Set up questions with shuffled answers
        const questionsWithShuffledAnswers = sessionData.questions.map(q => ({
          ...q,
          answers: quizGameAPI.shuffleArray(q.answers)
        }));
        setQuestions(questionsWithShuffledAnswers);
        setCurrentQuestionIndex(0);
        setCurrentQuestion(questionsWithShuffledAnswers[0]);
        setTotalQuestionsAnswered(0);
      }
      
      // Start playing
      setGameState('playing');
      setTimeLeft(5);
      questionStartTimeRef.current = Date.now();
      startTimer();
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to initialize quiz:', err);
      setError(err.message || 'Failed to start quiz');
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = async () => {
    if (isAnswered) return;

    console.log('⏰ Time\'s up!');
    setIsAnswered(true);
    playTimeout();
    
    const timeTaken = 5; // Timeout = 5 seconds
    
    // Submit timeout as null answer
    const result = await submitAnswer(null, null, timeTaken);
    
    if (result) {
      updateGameState(result, null);
    }
    
    // Move to next question after delay
    setTimeout(() => {
      moveToNextQuestion();
    }, 2500);
  };

  const handleAnswerSelect = async (answer) => {
    if (isAnswered) return;

    console.log('📝 Answer selected:', answer);
    clearInterval(timerRef.current);
    setIsAnswered(true);
    setSelectedAnswer(answer);

    // Calculate time taken (ensure it's between 1-5 seconds)
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    const timeTaken = Math.max(1, Math.min(5, elapsed));
    
    // Submit answer
    const result = await submitAnswer(answer, answer.id, timeTaken);
    
    if (result) {
      const isCorrect = result.submission.is_correct;
      updateGameState(result, answer);
      
      // Play sound
      if (isCorrect) {
        playCorrect();
      } else {
        playWrong();
      }
    }
    
    // Move to next question after delay
    setTimeout(() => {
      moveToNextQuestion();
    }, 2500);
  };

  const submitAnswer = async (answer, answerId, timeTaken) => {
    if (!sessionId || !currentQuestion || !currentCategory) {
      console.error('❌ Cannot submit: missing session, question, or category');
      return null;
    }

    try {
      const result = await quizGameAPI.submitAnswer(
        sessionId,
        currentCategory.slug,
        currentQuestion,
        answer,
        answerId,
        timeTaken
      );
      
      console.log('✅ Answer submitted:', result);
      return result;
    } catch (err) {
      console.error('❌ Failed to submit answer:', err);
      return null;
    }
  };

  const updateGameState = (result, submittedAnswer = null) => {
    const { submission, session_updated } = result;
    
    // Track previous turbo state to detect mode change
    const wasTurboActive = isTurboActive;
    
    // Update session state
    setScore(session_updated.score);
    setConsecutiveCorrect(session_updated.consecutive_correct);
    setIsTurboActive(session_updated.is_turbo_active);
    
    // Find correct answer from current question
    let correctAnswerText = 'Unknown';
    if (!submission.is_correct && currentQuestion) {
      // For math questions, use question_data
      if (currentQuestion.question_data) {
        correctAnswerText = currentQuestion.question_data.correct_answer.toString();
      } else {
        // For regular questions, the first answer in the original order is correct
        // Since we shuffled, we need to check which answer is actually correct
        // The backend should ideally return this, but for now we'll use question_data or first answer
        const firstAnswer = currentQuestion.answers.find(a => a.order === 0);
        correctAnswerText = firstAnswer?.text || 'Unknown';
      }
    }
    
    // Calculate scoring details
    const wasInTurbo = submission.was_turbo_active;
    const multiplier = wasInTurbo ? 2 : 1;
    const basePoints = submission.points_awarded / multiplier;
    
    // Detect streak changes
    const streakBroken = wasTurboActive && !session_updated.is_turbo_active;
    const turboActivated = !wasTurboActive && session_updated.is_turbo_active;
    
    // Update answer feedback with complete details
    setLastAnswerFeedback({
      isCorrect: submission.is_correct,
      timeout: submission.time_taken_seconds >= 5 && !submission.is_correct,
      timeTaken: submission.time_taken_seconds,
      pointsAwarded: submission.points_awarded,
      basePoints: Math.round(basePoints),
      multiplierUsed: multiplier,
      correctAnswer: correctAnswerText,
      selectedAnswer: submittedAnswer?.text || submittedAnswer || 'No answer',
      streakBroken,
      turboActivated
    });
  };

  const moveToNextQuestion = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    setLastAnswerFeedback(null);
    setTotalQuestionsAnswered(prev => prev + 1);

    // Check if more questions in current category
    if (currentQuestionIndex < questions.length - 1) {
      // Next question in current category
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setTimeLeft(5);
      questionStartTimeRef.current = Date.now();
      startTimer();
    } else {
      // Finished current category - check if more categories
      checkForNextCategory();
    }
  };

  const checkForNextCategory = async () => {
    const totalQuestionsCompleted = (currentCategoryIndex + 1) * 10;
    
    if (totalQuestionsCompleted >= 50) {
      // All 50 questions done - finish game
      finishGame();
    } else {
      // Load next category
      setGameState('category-transition');
      setTimeout(async () => {
        await loadNextCategory();
      }, 2000);
    }
  };

  const loadNextCategory = async () => {
    try {
      setLoading(true);
      
      // Get all categories to determine order and next category
      const allCategories = await quizGameAPI.getCategories();
      
      // Filter active categories and sort by order
      const activeCategories = allCategories
        .filter(cat => cat.is_active)
        .sort((a, b) => a.order - b.order);
      
      const nextCategoryIndex = currentCategoryIndex + 1;
      
      if (nextCategoryIndex < activeCategories.length && nextCategoryIndex < 5) {
        const nextCategory = activeCategories[nextCategoryIndex];
        
        console.log(`📚 Loading category ${nextCategoryIndex + 1}/5: ${nextCategory.name}`);
        
        // Fetch category detail which should include questions
        const categoryDetail = await quizGameAPI.getCategoryDetail(nextCategory.slug);
        
        // Generate questions based on category type
        let newQuestions = [];
        
        if (categoryDetail.is_math_category) {
          // Generate 10 math questions
          newQuestions = generateMathQuestions(10);
        } else if (categoryDetail.questions && categoryDetail.questions.length > 0) {
          // Use pre-defined questions from backend
          newQuestions = categoryDetail.questions
            .slice(0, 10)
            .map(q => ({
              ...q,
              category_slug: nextCategory.slug,
              answers: quizGameAPI.shuffleArray(q.answers)
            }));
        } else {
          console.error('❌ No questions available for category:', nextCategory.name);
          throw new Error(`No questions available for ${nextCategory.name}`);
        }
        
        if (newQuestions.length === 0) {
          throw new Error('Failed to load questions for next category');
        }
        
        // Update state with next category
        setCurrentCategory(nextCategory);
        setCategories(prev => [...prev, nextCategory]);
        setCurrentCategoryIndex(nextCategoryIndex);
        setQuestions(newQuestions);
        setCurrentQuestionIndex(0);
        setCurrentQuestion(newQuestions[0]);
        
        // Start playing next category
        setGameState('playing');
        setTimeLeft(5);
        questionStartTimeRef.current = Date.now();
        startTimer();
      } else {
        // No more categories - game complete
        console.log('🏁 All categories completed!');
        finishGame();
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to load next category:', err);
      setError(err.message || 'Failed to load next category');
      setLoading(false);
    }
  };

  // Generate math questions for dynamic math category
  const generateMathQuestions = (count) => {
    const questions = [];
    const operators = ['+', '-', '*', '/'];
    
    for (let i = 0; i < count; i++) {
      const operator = operators[Math.floor(Math.random() * operators.length)];
      let num1, num2, correctAnswer;
      
      switch (operator) {
        case '+':
          num1 = Math.floor(Math.random() * 50) + 1;
          num2 = Math.floor(Math.random() * 50) + 1;
          correctAnswer = num1 + num2;
          break;
        case '-':
          num1 = Math.floor(Math.random() * 50) + 20;
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
          correctAnswer = num1 - num2;
          break;
        case '*':
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          correctAnswer = num1 * num2;
          break;
        case '/':
          num2 = Math.floor(Math.random() * 12) + 1;
          correctAnswer = Math.floor(Math.random() * 12) + 1;
          num1 = num2 * correctAnswer;
          break;
      }
      
      // Generate 3 wrong answers
      const wrongAnswers = new Set();
      while (wrongAnswers.size < 3) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const wrong = correctAnswer + offset;
        if (wrong !== correctAnswer && wrong > 0) {
          wrongAnswers.add(wrong);
        }
      }
      
      const allAnswers = [
        { id: 1, text: correctAnswer.toString(), order: 0 },
        { id: 2, text: Array.from(wrongAnswers)[0].toString(), order: 1 },
        { id: 3, text: Array.from(wrongAnswers)[1].toString(), order: 2 },
        { id: 4, text: Array.from(wrongAnswers)[2].toString(), order: 3 }
      ];
      
      questions.push({
        id: null,
        category_slug: 'dynamic-math',
        text: `${num1} ${operator} ${num2} = ?`,
        image_url: null,
        answers: quizGameAPI.shuffleArray(allAnswers),
        question_data: {
          num1,
          num2,
          operator,
          correct_answer: correctAnswer
        }
      });
    }
    
    return questions;
  };

  const finishGame = async () => {
    console.log('🏁 Finishing game...');
    clearInterval(timerRef.current);
    setGameState('finished');
    playFinish();

    if (sessionId) {
      try {
        const result = await quizGameAPI.completeSession(sessionId);
        console.log('✅ Session completed:', result);
        
        if (result.session) {
          setSession(result.session);
          setScore(result.session.score);
        }
      } catch (err) {
        console.error('❌ Failed to complete session:', err);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    // Session
    session,
    sessionId,
    isResumed,
    
    // Progress
    currentCategory,
    currentCategoryIndex,
    totalCategories: 5, // Always 5 categories
    questionsPerCategory: 10, // Always 10 questions per category
    totalQuestions: 50, // Always 50 total
    totalQuestionsAnswered,
    
    // Current question
    currentQuestion,
    currentQuestionIndex,
    questions,
    
    // Answer state
    selectedAnswer,
    isAnswered,
    lastAnswerFeedback,
    timeLeft,
    
    // Score
    score,
    consecutiveCorrect,
    isTurboActive,
    
    // Game state
    gameState,
    loading,
    error,
    
    // Actions
    handleAnswerSelect,
    handleTimeout
  };
}
