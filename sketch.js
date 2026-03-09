const Sketch = {
  _svg: null,
  _timeout: null,
  _fillTimeout: null,
  _resolve: null,
  _skipHandler: null,
  _active: false,
  _animated: true,
  _pendingFills: [],

  // --- Wobbly path utilities ---

  wobbleLine(x1, y1, x2, y2, amp) {
    amp = amp || 1.5;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const steps = Math.max(2, Math.round(len / 6));
    const nx = -dy / len, ny = dx / len;
    let d = `M ${x1} ${y1}`;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t + nx * (Math.random() - 0.5) * amp * 2;
      const py = y1 + dy * t + ny * (Math.random() - 0.5) * amp * 2;
      if (i === 1) {
        d += ` L ${px} ${py}`;
      } else {
        const ct = (i - 0.5) / steps;
        const cpx = x1 + dx * ct + nx * (Math.random() - 0.5) * amp * 2;
        const cpy = y1 + dy * ct + ny * (Math.random() - 0.5) * amp * 2;
        d += ` Q ${cpx} ${cpy} ${px} ${py}`;
      }
    }
    return d;
  },

  wobbleRect(x, y, w, h, r, amp) {
    r = r || 0;
    amp = amp || 1.5;
    if (w < 2 || h < 2) return `M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
    const points = [];
    const step = 8;
    for (let i = r; i <= w - r; i += step) points.push([x + i, y]);
    if (r > 0) for (let a = -Math.PI / 2; a <= 0; a += 0.3) points.push([x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
    for (let i = r; i <= h - r; i += step) points.push([x + w, y + i]);
    if (r > 0) for (let a = 0; a <= Math.PI / 2; a += 0.3) points.push([x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]);
    for (let i = w - r; i >= r; i -= step) points.push([x + i, y + h]);
    if (r > 0) for (let a = Math.PI / 2; a <= Math.PI; a += 0.3) points.push([x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]);
    for (let i = h - r; i >= r; i -= step) points.push([x, y + i]);
    if (r > 0) for (let a = Math.PI; a <= Math.PI * 1.5; a += 0.3) points.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
    if (points.length < 3) return `M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
    return this._wobblePoints(points, amp, true);
  },

  wobbleCircle(cx, cy, r, amp) {
    amp = amp || 1.5;
    if (r < 1) r = 1;
    const n = Math.max(8, Math.round(r * 1.2));
    const points = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r + (Math.random() - 0.5) * amp * 2;
      points.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return this._wobblePoints(points, amp * 0.3, true);
  },

  _wobblePoints(points, amp, closed) {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [px, py] = points[i];
      const [prevX, prevY] = points[i - 1];
      const cpx = (prevX + px) / 2 + (Math.random() - 0.5) * amp * 2;
      const cpy = (prevY + py) / 2 + (Math.random() - 0.5) * amp * 2;
      d += ` Q ${cpx} ${cpy} ${px} ${py}`;
    }
    if (closed) {
      const [fx, fy] = points[0];
      const [lx, ly] = points[points.length - 1];
      const cpx = (lx + fx) / 2 + (Math.random() - 0.5) * amp * 2;
      const cpy = (ly + fy) / 2 + (Math.random() - 0.5) * amp * 2;
      d += ` Q ${cpx} ${cpy} ${fx} ${fy} Z`;
    }
    return d;
  },

  // --- SVG path creation ---

  createPath(container, d, stroke, strokeWidth, delay, duration, fill) {
    if (!d || !container) return null;
    const ns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('fill', fill || 'none');
    path.style.strokeLinecap = 'round';
    path.style.strokeLinejoin = 'round';

    if (this._animated) {
      path.classList.add('sketch-path');
      path.style.setProperty('--draw-delay', delay + 'ms');
      path.style.setProperty('--draw-duration', duration + 'ms');
      container.appendChild(path);
      const len = path.getTotalLength();
      if (len > 0) {
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
      }
    } else {
      container.appendChild(path);
    }

    if (fill && fill !== 'none') {
      if (this._animated) {
        path.setAttribute('fill-opacity', '0');
        this._pendingFills.push(path);
      } else {
        path.setAttribute('fill-opacity', '0.5');
      }
    }
    return path;
  },

  // --- SVG group for piece elements ---

  _createGroup(svg, className) {
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    if (className) g.classList.add(className);
    svg.appendChild(g);
    return g;
  },

  // --- Element sketchers ---

  sketchKnife(svg, gameRect) {
    const knife = document.getElementById('knife');
    const blade = knife.querySelector('.knife-blade');
    const handle = knife.querySelector('.knife-handle');
    const bladeR = blade.getBoundingClientRect();
    const handleR = handle.getBoundingClientRect();
    if (bladeR.width === 0 || handleR.width === 0) return;

    const bx = bladeR.left - gameRect.left, by = bladeR.top - gameRect.top;
    const hx = handleR.left - gameRect.left, hy = handleR.top - gameRect.top;

    this.createPath(svg, this.wobbleRect(bx, by, bladeR.width, bladeR.height, 2, 1.2), '#333', 2, 0, 300, '#B0BEC5');
    this.createPath(svg, this.wobbleRect(hx, hy, handleR.width, handleR.height, 2, 1.2), '#333', 2, 200, 200, '#6D4C41');
  },

  _sketchOnePizza(container, r, gameRect, delay) {
    const g = this._createGroup(container, 'sketch-piece');
    const px = r.left - gameRect.left, py = r.top - gameRect.top;
    const pw = r.width, ph = r.height;
    if (pw < 2 || ph < 2) return;
    this.createPath(g, this.wobbleRect(px, py, pw, ph, 12, 1.8), '#333', 2, delay, 300, '#FFD54F');
    const peps = [[0.25,0.30,8],[0.65,0.20,6],[0.45,0.60,7],[0.75,0.70,6],[0.20,0.75,5],[0.55,0.85,7]];
    peps.forEach((pep, j) => {
      const cx = px + pw * pep[0], cy = py + ph * pep[1];
      const cr = pep[2] * (pw / 120);
      this.createPath(g, this.wobbleCircle(cx, cy, cr, 0.8), '#C62828', 1.5, delay + 200 + j * 20, 80, '#C62828');
    });
  },

  _sketchOnePiece(container, r, gameRect, depth, delay) {
    const g = this._createGroup(container, 'sketch-piece');
    const px = r.left - gameRect.left, py = r.top - gameRect.top;
    const pw = r.width, ph = r.height;
    if (pw < 1 || ph < 1) return;
    if (depth <= 2) {
      const rad = depth === 1 ? 6 : 3;
      this.createPath(g, this.wobbleRect(px, py, pw, ph, rad, 1.2), '#333', 1.5, delay, 100, '#FFD54F');
      if (depth === 1 && pw > 10) {
        this.createPath(g, this.wobbleCircle(px + pw * 0.35, py + ph * 0.35, 3, 0.5), '#C62828', 1, delay + 60, 40, '#C62828');
        this.createPath(g, this.wobbleCircle(px + pw * 0.7, py + ph * 0.65, 2.5, 0.5), '#C62828', 1, delay + 80, 40, '#C62828');
      }
    } else {
      const rad = depth === 3 ? 2 : 1;
      this.createPath(g, this.wobbleRect(px, py, pw, ph, rad, 0.6), '#333', 1, delay, 60, '#FFD54F');
    }
  },

  sketchPizzaArea(svg, state, gameRect) {
    const pizzas = document.querySelectorAll('#pizza-area .pizza:not(.distributed)');
    let delay = this._animated ? 500 : 0;
    const perPizza = this._animated ? 300 : 0;

    pizzas.forEach((pizza, i) => {
      this._sketchOnePizza(svg, pizza.getBoundingClientRect(), gameRect, delay + i * perPizza);
    });

    let endDelay = delay + pizzas.length * perPizza + (this._animated ? 300 : 0);

    const pieces = document.querySelectorAll('#pizza-area .piece:not(.distributed)');
    const perPiece = this._animated ? 30 : 0;
    pieces.forEach((piece, i) => {
      const depth = parseInt(piece.className.match(/depth-(\d)/)?.[1] || '1');
      this._sketchOnePiece(svg, piece.getBoundingClientRect(), gameRect, depth, endDelay + i * perPiece);
    });

    return endDelay + pieces.length * perPiece + 100;
  },

  _sketchOneMouse(svg, mouse, gameRect, delay) {
    const r = mouse.getBoundingClientRect();
    if (r.width === 0) return;
    const mx = r.left - gameRect.left, my = r.top - gameRect.top;
    const mw = r.width, mh = r.height;
    const sc = mw / 44;
    const isFed = mouse.classList.contains('fed');

    const earR = 7 * sc, earY = my + earR;
    this.createPath(svg, this.wobbleCircle(mx + mw * 0.28, earY, earR, 1), '#333', 1.5, delay, 60, '#9E9E9E');
    this.createPath(svg, this.wobbleCircle(mx + mw * 0.72, earY, earR, 1), '#333', 1.5, delay + 30, 60, '#9E9E9E');
    this.createPath(svg, this.wobbleCircle(mx + mw * 0.28, earY, earR * 0.55, 0.6), '#F8BBD0', 1, delay + 50, 40, '#F8BBD0');
    this.createPath(svg, this.wobbleCircle(mx + mw * 0.72, earY, earR * 0.55, 0.6), '#F8BBD0', 1, delay + 60, 40, '#F8BBD0');

    const bodyCx = mx + mw / 2, bodyCy = my + 14 * sc + 15 * sc;
    const bodyRx = 18 * sc, bodyRy = 15 * sc;
    const bodyPts = [];
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2;
      bodyPts.push([bodyCx + Math.cos(a) * (bodyRx + (Math.random() - 0.5) * 2), bodyCy + Math.sin(a) * (bodyRy + (Math.random() - 0.5) * 2)]);
    }
    const bodyFill = isFed ? '#BDBDBD' : '#9E9E9E';
    this.createPath(svg, this._wobblePoints(bodyPts, 0.8, true), '#333', 1.5, delay + 70, 80, bodyFill);

    const eyeY = bodyCy - 5 * sc;
    if (isFed) {
      this.createPath(svg, this.wobbleLine(bodyCx - 6 * sc, eyeY, bodyCx - 2 * sc, eyeY, 0.8), '#212121', 1.5, delay + 100, 30);
      this.createPath(svg, this.wobbleLine(bodyCx + 2 * sc, eyeY, bodyCx + 6 * sc, eyeY, 0.8), '#212121', 1.5, delay + 110, 30);
    } else {
      this.createPath(svg, this.wobbleCircle(bodyCx - 4 * sc, eyeY, 2.5 * sc, 0.5), '#212121', 1, delay + 100, 30, '#212121');
      this.createPath(svg, this.wobbleCircle(bodyCx + 4 * sc, eyeY, 2.5 * sc, 0.5), '#212121', 1, delay + 110, 30, '#212121');
    }

    this.createPath(svg, this.wobbleCircle(bodyCx, bodyCy, 3 * sc, 0.5), '#F48FB1', 1, delay + 120, 30, '#F48FB1');

    const wy = bodyCy + 1 * sc;
    this.createPath(svg, this.wobbleLine(bodyCx - 6 * sc, wy - 2 * sc, bodyCx - 18 * sc, wy - 4 * sc, 0.8), '#757575', 1, delay + 130, 30);
    this.createPath(svg, this.wobbleLine(bodyCx - 6 * sc, wy + 1 * sc, bodyCx - 18 * sc, wy + 3 * sc, 0.8), '#757575', 1, delay + 135, 30);
    this.createPath(svg, this.wobbleLine(bodyCx + 6 * sc, wy - 2 * sc, bodyCx + 18 * sc, wy - 4 * sc, 0.8), '#757575', 1, delay + 140, 30);
    this.createPath(svg, this.wobbleLine(bodyCx + 6 * sc, wy + 1 * sc, bodyCx + 18 * sc, wy + 3 * sc, 0.8), '#757575', 1, delay + 145, 30);
  },

  sketchMice(svg, state, gameRect) {
    const mice = document.querySelectorAll('#mouse-tray .mouse');
    const count = mice.length;
    const perMouse = Math.min(150, 800 / Math.max(1, count));
    let baseDelay = arguments[4] || 0;
    if (!this._animated) baseDelay = 0;

    mice.forEach((mouse, i) => {
      this._sketchOneMouse(svg, mouse, gameRect, baseDelay + i * (this._animated ? perMouse : 0));
    });

    return baseDelay + count * perMouse + 160;
  },

  // --- Refresh (instant redraw for state changes) ---

  refresh(state) {
    if (!this._active || !this._svg) return;
    this._hideRealElements();
    const game = document.getElementById('game');
    void game.offsetHeight;
    const gameRect = game.getBoundingClientRect();
    this._svg.innerHTML = '';
    this._animated = false;
    this.sketchKnife(this._svg, gameRect);
    this.sketchPizzaArea(this._svg, state, gameRect);
    this.sketchMice(this._svg, state, gameRect);
    this._animated = true;
  },

  // --- Distribute animation on sketch SVG ---

  animateDistribute(toDistribute, pieceDelay) {
    if (!this._active || !this._svg) return;
    const game = document.getElementById('game');
    const gameRect = game.getBoundingClientRect();

    // Read positions from hidden DOM elements BEFORE anything changes
    const pizzaEls = Array.from(document.querySelectorAll('#pizza-area .pizza:not(.distributed)'));
    const pieceEls = Array.from(document.querySelectorAll('#pizza-area .piece:not(.distributed)'));
    const allPieces = [...pizzaEls, ...pieceEls];
    const mouseEls = Array.from(document.querySelectorAll('#mouse-tray .mouse'));

    const positions = [];
    for (let i = 0; i < toDistribute; i++) {
      const piece = allPieces[i];
      const mouse = mouseEls[i];
      if (!piece || !mouse) continue;
      const pr = piece.getBoundingClientRect();
      const mr = mouse.getBoundingClientRect();
      positions.push({
        sx: pr.left - gameRect.left + pr.width / 2,
        sy: pr.top - gameRect.top + pr.height / 2,
        tx: mr.left - gameRect.left + mr.width / 2,
        ty: mr.top - gameRect.top + mr.height / 2,
        size: Math.max(pr.width, pr.height) / 3,
      });
    }

    // Animate each piece group one by one — keep original shape, fly to mouse
    const pieceGroups = Array.from(this._svg.querySelectorAll('.sketch-piece'));

    positions.forEach((pos, i) => {
      setTimeout(() => {
        if (!this._svg) return;
        const group = pieceGroups[i];
        if (!group) return;

        // Fly the actual sketch piece to the mouse
        const dx = pos.tx - pos.sx;
        const dy = pos.ty - pos.sy;
        group.style.transformBox = 'fill-box';
        group.style.transformOrigin = 'center';
        group.style.transition = 'transform 0.4s ease-in';
        group.getBoundingClientRect(); // force reflow
        group.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;

        setTimeout(() => {
          if (group.parentNode) group.remove();
        }, 450);
      }, i * pieceDelay);
    });
  },

  // --- Dismiss remaining sketch pieces to the right ---

  animateDismissRemaining() {
    if (!this._active || !this._svg) return Promise.resolve();
    const groups = Array.from(this._svg.querySelectorAll('.sketch-piece'));
    if (groups.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      groups.forEach((group, i) => {
        setTimeout(() => {
          group.style.transformBox = 'fill-box';
          group.style.transformOrigin = 'center';
          group.style.transition = 'transform 0.5s ease-in, opacity 0.3s ease 0.2s';
          group.getBoundingClientRect();
          group.style.transform = 'translateX(120vw)';
          group.style.opacity = '0';
          setTimeout(() => { if (group.parentNode) group.remove(); }, 550);
        }, i * 30);
      });
      setTimeout(resolve, groups.length * 30 + 550);
    });
  },

  // --- Cut line animation on sketch SVG ---

  drawCutLines(cutDepth, divisor) {
    if (!this._active || !this._svg) return;
    const game = document.getElementById('game');
    const gameRect = game.getBoundingClientRect();
    const sel = cutDepth === 0 ? '#pizza-area .pizza:not(.distributed)' : `#pizza-area .piece.depth-${cutDepth}:not(.distributed)`;
    const targets = document.querySelectorAll(sel);
    const numCuts = divisor - 1;
    let delay = 0;

    this._animated = true;
    targets.forEach(target => {
      const r = target.getBoundingClientRect();
      if (r.width === 0) return;
      const tx = r.left - gameRect.left, ty = r.top - gameRect.top;
      for (let i = 0; i < numCuts; i++) {
        const cutY = ty + (i + 1) / divisor * r.height;
        this.createPath(this._svg, this.wobbleLine(tx, cutY, tx + r.width, cutY, 1.5), '#333', 1.5, delay, 100);
        delay += 150;
      }
    });
  },

  // --- Orchestrator ---

  _introId: 0,

  cancel() {
    this._active = false;
    this._introId++; // invalidate any pending rAF/setTimeout callbacks
    this._pendingFills = [];
    if (this._svg) { this._svg.remove(); this._svg = null; }
    if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
    if (this._fillTimeout) { clearTimeout(this._fillTimeout); this._fillTimeout = null; }
    if (this._skipTimeout) { clearTimeout(this._skipTimeout); this._skipTimeout = null; }
    if (this._skipHandler) { document.removeEventListener('click', this._skipHandler, true); this._skipHandler = null; }
    document.querySelectorAll('.sketch-hidden').forEach(el => el.classList.remove('sketch-hidden'));
    if (this._resolve) { this._resolve(); this._resolve = null; }
  },

  _ensureSvg() {
    const game = document.getElementById('game');
    const gameRect = game.getBoundingClientRect();
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('sketch-svg');
    svg.setAttribute('width', gameRect.width);
    svg.setAttribute('height', gameRect.height);
    svg.setAttribute('viewBox', `0 0 ${gameRect.width} ${gameRect.height}`);
    game.appendChild(svg);
    return svg;
  },

  _hideRealElements() {
    document.getElementById('knife').classList.add('sketch-hidden');
    document.getElementById('pizza-area').classList.add('sketch-hidden');
    document.getElementById('mouse-tray').classList.add('sketch-hidden');
  },

  playIntro(state) {
    this.cancel();
    const myId = this._introId;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._pendingFills = [];
      this._hideRealElements();
      Render.drawState(state);

      // Double rAF ensures layout is fully computed (fixes blank screen after page show)
      requestAnimationFrame(() => {
        if (this._introId !== myId) return;
        requestAnimationFrame(() => {
          if (this._introId !== myId) return;
          this._startIntro(state, myId);
        });
      });
    });
  },

  _startIntro(state, myId) {
    if (this._introId !== myId) return;

    const game = document.getElementById('game');
    void game.offsetHeight;
    const gameRect = game.getBoundingClientRect();

    // If page isn't visible yet, retry
    if (gameRect.width === 0 || gameRect.height === 0) {
      requestAnimationFrame(() => this._startIntro(state, myId));
      return;
    }

    const svg = this._ensureSvg();
    this._svg = svg;
    this._animated = true;

    this.sketchKnife(svg, gameRect);
    const afterPizzas = this.sketchPizzaArea(svg, state, gameRect);
    const afterMice = this.sketchMice(svg, state, gameRect, null, afterPizzas + 100);

    // After all strokes complete, fill in colors as the final step
    const fillInTime = afterMice;
    this._fillTimeout = setTimeout(() => {
      if (this._introId !== myId || !this._svg) return;
      this._pendingFills.forEach(path => {
        path.style.transition = 'fill-opacity 0.3s ease';
        path.setAttribute('fill-opacity', '0.5');
      });
      this._pendingFills = [];
    }, fillInTime);

    const totalTime = fillInTime + 400;

    const skip = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._finishIntro(true);
    };
    this._skipHandler = skip;
    this._skipTimeout = setTimeout(() => {
      if (this._introId !== myId) return;
      if (this._svg && this._skipHandler === skip) {
        document.addEventListener('click', skip, true);
      }
    }, 100);

    this._timeout = setTimeout(() => {
      if (this._introId !== myId) return;
      this._finishIntro(false);
    }, totalTime);
  },

  _finishIntro(skipped) {
    if (!this._svg) return;
    if (this._skipHandler) { document.removeEventListener('click', this._skipHandler, true); this._skipHandler = null; }
    if (this._skipTimeout) { clearTimeout(this._skipTimeout); this._skipTimeout = null; }
    if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
    if (this._fillTimeout) { clearTimeout(this._fillTimeout); this._fillTimeout = null; }

    // Immediately fill any pending paths
    this._pendingFills.forEach(path => {
      path.setAttribute('fill-opacity', '0.5');
    });
    this._pendingFills = [];

    this._active = true;
    this._hideRealElements();

    if (skipped) {
      this.refresh(Game.state);
    }

    if (this._resolve) { this._resolve(); this._resolve = null; }
  },
};
