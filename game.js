const Game = {
  state: null,
  distributeQueued: 0,
  cutQueued: 0,
  cutHistory: [],
  hasDistributed: false,
  lives: 3,
  distributeTimes: [],
  fastMode: false,

  init() {
    this.loadLives();
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
    if (idx >= LEVELS.length) {
      return this.loadLevel(LEVELS.length);
    }
    if (num < 1) num = 1;

    const def = LEVELS[idx];
    this.distributeQueued = 0;
    this.cutQueued = 0;
    this.cutHistory = [];
    this.hasDistributed = false;
    this.distributeTimes = [];
    this.fastMode = false;
    this.state = {
      level: num,
      wholePizzas: def.pizzas,
      slices: 0,
      bits: 0,
      crumbs: 0,
      specks: 0,
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
    this.state.wholePizzas = prev.wholePizzas;
    this.state.slices = prev.slices;
    this.state.bits = prev.bits;
    this.state.crumbs = prev.crumbs;
    this.state.specks = prev.specks;
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

  executeCut() {
    if (this.cutQueued > 0) this.cutQueued--;

    // Save state before cut for undo
    this.cutHistory.push({
      wholePizzas: this.state.wholePizzas,
      slices: this.state.slices,
      bits: this.state.bits,
      crumbs: this.state.crumbs,
      specks: this.state.specks,
    });

    if (this.state.wholePizzas > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.slices += this.state.wholePizzas * 10;
      this.state.wholePizzas = 0;
      Sound.slice();
      Render.animateCut(this.state, 'pizza').then(() => {
        this.updateUndoBtn();
        this.afterAnimating();
      });
    } else if (this.state.slices > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.bits += this.state.slices * 10;
      this.state.slices = 0;
      Sound.slice();
      Render.animateCut(this.state, 'slice').then(() => {
        this.updateUndoBtn();
        this.afterAnimating();
      });
    } else if (this.state.bits > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.crumbs += this.state.bits * 10;
      this.state.bits = 0;
      Sound.slice();
      Render.animateCut(this.state, 'bit').then(() => {
        this.updateUndoBtn();
        this.afterAnimating();
      });
    } else if (this.state.crumbs > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.specks += this.state.crumbs * 10;
      this.state.crumbs = 0;
      Sound.slice();
      Render.animateCut(this.state, 'crumb').then(() => {
        this.updateUndoBtn();
        this.afterAnimating();
      });
    } else {
      // Nothing to cut — remove the history entry we just pushed
      this.cutHistory.pop();
      this.updateUndoBtn();
    }
  },

  handleDistribute() {
    // Track swipe timestamps for fast mode
    const now = Date.now();
    this.distributeTimes.push(now);
    // Keep only last 1.5s
    this.distributeTimes = this.distributeTimes.filter(t => now - t < 1500);
    if (this.distributeTimes.length >= 3) {
      this.fastMode = true;
    }

    // Hide undo on first distribute
    if (!this.hasDistributed) {
      Render.hideUndoBtn();
    }

    // Queue distribute if already animating
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

    const available = this.state.wholePizzas + this.state.slices + this.state.bits + this.state.crumbs + this.state.specks;
    if (available === 0) return;

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    const toDistribute = Math.min(available, this.state.mice);

    let remaining = toDistribute;
    let fromWhole = Math.min(this.state.wholePizzas, remaining);
    remaining -= fromWhole;
    let fromSlice = Math.min(this.state.slices, remaining);
    remaining -= fromSlice;
    let fromBits = Math.min(this.state.bits, remaining);
    remaining -= fromBits;
    let fromCrumbs = Math.min(this.state.crumbs, remaining);
    remaining -= fromCrumbs;
    let fromSpecks = Math.min(this.state.specks, remaining);

    this.state.wholePizzas -= fromWhole;
    this.state.slices -= fromSlice;
    this.state.bits -= fromBits;
    this.state.crumbs -= fromCrumbs;
    this.state.specks -= fromSpecks;

    const isPartialRound = toDistribute < this.state.mice;
    const pieceDelay = this.fastMode ? 30 : 150;

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch(), pieceDelay).then(() => {
      if (isPartialRound) {
        // Check if remainder is only specks (can't cut further) — auto-dismiss
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

  noPiecesLeft() {
    return this.state.wholePizzas === 0 && this.state.slices === 0 &&
           this.state.bits === 0 && this.state.crumbs === 0 && this.state.specks === 0;
  },

  autoDismissRemainder() {
    // Animate remaining specks off screen, then complete the level
    Sound.sparkle();
    Render.animateDismissRemainder(this.state).then(() => {
      this.state.specks = 0;
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

  // Check if only specks remain and they can't fill a round for all mice
  hasUndistributableRemainder() {
    return this.state.specks > 0 && this.state.specks < this.state.mice &&
           this.state.wholePizzas === 0 && this.state.slices === 0 &&
           this.state.bits === 0 && this.state.crumbs === 0;
  },

  checkCompletion() {
    if (this.noPiecesLeft()) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration(this.state);
    } else if (this.hasDistributed && this.hasUndistributableRemainder()) {
      // Last possible cut done, remainder too small — auto-dismiss
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
