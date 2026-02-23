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

  // World-anchor system
  ANCHOR_DISTANCE_MIN: 12,        // min distance in front of camera for anchor
  ANCHOR_DISTANCE_MAX: 30,        // max distance in front of camera for anchor
  ANCHOR_HORIZONTAL_SPREAD: 5,    // ±units horizontal offset from camera forward
  ANCHOR_HEIGHT_MIN: 1.5,         // min height above camera.y for anchor
  ANCHOR_HEIGHT_MAX: 4.0,         // max height above camera.y for anchor
  ANCHOR_LERP_MIN: 0.04,          // min lerp smoothing factor per frame
  ANCHOR_LERP_MAX: 0.08,          // max lerp smoothing factor per frame
  ANCHOR_INTERVAL_MIN: 1200,      // min ms between anchor retargets
  ANCHOR_INTERVAL_MAX: 2400,      // max ms between anchor retargets
  SPAWN_DAMAGE_GRACE: 2000,       // ms after spawn before enemy can deal damage

  // Damage / game
  HIT_DISTANCE: 50,               // max raycast hit distance (meters)
  HIT_THRESHOLD: 1.2,             // radius around enemy center for a hit (m)
  ENEMY_DAMAGE_DISTANCE: 8,       // 3D distance at which enemies deal damage
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
