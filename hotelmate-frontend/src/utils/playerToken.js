/**
 * PlayerTokenManager - Manages anonymous player tokens and info for tournaments
 * 
 * This system provides:
 * - Unique token per device/browser for reliable player tracking
 * - Persistent storage of player name and room info
 * - Tournament integrity (one best score per device)
 * - User-friendly experience with remembered info
 */

export const PlayerTokenManager = {
  
  /**
   * Generate or retrieve existing player token
   * Creates a unique token for this device/browser session
   * @returns {string} Player token (e.g., "player_1730123456_abc123def")
   */
  getPlayerToken() {
    let token = localStorage.getItem('tournament_player_token');
    if (!token) {
      // Generate new UUID-like token with timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      token = `player_${timestamp}_${randomString}`;
      localStorage.setItem('tournament_player_token', token);
    }
    return token;
  },

  /**
   * Store player information for future tournament sessions
   * @param {string} name Player's name
   * @param {string} room Player's room number
   */
  storePlayerInfo(name, room) {
    if (name && name.trim()) {
      localStorage.setItem('player_name', name.trim());
    }
    if (room && room.trim()) {
      localStorage.setItem('room_number', room.trim());
    }
  },

  /**
   * Get previously stored player information
   * @returns {Object} {name: string, room: string}
   */
  getStoredPlayerInfo() {
    const stored = {
      name: localStorage.getItem('player_name') || '',
      room: localStorage.getItem('room_number') || ''
    };
    return stored;
  },

  /**
   * Check if this device has been used for tournaments before
   * @returns {boolean} True if player has played before
   */
  hasPlayedBefore() {
    const hasToken = localStorage.getItem('tournament_player_token') !== null;
    const hasPlayerInfo = localStorage.getItem('player_name') !== null;
    return hasToken && hasPlayerInfo;
  },

  /**
   * Clear all player data - use when starting as "new player"
   * Useful for shared devices or when someone else wants to play
   */
  clearPlayerToken() {
    localStorage.removeItem('tournament_player_token');
    localStorage.removeItem('player_name');
    localStorage.removeItem('room_number');
  },

  /**
   * Get player display name (for UI)
   * @returns {string} Stored name or empty string
   */
  getDisplayName() {
    return localStorage.getItem('player_name') || '';
  },

  /**
   * Get room number (for UI)
   * @returns {string} Stored room or empty string
   */
  getDisplayRoom() {
    return localStorage.getItem('room_number') || '';
  },

  /**
   * Update just the player name (keep token and room)
   * @param {string} name New player name
   */
  updatePlayerName(name) {
    if (name && name.trim()) {
      localStorage.setItem('player_name', name.trim());
    }
  },

  /**
   * Update just the room number (keep token and name)
   * @param {string} room New room number
   */
  updateRoomNumber(room) {
    if (room && room.trim()) {
      localStorage.setItem('room_number', room.trim());
    }
  },

  /**
   * Get debug info for troubleshooting
   * @returns {Object} All stored tournament data
   */
  getDebugInfo() {
    return {
      token: localStorage.getItem('tournament_player_token'),
      name: localStorage.getItem('player_name'),
      room: localStorage.getItem('room_number'),
      hasPlayedBefore: this.hasPlayedBefore(),
      timestamp: new Date().toISOString()
    };
  }
};

export default PlayerTokenManager;