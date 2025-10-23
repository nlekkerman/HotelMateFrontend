import api from "./api";

class MemoryGameAPI {
  constructor() {
    this.baseURL = '/entertainment';
    this.pendingSessions = this.loadPendingSessions();
  }

  // Score calculation function (matches backend logic)
  calculateScore(difficulty, timeSeconds, movesCount) {
    const multipliers = { easy: 1.0, intermediate: 1.5, hard: 2.0 };
    const optimalMoves = { easy: 32, intermediate: 72, hard: 128 };
    
    const baseScore = multipliers[difficulty] * 1000;
    const timePenalty = timeSeconds * 2;
    const movesPenalty = Math.max(0, movesCount - optimalMoves[difficulty]) * 5;
    
    return Math.max(0, Math.floor(baseScore - timePenalty - movesPenalty));
  }

  // Game Session Management
  async saveGameSession(gameData) {
    try {
      const response = await api.post(`${this.baseURL}/memory-sessions/`, gameData);
      
      // If successful, try to sync any pending sessions
      this.syncPendingSessions();
      
      return response.data;
    } catch (error) {
      console.error('Failed to save game session:', error);
      
      // Fallback to localStorage if API fails
      this.savePendingSession(gameData);
      throw new Error('Game saved locally. Will sync when online.');
    }
  }

  async getUserStats() {
    try {
      const response = await api.get(`${this.baseURL}/memory-sessions/my-stats/`);
      return response.data;
    } catch (error) {
      console.error('Failed to load user stats:', error);
      return this.getLocalStats();
    }
  }

  async getUserGameHistory(difficulty = null, limit = 10) {
    try {
      const params = { limit };
      if (difficulty) params.difficulty = difficulty;
      
      const response = await api.get(`${this.baseURL}/memory-sessions/`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to load game history:', error);
      return [];
    }
  }

  async getLeaderboard(difficulty = 'easy', limit = 10) {
    try {
      const response = await api.get(`${this.baseURL}/memory-sessions/leaderboard/`, {
        params: { difficulty, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      return [];
    }
  }

  // Tournament Management
  async getTournaments(status = 'active') {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/`, {
        params: { status }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      return [];
    }
  }

  async getTournamentDetail(tournamentId) {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to load tournament details:', error);
      return null;
    }
  }

  async registerForTournament(tournamentId, participantData) {
    const response = await api.post(`${this.baseURL}/tournaments/${tournamentId}/register/`, participantData);
    return response.data;
  }

  async getTournamentLeaderboard(tournamentId, limit = 20) {
    const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/leaderboard/`, {
      params: { limit }
    });
    return response.data;
  }

  async getTournamentParticipants(tournamentId) {
    const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/participants/`);
    return response.data;
  }

  // Achievement System
  async getAchievements() {
    try {
      const response = await api.get(`${this.baseURL}/achievements/`);
      return response.data;
    } catch (error) {
      console.error('Failed to load achievements:', error);
      return [];
    }
  }

  async getUserAchievements() {
    try {
      const response = await api.get(`${this.baseURL}/achievements/my-achievements/`);
      return response.data;
    } catch (error) {
      console.error('Failed to load user achievements:', error);
      return [];
    }
  }

  // Offline Support Methods
  savePendingSession(gameData) {
    this.pendingSessions.push({ 
      ...gameData, 
      timestamp: Date.now(),
      localScore: this.calculateScore(gameData.difficulty, gameData.time_seconds, gameData.moves_count)
    });
    localStorage.setItem('pendingMemoryGameSessions', JSON.stringify(this.pendingSessions));
  }

  loadPendingSessions() {
    try {
      return JSON.parse(localStorage.getItem('pendingMemoryGameSessions') || '[]');
    } catch {
      return [];
    }
  }

  async syncPendingSessions() {
    if (!navigator.onLine || this.pendingSessions.length === 0) return 0;
    
    const successfulSyncs = [];
    
    for (const session of this.pendingSessions) {
      try {
        // Remove timestamp and localScore before sending to API
        const { timestamp, localScore, ...sessionData } = session;
        await api.post(`${this.baseURL}/memory-sessions/`, sessionData);
        successfulSyncs.push(session);
      } catch (error) {
        console.error('Failed to sync session:', error);
        break; // Stop syncing if one fails
      }
    }
    
    // Remove successfully synced sessions
    this.pendingSessions = this.pendingSessions.filter(
      session => !successfulSyncs.includes(session)
    );
    localStorage.setItem('pendingMemoryGameSessions', JSON.stringify(this.pendingSessions));
    
    if (successfulSyncs.length > 0) {
      console.log(`Successfully synced ${successfulSyncs.length} pending game sessions`);
    }
    
    return successfulSyncs.length;
  }

  // Local stats fallback for offline mode
  getLocalStats() {
    const pendingSessions = this.loadPendingSessions();
    const oldLocalGames = JSON.parse(localStorage.getItem('memoryGameScores') || '[]');
    
    // Combine old localStorage data with pending sessions
    const allGames = [...oldLocalGames, ...pendingSessions];
    
    if (allGames.length === 0) {
      return {
        total_games: 0,
        total_score: 0,
        total_time_played: 0,
        average_moves_per_game: 0,
        best_time_easy: null,
        best_time_intermediate: null,
        best_time_hard: null,
        best_score_easy: 0,
        best_score_intermediate: 0,
        best_score_hard: 0
      };
    }

    const stats = {
      total_games: allGames.length,
      total_score: allGames.reduce((sum, game) => sum + (game.localScore || game.score || 0), 0),
      total_time_played: allGames.reduce((sum, game) => sum + (game.time_seconds || game.timeSeconds || 0), 0),
      average_moves_per_game: allGames.reduce((sum, game) => sum + (game.moves_count || game.moves || 0), 0) / allGames.length,
      best_time_easy: null,
      best_time_intermediate: null,
      best_time_hard: null,
      best_score_easy: 0,
      best_score_intermediate: 0,
      best_score_hard: 0
    };

    // Calculate best times and scores per difficulty
    allGames.forEach(game => {
      const difficulty = game.difficulty;
      const time = game.time_seconds || game.timeSeconds;
      const score = game.localScore || game.score || 0;

      if (difficulty === 'easy') {
        if (!stats.best_time_easy || time < stats.best_time_easy) {
          stats.best_time_easy = time;
        }
        if (score > stats.best_score_easy) {
          stats.best_score_easy = score;
        }
      } else if (difficulty === 'intermediate') {
        if (!stats.best_time_intermediate || time < stats.best_time_intermediate) {
          stats.best_time_intermediate = time;
        }
        if (score > stats.best_score_intermediate) {
          stats.best_score_intermediate = score;
        }
      } else if (difficulty === 'hard') {
        if (!stats.best_time_hard || time < stats.best_time_hard) {
          stats.best_time_hard = time;
        }
        if (score > stats.best_score_hard) {
          stats.best_score_hard = score;
        }
      }
    });

    return stats;
  }

  // Migrate old localStorage data
  async migrateLocalStorageData() {
    const oldGames = JSON.parse(localStorage.getItem('memoryGameScores') || '[]');
    
    if (oldGames.length === 0) return 0;
    
    let migratedCount = 0;
    
    for (const game of oldGames) {
      try {
        // Convert old format to new format
        const gameData = {
          difficulty: game.difficulty,
          time_seconds: game.timeSeconds || game.time_seconds,
          moves_count: game.moves || game.moves_count,
          completed: true
        };
        
        await this.saveGameSession(gameData);
        migratedCount++;
      } catch (error) {
        console.error('Failed to migrate game:', error);
        // Add to pending sessions instead
        this.savePendingSession(gameData);
      }
    }
    
    if (migratedCount > 0) {
      // Clear old localStorage data after successful migration
      localStorage.removeItem('memoryGameScores');
      console.log(`Successfully migrated ${migratedCount} games from localStorage`);
    }
    
    return migratedCount;
  }

  // Network status monitoring
  setupOfflineSupport() {
    window.addEventListener('online', () => {
      console.log('Back online, syncing pending sessions...');
      this.syncPendingSessions();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline, games will be saved locally');
    });
  }

  // Helper methods
  formatTime(seconds) {
    if (!seconds) return '--';
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

  getDifficultyMultiplier(difficulty) {
    const multipliers = { easy: 1.0, intermediate: 1.5, hard: 2.0 };
    return multipliers[difficulty] || 1.0;
  }

  getDifficultyDisplay(difficulty) {
    const displays = {
      easy: 'Easy (4x4)',
      intermediate: 'Intermediate (6x6)', 
      hard: 'Hard (8x8)'
    };
    return displays[difficulty] || difficulty;
  }

  getOptimalMoves(difficulty) {
    const optimalMoves = { easy: 32, intermediate: 72, hard: 128 };
    return optimalMoves[difficulty] || 32;
  }
}

// Create and export singleton instance
export const memoryGameAPI = new MemoryGameAPI();

// Auto-setup offline support
memoryGameAPI.setupOfflineSupport();

export default memoryGameAPI;