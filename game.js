(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DinoGame = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const STATES = { idle: 'idle', running: 'running', paused: 'paused', gameover: 'gameover' };

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  class DinoEngine {
    constructor(options = {}) {
      this.random = options.random || Math.random;
      this.storage = options.storage || null;
      this.highScoreKey = options.highScoreKey || 'choi-jeongin-dino-best';
      this.baseSpeed = options.baseSpeed || 5;
      this.maxSpeed = options.maxSpeed || 14;
      this.reset();
      this.bestScore = this.readBestScore();
    }

    reset() {
      this.state = STATES.idle;
      this.distance = 0;
      this.score = 0;
      this.speed = this.baseSpeed;
      this.playerY = 0;
      this.velocityY = 0;
      this.ducking = false;
      this.obstacles = [];
      this.spawnTimer = 40;
      this.tickCount = 0;
    }

    start() {
      if (this.state === STATES.gameover) this.reset();
      if (this.state === STATES.idle || this.state === STATES.paused) this.state = STATES.running;
      return this.snapshot();
    }

    pause() {
      if (this.state === STATES.running) this.state = STATES.paused;
      return this.snapshot();
    }

    resume() {
      if (this.state === STATES.paused) this.state = STATES.running;
      return this.snapshot();
    }

    restart() {
      this.reset();
      this.state = STATES.running;
      return this.snapshot();
    }

    jump() {
      if (this.state !== STATES.running || this.playerY > 0) return false;
      this.velocityY = 12;
      this.playerY = .01;
      return true;
    }

    setDucking(value) {
      if (this.state === STATES.running) this.ducking = Boolean(value);
      return this.ducking;
    }

    spawnObstacle(type) {
      const obstacleType = type || (this.random() > .55 ? 'bird' : 'cactus');
      this.obstacles.push(obstacleType === 'bird'
        ? { type: 'bird', x: 104, y: 2.2, width: 4.5, height: 1.1 }
        : { type: 'cactus', x: 104, y: 0, width: 2.2, height: 3.2 });
    }

    playerBounds() {
      return { x: 10, y: this.playerY, width: 4, height: this.ducking ? 1.7 : 3.8 };
    }

    tick() {
      if (this.state !== STATES.running) return this.snapshot();
      this.tickCount += 1;
      this.distance += this.speed;
      this.score = Math.floor(this.distance / 10);
      this.speed = Math.min(this.maxSpeed, this.baseSpeed + this.distance / 1200);
      this.velocityY -= .8;
      this.playerY = Math.max(0, this.playerY + this.velocityY / 10);
      if (this.playerY === 0) this.velocityY = 0;
      this.spawnTimer -= 1;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = Math.max(32, Math.floor(78 - this.speed * 2 + this.random() * 35));
      }
      this.obstacles.forEach((obstacle) => { obstacle.x -= this.speed / 4; });
      this.obstacles = this.obstacles.filter((obstacle) => obstacle.x > -10);
      if (this.obstacles.some((obstacle) => overlaps(this.playerBounds(), obstacle))) this.endGame();
      this.bestScore = Math.max(this.bestScore, this.score);
      this.writeBestScore();
      return this.snapshot();
    }

    endGame() {
      this.state = STATES.gameover;
      this.writeBestScore();
    }

    readBestScore() {
      if (!this.storage || typeof this.storage.getItem !== 'function') return 0;
      return Number(this.storage.getItem(this.highScoreKey)) || 0;
    }

    writeBestScore() {
      if (this.storage && typeof this.storage.setItem === 'function') this.storage.setItem(this.highScoreKey, String(this.bestScore));
    }

    snapshot() {
      return { state: this.state, distance: this.distance, score: this.score, bestScore: this.bestScore, speed: this.speed, playerY: this.playerY, ducking: this.ducking, obstacles: this.obstacles.map((obstacle) => ({ ...obstacle })) };
    }
  }

  function createController(document, storage, windowObject) {
    const board = document.querySelector('#game-board');
    if (!board) return null;
    const engine = new DinoEngine({ storage });
    const score = document.querySelector('#score');
    const bestScore = document.querySelector('#best-score');
    const status = document.querySelector('.game-status');
    let timerId = null;
    let dino = null;

    function render() {
      board.replaceChildren();
      const cloud = document.createElement('span');
      cloud.className = 'game-cloud';
      cloud.style.left = `${(engine.tickCount * .08) % 85}%`;
      cloud.style.top = '18%';
      board.appendChild(cloud);
      dino = document.createElement('span');
      dino.className = `dino-sprite${engine.ducking ? ' dino-sprite--duck' : ''}`;
      dino.style.bottom = `${1.6 + engine.playerY * 1.6}rem`;
      board.appendChild(dino);
      engine.obstacles.forEach((obstacle) => {
        const item = document.createElement('span');
        item.className = `obstacle-sprite obstacle-sprite--${obstacle.type}`;
        item.style.left = `${obstacle.x}%`;
        board.appendChild(item);
      });
      if (score) score.textContent = String(engine.score);
      if (bestScore) bestScore.textContent = String(engine.bestScore);
      if (status) status.textContent = ({ idle: 'Ready · Space 또는 ↑로 시작', running: 'Running · ↓ 숙이기 · Alt 일시정지', paused: 'Paused · Alt로 계속하기', gameover: 'Game over · Space로 다시 시작' })[engine.state];
    }

    function stopLoop() {
      if (timerId !== null) windowObject.clearInterval(timerId);
      timerId = null;
    }

    function startLoop() {
      if (timerId !== null) return;
      timerId = windowObject.setInterval(() => { engine.tick(); render(); if (engine.state === STATES.gameover) stopLoop(); }, 80);
    }

    function start() { engine.start(); startLoop(); render(); }
    function pause() { engine.state === STATES.paused ? engine.resume() : engine.pause(); if (engine.state === STATES.paused) stopLoop(); else startLoop(); render(); }
    function restart() { stopLoop(); engine.restart(); startLoop(); render(); }

    document.querySelectorAll('[data-game-action]').forEach((button) => {
      button.addEventListener('click', () => ({ start, pause, restart }[button.dataset.gameAction] || (() => {}))());
    });
    document.querySelector('[data-dino-action="jump"]')?.addEventListener('pointerdown', () => { if (engine.state === STATES.idle) start(); engine.jump(); render(); });
    const duckButton = document.querySelector('[data-dino-action="duck"]');
    duckButton?.addEventListener('pointerdown', () => engine.setDucking(true));
    duckButton?.addEventListener('pointerup', () => engine.setDucking(false));
    duckButton?.addEventListener('pointerleave', () => engine.setDucking(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Alt') { event.preventDefault(); if (engine.state !== STATES.idle) pause(); return; }
      if (event.key === ' ' || event.key === 'ArrowUp') { event.preventDefault(); if (engine.state === STATES.gameover) restart(); else { if (engine.state === STATES.idle) start(); engine.jump(); } return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); engine.setDucking(true); }
    });
    document.addEventListener('keyup', (event) => { if (event.key === 'ArrowDown') engine.setDucking(false); });
    render();
    return { engine, start, pause, restart, stopLoop };
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => { window.dinoGameController = createController(document, window.localStorage, window); });
  return { DinoEngine, createController, STATES };
});
