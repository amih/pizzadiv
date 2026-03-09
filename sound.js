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

  // Knife cutting paper — crisp scratchy snip
  slice() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // High-frequency noise burst — the paper tearing texture
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Crinkly texture: mix of noise with occasional sharp spikes
      data[i] = (Math.random() * 2 - 1) * (1 + 0.3 * Math.sin(i * 0.15));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Highpass keeps it papery and thin
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(3000, now);
    highpass.Q.value = 0.7;

    // Bandpass for the main "scritch" character
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(5000, now);
    bandpass.frequency.exponentialRampToValueAtTime(3500, now + 0.12);
    bandpass.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    noiseGain.gain.setValueAtTime(0.2, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    // Second shorter burst for the "snip" finish
    const buf2Size = ctx.sampleRate * 0.04;
    const buf2 = ctx.createBuffer(1, buf2Size, ctx.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < buf2Size; i++) {
      d2[i] = (Math.random() * 2 - 1);
    }
    const snip = ctx.createBufferSource();
    snip.buffer = buf2;

    const snipBP = ctx.createBiquadFilter();
    snipBP.type = 'bandpass';
    snipBP.frequency.value = 6000;
    snipBP.Q.value = 2;

    const snipGain = ctx.createGain();
    snipGain.gain.setValueAtTime(0.15, now + 0.08);
    snipGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(highpass).connect(bandpass).connect(noiseGain).connect(ctx.destination);
    snip.connect(snipBP).connect(snipGain).connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
    snip.start(now + 0.08);
    snip.stop(now + 0.12);
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

  // Cheerful sparkle — ascending twinkle for remainder dismissal
  sparkle() {
    this.ensure();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
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
