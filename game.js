const Game = {
  state: null,

  init() {
    this.loadLevel(1);
    Input.init();
    Input.onCut = () => this.handleCut();
    Input.onDistribute = () => this.handleDistribute();
    Input.onCelebrationTap = () => this.handleOverlayTap();
  },

  loadLevel(num) {
    const idx = num - 1;
    if (idx >= LEVELS.length) {
      return this.loadLevel(1);
    }

    const def = LEVELS[idx];
    this.state = {
      level: num,
      wholePizzas: def.pizzas,
      slices: 0,
      bits: 0,         // 1/100 of a pizza (slice cut into 10)
      mice: def.mice,
      phase: 'READY',
    };

    Render.hideCelebration();
    Render.hideFailure();
    Render.drawState(this.state);
  },

  handleCut() {
    if (this.state.phase !== 'READY') return;

    // Cut largest available: whole pizzas → slices, or slices → bits
    if (this.state.wholePizzas > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.slices += this.state.wholePizzas * 10;
      this.state.wholePizzas = 0;
      Sound.slice();
      Render.animateCut(this.state, 'pizza').then(() => {
        this.checkCompletion();
      });
    } else if (this.state.slices > 0) {
      this.state.phase = 'ANIMATING';
      Input.enabled = false;
      this.state.bits += this.state.slices * 10;
      this.state.slices = 0;
      Sound.slice();
      Render.animateCut(this.state, 'slice').then(() => {
        this.checkCompletion();
      });
    }
    // bits can't be cut further (for now)
  },

  handleDistribute() {
    if (this.state.phase !== 'READY') return;

    const available = this.state.wholePizzas + this.state.slices + this.state.bits;
    if (available === 0) return;

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    const toDistribute = Math.min(available, this.state.mice);

    // Use whole pizzas first, then slices, then bits
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

    console.log('distribute:', { toDistribute, fromWhole, fromSlice, fromBits, remaining: this.state });

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch()).then(() => {
      if (isPartialRound) {
        this.state.phase = 'LEVEL_FAILED';
        Input.enabled = true;
        Sound.cry();
        Render.showFailure();
      } else {
        this.checkCompletion();
      }
    });
  },

  checkCompletion() {
    const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0 && this.state.bits === 0;
    console.log('checkCompletion v1.1.0:', { noPiecesLeft, wholePizzas: this.state.wholePizzas, slices: this.state.slices, bits: this.state.bits });

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
