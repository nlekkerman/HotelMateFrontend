import api from "./api";

class MemoryGameAPI {
  constructor() {
    this.baseURL = '/entertainment';
    this.pendingSessions = this.loadPendingSessions();
    this.cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || '';
    console.log('🌐 Cloudinary base URL loaded:', this.cloudinaryBase);
  }

  // Helper function to get full image URL
  getFullImageUrl(path) {
    if (!path) return null;
    
    // If already a full URL, return as is
    if (path.startsWith("http")) {
      return path;
    }
    
    // Construct full Cloudinary URL - add .png if no extension
    const pathWithExtension = path.includes('.') ? path : `${path}.png`;
    
    // Ensure cloudinaryBase has trailing slash
    const baseWithSlash = this.cloudinaryBase.endsWith('/') ? this.cloudinaryBase : `${this.cloudinaryBase}/`;
    const fullUrl = `${baseWithSlash}image/upload/${pathWithExtension}`;
    
    console.log(`🖼️ Constructing image URL:`);
    console.log(`  - Base: ${this.cloudinaryBase}`);
    console.log(`  - Base with slash: ${baseWithSlash}`);
    console.log(`  - Path: ${path}`);
    console.log(`  - Path with extension: ${pathWithExtension}`);
    console.log(`  - Final URL: ${fullUrl}`);
    
    return fullUrl;
  }

  // Score calculation function (matches backend logic - FIXED for 6 pairs = 12 cards)
  calculateScore(timeSeconds, movesCount) {
    // New simplified scoring for 6 pairs (12 cards) only
    const baseScore = 1000;
    const optimalMoves = 12; // 6 pairs × 2 = 12 moves for perfect game
    
    const timePenalty = timeSeconds * 2;
    const movesPenalty = Math.max(0, movesCount - optimalMoves) * 5;
    
    return Math.max(0, Math.floor(baseScore - timePenalty - movesPenalty));
  }

  // Legacy method for backward compatibility
  calculateScoreWithDifficulty(difficulty, timeSeconds, movesCount) {
    return this.calculateScore(timeSeconds, movesCount);
  }

  // Card Management - Load cards from database (NO DIFFICULTY - always 6 pairs for 3x4 grid)
  async getGameCards() {
    console.log('🎮 Loading game cards for 3x4 grid (6 pairs)...');
    
    // ONLY use the tested api.js - NO FALLBACK to local images
    console.log('📡 Calling backend API:', `${this.baseURL}/memory-cards/for-game/`);
    const response = await api.get(`${this.baseURL}/memory-cards/for-game/`);
    console.log('✅ Backend API response:', response.data);
    
    // Handle paginated response
    const data = response.data;
    console.log('📊 Raw API data structure:', data);
    
    if (data && data.results) {
      console.log('📋 Processing paginated results...');
      // Fix image URLs by adding Cloudinary base URL if needed
      const cardsWithFullUrls = data.results.map(card => {
        const originalUrl = card.image_url;
        const fullUrl = this.getFullImageUrl(originalUrl);
        console.log(`🎴 Processing card: ${card.name} - ${originalUrl} → ${fullUrl}`);
        return {
          ...card,
          image_url: fullUrl
        };
      });
      
      const result = {
        grid_size: "3x4",
        pairs_needed: 6,
        cards_count: cardsWithFullUrls.length,
        total_cards: 12,
        cards: cardsWithFullUrls.slice(0, 6) // Ensure exactly 6 cards
      };
      console.log('🎯 API Success - Final result:', result);
      return result;
    }
    
    // Legacy format support - always return 6 cards
    console.log('📋 Processing legacy/direct format...');
    const cards = Array.isArray(data) ? data : (data.cards || []);
    console.log('📋 Raw cards before URL processing:', cards);
    
    // Process URLs for legacy format too
    const cardsWithFullUrls = cards.map(card => {
      const originalUrl = card.image_url;
      const fullUrl = this.getFullImageUrl(originalUrl);
      console.log(`🎴 Processing legacy card: ${card.name} - ${originalUrl} → ${fullUrl}`);
      return {
        ...card,
        image_url: fullUrl
      };
    });
    
    const result = {
      grid_size: "3x4",
      pairs_needed: 6,
      cards_count: Math.min(6, cardsWithFullUrls.length),
      total_cards: 12,
      cards: cardsWithFullUrls.slice(0, 6)
    };
    console.log('🎯 Backend Success (legacy format):', result);
    return result;
  }

  // Practice Mode - Calculate score only (not saved to database) - NO DIFFICULTY NEEDED
  async savePracticeSession(gameData) {
    try {
      // Remove difficulty from gameData since we no longer use it
      const { difficulty, ...gameDataWithoutDifficulty } = gameData;
      const response = await api.post(`${this.baseURL}/memory-sessions/practice/`, gameDataWithoutDifficulty);
      return response.data;
    } catch (error) {
      // Fallback to local calculation
      const localScore = this.calculateScore(gameData.time_seconds, gameData.moves_count);
      return { score: localScore, ...gameData };
    }
  }

  // Game Session Management
  async saveGameSession(gameData) {
    try {
      // Try public API first for guest tournament play, fallback to authenticated API
      let response;
      try {
        response = await publicApi.post(`entertainment/memory-sessions/`, gameData);
      } catch (publicError) {
        // Fallback to authenticated API
        response = await api.post(`${this.baseURL}/memory-sessions/`, gameData);
      }
      
      // If successful, try to sync any pending sessions
      this.syncPendingSessions();
      
      return response.data;
    } catch (error) {
      
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
      return this.getLocalStats();
    }
  }

  async getUserGameHistory(limit = 10) {
    try {
      const params = { limit };
      // No difficulty parameter needed anymore
      
      const response = await api.get(`${this.baseURL}/memory-sessions/`, { params });
      return response.data.results || response.data || [];
    } catch (error) {
      return [];
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const response = await api.get(`${this.baseURL}/memory-sessions/leaderboard/`, {
        params: { limit }
      });
      return response.data.results || response.data || [];
    } catch (error) {
      return [];
    }
  }

  // Old Tournament Management methods removed - using updated methods below with proper error handling

  // Achievement System
  async getAchievements() {
    try {
      const response = await api.get(`${this.baseURL}/achievements/`);
      return response.data.results || response.data || [];
    } catch (error) {
      return [];
    }
  }

  async getUserAchievements() {
    try {
      const response = await api.get(`${this.baseURL}/achievements/my-achievements/`);
      return response.data.results || response.data || [];
    } catch (error) {
      return [];
    }
  }

  // Dashboard stats
  async getDashboardStats() {
    try {
      const response = await api.get(`${this.baseURL}/dashboard/stats/`);
      return response.data;
    } catch (error) {
      return {};
    }
  }

  // Offline Support Methods
  savePendingSession(gameData) {
    this.pendingSessions.push({ 
      ...gameData, 
      timestamp: Date.now(),
      localScore: this.calculateScore(gameData.time_seconds, gameData.moves_count)
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
        break; // Stop syncing if one fails
      }
    }
    
    // Remove successfully synced sessions
    this.pendingSessions = this.pendingSessions.filter(
      session => !successfulSyncs.includes(session)
    );
    localStorage.setItem('pendingMemoryGameSessions', JSON.stringify(this.pendingSessions));
    
    if (successfulSyncs.length > 0) {
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
        best_time: null,
        best_score: 0
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

    // Calculate best times and scores (no difficulty differentiation)
    allGames.forEach(game => {
      const time = game.time_seconds || game.timeSeconds;
      const score = game.localScore || game.score || 0;

      // Track overall best time and score
      if (!stats.best_time || time < stats.best_time) {
        stats.best_time = time;
      }
      if (score > stats.best_score) {
        stats.best_score = score;
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
        // Convert old format to new format (remove difficulty)
        const gameData = {
          time_seconds: game.timeSeconds || game.time_seconds,
          moves_count: game.moves || game.moves_count,
          completed: true
        };
        
        await this.saveGameSession(gameData);
        migratedCount++;
      } catch (error) {
        // Add to pending sessions instead
        this.savePendingSession(gameData);
      }
    }    if (migratedCount > 0) {
      // Clear old localStorage data after successful migration
      localStorage.removeItem('memoryGameScores');
    }
    
    return migratedCount;
  }

  // Network status monitoring
  setupOfflineSupport() {
    window.addEventListener('online', () => {
      this.syncPendingSessions();
    });

    window.addEventListener('offline', () => {
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

  // Removed difficulty-based methods - now using fixed 3x4 grid
  getGameDisplay() {
    return 'Memory Match: 3×4 Grid (6 pairs, 12 cards)';
  }

  getOptimalMoves() {
    return 12; // Fixed optimal moves for 6 pairs (2 moves per pair)
  }
  // Tournament Management Functions
  
  async getTournaments() {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/`);
      return response.data;
    } catch (error) {
      // If 404 or 500, backend probably doesn't have tournament endpoints yet
      if (error.response?.status === 404 || error.response?.status === 500) {
        throw new Error('Tournament API endpoints not implemented on backend yet');
      }
      throw error;
    }
  }

  async createTournament(tournamentData) {
    try {
      const response = await api.post(`${this.baseURL}/tournaments/`, tournamentData);
      return response.data;
    } catch (error) {
      // If 404 or 500, backend probably doesn't have tournament endpoints yet
      if (error.response?.status === 404 || error.response?.status === 500) {
        throw new Error('Tournament API endpoints not implemented on backend yet');
      }
      throw error;
    }
  }

  async getTournament(tournamentId) {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTournamentLeaderboard(tournamentId) {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/leaderboard/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // NEW: Submit tournament score (after game completion)
  async submitTournamentScore(tournamentId, scoreData) {
    try {
      const response = await api.post(`${this.baseURL}/tournaments/${tournamentId}/submit_score/`, scoreData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // NEW: Anonymous Tournament Play Session (Key endpoint!)
  async createTournamentPlaySession(tournamentId, gameData) {
    try {
      const response = await api.post(`${this.baseURL}/tournaments/${tournamentId}/play_session/`, gameData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateTournament(tournamentId, updateData) {
    try {
      const response = await api.patch(`${this.baseURL}/tournaments/${tournamentId}/`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // QR Code Management
  getTournamentQRCode(tournament, type = 'play') {
    // Your API shows tournaments have qr_code_url field with the Cloudinary URL
    if (tournament.qr_code_url) {
      return tournament.qr_code_url;
    }
    
    // Fallback: construct expected Cloudinary URL based on your pattern
    if (tournament.hotel?.slug && tournament.slug) {
      return `https://res.cloudinary.com/dg0ssec7u/image/upload/tournament_qr/${tournament.hotel.slug}_${tournament.slug}.png`;
    }
    
    return null;
  }

  // Generate QR Code for Tournament
  async generateTournamentQRCode(tournamentId) {
    try {
      const response = await api.post(`${this.baseURL}/tournaments/${tournamentId}/generate_qr_code/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get Tournament Play URL (what QR code should point to)
  getTournamentPlayURL(tournament, baseUrl = window.location.origin) {
    if (tournament.hotel?.slug && tournament.slug) {
      return `${baseUrl}/tournaments/${tournament.hotel.slug}/${tournament.slug}/play`;
    }
    // Fallback to legacy format
    return `${baseUrl}/games/memory-match/tournament/${tournament.id}`;
  }

  // Get Tournament by Hotel and Slug (for QR code landing pages)
  async getTournamentBySlug(hotelSlug, tournamentSlug) {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/`, {
        params: { hotel_slug: hotelSlug, slug: tournamentSlug }
      });
      
      // Return first matching tournament
      const tournaments = response.data.results || response.data || [];
      return tournaments.find(t => 
        t.hotel?.slug === hotelSlug && t.slug === tournamentSlug
      ) || null;
    } catch (error) {
      return null;
    }
  }

  // Get Active Tournaments for Hotel (new refactored approach)
  async getActiveTournamentsForHotel(hotelSlug) {
    try {
      
      // Try multiple endpoint patterns based on backend documentation
      const endpoints = [
        `${this.baseURL}/tournaments/active_for_hotel/?hotel=${hotelSlug}`,
        `${this.baseURL}/tournaments/active/?hotel=${hotelSlug}`,
        `${this.baseURL}/tournaments/?hotel=${hotelSlug}&status=active`,
        `${this.baseURL}/tournaments/?hotel_slug=${hotelSlug}`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          
          const tournaments = response.data.tournaments || response.data.results || response.data;
          if (Array.isArray(tournaments)) {
            return {
              tournaments: tournaments,
              count: tournaments.length
            };
          }
        } catch (endpointError) {
          continue;
        }
      }
      
      // If all endpoints fail, return empty but don't throw
      return { tournaments: [], count: 0 };
      
    } catch (error) {
      return { tournaments: [], count: 0 };
    }
  }

  // Leaderboard Methods
  async getGeneralLeaderboard(limit = 10) {
    try {
      const response = await api.get(`${this.baseURL}/memory-sessions/leaderboard/`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch general leaderboard:', error);
      return { results: [] };
    }
  }

  async getTournamentLeaderboard(tournamentId) {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/${tournamentId}/leaderboard/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch tournament ${tournamentId} leaderboard:`, error);
      return { results: [] };
    }
  }

  async getMyStats() {
    try {
      const response = await api.get(`${this.baseURL}/memory-sessions/my-stats/`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return {};
    }
  }

}

// Create and export singleton instance
export const memoryGameAPI = new MemoryGameAPI();

// Auto-setup offline support
memoryGameAPI.setupOfflineSupport();

export default memoryGameAPI;
