// audio.js — SALERO. WebAudio synth SFX, zero audio files (no-network rule).
// One job: sounds. Lazily created on the first user gesture (browser policy);
// every call is a no-op until then, and a no-op forever when muted.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let sizzleNodes = null;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.15, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, filterFreq, vol = 0.2) {
    const c = ensure();
    if (!c || muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(m) {
      muted = m;
      if (m) this.stopSizzle();
    },
    get muted() {
      return muted;
    },
    chop() {
      noiseBurst(0.07, 1200, 0.25);
      tone(180, 0.06, 'sine', 0.2);
    },
    pop() {
      tone(660, 0.08, 'sine', 0.12);
      tone(880, 0.1, 'sine', 0.1, 0.05);
    },
    ding(perfect) {
      tone(880, 0.15, 'sine', 0.18);
      tone(1318, 0.25, 'sine', 0.15, 0.08);
      if (perfect) tone(1760, 0.3, 'sine', 0.12, 0.16);
    },
    error() {
      tone(160, 0.16, 'sawtooth', 0.12);
    },
    burn() {
      tone(220, 0.2, 'square', 0.1);
      tone(180, 0.25, 'square', 0.1, 0.12);
    },
    fanfare() {
      tone(523, 0.15, 'sine', 0.15);
      tone(659, 0.15, 'sine', 0.15, 0.1);
      tone(784, 0.3, 'sine', 0.18, 0.2);
    },
    startSizzle() {
      const c = ensure();
      if (!c || muted || sizzleNodes) return;
      const len = c.sampleRate;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 4200;
      f.Q.value = 0.6;
      const g = c.createGain();
      g.gain.value = 0.035;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      sizzleNodes = { src, g };
    },
    stopSizzle() {
      if (!sizzleNodes) return;
      try {
        sizzleNodes.src.stop();
      } catch {
        /* already stopped */
      }
      sizzleNodes = null;
    },
  };
}
