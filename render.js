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

  drawState(state) {
    this.levelLabel.textContent = `Level ${state.level}`;
    this.updateHeader(state);
    this.drawPizzas(state);
    this.drawMice(state);
  },

  updateHeader(state) {
    // Pizza count
    const total = state.wholePizzas + state.slices + state.bits + state.crumbs + state.specks;
    if (state.wholePizzas > 0 && state.slices === 0 && state.bits === 0 && state.crumbs === 0 && state.specks === 0) {
      this.pizzaCount.textContent = `\u00D7 ${state.wholePizzas}`;
    } else if (total > 0) {
      const parts = [];
      if (state.wholePizzas > 0) parts.push(`${state.wholePizzas} whole`);
      if (state.slices > 0) parts.push(`${state.slices} slices`);
      if (state.bits > 0) parts.push(`${state.bits} bits`);
      if (state.crumbs > 0) parts.push(`${state.crumbs} crumbs`);
      if (state.specks > 0) parts.push(`${state.specks} specks`);
      this.pizzaCount.textContent = parts.join(' + ');
    } else {
      this.pizzaCount.textContent = 'All gone!';
    }
    // Mice count
    this.miceCount.textContent = `\u00D7 ${state.mice}`;
  },

  updateLives(lives) {
    if (this.livesDisplay) {
      this.livesDisplay.textContent = '\u2665'.repeat(Math.max(0, lives));
    }
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

    if (state.crumbs > 0) {
      this.pizzaArea.appendChild(this.createCrumbGroup(state.crumbs));
    }

    if (state.specks > 0) {
      this.pizzaArea.appendChild(this.createSpeckGroup(state.specks));
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

  createCrumbGroup(count) {
    const group = document.createElement('div');
    group.className = 'crumb-group';
    for (let i = 0; i < count; i++) {
      const crumb = document.createElement('div');
      crumb.className = 'crumb';
      group.appendChild(crumb);
    }
    return group;
  },

  createSpeckGroup(count) {
    const group = document.createElement('div');
    group.className = 'speck-group';
    for (let i = 0; i < count; i++) {
      const speck = document.createElement('div');
      speck.className = 'speck';
      group.appendChild(speck);
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
      } else if (state.mice === 10) {
        // Triangle: rows of 1, 2, 3, 4 on a 4-col grid
        const tri = [
          { col: '1 / 5', row: '1' },
          { col: '2', row: '2' },
          { col: '3', row: '2' },
          { col: '1 / 3', row: '3' },
          { col: '2 / 4', row: '3' },
          { col: '3 / 5', row: '3' },
          { col: '1', row: '4' },
          { col: '2', row: '4' },
          { col: '3', row: '4' },
          { col: '4', row: '4' },
        ];
        mouse.style.gridColumn = tri[i].col;
        mouse.style.gridRow = tri[i].row;
        mouse.style.justifySelf = 'center';
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

      const targetMap = {
        pizza: '.pizza',
        slice: '.slice',
        bit: '.bit',
        crumb: '.crumb',
      };
      const targets = this.pizzaArea.querySelectorAll(targetMap[what]);

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
        const groups = this.pizzaArea.querySelectorAll('.slice-group, .bit-group, .crumb-group, .speck-group');
        groups.forEach((g) => g.classList.add('cutting'));
        setTimeout(resolve, 500);
      }, 500);
    });
  },

  animateDistributeRound(state, toDistribute, isPartial, onMunch) {
    return new Promise((resolve) => {
      const mouseEls = this.mouseTray.querySelectorAll('.mouse');
      const pizzaEls = Array.from(this.pizzaArea.querySelectorAll('.pizza:not(.distributed)'));
      const sliceEls = Array.from(this.pizzaArea.querySelectorAll('.slice:not(.distributed)'));
      const bitEls = Array.from(this.pizzaArea.querySelectorAll('.bit:not(.distributed)'));
      const crumbEls = Array.from(this.pizzaArea.querySelectorAll('.crumb:not(.distributed)'));
      const speckEls = Array.from(this.pizzaArea.querySelectorAll('.speck:not(.distributed)'));
      const allPieces = [...pizzaEls, ...sliceEls, ...bitEls, ...crumbEls, ...speckEls];

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
        }, i * 150);
      }

      if (toDistribute === 0) resolve();
    });
  },

  formatDecimal(pizzas, mice) {
    const result = pizzas / mice;
    // Check for repeating decimals
    const str = result.toString();
    if (str.length <= 10) return str;
    // Try to detect repeating pattern — just round to reasonable precision
    return parseFloat(result.toPrecision(6)).toString();
  },

  showCelebration(state) {
    // Build fraction display
    if (this.fractionDisplay && state) {
      const def = LEVELS[state.level - 1];
      const pizzas = def.pizzas;
      const mice = def.mice;

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

      this.fractionDisplay.innerHTML = `
        <div class="fraction">
          <div class="fraction-top">${topHTML}</div>
          <div class="fraction-line"></div>
          <div class="fraction-bottom">${bottomHTML}</div>
        </div>
        <div class="fraction-equals">=</div>
        <div class="fraction-result">${this.formatDecimal(pizzas, mice)}</div>
      `;
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
