(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WormGame = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  function samePosition(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  class WormEngine {
    constructor(options = {}) {
      this.width = options.width || 20;
      this.height = options.height || 12;
      this.random = options.random || Math.random;
      this.storage = options.storage || null;
      this.highScoreKey = options.highScoreKey || 'choi-jeongin-worm-best';
      this.initialLength = options.initialLength || 3;
      this.state = 'idle';
      this.score = 0;
      this.bestScore = this.readBestScore();
      this.food = options.food || null;
      this.reset();
    }

    reset() {
      const centerX = Math.floor(this.width / 2);
      const centerY = Math.floor(this.height / 2);
      this.worm = Array.from({ length: this.initialLength }, (_, index) => ({
        x: centerX - index,
        y: centerY
      }));
      this.direction = { ...DIRECTIONS.right };
      this.nextDirection = { ...DIRECTIONS.right };
      this.score = 0;
      this.state = 'idle';
      if (!this.food || this.worm.some((segment) => samePosition(segment, this.food))) this.placeFood();
    }

    start() {
      if (this.state === 'gameover') this.reset();
      if (this.state === 'idle' || this.state === 'paused') this.state = 'running';
      return this.snapshot();
    }

    pause() {
      if (this.state === 'running') this.state = 'paused';
      return this.snapshot();
    }

    restart() {
      this.reset();
      this.state = 'running';
      return this.snapshot();
    }

    setDirection(name) {
      const next = DIRECTIONS[name];
      if (!next || (next.x + this.direction.x === 0 && next.y + this.direction.y === 0)) return false;
      this.nextDirection = { ...next };
      return true;
    }

    tick() {
      if (this.state !== 'running') return this.snapshot();
      this.direction = { ...this.nextDirection };
      const head = this.worm[0];
      const nextHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };
      const hitsWall = nextHead.x < 0 || nextHead.x >= this.width || nextHead.y < 0 || nextHead.y >= this.height;
      const eatsFood = this.food && samePosition(nextHead, this.food);
      const bodyToCheck = eatsFood ? this.worm : this.worm.slice(0, -1);
      if (hitsWall || bodyToCheck.some((segment) => samePosition(segment, nextHead))) {
        this.state = 'gameover';
        this.bestScore = Math.max(this.bestScore, this.score);
        this.writeBestScore();
        return this.snapshot();
      }
      this.worm.unshift(nextHead);
      if (eatsFood) {
        this.score += 1;
        this.bestScore = Math.max(this.bestScore, this.score);
        this.writeBestScore();
        this.placeFood();
      } else {
        this.worm.pop();
      }
      return this.snapshot();
    }

    placeFood() {
      const open = [];
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const position = { x, y };
          if (!this.worm.some((segment) => samePosition(segment, position))) open.push(position);
        }
      }
      this.food = open.length ? open[Math.floor(this.random() * open.length)] : null;
    }

    readBestScore() {
      if (!this.storage || typeof this.storage.getItem !== 'function') return 0;
      return Number(this.storage.getItem(this.highScoreKey)) || 0;
    }

    writeBestScore() {
      if (this.storage && typeof this.storage.setItem === 'function') this.storage.setItem(this.highScoreKey, String(this.bestScore));
    }

    snapshot() {
      return {
        state: this.state,
        score: this.score,
        bestScore: this.bestScore,
        worm: this.worm.map((segment) => ({ ...segment })),
        food: this.food ? { ...this.food } : null,
        direction: { ...this.direction }
      };
    }
  }

  function createController(document, storage) {
    const board = document.querySelector('#game-board');
    if (!board) return null;
    const score = document.querySelector('#score');
    const bestScore = document.querySelector('#best-score');
    const status = document.querySelector('.game-status');
    const engine = new WormEngine({ storage });
    const cellCount = engine.width * engine.height;
    let timerId = null;

    board.style.gridTemplateRows = `repeat(${engine.height}, 1fr)`;
    for (let index = 0; index < cellCount; index += 1) {
      const cell = document.createElement('span');
      cell.className = 'game-cell';
      board.appendChild(cell);
    }

    function render() {
      const cells = board.children;
      for (const cell of cells) cell.className = 'game-cell';
      engine.worm.forEach((segment, index) => {
        const cell = cells[segment.y * engine.width + segment.x];
        if (cell) cell.className = index === 0 ? 'game-cell game-cell--worm-head' : 'game-cell game-cell--worm';
      });
      if (engine.food) {
        const foodCell = cells[engine.food.y * engine.width + engine.food.x];
        if (foodCell) foodCell.className = 'game-cell game-cell--food';
      }
      if (score) score.textContent = String(engine.score);
      if (bestScore) bestScore.textContent = String(engine.bestScore);
      if (status) status.textContent = ({ idle: 'Ready · Start to play', running: 'Playing · Move with arrows or WASD', paused: 'Paused · Press P or Resume to continue', gameover: 'Game over · Restart to try again' })[engine.state];
    }

    function stopLoop() {
      if (timerId !== null) window.clearInterval(timerId);
      timerId = null;
    }

    function startLoop() {
      if (timerId !== null) return;
      timerId = window.setInterval(() => { engine.tick(); render(); if (engine.state === 'gameover') stopLoop(); }, 150);
    }

    function start() { engine.start(); startLoop(); render(); }
    function pause() { engine.pause(); if (engine.state === 'paused') stopLoop(); render(); }
    function restart() { stopLoop(); engine.restart(); startLoop(); render(); }

    document.querySelectorAll('[data-game-action]').forEach((button) => {
      button.addEventListener('click', () => ({ start, pause, restart }[button.dataset.gameAction] || (() => {}))());
    });
    document.querySelectorAll('[data-direction]').forEach((button) => {
      button.addEventListener('pointerdown', () => { engine.setDirection(button.dataset.direction); if (engine.state === 'idle') start(); });
    });
    document.addEventListener('keydown', (event) => {
      const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
      if (event.key === 'p' || event.key === 'P') { event.preventDefault(); if (engine.state === 'running') pause(); else if (engine.state === 'paused') start(); return; }
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      engine.setDirection(direction);
      if (engine.state === 'idle') start();
    });
    render();
    return { engine, start, pause, restart, stopLoop };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => { window.wormGameController = createController(document, window.localStorage); });
  }

  return { WormEngine, createController, DIRECTIONS };
});
