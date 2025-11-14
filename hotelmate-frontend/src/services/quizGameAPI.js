import api from "./api";

class QuizGameAPI {
  constructor() {
    this.baseURL = 'entertainment';
  }

  // Player Token Management
  generatePlayerToken() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getPlayerToken() {
    let token = localStorage.getItem('quiz_player_token');
    if (!token) {
      token = this.generatePlayerToken();
      localStorage.setItem('quiz_player_token', token);
    }
    return token;
  }

  clearPlayerToken() {
    localStorage.removeItem('quiz_player_token');
  }

  // Player Name Management
  getPlayerName() {
    return localStorage.getItem('quiz_player_name') || null;
  }

  savePlayerName(name) {
    if (name && name.trim()) {
      localStorage.setItem('quiz_player_name', name.trim());
      return true;
    }
    return false;
  }

  clearPlayerName() {
    localStorage.removeItem('quiz_player_name');
  }

  formatPlayerName(username) {
    const token = this.getPlayerToken();
    return `${username}|${token}`;
  }

  // Quiz Categories
  async getCategories() {
    try {
      const response = await api.get(`${this.baseURL}/quiz-categories/`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch quiz categories:', error);
      throw error;
    }
  }

  async getCategoryDetail(id) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-categories/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch category ${id}:`, error);
      throw error;
    }
  }

  async getRandomCategories(count = 5) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-categories/random_selection/`, {
        params: { count }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch random categories:', error);
      throw error;
    }
  }

  // Quiz Questions
  async getQuestions(categoryId = null, difficulty = null) {
    try {
      const params = {};
      if (categoryId) params.category = categoryId;
      if (difficulty) params.difficulty = difficulty;
      
      const response = await api.get(`${this.baseURL}/quiz-questions/`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      throw error;
    }
  }

  async getQuestionDetail(id) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-questions/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch question ${id}:`, error);
      throw error;
    }
  }

  // Quiz Sessions
  async startQuiz(username, hotelId = null, tournamentId = null, questionsPerQuiz = 20) {
    try {
      const playerName = this.formatPlayerName(username);
      const requestData = {
        player_name: playerName,
        questions_per_quiz: questionsPerQuiz
      };

      if (hotelId) requestData.hotel = hotelId;
      if (tournamentId) requestData.tournament = tournamentId;

      const response = await api.post(`${this.baseURL}/quiz-sessions/start_quiz/`, requestData);
      
      if (response.data.session) {
        localStorage.setItem('quiz_session_id', response.data.session.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to start quiz:', error);
      throw error;
    }
  }

  async submitAnswer(sessionId, questionId, selectedAnswer, timeSeconds = null) {
    try {
      const requestData = {
        question_id: questionId,
        selected_answer: selectedAnswer
      };

      if (timeSeconds !== null) requestData.time_seconds = timeSeconds;

      const response = await api.post(
        `${this.baseURL}/quiz-sessions/${sessionId}/submit_answer/`,
        requestData
      );
      return response.data;
    } catch (error) {
      console.error('Failed to submit answer:', error);
      throw error;
    }
  }

  async completeSession(sessionId, timeSeconds = null) {
    try {
      const requestData = {};
      if (timeSeconds !== null) requestData.time_seconds = timeSeconds;

      const response = await api.post(
        `${this.baseURL}/quiz-sessions/${sessionId}/complete_session/`,
        requestData
      );
      
      localStorage.removeItem('quiz_session_id');
      return response.data;
    } catch (error) {
      console.error('Failed to complete session:', error);
      throw error;
    }
  }

  async getSessions(playerToken = null, tournamentId = null) {
    try {
      const params = {};
      if (playerToken) params.player_token = playerToken;
      if (tournamentId) params.tournament = tournamentId;

      const response = await api.get(`${this.baseURL}/quiz-sessions/`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      throw error;
    }
  }

  async getSessionDetail(sessionId) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-sessions/${sessionId}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch session ${sessionId}:`, error);
      throw error;
    }
  }

  // Leaderboard
  async getLeaderboard() {
    try {
      const response = await api.get(`${this.baseURL}/quiz-leaderboard/`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }

  async getMyRank(playerToken = null) {
    try {
      const token = playerToken || this.getPlayerToken();
      const response = await api.get(`${this.baseURL}/quiz-leaderboard/my_rank/`, {
        params: { player_token: token }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch player rank:', error);
      return null;
    }
  }

  // Tournaments
  async getTournaments(status = null, hotelId = null) {
    try {
      const params = {};
      if (status) params.status = status;
      if (hotelId) params.hotel = hotelId;

      const response = await api.get(`${this.baseURL}/quiz-tournaments/`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      return [];
    }
  }

  async getTournamentDetail(tournamentId) {
    try {
      const response = await api.get(`${this.baseURL}/quiz-tournaments/${tournamentId}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  async getTournamentLeaderboard(tournamentId, limit = null) {
    try {
      const params = {};
      if (limit) params.limit = limit;

      const response = await api.get(
        `${this.baseURL}/quiz-tournaments/${tournamentId}/leaderboard/`,
        { params }
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch tournament leaderboard for ${tournamentId}:`, error);
      return [];
    }
  }

  async getTournamentTopPlayers(tournamentId) {
    try {
      const response = await api.get(
        `${this.baseURL}/quiz-tournaments/${tournamentId}/top_players/`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch tournament top players for ${tournamentId}:`, error);
      throw error;
    }
  }

  // Utility Methods
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
}

export const quizGameAPI = new QuizGameAPI();
export default quizGameAPI;
