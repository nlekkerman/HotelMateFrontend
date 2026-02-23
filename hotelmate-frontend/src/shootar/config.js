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

  // World-anchor system (360° static placement)
  ANCHOR_DISTANCE_MIN: 15,        // min spawn radius around player (m)
  ANCHOR_DISTANCE_MAX: 60,        // max spawn radius — wider spread
  ANCHOR_HEIGHT_MIN: -2,          // can spawn below camera
  ANCHOR_HEIGHT_MAX: 8,           // can spawn above camera
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
