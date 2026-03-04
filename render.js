const Render = {
  pizzaArea: document.getElementById('pizza-area'),
  mouseTray: document.getElementById('mouse-tray'),
  levelLabel: document.getElementById('level-label'),
  pizzaCount: document.getElementById('pizza-count'),
  celebration: document.getElementById('celebration'),
  failure: document.getElementById('failure'),
  knife: document.getElementById('knife'),

  drawState(state) {
    this.levelLabel.textContent = `Level ${state.level}`;
    const total = state.wholePizzas + Math.ceil(state.slices / 10);
    this.pizzaCount.textContent = `\u{1F355} \u00D7 ${total || state.slices + ' slices'}`;
    this.drawPizzas(state);
    this.drawMice(state);
  },

  drawPizzas(state) {
    this.pizzaArea.innerHTML = '';

    for (let i = 0; i < state.wholePizzas; i++) {
      const pizza = document.createElement('div');
      pizza.className = 'pizza';
      pizza.dataset.index = i;
      this.pizzaArea.appendChild(pizza);
    }

    if (state.slices > 0) {
      // group slices in sets of 10 for visual clarity
      const fullGroups = Math.floor(state.slices / 10);
      const remainder = state.slices % 10;

      for (let g = 0; g < fullGroups; g++) {
        this.pizzaArea.appendChild(this.createSliceGroup(10));
      }
      if (remainder > 0) {
        this.pizzaArea.appendChild(this.createSliceGroup(remainder));
      }
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

  drawMice(state) {
    this.mouseTray.innerHTML = '';
    for (let i = 0; i < state.mice; i++) {
      const mouse = document.createElement('div');
      mouse.className = 'mouse' + (i < state.fedMice ? ' fed' : '');
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
  },

  animateCut(state) {
    return new Promise((resolve) => {
      this.knife.classList.add('cutting');

      // Add shing effect to each pizza
      const pizzas = this.pizzaArea.querySelectorAll('.pizza');
      setTimeout(() => {
        pizzas.forEach((pizza) => {
          const shing = document.createElement('div');
          shing.className = 'shing-effect';
          pizza.appendChild(shing);
        });
      }, 150);

      setTimeout(() => {
        this.knife.classList.remove('cutting');
        // Replace pizzas with slice groups
        this.drawPizzas(state);
        // Animate the spread
        const groups = this.pizzaArea.querySelectorAll('.slice-group');
        groups.forEach((g) => g.classList.add('cutting'));
        setTimeout(resolve, 500);
      }, 500);
    });
  },

  animateDistribute(state, piecesUsed, startFedIndex, onMunch) {
    return new Promise((resolve) => {
      const mouseEls = this.mouseTray.querySelectorAll('.mouse');
      const pizzaEls = Array.from(this.pizzaArea.querySelectorAll('.pizza'));
      const sliceEls = Array.from(this.pizzaArea.querySelectorAll('.slice'));
      const allPieces = [...pizzaEls, ...sliceEls];

      let animated = 0;

      for (let i = 0; i < piecesUsed; i++) {
        const piece = allPieces[i];
        const mouseEl = mouseEls[startFedIndex + i];
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
            mouseEl.classList.add('fed', 'eating');
            if (onMunch) onMunch();
            setTimeout(() => mouseEl.classList.remove('eating'), 400);

            animated++;
            if (animated === piecesUsed) {
              setTimeout(() => {
                this.drawState(state);
                resolve();
              }, 200);
            }
          }, 450);
        }, i * 150);
      }

      if (piecesUsed === 0) resolve();
    });
  },

  showCelebration() {
    this.celebration.classList.remove('hidden');
    // Force reflow before adding visible
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
    // Make unfed mice cry
    const mice = this.mouseTray.querySelectorAll('.mouse:not(.fed)');
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

    // Show overlay after a short delay so crying is visible first
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
