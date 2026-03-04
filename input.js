const Input = {
  startX: 0,
  startY: 0,
  tracking: false,
  onCut: null,
  onDistribute: null,
  onCelebrationTap: null,
  enabled: true,

  init() {
    const game = document.getElementById('game');

    game.addEventListener('touchstart', (e) => this.handleStart(e.touches[0]), { passive: true });
    game.addEventListener('touchmove', (e) => this.handleMove(e.touches[0]), { passive: true });
    game.addEventListener('touchend', (e) => this.handleEnd(e.changedTouches[0]));

    game.addEventListener('mousedown', (e) => this.handleStart(e));
    game.addEventListener('mousemove', (e) => { if (this.tracking) this.handleMove(e); });
    game.addEventListener('mouseup', (e) => this.handleEnd(e));
  },

  handleStart(point) {
    if (!this.enabled) return;
    this.startX = point.clientX;
    this.startY = point.clientY;
    this.tracking = true;

    // Check if starting in knife zone
    const knifeZone = document.getElementById('knife-zone');
    const rect = knifeZone.getBoundingClientRect();
    this.startedInKnife = point.clientX < rect.right;
  },

  handleMove(point) {
    if (!this.tracking || !this.enabled) return;

    const dx = point.clientX - this.startX;
    if (this.startedInKnife && dx > 20) {
      document.getElementById('knife').classList.add('swiping');
    } else {
      document.getElementById('knife').classList.remove('swiping');
    }
  },

  handleEnd(point) {
    if (!this.tracking) return;
    this.tracking = false;
    document.getElementById('knife').classList.remove('swiping');

    if (!this.enabled) return;

    const dx = point.clientX - this.startX;
    const dy = point.clientY - this.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Check overlay taps (celebration or failure)
    const celebration = document.getElementById('celebration');
    const failure = document.getElementById('failure');
    if (celebration.classList.contains('visible') || failure.classList.contains('visible')) {
      if (this.onCelebrationTap) this.onCelebrationTap();
      return;
    }

    // Swipe right from knife zone → CUT
    if (this.startedInKnife && dx > 50 && adx > ady) {
      if (this.onCut) this.onCut();
      return;
    }

    // Swipe down on pizza area → DISTRIBUTE
    if (dy > 50 && ady > adx && !this.startedInKnife) {
      if (this.onDistribute) this.onDistribute();
      return;
    }
  },
};
