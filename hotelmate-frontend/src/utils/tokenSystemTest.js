/**
 * Token System Test Utility
 * 
 * This file provides functions to test the PlayerTokenManager system
 * Run in browser console to verify token persistence and functionality
 */

import { PlayerTokenManager } from './playerToken.js';

export const TokenSystemTest = {
  
  /**
   * Test basic token generation and persistence
   */
  testTokenGeneration() {
    console.log('🧪 Testing Token Generation...');
    
    // Clear existing data
    PlayerTokenManager.clearPlayerToken();
    
    // Generate first token
    const token1 = PlayerTokenManager.getPlayerToken();
    console.log('First token:', token1);
    
    // Get token again (should be same)
    const token2 = PlayerTokenManager.getPlayerToken();
    console.log('Second token (should be same):', token2);
    
    const passed = token1 === token2 && token1.startsWith('player_');
    console.log('✅ Token persistence test:', passed ? 'PASSED' : 'FAILED');
    
    return passed;
  },

  /**
   * Test player info storage and retrieval
   */
  testPlayerInfoStorage() {
    console.log('🧪 Testing Player Info Storage...');
    
    // Store player info
    PlayerTokenManager.storePlayerInfo('Test Player', '123');
    
    // Retrieve stored info
    const stored = PlayerTokenManager.getStoredPlayerInfo();
    console.log('Stored info:', stored);
    
    // Check if correctly stored
    const passed = stored.name === 'Test Player' && stored.room === '123';
    console.log('✅ Player info storage test:', passed ? 'PASSED' : 'FAILED');
    
    return passed;
  },

  /**
   * Test hasPlayedBefore functionality
   */
  testHasPlayedBefore() {
    console.log('🧪 Testing Has Played Before...');
    
    // Clear data first
    PlayerTokenManager.clearPlayerToken();
    let hasPlayed = PlayerTokenManager.hasPlayedBefore();
    console.log('After clearing (should be false):', hasPlayed);
    
    // Generate token and add player info
    PlayerTokenManager.getPlayerToken();
    PlayerTokenManager.storePlayerInfo('Test Player', '123');
    hasPlayed = PlayerTokenManager.hasPlayedBefore();
    console.log('After adding info (should be true):', hasPlayed);
    
    const passed = hasPlayed === true;
    console.log('✅ Has played before test:', passed ? 'PASSED' : 'FAILED');
    
    return passed;
  },

  /**
   * Test clearing player data
   */
  testClearPlayerData() {
    console.log('🧪 Testing Clear Player Data...');
    
    // Set up data first
    PlayerTokenManager.getPlayerToken();
    PlayerTokenManager.storePlayerInfo('Test Player', '123');
    
    // Clear data
    PlayerTokenManager.clearPlayerToken();
    
    // Check if cleared
    const token = localStorage.getItem('tournament_player_token');
    const name = localStorage.getItem('player_name');
    const room = localStorage.getItem('room_number');
    
    console.log('After clearing - Token:', token, 'Name:', name, 'Room:', room);
    
    const passed = token === null && name === null && room === null;
    console.log('✅ Clear player data test:', passed ? 'PASSED' : 'FAILED');
    
    return passed;
  },

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🚀 Running All Token System Tests...');
    console.log('=======================================');
    
    const results = {
      tokenGeneration: this.testTokenGeneration(),
      playerInfoStorage: this.testPlayerInfoStorage(),
      hasPlayedBefore: this.testHasPlayedBefore(),
      clearPlayerData: this.testClearPlayerData()
    };
    
    console.log('=======================================');
    console.log('📊 Test Results:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('=======================================');
    console.log(`🏆 Overall Result: ${allPassed ? 'ALL TESTS PASSED! 🎉' : 'SOME TESTS FAILED ❌'}`);
    
    return results;
  },

  /**
   * Simulate tournament flow
   */
  simulateTournamentFlow() {
    console.log('🎮 Simulating Tournament Flow...');
    console.log('=======================================');
    
    // Step 1: New player starts game
    console.log('👤 Step 1: New player starts game');
    PlayerTokenManager.clearPlayerToken();
    const token = PlayerTokenManager.getPlayerToken();
    const isNewPlayer = !PlayerTokenManager.hasPlayedBefore();
    console.log('- Token generated:', token);
    console.log('- Is new player:', isNewPlayer);
    
    // Step 2: Player completes game and enters info
    console.log('🎯 Step 2: Player completes game and submits score');
    PlayerTokenManager.storePlayerInfo('Alice Johnson', '205');
    console.log('- Player info stored for future sessions');
    
    // Step 3: Player plays again (returning player)
    console.log('🔄 Step 3: Same player plays again');
    const sameToken = PlayerTokenManager.getPlayerToken();
    const isReturningPlayer = PlayerTokenManager.hasPlayedBefore();
    const storedInfo = PlayerTokenManager.getStoredPlayerInfo();
    console.log('- Same token used:', token === sameToken);
    console.log('- Is returning player:', isReturningPlayer);
    console.log('- Stored info retrieved:', storedInfo);
    
    // Step 4: Someone else uses same device
    console.log('👥 Step 4: Someone else uses same device');
    PlayerTokenManager.clearPlayerToken();
    const newToken = PlayerTokenManager.getPlayerToken();
    const isNewAgain = !PlayerTokenManager.hasPlayedBefore();
    console.log('- New token generated:', newToken);
    console.log('- Is new player again:', isNewAgain);
    console.log('- Tokens are different:', token !== newToken);
    
    console.log('=======================================');
    console.log('🎉 Tournament flow simulation complete!');
  }
};

// Export for use in browser console
window.TokenSystemTest = TokenSystemTest;