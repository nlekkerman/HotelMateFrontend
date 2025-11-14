import api from "./api";
import { v4 as uuidv4 } from 'uuid';

class QuizGameAPI {
  constructor() {
    // Note: api.js already has /api/ in baseURL, so we just need 'entertainment'
    this.baseURL = 'entertainment';
  }

  // ============================================
  // SESSION TOKEN MANAGEMENT
  // ============================================
  
  getSessionToken() {
    let token = localStorage.getItem('quiz_session_token');
    if (!token) {
      token = uuidv4();
      localStorage.setItem('quiz_session_token', token);
    }
    return token;
  }

  generateNewSessionToken() {
    const token = uuidv4();
    localStorage.setItem('quiz_session_token', token);
    console.log('🔄 Generated new session token:', token);
    return token;
  }

  clearSessionToken() {
    localStorage.removeItem('quiz_session_token');
    console.log('🗑️ Cleared session token');
  }

  // ============================================
  // QUIZZES (NEW API)
  // ============================================
  
  async getQuizzes() {
    try {
      const response = await api.get(`${this.baseURL}/quizzes/`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch quizzes:', error);
      throw error;
    }
  }

  async getQuizDetail(slug) {
    try {
      const response = await api.get(`${this.baseURL}/quizzes/${slug}/`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch quiz ${slug}:`, error);
      throw error;
    }
  }

  // ============================================
  // QUIZ CATEGORIES (NEW API)
  // ============================================
  
  async getCategories() {
    try {
      const response = await api.get(`${this.baseURL}/quiz-categories/`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch quiz categories:', error);
      throw error;
    }
  }

  async getCategoryDetail(slug) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-categories/${slug}/`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch category ${slug}:`, error);
      throw error;
    }
  }

  // ============================================
  // GAME SESSION FLOW (NEW API)
  // ============================================
  
  async startSession(playerName, isTournamentMode = false, tournamentSlug = null) {
    try {
      const sessionToken = this.getSessionToken();
      
      const sessionData = {
        player_name: playerName,
        session_token: sessionToken,
        is_tournament_mode: isTournamentMode,
        tournament_slug: tournamentSlug
      };
      
      const response = await api.post(`${this.baseURL}/quiz/game/start_session/`, sessionData);
      console.log('✅ Quiz session started:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to start quiz session:', error);
      throw error;
    }
  }

  async submitAnswer(sessionId, categorySlug, question, selectedAnswer, selectedAnswerId, timeTaken) {
    try {
      const answerData = {
        session_id: sessionId,
        category_slug: categorySlug,
        question_text: question.text,
        selected_answer: selectedAnswer?.text || null,
        time_taken_seconds: timeTaken
      };
      
      // Add question_id for regular questions
      if (question.id) {
        answerData.question_id = question.id;
        answerData.selected_answer_id = selectedAnswerId;
      }
      
      // Add question_data for math questions
      if (question.question_data) {
        answerData.question_data = question.question_data;
      }
      
      const response = await api.post(
        `${this.baseURL}/quiz/game/submit_answer/`,
        answerData
      );
      
      console.log('✅ Answer submitted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      throw error;
    }
  }

  async completeSession(sessionId) {
    try {
      const response = await api.post(`${this.baseURL}/quiz/game/complete_session/`, {
        session_id: sessionId
      });
      console.log('✅ Quiz session completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to complete session:', error);
      throw error;
    }
  }

  // ============================================
  // TOURNAMENTS (NEW API)
  // ============================================
  
  async getTournaments() {
    try {
      const response = await api.get(`${this.baseURL}/quiz-tournaments/`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch tournaments:', error);
      return [];
    }
  }

  async getTournamentDetail(slug) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-tournaments/${slug}/`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch tournament ${slug}:`, error);
      throw error;
    }
  }

  async getTournamentLeaderboard(slug) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-tournaments/${slug}/leaderboard/`);
      return response.data || [];
    } catch (error) {
      console.error(`❌ Failed to fetch tournament leaderboard for ${slug}:`, error);
      return [];
    }
  }

  // ============================================
  // LEADERBOARDS (NEW API)
  // ============================================
  
  async getAllTimeLeaderboard(limit = 10) {
    try {
      const response = await api.get(`${this.baseURL}/quiz/leaderboard/all-time/`, {
        params: { limit }
      });
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch all-time leaderboard:', error);
      return [];
    }
  }

  async getPlayerStats(sessionToken = null) {
    try {
      const token = sessionToken || this.getSessionToken();
      const response = await api.get(`${this.baseURL}/quiz/leaderboard/player-stats/`, {
        params: { session_token: token }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch player stats:', error);
      return null;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  formatTime(seconds) {
    if (!seconds && seconds !== 0) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ============================================
  // URL PARSING
  // ============================================
  
  parseTournamentFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tournament');
  }
}

// Create and export singleton instance
export const quizGameAPI = new QuizGameAPI();

export default quizGameAPI;
