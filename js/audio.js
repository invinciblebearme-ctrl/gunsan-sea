// audio.js — WebAudio 합성만 사용 (파일 없음): 뱃고동, 첨벙, 퐁, 젤리 흔들림, 파도 소리
export function createAudio() {
  let ctx = null, master = null, noiseBuf = null, sea = null, muted = false, calm = 0.45;
  const A = {
    init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // 파도 소리: 걸러낸 잡음 + 느린 LFO
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 0.03;
      lfo.connect(lg); lg.connect(g.gain); src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(master); src.start(); lfo.start();
      sea = { g, lg, lp }; A.setCalm(calm);
    },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05); },
    get muted() { return muted; },
    setCalm(c) { calm = c; if (sea) { sea.g.gain.setTargetAtTime(0.02 + (1 - c) * 0.07, ctx.currentTime, 0.3); sea.lg.gain.value = 0.012 + (1 - c) * 0.04; } },
    horn() {
      if (!ctx) return; const t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.12); g.gain.setValueAtTime(0.3, t + 1.0); g.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
      for (const f of [98, 147.5, 196.6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.25); o.connect(lp); o.start(t); o.stop(t + 1.8); }
      lp.connect(g); g.connect(master);
    },
    noise(dur, freq, q, vol, type = 'bandpass', sweep = 1) {
      if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.5;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur); f.Q.value = q;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    },
    tone(f0, f1, dur, vol, type = 'sine') {
      if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    },
    splash(v = 1) { A.noise(0.45, 1400, 0.7, 0.28 * v, 'bandpass', 0.35); A.tone(190, 70, 0.22, 0.2 * v); },   // 첨벙
    swish(v = 1) { A.noise(0.22, 900 + Math.random() * 500, 1.2, 0.07 * v, 'bandpass', 0.6); },
    plop() { A.tone(520, 180, 0.16, 0.22); },                                                               // 퐁
    blip() { A.tone(880 + Math.random() * 300, 1500, 0.08, 0.07); },
    wobble(v = 1) {                                                                                         // 젤리 흔들림
      if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.7);
      l.frequency.value = 9; lg.gain.value = 22; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(0.4, 0.12 + v * 0.5), t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + 0.85); l.stop(t + 0.85);
    },
  };
  return A;
}
