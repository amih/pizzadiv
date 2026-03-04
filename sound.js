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

  // Sword slice — metallic "shing" sweep
  slice() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // High-pitched sweep down
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(4000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    // Metallic ring
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3200, now);
    osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.3);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    // Noise burst for the "shh" part
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    const hipass = ctx.createBiquadFilter();
    hipass.type = 'highpass';
    hipass.frequency.value = 3000;

    osc.connect(gain).connect(ctx.destination);
    osc2.connect(gain2).connect(ctx.destination);
    noise.connect(hipass).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
    osc2.start(now);
    osc2.stop(now + 0.35);
    noise.start(now);
    noise.stop(now + 0.15);
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

  // Quick confirmation chirp — queued action acknowledged
  confirm() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
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
