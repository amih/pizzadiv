const Game = {
  state: null,

  init() {
    this.loadLevel(1);
    Input.init();
    Input.onCut = () => this.handleCut();
    Input.onDistribute = () => this.handleDistribute();
    Input.onCelebrationTap = () => this.nextLevel();
  },

  loadLevel(num) {
    const idx = num - 1;
    if (idx >= LEVELS.length) {
      // Wrap around or show "all done" — for now, wrap
      return this.loadLevel(1);
    }

    const def = LEVELS[idx];
    this.state = {
      level: num,
      wholePizzas: def.pizzas,
      slices: 0,
      mice: def.mice,
      fedMice: 0,
      phase: 'READY',
    };

    Render.hideCelebration();
    Render.drawState(this.state);
  },

  handleCut() {
    if (this.state.phase !== 'READY') return;
    if (this.state.wholePizzas === 0) return; // nothing to cut

    this.state.phase = 'ANIMATING';
    Input.enabled = false;

    // Convert whole pizzas to slices
    this.state.slices += this.state.wholePizzas * 10;
    this.state.wholePizzas = 0;

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

    const unfed = this.state.mice - this.state.fedMice;
    const toFeed = Math.min(available, unfed);
    const startFedIndex = this.state.fedMice;

    // Determine which pieces get used: whole pizzas first, then slices
    let piecesFromWhole = Math.min(this.state.wholePizzas, toFeed);
    let piecesFromSlice = toFeed - piecesFromWhole;

    this.state.wholePizzas -= piecesFromWhole;
    this.state.slices -= piecesFromSlice;
    this.state.fedMice += toFeed;

    Render.animateDistribute(this.state, toFeed, startFedIndex).then(() => {
      this.checkCompletion();
    });
  },

  checkCompletion() {
    if (this.state.fedMice >= this.state.mice) {
      this.state.phase = 'LEVEL_COMPLETE';
      Input.enabled = true;
      Render.showCelebration();
    } else {
      this.state.phase = 'READY';
      Input.enabled = true;
    }
  },

  nextLevel() {
    this.loadLevel(this.state.level + 1);
  },
};

Game.init();
