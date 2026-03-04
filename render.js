const Render = {
  pizzaArea: document.getElementById('pizza-area'),
  mouseTray: document.getElementById('mouse-tray'),
  levelLabel: document.getElementById('level-label'),
  pizzaCount: document.getElementById('pizza-count'),
  miceCount: document.getElementById('mice-count'),
  celebration: document.getElementById('celebration'),
  failure: document.getElementById('failure'),
  knife: document.getElementById('knife'),

  drawState(state) {
    this.levelLabel.textContent = `Level ${state.level}`;
    this.updateHeader(state);
    this.drawPizzas(state);
    this.drawMice(state);
  },

  updateHeader(state) {
    // Pizza count
    const total = state.wholePizzas + state.slices + state.bits;
    if (state.wholePizzas > 0 && state.slices === 0 && state.bits === 0) {
      this.pizzaCount.textContent = `\u00D7 ${state.wholePizzas}`;
    } else if (total > 0) {
      const parts = [];
      if (state.wholePizzas > 0) parts.push(`${state.wholePizzas} whole`);
      if (state.slices > 0) parts.push(`${state.slices} slices`);
      if (state.bits > 0) parts.push(`${state.bits} bits`);
      this.pizzaCount.textContent = parts.join(' + ');
    } else {
      this.pizzaCount.textContent = 'All gone!';
    }
    // Mice count
    this.miceCount.textContent = `\u00D7 ${state.mice}`;
  },

  drawPizzas(state) {
    this.pizzaArea.innerHTML = '';

    for (let i = 0; i < state.wholePizzas; i++) {
      const pizza = document.createElement('div');
      pizza.className = 'pizza';
      this.pizzaArea.appendChild(pizza);
    }

    if (state.slices > 0) {
      const fullGroups = Math.floor(state.slices / 10);
      const remainder = state.slices % 10;
      for (let g = 0; g < fullGroups; g++) {
        this.pizzaArea.appendChild(this.createSliceGroup(10));
      }
      if (remainder > 0) {
        this.pizzaArea.appendChild(this.createSliceGroup(remainder));
      }
    }

    if (state.bits > 0) {
      this.pizzaArea.appendChild(this.createBitGroup(state.bits));
    }
  },

  createSliceGroup(count) {
    const group = document.createElement('div');
    group.className = 'slice-group';
    for (let i = 0; i < count; i++) {
      const slice = document.createElement('div');
      slice.className = 'slice';
      group.appendChild(slice);
    }
    return group;
  },

  createBitGroup(count) {
    const group = document.createElement('div');
    group.className = 'bit-group';
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('div');
      bit.className = 'bit';
      group.appendChild(bit);
    }
    return group;
  },

  drawMice(state) {
    this.mouseTray.innerHTML = '';
    this.mouseTray.dataset.count = state.mice;

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

      // Position mice for odd subitizing patterns
      if (state.mice === 3 && i === 0) {
        // Triangle: first mouse centered across 2 columns
        mouse.style.gridColumn = '1 / 3';
        mouse.style.justifySelf = 'center';
      } else if (state.mice === 5) {
        // Quincunx on 3-col grid: corners + center
        // Row 1: col 1, col 3; Row 2: col 2; Row 3: col 1, col 3
        const positions = [
          { col: '1', row: '1' },
          { col: '3', row: '1' },
          { col: '2', row: '2' },
          { col: '1', row: '3' },
          { col: '3', row: '3' },
        ];
        mouse.style.gridColumn = positions[i].col;
        mouse.style.gridRow = positions[i].row;
      } else if (state.mice === 7) {
        // 3 top, 1 centered, 3 bottom
        if (i === 3) {
          mouse.style.gridColumn = '1 / 4';
          mouse.style.justifySelf = 'center';
        }
      }

      this.mouseTray.appendChild(mouse);
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

  animateCut(state, what) {
    return new Promise((resolve) => {
      this.knife.classList.add('cutting');

      const targets = what === 'pizza'
        ? this.pizzaArea.querySelectorAll('.pizza')
        : this.pizzaArea.querySelectorAll('.slice');

      setTimeout(() => {
        targets.forEach((el) => {
          const shing = document.createElement('div');
          shing.className = 'shing-effect';
          el.appendChild(shing);
        });
      }, 150);

      setTimeout(() => {
        this.knife.classList.remove('cutting');
        this.drawPizzas(state);
        const groups = this.pizzaArea.querySelectorAll('.slice-group, .bit-group');
        groups.forEach((g) => g.classList.add('cutting'));
        setTimeout(resolve, 500);
      }, 500);
    });
  },

  animateDistributeRound(state, toDistribute, isPartial, onMunch) {
    return new Promise((resolve) => {
      const mouseEls = this.mouseTray.querySelectorAll('.mouse');
      const pizzaEls = Array.from(this.pizzaArea.querySelectorAll('.pizza'));
      const sliceEls = Array.from(this.pizzaArea.querySelectorAll('.slice'));
      const bitEls = Array.from(this.pizzaArea.querySelectorAll('.bit'));
      const allPieces = [...pizzaEls, ...sliceEls, ...bitEls];

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
                // Remove distributed pieces from DOM (don't full redraw)
                allPieces.slice(0, toDistribute).forEach((p) => p.remove());
                // Clean up empty groups
                this.pizzaArea.querySelectorAll('.slice-group, .bit-group').forEach((g) => {
                  if (g.children.length === 0) g.remove();
                });
                // Update header only
                this.updateHeader(state);
                resolve();
              }, 200);
            }
          }, 450);
        }, i * 150);
      }

      if (toDistribute === 0) resolve();
    });
  },

  showCelebration() {
    this.celebration.classList.remove('hidden');
    void this.celebration.offsetWidth;
    this.celebration.classList.add('visible');
    this.spawnConfetti();
  },

  hideCelebration() {
    this.celebration.classList.remove('visible');
    this.celebration.classList.add('hidden');
    document.querySelectorAll('.confetti').forEach((c) => c.remove());
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
