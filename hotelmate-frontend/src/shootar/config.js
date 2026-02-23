// ShootAR — game configuration constants
// Units are in meters unless noted otherwise.

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // NEW: player eye height (camera Y)
  PLAYER_EYE_HEIGHT: 1.65,

  // Enemy spawning
  MAX_ENEMIES_ACTIVE: 5,
  SPAWN_RADIUS_MIN: 16,
  SPAWN_RADIUS_MAX: 26,
  SPAWN_MIN_DISTANCE: 10,

  // CHANGE MEANING: height relative to eye (not ground)
  ENEMY_HEIGHT_MIN: -0.2,   // slightly below eye ok
  ENEMY_HEIGHT_MAX: 1.0,    // up to 1m above eye

  // Enemy movement
  APPROACH_SPEED: 0.35,           // meters per second toward player
  DRIFT_AMPLITUDE: 0.0,           // disabled — replaced by step movement
  DRIFT_SPEED: 0.0,               // disabled — replaced by step movement
  STEP_INTERVAL: 2000,            // ms between sudden lateral steps
  STEP_BEARING_DELTA: 0.35,       // max radians per step
  STEP_HEIGHT_DELTA: 0.5,         // max height change per step (m)

  // Enemies stop approaching at this distance (meters)
  COMFORT_DISTANCE: 7,

  // Damage / game
  HIT_DISTANCE: 50,               // max raycast hit distance (meters)
  HIT_THRESHOLD: 1.2,             // radius around enemy center for a hit (m)
  ENEMY_DAMAGE_DISTANCE: 8,       // damage zone starts here (must be > COMFORT_DISTANCE)
  DAMAGE_PER_HIT: 10,             // reduced — enemies stay in range longer
  SCORE_PER_KILL: 100,
  MAX_HEALTH: 100,
  DAMAGE_COOLDOWN: 2000,          // ms between damage ticks from same enemy

  // Respawn
  RESPAWN_DELAY: 2500,            // ms before destroyed enemy respawns

  // GLB model paths (served from public/)
  GLB_MODELS: [
    "/shootar/sci-fi_camera_drone.glb",
    "/shootar/scific_drone_for_free.glb",
  ],
  ENEMY_MODEL_SCALE: 0.6,         // uniform scale applied to GLB clones

  // Colors for fallback primitive enemies
  ENEMY_COLORS: [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0x44ffff],
};

export default CONFIG;
