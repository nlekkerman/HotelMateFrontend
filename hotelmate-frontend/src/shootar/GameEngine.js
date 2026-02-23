// ShootAR — GameEngine
// Single rAF loop, keeps game logic separate from rendering.

import CONFIG from "./config.js";

export default class GameEngine {
  constructor({ onScoreChange, onHealthChange, onGameOver }) {
    this.score = 0;
    this.health = CONFIG.MAX_HEALTH;
    this.running = false;
    this.onScoreChange = onScoreChange;
    this.onHealthChange = onHealthChange;
    this.onGameOver = onGameOver;
    this._lastDamageTime = {};
  }

  start() {
    this.score = 0;
    this.health = CONFIG.MAX_HEALTH;
    this.running = true;
    this._lastDamageTime = {};
    this.onScoreChange(this.score);
    this.onHealthChange(this.health);
  }

  stop() {
    this.running = false;
  }

  addScore(points) {
    if (!this.running) return;
    this.score += points;
    this.onScoreChange(this.score);
  }

  takeDamage(enemyId) {
    if (!this.running) return;
    const now = Date.now();
    if (
      this._lastDamageTime[enemyId] &&
      now - this._lastDamageTime[enemyId] < CONFIG.DAMAGE_COOLDOWN
    ) {
      return; // cooldown
    }
    this._lastDamageTime[enemyId] = now;
    this.health = Math.max(0, this.health - CONFIG.DAMAGE_PER_HIT);
    this.onHealthChange(this.health);
    if (this.health <= 0) {
      this.running = false;
      this.onGameOver();
    }
  }

  reset() {
    this.start();
  }
}
