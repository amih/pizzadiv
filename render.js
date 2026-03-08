const Render = {
  pizzaArea: document.getElementById('pizza-area'),
  mouseTray: document.getElementById('mouse-tray'),
  levelLabel: document.getElementById('level-label'),
  pizzaCount: document.getElementById('pizza-count'),
  miceCount: document.getElementById('mice-count'),
  celebration: document.getElementById('celebration'),
  failure: document.getElementById('failure'),
  knife: document.getElementById('knife'),
  livesDisplay: document.getElementById('lives-display'),
  gameOver: document.getElementById('game-over'),
  fractionDisplay: document.getElementById('fraction-display'),
  undoBtn: document.getElementById('undo-btn'),

  // Piece sizes by depth (px)
  PIECE_SIZES: [120, 40, 15, 8, 4],
  PIECE_LABELS: ['whole', 'piece', 'bit', 'crumb', 'speck'],

  drawState(state) {
    this.levelLabel.textContent = `Level ${state.level}`;
    this.updateHeader(state);
    this.drawPizzas(state);
    this.drawMice(state);
  },

  updateHeader(state) {
    const total = state.pieces.reduce((s, p) => s + p, 0);
    if (state.pieces[0] > 0 && state.pieces.slice(1).every(p => p === 0)) {
      this.pizzaCount.textContent = `\u00D7 ${state.pieces[0]}`;
    } else if (total > 0) {
      const parts = [];
      state.pieces.forEach((count, depth) => {
        if (count > 0) {
          parts.push(`${count} ${this.PIECE_LABELS[depth]}${count > 1 ? 's' : ''}`);
        }
      });
      this.pizzaCount.textContent = parts.join(' + ');
    } else {
      this.pizzaCount.textContent = 'All gone!';
    }
    this.miceCount.textContent = `\u00D7 ${state.mice}`;
  },

  updateLives(lives) {
    if (this.livesDisplay) {
      this.livesDisplay.textContent = '\u2665'.repeat(Math.max(0, lives));
    }
  },

  showUndoBtn() {
    if (this.undoBtn) this.undoBtn.classList.add('visible');
  },

  hideUndoBtn() {
    if (this.undoBtn) this.undoBtn.classList.remove('visible');
  },

  drawPizzas(state) {
    this.pizzaArea.innerHTML = '';

    // Depth 0: whole pizzas — stacked diagonally if more than 1
    if (state.pieces[0] > 0) {
      if (state.pieces[0] > 1) {
        const stack = document.createElement('div');
        stack.className = 'pizza-stack';
        const offset = 8 * (state.pieces[0] - 1);
        stack.style.width = `calc(120px + ${offset}px)`;
        stack.style.height = `calc(120px + ${offset}px)`;
        for (let i = state.pieces[0] - 1; i >= 0; i--) {
          const pizza = document.createElement('div');
          pizza.className = 'pizza';
          pizza.style.transform = `translate(${8 * i}px, ${8 * i}px)`;
          pizza.style.zIndex = state.pieces[0] - i;
          stack.appendChild(pizza);
        }
        this.pizzaArea.appendChild(stack);
      } else {
        const pizza = document.createElement('div');
        pizza.className = 'pizza';
        this.pizzaArea.appendChild(pizza);
      }
    }

    // Depths 1-4: piece groups
    for (let depth = 1; depth < state.pieces.length; depth++) {
      const count = state.pieces[depth];
      if (count <= 0) continue;

      const divisor = state.divisor;
      // Group pieces into sets of `divisor` (like a reconstituted pizza)
      const fullGroups = Math.floor(count / divisor);
      const remainder = count % divisor;

      for (let g = 0; g < fullGroups; g++) {
        this.pizzaArea.appendChild(this.createPieceGroup(divisor, depth, state.divisor));
      }
      if (remainder > 0) {
        this.pizzaArea.appendChild(this.createPieceGroup(remainder, depth, state.divisor));
      }
    }
  },

  createPieceGroup(count, depth, divisor) {
    const group = document.createElement('div');
    group.className = 'piece-group';
    group.dataset.depth = depth;

    const size = this.PIECE_SIZES[depth] || 4;
    // Set group size based on depth
    const groupSize = depth === 1 ? 120 : (depth === 2 ? 80 : (depth === 3 ? 60 : 50));
    group.style.width = groupSize + 'px';
    group.style.height = groupSize + 'px';
    group.style.position = 'relative';

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = `piece depth-${depth}`;
      group.appendChild(piece);
    }

    // Apply subitizing pattern
    if (count <= 10) {
      applyPattern(group, count, size);
    }

    return group;
  },

  drawMice(state) {
    this.mouseTray.innerHTML = '';
    this.mouseTray.dataset.count = state.mice;

    // Use absolute positioning with subitizing patterns
    this.mouseTray.style.position = 'relative';

    for (let i = 0; i < state.mice; i++) {
      const mouse = document.createElement('div');
      mouse.className = 'mouse';
      mouse.dataset.index = i;
      mouse.innerHTML = `
        <div class="mouse-ears">
          <div class="mouse-ear"></div>
          <div class="mouse-ear"></div>
        </div>
        <div class="mouse-body">
          <div class="mouse-eyes">
            <div class="mouse-eye"></div>
            <div class="mouse-eye"></div>
          </div>
          <div class="mouse-nose"></div>
          <div class="mouse-whiskers">
            <div class="mouse-whisker left-top"></div>
            <div class="mouse-whisker left-bottom"></div>
            <div class="mouse-whisker right-top"></div>
            <div class="mouse-whisker right-bottom"></div>
          </div>
        </div>
      `;
      this.mouseTray.appendChild(mouse);
    }

    // Apply subitizing pattern to mice
    const mouseCount = Math.min(state.mice, 10);
    if (mouseCount > 0) {
      applyPattern(this.mouseTray, mouseCount, 44);
    }
  },

  nudgeMice() {
    const mice = this.mouseTray.querySelectorAll('.mouse');
    mice.forEach((m) => {
      m.classList.remove('nudge');
      void m.offsetWidth;
      m.classList.add('nudge');
    });
  },

  // Multi-step cut animation: sequential cut lines on each pizza one at a time
  animateMultiStepCut(state, cutDepth, factors, pieceCount) {
    return new Promise((resolve) => {
      const targetSel = cutDepth === 0 ? '.pizza:not(.distributed)' : `.piece.depth-${cutDepth}:not(.distributed)`;
      const targets = Array.from(this.pizzaArea.querySelectorAll(targetSel));
      const divisor = state.divisor;
      const numCuts = divisor - 1;
      const lineInterval = 150;

      // Process each target sequentially, with numCuts lines each
      let delay = 0;
      targets.forEach((target) => {
        for (let i = 0; i < numCuts; i++) {
          setTimeout(() => {
            this.knife.classList.remove('cutting-step');
            void this.knife.offsetWidth;
            this.knife.classList.add('cutting-step');

            const line = document.createElement('div');
            line.className = 'cut-line';
            line.style.top = ((i + 1) / divisor * 100) + '%';
            target.appendChild(line);
          }, delay);
          delay += lineInterval;
        }
      });

      const totalLineTime = delay;

      // Shing effect after all lines
      setTimeout(() => {
        targets.forEach((el) => {
          const shing = document.createElement('div');
          shing.className = 'shing-effect';
          el.appendChild(shing);
        });
      }, totalLineTime + 100);

      // Redraw with new state
      setTimeout(() => {
        this.knife.classList.remove('cutting-step');
        this.drawPizzas(state);
        const newGroups = this.pizzaArea.querySelectorAll('.piece-group');
        newGroups.forEach((g) => g.classList.add('cutting'));
        this.updateHeader(state);
        setTimeout(resolve, 500);
      }, totalLineTime + 400);
    });
  },

  animateDistributeRound(state, toDistribute, isPartial, onMunch, pieceDelay = 150) {
    return new Promise((resolve) => {
      const mouseEls = this.mouseTray.querySelectorAll('.mouse');
      // Gather all individual pieces across all types
      const pizzaEls = Array.from(this.pizzaArea.querySelectorAll('.pizza:not(.distributed)'));
      const pieceEls = Array.from(this.pizzaArea.querySelectorAll('.piece:not(.distributed)'));
      const allPieces = [...pizzaEls, ...pieceEls];

      // Snapshot ALL positions first, then apply absolute
      const areaRect = this.pizzaArea.getBoundingClientRect();
      const topChildren = Array.from(this.pizzaArea.children);
      const rects = topChildren.map((el) => el.getBoundingClientRect());
      topChildren.forEach((el, i) => {
        const r = rects[i];
        el.style.position = 'absolute';
        el.style.left = (r.left - areaRect.left) + 'px';
        el.style.top = (r.top - areaRect.top) + 'px';
        el.style.width = r.width + 'px';
      });

      let animated = 0;

      for (let i = 0; i < toDistribute; i++) {
        const piece = allPieces[i];
        const mouseEl = mouseEls[i];
        if (!piece || !mouseEl) continue;

        const pieceRect = piece.getBoundingClientRect();
        const mouseRect = mouseEl.getBoundingClientRect();
        const dx = mouseRect.left + mouseRect.width / 2 - (pieceRect.left + pieceRect.width / 2);
        const dy = mouseRect.top + mouseRect.height / 2 - (pieceRect.top + pieceRect.height / 2);

        piece.style.setProperty('--fly-x', `${dx}px`);
        piece.style.setProperty('--fly-y', `${dy}px`);

        setTimeout(() => {
          piece.classList.add('distributing');

          setTimeout(() => {
            mouseEl.classList.add('eating');
            if (onMunch) onMunch();
            setTimeout(() => mouseEl.classList.remove('eating'), 400);

            animated++;
            if (animated === toDistribute) {
              setTimeout(() => {
                allPieces.slice(0, toDistribute).forEach((p) => {
                  p.classList.add('distributed');
                  p.style.pointerEvents = 'none';
                });
                this.updateHeader(state);
                resolve();
              }, 200);
            }
          }, 450);
        }, i * pieceDelay);
      }

      if (toDistribute === 0) resolve();
    });
  },

  animateDismissRemainder(state) {
    return new Promise((resolve) => {
      const pieces = this.pizzaArea.querySelectorAll('.piece:not(.distributed), .pizza:not(.distributed)');
      if (pieces.length === 0) { resolve(); return; }

      pieces.forEach((p, i) => {
        setTimeout(() => {
          p.classList.add('dismissing');
        }, i * 20);
      });

      setTimeout(() => {
        this.pizzaArea.innerHTML = '';
        this.updateHeader(state);
        resolve();
      }, 600);
    });
  },

  getPieceBreakdown(pizzas, mice, divisor) {
    const pieces = [];
    const depthSizes = [22, 14, 8, 5, 3];
    let remainder = pizzas;
    for (let depth = 0; depth < 5 && remainder > 0; depth++) {
      const count = Math.floor(remainder / mice);
      remainder = (remainder % mice) * divisor;
      if (count > 0) {
        pieces.push({ depth, count, size: depthSizes[depth] });
      }
    }
    return pieces;
  },

  showCelebration(state) {
    if (this.fractionDisplay && state) {
      const def = Game.levels[state.level - 1];
      const pizzas = def.pizzas;
      const mice = def.mice;
      const divisor = def.divisor;
      // Cuts display (knife icon + divisor)
      let cutsHTML = '';
      if (Game.cutHistory.length > 0) {
        cutsHTML = `
          <div class="cuts-display">
            <div class="mini-knife-icon">
              <div class="mk-blade"></div>
              <div class="mk-handle"></div>
            </div>
            <span class="cuts-count">&times; ${divisor}</span>
          </div>
        `;
      }

      let topHTML = '';
      for (let i = 0; i < pizzas; i++) {
        topHTML += '<div class="mini-pizza"></div>';
      }

      let bottomHTML = '';
      for (let i = 0; i < mice; i++) {
        bottomHTML += `<div class="mini-mouse-icon">
          <div class="hm-ears"><div class="hm-ear"></div><div class="hm-ear"></div></div>
          <div class="hm-body"></div>
        </div>`;
      }

      const pieces = this.getPieceBreakdown(pizzas, mice, divisor);
      let resultHTML = '';
      pieces.forEach((p) => {
        let iconsHTML = '';
        for (let i = 0; i < p.count; i++) {
          const cls = p.depth === 0 ? 'mini-pizza' : `mini-piece depth-${p.depth}`;
          iconsHTML += `<div class="${cls}"></div>`;
        }
        resultHTML += `<div class="result-piece-group">${iconsHTML}</div>`;
      });

      this.fractionDisplay.innerHTML = `
        ${cutsHTML}
        <div class="fraction">
          <div class="fraction-top">${topHTML}</div>
          <div class="fraction-line"></div>
          <div class="fraction-bottom">${bottomHTML}</div>
        </div>
        <div class="fraction-equals">=</div>
        <div class="fraction-result-pieces">${resultHTML}</div>
      `;

      // Apply subitizing pattern to mice in denominator
      const fractionBottom = this.fractionDisplay.querySelector('.fraction-bottom');
      if (mice >= 2 && mice <= 10) {
        fractionBottom.classList.add('subitized');
        const w = Math.max(50, Math.min(110, mice * 18));
        const h = mice <= 2 ? 30 : (mice <= 5 ? 45 : 55);
        fractionBottom.style.width = w + 'px';
        fractionBottom.style.height = h + 'px';
        applyPattern(fractionBottom, mice, 18);
      }
    }

    this.celebration.classList.remove('hidden');
    void this.celebration.offsetWidth;
    this.celebration.classList.add('visible');
    this.spawnConfetti();
  },

  hideCelebration() {
    this.celebration.classList.remove('visible');
    this.celebration.classList.add('hidden');
    document.querySelectorAll('.confetti').forEach((c) => c.remove());
    if (this.fractionDisplay) this.fractionDisplay.innerHTML = '';
  },

  showFailure() {
    const mice = this.mouseTray.querySelectorAll('.mouse:not(.eating)');
    mice.forEach((m) => {
      m.classList.add('crying');
      const body = m.querySelector('.mouse-body');
      const tearL = document.createElement('div');
      tearL.className = 'mouse-tear left';
      const tearR = document.createElement('div');
      tearR.className = 'mouse-tear right';
      body.appendChild(tearL);
      body.appendChild(tearR);
    });

    setTimeout(() => {
      this.failure.classList.remove('hidden');
      void this.failure.offsetWidth;
      this.failure.classList.add('visible');
    }, 800);
  },

  hideFailure() {
    this.failure.classList.remove('visible');
    this.failure.classList.add('hidden');
  },

  showGameOver() {
    this.gameOver.classList.remove('hidden');
    void this.gameOver.offsetWidth;
    this.gameOver.classList.add('visible');
  },

  hideGameOver() {
    this.gameOver.classList.remove('visible');
    this.gameOver.classList.add('hidden');
  },

  spawnConfetti() {
    const colors = ['#F4A83D', '#E53935', '#A5D6A7', '#FFD54F', '#F48FB1', '#90CAF9'];
    for (let i = 0; i < 30; i++) {
      const conf = document.createElement('div');
      conf.className = 'confetti';
      conf.style.left = Math.random() * 100 + '%';
      conf.style.top = '-10px';
      conf.style.background = colors[Math.floor(Math.random() * colors.length)];
      conf.style.animationDelay = Math.random() * 0.8 + 's';
      conf.style.animationDuration = (1 + Math.random()) + 's';
      conf.style.width = (6 + Math.random() * 8) + 'px';
      conf.style.height = (6 + Math.random() * 8) + 'px';
      conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      this.celebration.appendChild(conf);
    }
  },
};
