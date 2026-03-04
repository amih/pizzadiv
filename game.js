const Game = {
  state: null,
  distributeQueued: 0,
  cutQueued: 0,
  cutHistory: [],
  hasDistributed: false,
  lives: 3,

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
      // All levels done — stay on last level complete or wrap
      return this.loadLevel(LEVELS.length);
    }
    if (num < 1) num = 1;

    const def = LEVELS[idx];
    this.distributeQueued = 0;
    this.cutQueued = 0;
    this.cutHistory = [];
    this.hasDistributed = false;
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
    Render.updateLives(this.lives);
    Render.drawState(this.state);
  },

  resetToLevel1() {
    localStorage.removeItem('pizzadiv_level');
    this.resetLives();
    this.loadLevel(1);
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
        this.afterAnimating();
      });
    } else if (this.state.slices > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.bits += this.state.slices * 10;
      this.state.slices = 0;
      Sound.slice();
      Render.animateCut(this.state, 'slice').then(() => {
        this.afterAnimating();
      });
    } else if (this.state.bits > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.crumbs += this.state.bits * 10;
      this.state.bits = 0;
      Sound.slice();
      Render.animateCut(this.state, 'bit').then(() => {
        this.afterAnimating();
      });
    } else if (this.state.crumbs > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.specks += this.state.crumbs * 10;
      this.state.crumbs = 0;
      Sound.slice();
      Render.animateCut(this.state, 'crumb').then(() => {
        this.afterAnimating();
      });
    } else {
      // Nothing to cut — remove the history entry we just pushed
      this.cutHistory.pop();
    }
  },

  handleDistribute() {
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

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch()).then(() => {
      if (isPartialRound) {
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
        const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0 && this.state.bits === 0 && this.state.crumbs === 0 && this.state.specks === 0;
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
    const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0 && this.state.bits === 0 && this.state.crumbs === 0 && this.state.specks === 0;

    if (noPiecesLeft) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration(this.state);
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
        // Game over — reset lives and level
        this.resetLives();
        this.loadLevel(1);
      } else {
        this.loadLevel(this.state.level);
      }
    }
  },
};

Game.init();
