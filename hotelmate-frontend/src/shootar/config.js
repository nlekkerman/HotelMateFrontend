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
  MAX_ENEMIES_ACTIVE: 6,

  // Spawn-on-shoot system — farther for large objects
  SPAWN_DISTANCE_MIN: 15,         // minimum 15m away
  SPAWN_DISTANCE_MAX: 40,         // up to 40m away
  SPAWN_HEIGHT_MIN: 1.0,          // 1m above floor (table height)
  SPAWN_HEIGHT_MAX: 2.2,          // below ceiling
  SPAWN_OFFSET: 2,                // ±m random offset from aim point (tighter)
  ENEMY_SPEED_MIN: 3,             // faster approach for longer distance
  ENEMY_SPEED_MAX: 8,             // max 8 m/s
  MIN_PLAYER_DISTANCE: 12,        // stop 12m away (not in face)
  SPAWN_DAMAGE_GRACE: 2000,       // ms after spawn before enemy can deal damage

  // Enemy dimensions
  ENEMY_MODEL_SCALE: 7.5,         // 2-3m wide objects (drone size)
  ENEMY_HEIGHT: 3.8,              // 1.8m tall

  // Damage / game
  HIT_DISTANCE: 50,               // max raycast hit distance (50m range)
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
