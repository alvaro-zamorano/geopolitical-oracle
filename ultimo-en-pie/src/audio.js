/* ===== sonido sintetizado (WebAudio, sin archivos) ===== */
const SFX = (() => {
  let ac = null, master = null, noise = null, on = true;
  const last = {};
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, dur, vol, delay) {
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, vol, fq, q, sweep, delay) {
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.setValueAtTime(fq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q || 1;
    env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  const lib = {
    swing: (v) => hiss(0.09, 0.25 * v, 1800, 0.8, 600),
    hit: (v) => { hiss(0.07, 0.5 * v, 900, 1.2); tone('square', 160, 60, 0.06, 0.12 * v); },
    heavy: (v) => { hiss(0.14, 0.7 * v, 400, 0.9, 120); tone('square', 110, 40, 0.12, 0.25 * v); },
    clang: (v) => { tone('triangle', 880, 820, 0.25, 0.3 * v); tone('square', 1320, 1200, 0.12, 0.08 * v); },
    boing: (v) => tone('sine', 180, 620, 0.22, 0.35 * v),
    clack: (v) => { for (let i = 0; i < 4; i++) hiss(0.02, 0.25 * v, 3000, 2, 0, i * 0.025); },
    zas: (v) => { hiss(0.05, 0.6 * v, 2500, 1.5); tone('square', 300, 90, 0.05, 0.12 * v); },
    shoot: (v) => { hiss(0.08, 0.5 * v, 1400, 0.7, 300); tone('square', 520, 90, 0.07, 0.12 * v); },
    laser: (v) => tone('sawtooth', 1400, 200, 0.12, 0.12 * v),
    bow: (v) => { tone('triangle', 240, 120, 0.08, 0.2 * v); hiss(0.05, 0.15 * v, 2200, 1); },
    zap: (v) => { for (let i = 0; i < 3; i++) tone('sawtooth', 900 + i * 300, 120, 0.06, 0.1 * v, i * 0.03); },
    boom: (v) => { hiss(0.5, 0.9 * v, 300, 0.6, 60); tone('sine', 90, 30, 0.4, 0.5 * v); },
    fire: (v) => hiss(0.12, 0.2 * v, 700, 0.5, 400),
    saw: (v) => tone('sawtooth', 95, 110, 0.12, 0.13 * v),
    wave: (v) => { tone('square', 70, 55, 0.3, 0.3 * v); tone('sawtooth', 140, 110, 0.25, 0.12 * v); },
    death: (v) => { tone('square', 420, 70, 0.35, 0.18 * v); hiss(0.18, 0.35 * v, 600, 0.8, 150); },
    pickup: (v) => { tone('square', 660, 660, 0.06, 0.12 * v); tone('square', 990, 990, 0.08, 0.12 * v, 0.06); },
    land: (v) => hiss(0.12, 0.25 * v, 300, 0.7, 100),
    crate: (v) => { hiss(0.25, 0.5 * v, 250, 0.8, 80); tone('square', 120, 60, 0.15, 0.2 * v); },
    zone: (v) => { tone('sawtooth', 110, 55, 0.9, 0.12 * v); tone('sawtooth', 165, 82, 0.9, 0.08 * v); },
    ann: (v) => { tone('square', 523, 523, 0.08, 0.1 * v); tone('square', 784, 784, 0.12, 0.1 * v, 0.08); },
    win: (v) => { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.14, 0.14 * v, i * 0.11)); tone('triangle', 1046, 1046, 0.5, 0.15 * v, 0.44); },
    lose: (v) => { [392, 330, 262].forEach((f, i) => tone('square', f, f * 0.98, 0.18, 0.12 * v, i * 0.16)); }
  };
  return {
    unlock() { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    set on(v) { on = v; }, get on() { return on; },
    play(name, vol) {
      if (!on || !ac || !lib[name]) return;
      const now = ac.currentTime;
      if (last[name] && now - last[name] < 0.045) return;
      last[name] = now;
      try { lib[name](clamp(vol === undefined ? 1 : vol, 0, 1.2)); } catch (e) { /* audio no disponible */ }
    }
  };
})();
