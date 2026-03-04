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
      mice: def.mice,
      phase: 'READY',
    };

    Render.hideCelebration();
    Render.hideFailure();
    Render.drawState(this.state);
  },

  handleCut() {
    if (this.state.phase !== 'READY') return;
    if (this.state.wholePizzas === 0) return;

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    this.state.slices += this.state.wholePizzas * 10;
    this.state.wholePizzas = 0;

    Sound.slice();
    Render.animateCut(this.state).then(() => {
      this.checkCompletion();
    });
  },

  handleDistribute() {
    if (this.state.phase !== 'READY') return;

    const available = this.state.wholePizzas + this.state.slices;
    if (available === 0) return;

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    // Each round: one piece per mouse (or fewer if not enough pieces)
    const toDistribute = Math.min(available, this.state.mice);

    // Use whole pizzas first, then slices
    let fromWhole = Math.min(this.state.wholePizzas, toDistribute);
    let fromSlice = toDistribute - fromWhole;

    this.state.wholePizzas -= fromWhole;
    this.state.slices -= fromSlice;

    // Partial round = failure (not enough pieces for all mice)
    const isPartialRound = toDistribute < this.state.mice;

    Render.animateDistributeRound(this.state, toDistribute, isPartialRound, () => Sound.munch()).then(() => {
      if (isPartialRound) {
        // Some mice didn't get food this round
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
    const noPiecesLeft = this.state.wholePizzas === 0 && this.state.slices === 0;

    if (noPiecesLeft) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration();
    } else {
      // More pieces remain — player needs to distribute again
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
