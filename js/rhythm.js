// ============================================================
//  HENNA NOTES - カオス・ノーツエンジン
//  下の一本線をノーツが流れる。パターンは制御不能に変化し続ける。
// ============================================================

const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ---- 変化のネタ帳 ------------------------------------------
const SHAPES = ['dot', 'ring', 'square', 'diamond', 'triangle', 'star', 'cross', 'plus',
  'hex', 'bar', 'twin', 'pixel', 'spark', 'hollow', 'arrow', 'blob'];

const MOTIONS = ['straight', 'sine', 'zigzag', 'bounce', 'gravity', 'float', 'spiral',
  'stutter', 'swell', 'drunk', 'pendulum', 'rocket', 'fall', 'orbit', 'elastic', 'snake'];

const PATTERNS = ['single', 'stream', 'chord', 'burst', 'stair', 'wave', 'cluster',
  'rest', 'triplet', 'machinegun', 'rain', 'crescendo', 'mirror', 'scatter'];

const LINES = ['solid', 'dashed', 'dotted', 'double', 'glow', 'wave', 'tilt', 'jitter',
  'thick', 'hair', 'gradient', 'broken', 'pulse', 'ladder'];

const PALETTES = ['neon', 'ice', 'magma', 'toxic', 'candy', 'mono', 'rainbow', 'sunset',
  'deep', 'vhs', 'gold', 'ghost'];

const EVENTS = [
  { k: 'GRAVITY FLIP', d: [4, 9], f: e => { e.gravity = -1.6; } },
  { k: 'ZERO-G', d: [5, 11], f: e => { e.zeroG = 1; e.speedMul *= .55; } },
  { k: 'HYPER', d: [3, 7], f: e => { e.speedMul *= 2.1; e.densityMul *= 1.5; } },
  { k: 'SLOW MOTION', d: [4, 9], f: e => { e.speedMul *= .42; } },
  { k: 'SWARM', d: [3, 6], f: e => { e.densityMul *= 3.4; e.sizeMul *= .6; } },
  { k: 'GIANT', d: [3, 7], f: e => { e.sizeMul *= 2.6; e.densityMul *= .5; } },
  { k: 'TINY', d: [4, 8], f: e => { e.sizeMul *= .45; e.densityMul *= 1.8; } },
  { k: 'MIRROR', d: [4, 10], f: e => { e.mirror = 1; } },
  { k: 'GHOST', d: [4, 9], f: e => { e.ghost = 1; } },
  { k: 'RAINBOW', d: [5, 12], f: e => { e.rainbow = 1; } },
  { k: 'MONOCHROME', d: [5, 11], f: e => { e.mono = 1; } },
  { k: 'STROBE', d: [2, 5], f: e => { e.strobe = 1; } },
  { k: 'INVERT', d: [2, 5], f: e => { e.invert = 1; } },
  { k: 'TORNADO', d: [4, 9], f: e => { e.tornado = 1; } },
  { k: 'SILENCE', d: [2, 4], f: e => { e.densityMul *= .12; } },
  { k: 'AVALANCHE', d: [2, 5], f: e => { e.densityMul *= 5; e.speedMul *= 1.35; e.sizeMul *= .7; } },
  { k: 'ECHO', d: [4, 9], f: e => { e.echo = 1; } },
  { k: 'DOUBLE LINE', d: [5, 11], f: e => { e.extraLines = 2; } },
  { k: 'SNAKE LINE', d: [5, 10], f: e => { e.lineWave = 26; e.lineFreq = 2.6; } },
  { k: 'DRUNK LINE', d: [4, 9], f: e => { e.lineTilt = rnd(-.14, .14); e.lineWave = 12; } },
  { k: 'METEOR', d: [3, 7], f: e => { e.meteor = 1; e.sizeMul *= 1.5; e.speedMul *= 1.5; } },
  { k: 'BLOOM', d: [4, 9], f: e => { e.bloom = 1; } },
  { k: 'GLITCH', d: [2, 6], f: e => { e.glitch = 1; } },
  { k: 'REVERSE', d: [3, 8], f: e => { e.reverse = 1; } },
  { k: 'SPLIT JUDGE', d: [5, 11], f: e => { e.judges = 3; } },
  { k: 'PENDULUM', d: [4, 9], f: e => { e.judgeSwing = 1; } },
  { k: 'FREEZE', d: [1.2, 2.6], f: e => { e.speedMul *= .06; } },
  { k: 'SHATTER', d: [3, 7], f: e => { e.shatter = 1; } },
  { k: 'DRIFT UP', d: [4, 9], f: e => { e.gravity = -.6; e.zeroG = .5; } },
  { k: 'HEARTBEAT', d: [5, 10], f: e => { e.heartbeat = 1; } }
];

function paletteHue(p, seed, t) {
  switch (p) {
    case 'neon': return 180 + seed * 140;
    case 'ice': return 185 + seed * 45;
    case 'magma': return 5 + seed * 45;
    case 'toxic': return 75 + seed * 55;
    case 'candy': return 300 + seed * 60;
    case 'mono': return 0;
    case 'rainbow': return (t * 90 + seed * 360) % 360;
    case 'sunset': return 340 + seed * 80;
    case 'deep': return 230 + seed * 50;
    case 'vhs': return chanceSeed(seed) ? 300 : 190;
    case 'gold': return 38 + seed * 22;
    case 'ghost': return 200 + seed * 20;
    default: return seed * 360;
  }
}
const chanceSeed = s => (s * 997 % 1) > .5;

export class Rhythm {
  constructor(canvas, hooks = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;              // {onJudge, onChaos, onEvent}
    this.notes = [];
    this.parts = [];
    this.waves = [];
    this.t = 0;
    this.running = false;
    this.enabled = true;
    this.score = 0;
    this.combo = 0;
    this.best = 0;
    this.events = [];
    this.beatAcc = 0;
    this.phaseLeft = 0;
    this.eventCd = rnd(6, 14);
    this.S = {};
    this.reroll(true);
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    window.addEventListener('orientationchange', this._resize);
    this.resize();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('orientationchange', this._resize);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = this.cv.clientWidth || window.innerWidth;
    const h = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    this.lineY = h * 0.78;
  }

  // ---- カオス director -------------------------------------
  reroll(first) {
    const S = this.S;
    S.bpm = rnd(72, 232);
    S.div = pick([1, 1, 2, 2, 3, 4, 4, 6, 8]);
    S.speed = rnd(150, 620);
    S.dir = chance(.5) ? 1 : -1;
    S.mixDir = chance(.22);
    S.density = rnd(.35, 1);
    S.swing = chance(.3) ? rnd(.1, .35) : 0;
    S.shape = pick(SHAPES);
    S.shapeMix = chance(.35);
    S.motion = pick(MOTIONS);
    S.motionMix = chance(.3);
    S.amp = rnd(6, 62);
    S.freq = rnd(.6, 5.5);
    S.size = rnd(7, 20);
    S.sizeVar = rnd(0, .8);
    S.trail = chance(.45) ? rndi(4, 16) : 0;
    S.spin = chance(.4) ? rnd(-6, 6) : 0;
    S.pattern = pick(PATTERNS);
    S.line = pick(LINES);
    S.lineWave = chance(.35) ? rnd(3, 18) : 0;
    S.lineFreq = rnd(.5, 3.4);
    S.lineTilt = chance(.25) ? rnd(-.08, .08) : 0;
    S.palette = pick(PALETTES);
    S.judgeX = rnd(.2, .8);
    S.judgeDrift = chance(.3) ? rnd(-.06, .06) : 0;
    S.jitter = chance(.25) ? rnd(1, 5) : 0;
    this.phaseLeft = rnd(2.6, 8);
    if (!first && this.hooks.onChaos) this.hooks.onChaos(this.describe());
  }

  describe() {
    const S = this.S;
    const ev = this.events.map(e => e.k).join(' + ');
    const base = `${S.pattern.toUpperCase()} / ${S.motion} / ${S.shape} / ${S.line} / ${S.palette} ` +
      `${Math.round(S.bpm)}BPM ${S.mixDir ? '⇄' : S.dir > 0 ? '→' : '←'}`;
    return ev ? `${base}  ✦ ${ev}` : base;
  }

  fireEvent() {
    const def = pick(EVENTS);
    const ev = { k: def.k, f: def.f, left: rnd(def.d[0], def.d[1]) };
    this.events.push(ev);
    if (this.events.length > 3) this.events.shift();
    if (this.hooks.onEvent) this.hooks.onEvent(ev.k);
    if (this.hooks.onChaos) this.hooks.onChaos(this.describe());
  }

  // 現在の実効パラメータ（イベント適用後）
  effective() {
    const e = {
      speedMul: 1, densityMul: 1, sizeMul: 1, gravity: 0, zeroG: 0,
      mirror: 0, ghost: 0, rainbow: 0, mono: 0, strobe: 0, invert: 0,
      tornado: 0, echo: 0, extraLines: 0, lineWave: this.S.lineWave,
      lineFreq: this.S.lineFreq, lineTilt: this.S.lineTilt, meteor: 0,
      bloom: 0, glitch: 0, reverse: 0, judges: 1, judgeSwing: 0,
      shatter: 0, heartbeat: 0
    };
    for (const ev of this.events) ev.f(e);
    return e;
  }

  // ---- ループ ---------------------------------------------
  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      this.update(dt);
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.ctx.clearRect(0, 0, this.W, this.H);
  }

  reset() {
    this.notes.length = 0; this.parts.length = 0; this.waves.length = 0;
    this.score = 0; this.combo = 0; this.best = 0; this.events.length = 0;
    this.pushHud();
  }

  update(dt) {
    this.t += dt;
    const S = this.S, E = this.effective();
    this.E = E;

    // director
    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) this.reroll();
    for (let i = this.events.length - 1; i >= 0; i--) {
      this.events[i].left -= dt;
      if (this.events[i].left <= 0) {
        this.events.splice(i, 1);
        if (this.hooks.onChaos) this.hooks.onChaos(this.describe());
      }
    }
    this.eventCd -= dt;
    if (this.eventCd <= 0) { this.fireEvent(); this.eventCd = rnd(5, 15); }

    // 判定点
    let jx = (S.judgeX + Math.sin(this.t * .35) * S.judgeDrift * 4) * this.W;
    if (E.judgeSwing) jx = this.W * (.5 + Math.sin(this.t * 1.1) * .3);
    this.jx = clamp(jx, this.W * .12, this.W * .88);
    this.judgeXs = E.judges > 1
      ? Array.from({ length: E.judges }, (_, i) => this.W * (i + 1) / (E.judges + 1))
      : [this.jx];

    // ノーツ生成（拍で刻む）
    if (this.enabled) {
      const beat = 60 / S.bpm / S.div;
      this.beatAcc += dt;
      while (this.beatAcc >= beat) {
        this.beatAcc -= beat;
        this.spawnBeat(E);
      }
    }

    // ノーツ更新
    const gone = [];
    for (const n of this.notes) {
      n.age += dt;
      const sp = n.speed * E.speedMul * (E.reverse ? -1 : 1);
      n.x += n.dir * sp * dt;
      n.spinA += n.spin * dt;
      if (n.trail) {
        n.tr.push([n.x, n.y]);
        if (n.tr.length > n.trail) n.tr.shift();
      }
      // 判定通過チェック
      if (!n.hit) {
        const tgt = this.nearestJudge(n.x);
        const passed = n.dir > 0 ? n.x - tgt > 92 : tgt - n.x > 92;
        if (passed && !n.missed) { n.missed = true; this.judge('MISS', 0, n); }
      }
      if (n.x < -180 || n.x > this.W + 180 || n.age > 22) gone.push(n);
    }
    if (gone.length) this.notes = this.notes.filter(n => !gone.includes(n));

    // パーティクル
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += w.sp * dt; w.life -= dt;
      if (w.life <= 0) this.waves.splice(i, 1);
    }
  }

  nearestJudge(x) {
    let best = this.judgeXs[0], bd = 1e9;
    for (const j of this.judgeXs) {
      const d = Math.abs(j - x);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  spawnBeat(E) {
    const S = this.S;
    const density = clamp(S.density * E.densityMul, 0, 6);
    if (Math.random() > Math.min(density, 1) && density <= 1) return;
    const reps = density > 1 ? Math.min(Math.round(density), 4) : 1;
    for (let r = 0; r < reps; r++) {
      const group = this.patternGroup(S.pattern);
      for (const g of group) {
        setTimeout(() => this.running && this.spawnNote(g), g.delay * 1000);
      }
    }
  }

  patternGroup(p) {
    const g = [];
    const push = (delay, o = {}) => g.push(Object.assign({ delay }, o));
    switch (p) {
      case 'single': push(0); break;
      case 'stream': for (let i = 0; i < 4; i++) push(i * .07); break;
      case 'chord': { const n = rndi(2, 4); for (let i = 0; i < n; i++) push(0, { yOff: (i - n / 2) * rnd(14, 30) }); break; }
      case 'burst': { const n = rndi(4, 9); for (let i = 0; i < n; i++) push(i * .028, { sizeMul: rnd(.6, 1.5) }); break; }
      case 'stair': for (let i = 0; i < 5; i++) push(i * .09, { yOff: (i - 2) * 18 }); break;
      case 'wave': for (let i = 0; i < 6; i++) push(i * .06, { yOff: Math.sin(i * .9) * 34 }); break;
      case 'cluster': { const n = rndi(3, 6); for (let i = 0; i < n; i++) push(rnd(0, .18), { yOff: rnd(-30, 30) }); break; }
      case 'rest': if (chance(.3)) push(0); break;
      case 'triplet': for (let i = 0; i < 3; i++) push(i * .055); break;
      case 'machinegun': for (let i = 0; i < 10; i++) push(i * .022, { sizeMul: .7 }); break;
      case 'rain': { const n = rndi(2, 5); for (let i = 0; i < n; i++) push(rnd(0, .3), { yOff: rnd(-46, 10), sizeMul: rnd(.5, 1.2) }); break; }
      case 'crescendo': { const n = rndi(4, 8); for (let i = 0; i < n; i++) push(i * .05, { sizeMul: .5 + i * .2 }); break; }
      case 'mirror': push(0, { forceDir: 1 }); push(0, { forceDir: -1 }); break;
      case 'scatter': { const n = rndi(1, 7); for (let i = 0; i < n; i++) push(rnd(0, .45), { yOff: rnd(-50, 50), sizeMul: rnd(.4, 1.8) }); break; }
      default: push(0);
    }
    return g;
  }

  spawnNote(o = {}) {
    const S = this.S, E = this.E || this.effective();
    if (this.notes.length > 260) return;
    let dir = o.forceDir || (S.mixDir ? (chance(.5) ? 1 : -1) : S.dir);
    if (E.mirror && chance(.5)) dir *= -1;
    const seed = Math.random();
    const size = S.size * (1 + rnd(-S.sizeVar, S.sizeVar)) * (o.sizeMul || 1) * E.sizeMul;
    const n = {
      x: dir > 0 ? -50 : this.W + 50,
      yOff: (o.yOff || 0),
      speed: S.speed * rnd(.9, 1.12),
      dir, size: clamp(size, 3, 90),
      shape: S.shapeMix ? pick(SHAPES) : S.shape,
      motion: S.motionMix ? pick(MOTIONS) : S.motion,
      amp: S.amp * rnd(.6, 1.4),
      freq: S.freq * rnd(.7, 1.3),
      phase: rnd(0, Math.PI * 2),
      spin: S.spin, spinA: rnd(0, 6.28),
      trail: S.trail, tr: [],
      seed, age: 0, hit: false, missed: false,
      hue: paletteHue(S.palette, seed, this.t),
      sat: S.palette === 'mono' ? 0 : rnd(70, 100),
      lig: S.palette === 'ghost' ? 88 : rnd(55, 72)
    };
    n.y = this.noteY(n, 0);
    this.notes.push(n);
  }

  // 線の高さ（うねり込み）
  lineAt(x) {
    const E = this.E || this.effective();
    let y = this.lineY + (x - this.W / 2) * (E.lineTilt || 0);
    if (E.lineWave) y += Math.sin(x * .012 * (E.lineFreq || 1) + this.t * 2.2) * E.lineWave;
    if (this.S.line === 'jitter') y += (Math.random() - .5) * 3;
    return y;
  }

  noteY(n, dt) {
    const E = this.E || this.effective();
    const base = this.lineAt(n.x) + n.yOff;
    const a = n.amp, ph = this.t * n.freq + n.phase;
    let off = 0;
    switch (n.motion) {
      case 'straight': off = 0; break;
      case 'sine': off = Math.sin(ph) * a; break;
      case 'zigzag': off = (Math.abs((ph / Math.PI) % 2 - 1) * 2 - 1) * a; break;
      case 'bounce': off = -Math.abs(Math.sin(ph)) * a; break;
      case 'gravity': off = -a + (n.age * n.age * 130) % (a * 2.4); break;
      case 'float': off = -Math.abs(Math.sin(ph * .5)) * a * .8 - n.age * 6; break;
      case 'spiral': off = Math.sin(ph) * a * Math.cos(ph * .33); break;
      case 'stutter': off = Math.round(Math.sin(ph) * 3) / 3 * a; break;
      case 'swell': off = Math.sin(ph) * a * (0.3 + 0.7 * Math.abs(Math.sin(this.t * .7))); break;
      case 'drunk': off = Math.sin(ph) * a * .6 + Math.sin(ph * 2.7 + 1) * a * .4; break;
      case 'pendulum': off = Math.sin(ph) * a * Math.exp(-n.age * .12); break;
      case 'rocket': off = -n.age * n.age * 42; break;
      case 'fall': off = n.age * n.age * 42 - a; break;
      case 'orbit': off = Math.sin(ph) * a; break;
      case 'elastic': off = Math.sin(ph) * a / (1 + n.age * .6); break;
      case 'snake': off = Math.sin(n.x * .02 + this.t * 2) * a; break;
    }
    if (E.gravity) off += E.gravity * n.age * n.age * 60;
    if (E.zeroG) off += Math.sin(n.age * 1.2 + n.seed * 6) * 26 * E.zeroG;
    if (E.tornado) off += Math.sin(n.x * .03 + this.t * 4) * 40;
    if (E.heartbeat) off *= 1 + Math.sin(this.t * 6) * .4;
    if (this.S.jitter) off += (Math.random() - .5) * this.S.jitter * 3;
    const lim = this.H * .42;
    return base + clamp(off, -lim, lim);
  }

  // ---- 判定 ------------------------------------------------
  hit() {
    if (!this.enabled) return;
    let target = null, bd = 1e9;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const d = Math.abs(n.x - this.nearestJudge(n.x));
      if (d < bd) { bd = d; target = n; }
    }
    const jx = target ? this.nearestJudge(target.x) : this.jx;
    if (!target || bd > 96) {
      this.waves.push({ x: jx, y: this.lineAt(jx), r: 4, sp: 170, life: .26, life0: .26, hue: 0, sat: 0 });
      return;
    }
    target.hit = true;
    let label, pts;
    if (bd < 16) { label = 'PERFECT'; pts = 300; }
    else if (bd < 38) { label = 'GREAT'; pts = 180; }
    else { label = 'GOOD'; pts = 80; }
    this.judge(label, pts, target);
    this.burst(target);
  }

  judge(label, pts, n) {
    if (label === 'MISS') { this.combo = 0; }
    else {
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.score += pts + Math.floor(this.combo * 1.5);
    }
    this.pushHud(label);
  }

  pushHud(label) {
    if (this.hooks.onJudge) {
      this.hooks.onJudge({ label, score: this.score, combo: this.combo, best: this.best });
    }
  }

  burst(n) {
    const y = this.noteY(n, 0);
    this.waves.push({ x: n.x, y, r: n.size, sp: 260, life: .38, life0: .38, hue: n.hue, sat: n.sat });
    const cnt = rndi(6, 16);
    for (let i = 0; i < cnt; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(60, 340);
      this.parts.push({
        x: n.x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rnd(.25, .7), size: rnd(1.5, 4.5), hue: n.hue, sat: n.sat
      });
    }
  }

  // ---- 描画 ------------------------------------------------
  draw() {
    const c = this.ctx, W = this.W, H = this.H, S = this.S, E = this.E || this.effective();
    c.clearRect(0, 0, W, H);
    if (!this.enabled) return;

    // 下部を少し暗くしてノーツを見やすく
    const g = c.createLinearGradient(0, H * .58, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.62)');
    c.fillStyle = g;
    c.fillRect(0, H * .58, W, H * .42);

    if (E.strobe && Math.sin(this.t * 26) > .4) {
      c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(0, 0, W, H);
    }
    if (E.invert) {
      c.save(); c.globalCompositeOperation = 'difference';
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore();
    }

    this.drawLines(c, E);
    this.drawJudges(c, E);

    c.save();
    if (E.bloom) c.globalCompositeOperation = 'lighter';
    for (const n of this.notes) {
      const y = this.noteY(n, 0);
      n.y = y;
      if (n.trail && n.tr.length > 1) this.drawTrail(c, n);
      if (E.echo) this.drawNote(c, n, n.x - n.dir * 34, y, .28, 1.1);
      if (E.meteor) this.drawNote(c, n, n.x - n.dir * 18, y - 6, .4, .8);
      const alpha = n.hit ? 0 : (E.ghost ? .35 + Math.sin(this.t * 5 + n.seed * 9) * .3 : 1);
      if (alpha > .02) this.drawNote(c, n, n.x, y, alpha, 1);
    }
    c.restore();

    // 波紋
    for (const w of this.waves) {
      c.save();
      c.globalAlpha = clamp(w.life / w.life0, 0, 1) * .85;
      c.strokeStyle = `hsl(${w.hue} ${w.sat}% 70%)`;
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(w.x, w.y, w.r, 0, 6.2832); c.stroke();
      c.restore();
    }
    // 破片
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      c.globalAlpha = clamp(p.life * 1.6, 0, 1);
      c.fillStyle = `hsl(${p.hue} ${p.sat}% 68%)`;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.2832); c.fill();
    }
    c.restore();

    if (E.glitch) this.drawGlitch(c, W, H);
  }

  drawLines(c, E) {
    const W = this.W, S = this.S;
    const count = 1 + (E.extraLines || 0);
    for (let li = 0; li < count; li++) {
      const shift = li === 0 ? 0 : (li % 2 ? -34 : 34) * Math.ceil(li / 2);
      const hue = paletteHue(S.palette, .5, this.t);
      c.save();
      c.globalAlpha = li === 0 ? .95 : .45;
      c.strokeStyle = S.palette === 'mono' ? 'rgba(255,255,255,.85)' : `hsl(${hue} 90% 66%)`;
      c.shadowColor = c.strokeStyle;
      c.lineWidth = 2;
      c.setLineDash([]);
      switch (S.line) {
        case 'dashed': c.setLineDash([16, 12]); break;
        case 'dotted': c.setLineDash([2, 10]); c.lineCap = 'round'; break;
        case 'thick': c.lineWidth = 6; break;
        case 'hair': c.lineWidth = .8; break;
        case 'glow': c.shadowBlur = 18; c.lineWidth = 3; break;
        case 'pulse': c.lineWidth = 2 + Math.abs(Math.sin(this.t * (S.bpm / 60) * Math.PI)) * 5; break;
        case 'broken': c.setLineDash([rnd(20, 70), rnd(8, 40)]); break;
        case 'ladder': c.setLineDash([4, 4]); c.lineWidth = 3; break;
      }
      if (S.line === 'gradient') {
        const gr = c.createLinearGradient(0, 0, W, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(.5, `hsl(${hue} 95% 70%)`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.strokeStyle = gr;
      }
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = this.lineAt(x) + shift;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
      if (S.line === 'double') {
        c.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y = this.lineAt(x) + shift + 6;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      if (S.line === 'ladder') {
        for (let x = 0; x <= W; x += 26) {
          const y = this.lineAt(x) + shift;
          c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x, y + 7); c.stroke();
        }
      }
      c.restore();
    }
  }

  drawJudges(c, E) {
    const S = this.S;
    const pulse = 1 + Math.abs(Math.sin(this.t * (S.bpm / 60) * Math.PI)) * .28;
    for (const jx of this.judgeXs) {
      const jy = this.lineAt(jx);
      const hue = paletteHue(S.palette, .8, this.t);
      c.save();
      c.strokeStyle = S.palette === 'mono' ? '#fff' : `hsl(${hue} 95% 72%)`;
      c.shadowColor = c.strokeStyle; c.shadowBlur = 14;
      c.lineWidth = 2;
      c.beginPath(); c.arc(jx, jy, 17 * pulse, 0, 6.2832); c.stroke();
      c.globalAlpha = .5;
      c.beginPath(); c.arc(jx, jy, 26 * pulse, 0, 6.2832); c.stroke();
      c.globalAlpha = 1;
      c.beginPath(); c.moveTo(jx, jy - 30); c.lineTo(jx, jy + 30); c.stroke();
      c.restore();
    }
  }

  drawTrail(c, n) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n.tr.length; i++) {
      const p = n.tr[i], a = (i / n.tr.length) * .5;
      c.globalAlpha = a;
      c.fillStyle = `hsl(${n.hue} ${n.sat}% ${n.lig}%)`;
      c.beginPath(); c.arc(p[0], p[1], n.size * .5 * (i / n.tr.length), 0, 6.2832); c.fill();
    }
    c.restore();
  }

  drawNote(c, n, x, y, alpha, scale) {
    const s = n.size * scale;
    const col = `hsl(${n.hue} ${n.sat}% ${n.lig}%)`;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    if (n.spin) c.rotate(n.spinA);
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = Math.max(1.4, s * .22);
    c.shadowColor = col; c.shadowBlur = s * .9;
    const poly = (k, r, rot = 0) => {
      c.beginPath();
      for (let i = 0; i < k; i++) {
        const a = rot + i * 6.2832 / k;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.closePath();
    };
    switch (n.shape) {
      case 'dot': c.beginPath(); c.arc(0, 0, s, 0, 6.2832); c.fill(); break;
      case 'ring': c.beginPath(); c.arc(0, 0, s, 0, 6.2832); c.stroke(); break;
      case 'square': c.fillRect(-s, -s, s * 2, s * 2); break;
      case 'hollow': c.strokeRect(-s, -s, s * 2, s * 2); break;
      case 'diamond': poly(4, s * 1.3); c.fill(); break;
      case 'triangle': poly(3, s * 1.3, -Math.PI / 2); c.fill(); break;
      case 'hex': poly(6, s * 1.1); c.fill(); break;
      case 'star':
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * .48 : s * 1.25, a = -Math.PI / 2 + i * Math.PI / 5;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath(); c.fill(); break;
      case 'cross':
        c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, s); c.moveTo(s, -s); c.lineTo(-s, s); c.stroke(); break;
      case 'plus':
        c.beginPath(); c.moveTo(0, -s * 1.2); c.lineTo(0, s * 1.2); c.moveTo(-s * 1.2, 0); c.lineTo(s * 1.2, 0); c.stroke(); break;
      case 'bar': c.fillRect(-s * .35, -s * 1.5, s * .7, s * 3); break;
      case 'twin':
        c.beginPath(); c.arc(-s * .8, 0, s * .62, 0, 6.2832); c.fill();
        c.beginPath(); c.arc(s * .8, 0, s * .62, 0, 6.2832); c.fill(); break;
      case 'pixel':
        c.fillRect(-s, -s, s, s); c.fillRect(0, 0, s, s); break;
      case 'spark':
        c.beginPath();
        c.moveTo(0, -s * 1.6); c.lineTo(s * .42, -s * .42); c.lineTo(s * 1.6, 0);
        c.lineTo(s * .42, s * .42); c.lineTo(0, s * 1.6); c.lineTo(-s * .42, s * .42);
        c.lineTo(-s * 1.6, 0); c.lineTo(-s * .42, -s * .42); c.closePath(); c.fill(); break;
      case 'arrow':
        c.beginPath();
        c.moveTo(s * 1.4 * n.dir, 0); c.lineTo(-s * .6 * n.dir, -s); c.lineTo(-s * .6 * n.dir, s);
        c.closePath(); c.fill(); break;
      case 'blob':
        c.beginPath();
        for (let i = 0; i <= 18; i++) {
          const a = i / 18 * 6.2832;
          const r = s * (1 + Math.sin(a * 3 + this.t * 3 + n.seed * 9) * .22);
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath(); c.fill(); break;
      default: c.beginPath(); c.arc(0, 0, s, 0, 6.2832); c.fill();
    }
    c.restore();
  }

  drawGlitch(c, W, H) {
    for (let i = 0; i < 4; i++) {
      const y = rnd(H * .5, H);
      const h = rnd(2, 14);
      const dx = rnd(-26, 26);
      try {
        const img = c.getImageData(0, y, W, h);
        c.putImageData(img, dx, y);
      } catch (e) { /* ignore */ }
    }
  }
}
