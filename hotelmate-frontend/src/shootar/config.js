// ShootAR — game configuration constants
// Units are in meters unless noted otherwise.

const CONFIG = {
  // Camera / Three.js
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,

  // Player
  PLAYER_EYE_HEIGHT: 1.65,        // camera Y (m)

  // Room boundaries (meters) — realistic indoor play area
  ROOM_WIDTH: 8,                  // ±4m left/right from center
  ROOM_DEPTH: 10,                 // ±5m forward/back
  ROOM_HEIGHT: 2.8,               // 2.8m ceiling (standard room)

  // Enemy spawning
  MAX_ENEMIES_ACTIVE: 6,

  // Spawn-on-shoot system — room-scale distances
  SPAWN_DISTANCE_MIN: 14,          // not closer than 4m
  SPAWN_DISTANCE_MAX: 28,          // not farther than 8m (room depth)
  SPAWN_HEIGHT_MIN: 1.0,          // 1m above floor (table height)
  SPAWN_HEIGHT_MAX: 2.2,          // below ceiling
  SPAWN_OFFSET: 2,                // ±m random offset from aim point (tighter)
  ENEMY_SPEED_MIN: 1.5,           // slightly slower for room scale
  ENEMY_SPEED_MAX: 3.5,           // max homing speed (m/s)
  MIN_PLAYER_DISTANCE: 4,         // stop homing at 4m (comfortable viewing)
  SPAWN_DAMAGE_GRACE: 2000,       // ms after spawn before enemy can deal damage

  // Enemy dimensions
  ENEMY_MODEL_SCALE: 7.5,         // 2-3m wide objects (drone size)
  ENEMY_HEIGHT: 3.8,              // 1.8m tall

  // Damage / game
  HIT_DISTANCE: 20,               // max raycast hit distance (room scale)
  HIT_THRESHOLD: 1.2,             // radius around enemy center for a hit (m)
  ENEMY_DAMAGE_DISTANCE: 6,       // 3D distance at which enemies deal damage
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
  ],

  // Colors for fallback primitive enemies
  ENEMY_COLORS: [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0x44ffff],
};

export default CONFIG;
