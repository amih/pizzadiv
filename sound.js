const Sound = {
  ctx: null,

  init() {
    // Create on first user gesture (autoplay policy)
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  ensure() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  // Knife slicing through pizza — soft swoosh
  slice() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Filtered noise swoosh — the main slicing texture
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Bandpass sweeps down for a natural cutting feel
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000, now);
    bandpass.frequency.exponentialRampToValueAtTime(600, now + 0.2);
    bandpass.Q.value = 1.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.setValueAtTime(0.2, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    // Soft thud at the end — knife hitting the board
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, now + 0.08);
    thud.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.setValueAtTime(0.1, now + 0.08);
    thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(bandpass).connect(noiseGain).connect(ctx.destination);
    thud.connect(thudGain).connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.25);
    thud.start(now + 0.08);
    thud.stop(now + 0.2);
  },

  // Munching — short "nom nom" chewing sound
  munch() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Two quick "nom" sounds
    for (let n = 0; n < 2; n++) {
      const t = now + n * 0.12;

      // Low thud — mouth closing
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      // Crunch noise
      const bufLen = ctx.sampleRate * 0.04;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        ch[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const crunch = ctx.createBufferSource();
      crunch.buffer = buf;

      const crunchGain = ctx.createGain();
      crunchGain.gain.setValueAtTime(0.12, t);
      crunchGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1200;
      bandpass.Q.value = 2;

      osc.connect(gain).connect(ctx.destination);
      crunch.connect(bandpass).connect(crunchGain).connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
      crunch.start(t);
      crunch.stop(t + 0.05);
    }
  },

  // Soft tick — subtle acknowledgment of queued action
  tick() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  },

  // Sad whimper — descending tone
  cry() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Two descending "aww" tones
    for (let n = 0; n < 2; n++) {
      const t = now + n * 0.35;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 - n * 80, t);
      osc.frequency.exponentialRampToValueAtTime(300 - n * 60, t + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      // Slight vibrato for sadness
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 15;
      lfo.connect(lfoGain).connect(osc.frequency);

      osc.connect(gain).connect(ctx.destination);

      lfo.start(t);
      lfo.stop(t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  },
};
