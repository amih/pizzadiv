const Game = {
  state: null,
  distributeQueued: 0,
  cutQueued: 0,
  cutHistory: [],
  hasDistributed: false,
  lives: 3,
  distributeTimes: [],
  fastMode: false,
  levels: [],

  async init() {
    this.loadLives();
    await this.loadLevelsData();
    const saved = localStorage.getItem('pizzadiv_level');
    const startLevel = saved ? parseInt(saved, 10) : 1;
    this.loadLevel(startLevel);
    Input.init();
    Input.onCut = () => this.handleCut();
    Input.onDistribute = () => this.handleDistribute();
    Input.onCelebrationTap = () => this.handleOverlayTap();
    Input.onUndo = () => this.handleUndo();

    document.getElementById('undo-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleUndo();
    });
  },

  async loadLevelsData() {
    try {
      const resp = await fetch('levels.json?v=' + APP_VERSION);
      this.levels = await resp.json();
    } catch (e) {
      console.error('Failed to load levels.json', e);
      this.levels = [{ pizzas: 1, mice: 1, divisor: 2 }];
    }
  },

  saveLives() {
    localStorage.setItem('pizzadiv_lives', this.lives);
  },

  loadLives() {
    const saved = localStorage.getItem('pizzadiv_lives');
    this.lives = saved !== null ? parseInt(saved, 10) : 3;
  },

  resetLives() {
    this.lives = 3;
    this.saveLives();
    Render.updateLives(this.lives);
  },

  saveLevel(num) {
    localStorage.setItem('pizzadiv_level', num);
  },

  loadLevel(num) {
    const idx = num - 1;
    if (idx >= this.levels.length) {
      return this.loadLevel(this.levels.length);
    }
    if (num < 1) num = 1;

    const def = this.levels[idx];
    this.distributeQueued = 0;
    this.cutQueued = 0;
    this.cutHistory = [];
    this.hasDistributed = false;
    this.distributeTimes = [];
    this.fastMode = false;
    this.state = {
      level: num,
      divisor: def.divisor,
      pieces: [def.pizzas, 0, 0, 0, 0], // depth 0=whole, 1-4=subdivisions
      mice: def.mice,
      phase: 'READY',
    };

    this.saveLevel(num);
    Render.hideCelebration();
    Render.hideFailure();
    Render.hideGameOver();
    Render.hideUndoBtn();
    Render.updateLives(this.lives);
    Render.drawState(this.state);
  },

  resetToLevel1() {
    localStorage.removeItem('pizzadiv_level');
    this.resetLives();
    this.loadLevel(1);
  },

  updateUndoBtn() {
    if (this.cutHistory.length > 0 && !this.hasDistributed) {
      Render.showUndoBtn();
    } else {
      Render.hideUndoBtn();
    }
  },

  handleUndo() {
    if (this.cutHistory.length === 0 || this.hasDistributed || this.state.phase !== 'READY') return;
    const prev = this.cutHistory.pop();
    this.state.pieces = prev.pieces.slice();
    Render.drawPizzas(this.state);
    Render.updateHeader(this.state);
    this.updateUndoBtn();
  },

  handleCut() {
    if (this.state.phase === 'ANIMATING') {
      this.cutQueued++;
      Sound.tick();
      return;
    }

    if (this.state.phase !== 'READY') return;

    this.executeCut();
  },

  // Get prime factors of divisor, sorted largest first
  primeFactors(n) {
    const factors = [];
    let d = 2;
    while (d * d <= n) {
      while (n % d === 0) {
        factors.push(d);
        n /= d;
      }
      d++;
    }
    if (n > 1) factors.push(n);
    factors.sort((a, b) => b - a);
    return factors;
  },

  executeCut() {
    if (this.cutQueued > 0) this.cutQueued--;

    // Find first non-zero depth to cut
    let cutDepth = -1;
    for (let i = 0; i < this.state.pieces.length - 1; i++) {
      if (this.state.pieces[i] > 0) {
        cutDepth = i;
        break;
      }
    }

    if (cutDepth === -1) {
      this.updateUndoBtn();
      return;
    }

    // Save state before cut for undo
    this.cutHistory.push({
      pieces: this.state.pieces.slice(),
    });

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    const count = this.state.pieces[cutDepth];
    const divisor = this.state.divisor;
    const factors = this.primeFactors(divisor);

    // Update state: move pieces from cutDepth to cutDepth+1
    this.state.pieces[cutDepth] = 0;
    this.state.pieces[cutDepth + 1] += count * divisor;

    Sound.slice();
    Render.animateMultiStepCut(this.state, cutDepth, factors, count).then(() => {
      this.updateUndoBtn();
      this.afterAnimating();
    });
  },

  handleDistribute() {
    // Track swipe timestamps for fast mode
    const now = Date.now();
    this.distributeTimes.push(now);
    this.distributeTimes = this.distributeTimes.filter(t => now - t < 1500);
    if (this.distributeTimes.length >= 3) {
      this.fastMode = true;
    }

    if (!this.hasDistributed) {
      Render.hideUndoBtn();
    }

    if (this.state.phase === 'ANIMATING') {
      this.distributeQueued++;
      Sound.tick();
      Render.nudgeMice();
      return;
    }

    if (this.state.phase !== 'READY') return;

    this.executeDistribute();
  },

  executeDistribute() {
    if (this.distributeQueued > 0) this.distributeQueued--;

    this.hasDistributed = true;
    Render.hideUndoBtn();

    const available = this.totalPieces();
    if (available === 0) return;

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    const toDistribute = Math.min(available, this.state.mice);

    // Take pieces from shallowest depth first
    let remaining = toDistribute;
    for (let i = 0; i < this.state.pieces.length && remaining > 0; i++) {
      const take = Math.min(this.state.pieces[i], remaining);
      this.state.pieces[i] -= take;
      remaining -= take;
    }

    const isPartialRound = toDistribute < this.state.mice;
    const pieceDelay = this.fastMode ? 30 : 150;

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch(), pieceDelay).then(() => {
      if (isPartialRound) {
        if (this.hasUndistributableRemainder()) {
          this.autoDismissRemainder();
          return;
        }
        this.distributeQueued = 0;
        this.state.phase = 'LEVEL_FAILED';
        Input.enabled = true;
        Sound.cry();
        this.lives--;
        this.saveLives();
        Render.updateLives(this.lives);
        if (this.lives <= 0) {
          Render.showGameOver();
        } else {
          Render.showFailure();
        }
      } else if (this.distributeQueued > 0) {
        const noPiecesLeft = this.noPiecesLeft();
        if (noPiecesLeft) {
          this.distributeQueued = 0;
          this.state.phase = 'LEVEL_COMPLETE';
          Input.enabled = true;
          Render.showCelebration(this.state);
        } else {
          this.state.phase = 'READY';
          Input.enabled = true;
          this.executeDistribute();
        }
      } else {
        this.checkCompletion();
      }
    });
  },

  totalPieces() {
    return this.state.pieces.reduce((s, p) => s + p, 0);
  },

  noPiecesLeft() {
    return this.state.pieces.every(p => p === 0);
  },

  // Check if only the deepest level has pieces and they can't fill a round
  hasUndistributableRemainder() {
    const maxDepth = this.state.pieces.length - 1;
    // Has pieces only at the deepest level and count < mice
    const deepestOnly = this.state.pieces.slice(0, maxDepth).every(p => p === 0);
    return deepestOnly && this.state.pieces[maxDepth] > 0 && this.state.pieces[maxDepth] < this.state.mice;
  },

  autoDismissRemainder() {
    Sound.sparkle();
    Render.animateDismissRemainder(this.state).then(() => {
      // Clear all pieces
      for (let i = 0; i < this.state.pieces.length; i++) {
        this.state.pieces[i] = 0;
      }
      this.distributeQueued = 0;
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration(this.state);
    });
  },

  afterAnimating() {
    if (this.distributeQueued > 0) {
      this.state.phase = 'READY';
      Input.enabled = true;
      this.executeDistribute();
    } else if (this.cutQueued > 0) {
      this.state.phase = 'READY';
      Input.enabled = true;
      this.executeCut();
    } else {
      this.checkCompletion();
    }
  },

  checkCompletion() {
    if (this.noPiecesLeft()) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration(this.state);
    } else if (this.hasDistributed && this.hasUndistributableRemainder()) {
      this.autoDismissRemainder();
    } else {
      this.state.phase = 'READY';
      Input.enabled = true;
    }
  },

  handleGiveUp() {
    if (this.state.phase === 'ANIMATING') return;
    if (this.state.phase === 'LEVEL_COMPLETE') return;
    if (this.state.phase === 'LEVEL_FAILED') return;

    this.lives--;
    this.saveLives();
    Render.updateLives(this.lives);
    if (this.lives <= 0) {
      this.state.phase = 'LEVEL_FAILED';
      Render.showGameOver();
    } else {
      this.loadLevel(this.state.level);
    }
  },

  handleOverlayTap() {
    if (this.state.phase === 'LEVEL_COMPLETE') {
      this.loadLevel(this.state.level + 1);
    } else if (this.state.phase === 'LEVEL_FAILED') {
      if (this.lives <= 0) {
        this.resetLives();
        this.loadLevel(1);
      } else {
        this.loadLevel(this.state.level);
      }
    }
  },
};

Game.init();
