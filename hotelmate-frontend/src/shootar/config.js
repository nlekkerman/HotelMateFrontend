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
  APPROACH_SPEED: 0.5,

  // NEW: enemies stop approaching at this radius (so not inside you)
  COMFORT_DISTANCE: 8,

  // Damage / game
  ENEMY_DAMAGE_DISTANCE: 2,
  // ...
};

export default CONFIG;
