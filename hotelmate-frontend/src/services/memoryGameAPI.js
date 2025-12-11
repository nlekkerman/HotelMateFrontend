import api, { publicAPI } from "./api";

class MemoryGameAPI {
  constructor() {
    this.baseURL = '/entertainment';
    this.pendingSessions = this.loadPendingSessions();
    this.cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || '';
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
    
    // ONLY use the tested api.js - NO FALLBACK to local images
    const response = await api.get(`${this.baseURL}/memory-cards/for-game/`);
    
    // Handle paginated response
    const data = response.data;
    
    if (data && data.results) {
      // Fix image URLs by adding Cloudinary base URL if needed
      const cardsWithFullUrls = data.results.map(card => {
        const originalUrl = card.image_url;
        const fullUrl = this.getFullImageUrl(originalUrl);
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
      return result;
    }
    
    // Legacy format support - always return 6 cards
    const cards = Array.isArray(data) ? data : (data.cards || []);
    
    // Process URLs for legacy format too
    const cardsWithFullUrls = cards.map(card => {
      const originalUrl = card.image_url;
      const fullUrl = this.getFullImageUrl(originalUrl);
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
        response = await publicAPI.post(`entertainment/memory-sessions/`, gameData);
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
  
  async getTournaments(hotelSlug = 'hotel-killarney') {
    try {
      // Use the correct backend endpoint for active tournaments by hotel
      const response = await api.get(`${this.baseURL}/tournaments/active_for_hotel/?hotel=${hotelSlug}`);
      
      // Backend returns { tournaments: [...], count: N }
      if (response.data && response.data.tournaments) {
        return response.data.tournaments;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch tournaments for ${hotelSlug}:`, error);
      
      // If 404 or 500, backend probably doesn't have tournament endpoints yet
      if (error.response?.status === 404 || error.response?.status === 500) {
        throw new Error(`Tournament API endpoints not implemented for hotel ${hotelSlug}`);
      }
      throw error;
    }
  }

  // Get all tournaments (no hotel filter) - for management dashboard
  async getAllTournaments() {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch all tournaments:', error);
      if (error.response?.status === 404 || error.response?.status === 500) {
        throw new Error('Tournament management API endpoints not implemented yet');
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

  async getTournamentLeaderboard(tournamentId, limit = null) {
    try {
      const url = `${this.baseURL}/tournaments/${tournamentId}/leaderboard/`;
      const config = limit ? { params: { limit } } : undefined;
      const response = await api.get(url, config);

      return response.data;
    } catch (error) {
      console.error(`❌ Tournament leaderboard API error:`, error);
      if (error.response) {
        console.error(`❌ Response status:`, error.response.status);
        console.error(`❌ Response data:`, error.response.data);
      }
      throw error;
    }
  }

  // Check if a score qualifies as a high score for the tournament
  async isHighScore(tournamentId, timeSeconds, movesCount) {
    try {
      const calculatedScore = this.calculateScore(timeSeconds, movesCount);
      
      // Get current leaderboard to check if this score would qualify
      const leaderboardData = await this.getTournamentLeaderboard(tournamentId);
      
      let leaderboardArray = [];
      
      // Handle different response formats from backend
      if (Array.isArray(leaderboardData)) {
        leaderboardArray = leaderboardData;
      } else if (leaderboardData && leaderboardData.sessions && Array.isArray(leaderboardData.sessions)) {
        leaderboardArray = leaderboardData.sessions;
      } else if (leaderboardData && leaderboardData.results && Array.isArray(leaderboardData.results)) {
        leaderboardArray = leaderboardData.results;
      } else if (leaderboardData && leaderboardData.data && Array.isArray(leaderboardData.data)) {
        leaderboardArray = leaderboardData.data;
      }
      
      // If there are fewer than 10 entries, it's automatically a high score
      if (leaderboardArray.length < 10) {
        return {
          isHighScore: true,
          rank: leaderboardArray.length + 1,
          reason: `Leaderboard has ${leaderboardArray.length} entries`
        };
      }
      
      // Check if score is higher than the lowest score in top 10
      const sortedScores = leaderboardArray
        .map(session => session.score || 0)
        .sort((a, b) => b - a); // Sort descending
      
      const lowestTop10Score = sortedScores[9] || 0; // 10th place (index 9)
      
      if (calculatedScore > lowestTop10Score) {
        console.log(`✅ High score: ${calculatedScore} > ${lowestTop10Score} (10th place)`);
        // Calculate estimated rank
        const betterScores = sortedScores.filter(score => score > calculatedScore);
        const estimatedRank = betterScores.length + 1;
        
        return {
          isHighScore: true,
          rank: estimatedRank,
          reason: `Score beats 10th place (${lowestTop10Score})`
        };
      }
      
      console.log(`❌ Not a high score: ${calculatedScore} <= ${lowestTop10Score} (10th place)`);
      return {
        isHighScore: false,
        rank: null,
        reason: `Score doesn't beat 10th place (${lowestTop10Score})`
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not check high score status, defaulting to true:`, error.message);
      // If we can't check the leaderboard, assume it's a high score to be safe
      return {
        isHighScore: true,
        rank: null,
        reason: 'Could not verify leaderboard, allowing submission'
      };
    }
  }

  // Check if player has already played in this tournament
  async hasPlayerAlreadyPlayed(tournamentId, playerName, roomNumber) {
    try {
      console.log(`🔍 Checking if player "${playerName}" (Room: ${roomNumber}) has already played tournament ${tournamentId}`);
      
      const leaderboardData = await this.getTournamentLeaderboard(tournamentId);
      
      let leaderboardArray = [];
      
      // Handle different response formats from backend
      if (Array.isArray(leaderboardData)) {
        leaderboardArray = leaderboardData;
      } else if (leaderboardData && leaderboardData.sessions && Array.isArray(leaderboardData.sessions)) {
        leaderboardArray = leaderboardData.sessions;
      } else if (leaderboardData && leaderboardData.results && Array.isArray(leaderboardData.results)) {
        leaderboardArray = leaderboardData.results;
      } else if (leaderboardData && leaderboardData.data && Array.isArray(leaderboardData.data)) {
        leaderboardArray = leaderboardData.data;
      }
      
      // Check for existing player by name and/or room number
      const existingEntry = leaderboardArray.find(session => {
        const sessionName = session.player_name || session.name || session.playerName;
        const sessionRoom = session.room_number || session.roomNumber;
        
        // Match by name (case insensitive)
        const nameMatch = sessionName && playerName && 
          sessionName.toLowerCase().trim() === playerName.toLowerCase().trim();
        
        // Match by room number (if both provided)
        const roomMatch = sessionRoom && roomNumber && 
          sessionRoom.toString().trim() === roomNumber.toString().trim();
        
        // Player has already played if either name matches or both name and room match
        return nameMatch || (nameMatch && roomMatch);
      });
      
      if (existingEntry) {
        console.log(`❌ Player already played:`, existingEntry);
        return {
          hasPlayed: true,
          existingEntry: existingEntry,
          message: `Player "${playerName}" has already participated in this tournament.`
        };
      }
      
      console.log(`✅ Player has not played yet`);
      return {
        hasPlayed: false,
        existingEntry: null,
        message: null
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not check if player already played:`, error.message);
      // If we can't check, allow the submission to be safe
      return {
        hasPlayed: false,
        existingEntry: null,
        message: null
      };
    }
  }

  // Get tournaments that are CURRENTLY ACTIVE (running right now)
  async getActiveTournaments(hotelSlug = 'hotel-killarney') {
    try {
      const tournaments = await this.getTournaments(hotelSlug);
      if (!tournaments || !Array.isArray(tournaments)) {
        console.log(`📅 No tournaments found for ${hotelSlug}`);
        return [];
      }

      const now = new Date();
      console.log(`🕐 Checking active tournaments for ${hotelSlug} at: ${now.toISOString()}`);
      
      const activeTournaments = tournaments.filter(tournament => {
        const startTime = new Date(tournament.start_date);
        const endTime = new Date(tournament.end_date);
        
        // Use both status field AND time validation
        const isActiveByStatus = tournament.status === 'active';
        const isActiveByTime = now >= startTime && now <= endTime;
        
        console.log(`🔍 Checking tournament "${tournament.name}" (ID: ${tournament.id}):`);
        console.log(`   Status field: ${tournament.status}`);
        console.log(`   is_active field: ${tournament.is_active}`);
        console.log(`   Start: ${startTime.toISOString()}`);
        console.log(`   End: ${endTime.toISOString()}`);
        console.log(`   Now: ${now.toISOString()}`);
        console.log(`   Active by status: ${isActiveByStatus}`);
        console.log(`   Active by time: ${isActiveByTime}`);
        console.log(`   Time until start: ${Math.floor((startTime.getTime() - now.getTime()) / 1000 / 60)} minutes`);
        console.log(`   Time until end: ${Math.floor((endTime.getTime() - now.getTime()) / 1000 / 60)} minutes`);
        
        // Tournament is active if backend says "active" AND it hasn't ended yet
        // Allow some flexibility - if backend says active, trust it unless clearly expired
        const hasNotEnded = now <= endTime;
        console.log(`   Has not ended: ${hasNotEnded}`);
        const isActive = isActiveByStatus && hasNotEnded;
        
        if (isActive) {
          console.log(`🏆 ✅ ACTIVE TOURNAMENT FOUND: "${tournament.name}"`);
        } else if (isActiveByStatus && !hasNotEnded) {
          console.log(`❌ Status says active but tournament ended - Status: ${tournament.status}, Ended: ${!hasNotEnded}`);
        } else {
          console.log(`❌ Not active - Status: ${tournament.status}, Has not ended: ${hasNotEnded}`);
        }
        
        return isActive;
      });

      console.log(`✅ Found ${activeTournaments.length} active tournaments for ${hotelSlug}`);
      return activeTournaments;
    } catch (error) {
      console.error(`❌ Failed to fetch active tournaments for ${hotelSlug}:`, error);
      return [];
    }
  }

  // Get tournaments that are UPCOMING (starting within next 2 hours)
  async getUpcomingTournaments(hoursAhead = 2, hotelSlug = 'hotel-killarney') {
    try {
      const tournaments = await this.getTournaments(hotelSlug);
      if (!tournaments || !Array.isArray(tournaments)) {
        console.log(`📅 No tournaments found for ${hotelSlug}`);
        return [];
      }

      const now = new Date();
      const lookAheadTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      console.log(`🔍 Looking for upcoming tournaments for ${hotelSlug}:`);
      console.log(`   Now: ${now.toISOString()}`);
      console.log(`   ${hoursAhead}h ahead: ${lookAheadTime.toISOString()}`);
      
      const upcomingTournaments = tournaments.filter(tournament => {
        const startTime = new Date(tournament.start_date);
        
        // Check if tournament is upcoming and within the time window
        const isUpcoming = startTime > now && startTime <= lookAheadTime;
        
        if (isUpcoming) {
          console.log(`📅 UPCOMING: "${tournament.name}" (ID: ${tournament.id})`);
          console.log(`   Hotel: ${tournament.hotel}`);
          console.log(`   Starts: ${startTime.toISOString()}`);
          console.log(`   Status: ${tournament.status || 'upcoming (assumed)'}`);
          const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
          console.log(`   In ${minutesUntil} minutes`);
        }
        
        return isUpcoming;
      }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)); // Sort by start time

      console.log(`✅ Found ${upcomingTournaments.length} upcoming tournaments for ${hotelSlug}`);
      return upcomingTournaments;
    } catch (error) {
      console.error(`❌ Failed to fetch upcoming tournaments for ${hotelSlug}:`, error);
      return [];
    }
  }

  // Get the next relevant tournament (active or upcoming)
  async getNextTournament(hotelSlug = 'hotel-killarney') {
    try {
      console.log(`🎯 Finding next tournament for ${hotelSlug}...`);
      
      // First check for active tournaments
      const activeTournaments = await this.getActiveTournaments(hotelSlug);
      if (activeTournaments.length > 0) {
        console.log(`🎯 Using active tournament: "${activeTournaments[0].name}" for ${hotelSlug}`);
        return {
          tournament: activeTournaments[0],
          status: 'active',
          allActive: activeTournaments,
          hotelSlug: hotelSlug
        };
      }

      // Then check for upcoming tournaments (within next 2 hours)
      const upcomingTournaments = await this.getUpcomingTournaments(2, hotelSlug);
      if (upcomingTournaments.length > 0) {
        console.log(`🎯 Using upcoming tournament: "${upcomingTournaments[0].name}" for ${hotelSlug}`);
        return {
          tournament: upcomingTournaments[0],
          status: 'upcoming',
          allUpcoming: upcomingTournaments,
          hotelSlug: hotelSlug
        };
      }

      console.log(`❌ No active or upcoming tournaments found for ${hotelSlug}`);
      return {
        tournament: null,
        status: 'none',
        allActive: [],
        allUpcoming: [],
        hotelSlug: hotelSlug
      };
      
    } catch (error) {
      console.error(`❌ Failed to get next tournament for ${hotelSlug}:`, error);
      return {
        tournament: null,
        status: 'error',
        error: error.message,
        allActive: [],
        allUpcoming: [],
        hotelSlug: hotelSlug
      };
    }
  }

  // Get a single summary object: { active, next, previous }
  async getTournamentsSummary(hotelSlug = 'hotel-killarney') {
    try {
      const response = await api.get(`${this.baseURL}/tournaments/summary/?hotel=${hotelSlug}`);
      // Expect backend to return an object with keys active, next, previous
      return response.data;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch tournaments summary for ${hotelSlug}:`, error?.message || error);
      // Return a safe default so UI can render fallback text
      return { active: null, next: null, previous: null };
    }
  }

  // Legacy method - kept for backward compatibility
  async hasActiveTournament() {
    try {
      const result = await this.getNextTournament();
      return {
        hasActive: result.status === 'active',
        activeTournaments: result.allActive || [],
        count: result.allActive?.length || 0,
        nextTournament: result.tournament,
        status: result.status
      };
    } catch (error) {
      console.error('❌ Failed to check for active tournaments:', error);
      return {
        hasActive: false,
        activeTournaments: [],
        count: 0,
        error: error.message
      };
    }
  }

  // NEW: Submit tournament score with token-based player tracking
  async submitTournamentScore(tournamentId, scoreData) {
    try {
      console.log(`🎯 Submitting score to tournament ${tournamentId}:`, scoreData);
      
      // Ensure we have a player_token in the scoreData
      if (!scoreData.player_token) {
        console.warn('⚠️ No player_token provided in scoreData - this may cause tracking issues');
      }
      
      const response = await api.post(`${this.baseURL}/tournaments/${tournamentId}/submit_score/`, scoreData);
      
      console.log(`✅ Score submitted successfully:`, response.data);
      console.log(`   Score: ${response.data.score}`);
      console.log(`   Best Score: ${response.data.best_score}`);
      console.log(`   Rank: ${response.data.rank || 'N/A'}`);
      console.log(`   Is Personal Best: ${response.data.is_personal_best}`);
      console.log(`   Updated: ${response.data.updated}`);
      console.log(`   Message: ${response.data.message || 'N/A'}`);
      console.log(`   Player Token: ${response.data.player_token || 'N/A'}`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to submit score to tournament ${tournamentId}:`, error);
      if (error.response) {
        console.error(`❌ Response status: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
      }
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
        `${this.baseURL}/tournaments/active/?hotel=${hotelSlug}`,
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

  async getTournamentLeaderboard(tournamentId, limit = null) {
    try {
      const url = `${this.baseURL}/tournaments/${tournamentId}/leaderboard/`;
      const config = limit ? { params: { limit } } : undefined;
      const response = await api.get(url, config);
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
