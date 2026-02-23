// ShootAR — game configuration constants

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // Enemy spawning
  ENEMY_COUNT: 4,
  SPAWN_RADIUS_MIN: 80,
  SPAWN_RADIUS_MAX: 150,
  SPAWN_HEIGHT_MIN: 1,
  SPAWN_HEIGHT_MAX: 5,

  // Enemy movement
  APPROACH_SPEED: 0.02,       // units per frame toward player
  DRIFT_AMPLITUDE: 0.0,       // disabled — replaced by step movement
  DRIFT_SPEED: 0.0,           // disabled — replaced by step movement
  STEP_INTERVAL: 2000,        // ms between sudden lateral steps
  STEP_BEARING_DELTA: 0.35,   // max radians per step
  STEP_HEIGHT_DELTA: 1.5,     // max height change per step

  // Damage / game
  HIT_DISTANCE: 100,          // max raycast hit distance
  HIT_THRESHOLD: 1.8,         // radius around enemy center for a hit
  ENEMY_DAMAGE_DISTANCE: 6,   // when enemy is this close → damage
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
