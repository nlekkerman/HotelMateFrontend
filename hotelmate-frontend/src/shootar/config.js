// ShootAR — game configuration constants

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // Enemy spawning
  ENEMY_COUNT: 8,
  SPAWN_RADIUS_MIN: 30,
  SPAWN_RADIUS_MAX: 60,
  SPAWN_HEIGHT_MIN: -5,
  SPAWN_HEIGHT_MAX: 10,

  // Enemy movement
  APPROACH_SPEED: 0.02,       // units per frame toward player
  DRIFT_AMPLITUDE: 0.03,      // lateral / vertical drift size
  DRIFT_SPEED: 0.008,         // drift oscillation speed

  // Damage / game
  HIT_DISTANCE: 100,          // max raycast hit distance
  HIT_THRESHOLD: 1.8,         // radius around enemy center for a hit
  ENEMY_DAMAGE_DISTANCE: 3,   // when enemy is this close → damage
  DAMAGE_PER_HIT: 20,
  SCORE_PER_KILL: 100,
  MAX_HEALTH: 100,
  DAMAGE_COOLDOWN: 1000,      // ms between damage ticks from same enemy

  // Respawn
  RESPAWN_DELAY: 2000,        // ms before destroyed enemy respawns

  // Enemy types (primitive geometries)
  ENEMY_TYPES: ["sphere", "cube", "cone"],

  // Colors for enemies
  ENEMY_COLORS: [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0x44ffff],
};

export default CONFIG;
