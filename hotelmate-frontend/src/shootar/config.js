// ShootAR — game configuration constants
// Units are in meters unless noted otherwise.

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // Enemy spawning
  MAX_ENEMIES_ACTIVE: 5,          // hard cap on alive enemies in the world
  SPAWN_RADIUS_MIN: 10,           // meters — closest spawn distance from player
  SPAWN_RADIUS_MAX: 18,           // meters — farthest spawn distance
  SPAWN_MIN_DISTANCE: 3,          // meters — absolute minimum distance guard
  ENEMY_HEIGHT_MIN: 1,            // meters above ground
  ENEMY_HEIGHT_MAX: 3,            // meters above ground

  // Enemy movement
  APPROACH_SPEED: 0.5,            // meters per second toward player (slow)
  DRIFT_AMPLITUDE: 0.0,           // disabled — replaced by step movement
  DRIFT_SPEED: 0.0,               // disabled — replaced by step movement
  STEP_INTERVAL: 2000,            // ms between sudden lateral steps
  STEP_BEARING_DELTA: 0.35,       // max radians per step
  STEP_HEIGHT_DELTA: 0.5,         // max height change per step (m)

  // Damage / game
  HIT_DISTANCE: 50,               // max raycast hit distance (meters)
  HIT_THRESHOLD: 1.2,             // radius around enemy center for a hit (m)
  ENEMY_DAMAGE_DISTANCE: 2,       // when enemy is this close → damage (m)
  DAMAGE_PER_HIT: 20,
  SCORE_PER_KILL: 100,
  MAX_HEALTH: 100,
  DAMAGE_COOLDOWN: 1000,          // ms between damage ticks from same enemy

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
