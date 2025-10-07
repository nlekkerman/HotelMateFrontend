// src/logic/Game.js
export default class Game {
  constructor(numHoles = 6, moleTime = 1000, gameTime = 30000) { // gameTime in ms
    this.numHoles = numHoles;
    this.moleTime = moleTime;
    this.gameTime = gameTime; // total game duration
    this.holes = Array(numHoles).fill(false);
    this.score = 0;
    this.interval = null;
    this.timer = null; // countdown timer
    this.timeLeft = gameTime; // remaining time
  }

  start(updateCallback, endCallback) {
    // Mole appearance interval
    this.interval = setInterval(() => {
      this.activateRandomHole();
      updateCallback(this.holes, this.score, this.timeLeft);
    }, this.moleTime);

    // Countdown timer
    this.timer = setInterval(() => {
      this.timeLeft -= 1000; // decrease 1 second
      if (this.timeLeft <= 0) {
        this.stop();
        if (endCallback) endCallback(this.score); // game over callback
      }
    }, 1000);
  }

  stop() {
    clearInterval(this.interval);
    clearInterval(this.timer);
    this.interval = null;
    this.timer = null;
    this.holes = Array(this.numHoles).fill(false);
  }

  activateRandomHole() {
    this.holes = Array(this.numHoles).fill(false);
    const randomIndex = Math.floor(Math.random() * this.numHoles);
    this.holes[randomIndex] = true;
  }

  clickHole(index) {
    if (this.holes[index]) {
      this.score += 1;
      this.holes[index] = false;
      return true;
    }
    return false;
  }

  getState() {
    return { holes: [...this.holes], score: this.score, timeLeft: this.timeLeft };
  }
}
