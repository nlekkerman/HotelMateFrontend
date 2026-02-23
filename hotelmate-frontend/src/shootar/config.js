// ShootAR — game configuration constants
// Units are in meters unless noted otherwise.

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // Player
  PLAYER_EYE_HEIGHT: 1.65,        // camera Y (m)

  // Room boundaries (meters) — expanded for large objects
  ROOM_WIDTH: 20,                 // ±10m left/right from center
  ROOM_DEPTH: 50,                 // 50m forward space
  ROOM_HEIGHT: 5,                 // 5m ceiling for large objects

  // Enemy spawning
  MAX_ENEMIES_ACTIVE: 10,

  // Spawn distances — far away so enemies charge in
  SPAWN_DISTANCE_MIN: 60,          // 60m minimum
  SPAWN_DISTANCE_MAX: 140,         // up to 140m away
  SPAWN_HEIGHT_MIN: 0.5,           // near ground
  SPAWN_HEIGHT_MAX: 10,            // up in sky
  SPAWN_OFFSET: 2,                 // ±m random offset from aim point
  ENEMY_SPEED_MIN: 10,             // fast approach
  ENEMY_SPEED_MAX: 20,             // 20 m/s = scary
  MIN_PLAYER_DISTANCE: 4,          // stop 4m away (close but not clipping)
  SPAWN_DAMAGE_GRACE: 2000,        // ms after spawn before enemy can deal damage

  // Enemy dimensions — smaller, not giant
  ENEMY_MODEL_SCALE: 1.5,          // ~1m wide drones
  ENEMY_HEIGHT: 1.2,               // 1.2m tall

  // Damage / game
  HIT_DISTANCE: 50,               // max raycast hit distance (50m range)
  HIT_THRESHOLD: 1.2,             // radius around enemy center for a hit (m)
  ENEMY_DAMAGE_DISTANCE: 4,       // 3D distance at which enemies deal damage
  DAMAGE_PER_HIT: 10,             // reduced — enemies stay in range longer
  SCORE_PER_KILL: 100,
  MAX_HEALTH: 100,
  DAMAGE_COOLDOWN: 2000,          // ms between damage ticks from same enemy

  // Respawn
  RESPAWN_DELAY: 2500,            // ms before destroyed enemy respawns

  // GLB model paths (served from public/)
  GLB_MODELS: [
    "/shootar/military_drone.glb",
    "/shootar/scific_drone_for_free.glb",
    "/shootar/space_ship_low_poly.glb",
  ],

  // Colors for fallback primitive enemies
  ENEMY_COLORS: [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0x44ffff],
};

export default CONFIG;
