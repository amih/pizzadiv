const Game = {
  state: null,
  distributeQueued: 0,
  cutQueued: 0,

  init() {
    const saved = localStorage.getItem('pizzamath_level');
    const startLevel = saved ? parseInt(saved, 10) : 1;
    this.loadLevel(startLevel);
    Input.init();
    Input.onCut = () => this.handleCut();
    Input.onDistribute = () => this.handleDistribute();
    Input.onCelebrationTap = () => this.handleOverlayTap();
  },

  saveLevel(num) {
    localStorage.setItem('pizzamath_level', num);
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
    this.state = {
      level: num,
      wholePizzas: def.pizzas,
      slices: 0,
      bits: 0,
      mice: def.mice,
      phase: 'READY',
    };

    this.saveLevel(num);
    Render.hideCelebration();
    Render.hideFailure();
    Render.drawState(this.state);
  },

  resetToLevel1() {
    localStorage.removeItem('pizzamath_level');
    this.loadLevel(1);
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

    const available = this.state.wholePizzas + this.state.slices + this.state.bits;
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

    this.state.wholePizzas -= fromWhole;
    this.state.slices -= fromSlice;
    this.state.bits -= fromBits;

    const isPartialRound = toDistribute < this.state.mice;

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch()).then(() => {
      if (isPartialRound) {
        this.distributeQueued = 0;
        this.state.phase = 'LEVEL_FAILED';
        Input.enabled = true;
        Sound.cry();
        Render.showFailure();
      } else if (this.distributeQueued > 0) {
        const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0 && this.state.bits === 0;
        if (noPiecesLeft) {
          this.distributeQueued = 0;
          this.state.phase = 'LEVEL_COMPLETE';
          Input.enabled = true;
          Render.showCelebration();
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
    const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0 && this.state.bits === 0;
    console.log('checkCompletion v1.4.0:', JSON.stringify({ noPiecesLeft, wholePizzas: this.state.wholePizzas, slices: this.state.slices, bits: this.state.bits }));

    if (noPiecesLeft) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration();
    } else {
      this.state.phase = 'READY';
      Input.enabled = true;
    }
  },

  handleOverlayTap() {
    if (this.state.phase === 'LEVEL_COMPLETE') {
      this.loadLevel(this.state.level + 1);
    } else if (this.state.phase === 'LEVEL_FAILED') {
      this.loadLevel(this.state.level);
    }
  },
};

Game.init();
