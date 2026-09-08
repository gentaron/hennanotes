// ============================================================
//  HENNA NOTES - ノーツエンジン
//  ノーツは一本線の上を右から左へ、まっすぐ一定速度で流れるだけ。
//  カオスなのは「間隔」。リズム生成器が数秒ごとに勝手に入れ替わる。
// ============================================================

const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ---- 間隔ジェネレータ ---------------------------------------
// make() は「次のノーツまでの秒数」を返す関数を作る。
// wild:true のものは画面中央にバナーで名前が出る。
const GENS = [
  {
    k: 'STEADY', make: () => { const b = rnd(.18, .7); return () => b; }
  },
  {
    k: 'BURST', wild: true, make: () => {
      const fast = rnd(.05, .1), gap = rnd(.7, 2.0), n = rndi(3, 9);
      let i = 0; return () => (++i % n === 0) ? gap : fast;
    }
  },
  {
    k: 'ACCEL', make: () => {
      let d = rnd(.5, .95); const r = rnd(.8, .93);
      return () => (d = Math.max(.05, d * r));
    }
  },
  {
    k: 'BRAKE', make: () => {
      let d = rnd(.05, .12); const r = rnd(1.08, 1.3);
      return () => (d = Math.min(1.8, d * r));
    }
  },
  {
    k: 'RANDOM', make: () => () => rnd(.06, .95)
  },
  {
    k: 'LOGISTIC', wild: true, make: () => {
      let x = rnd(.2, .8); const r = rnd(3.72, 3.99), lo = rnd(.05, .1), hi = rnd(.5, 1.1);
      return () => { x = r * x * (1 - x); return lo + x * (hi - lo); };
    }
  },
  {
    k: 'EUCLID', make: () => {
      const n = rndi(5, 16), k = rndi(2, Math.max(3, n - 2)), u = rnd(.09, .2);
      const seq = []; let prev = -1;
      for (let i = 0; i < n; i++) {
        const cur = Math.floor(i * k / n);
        if (cur !== prev) { seq.push(i); prev = cur; }
      }
      let i = 0;
      return () => {
        const a = seq[i % seq.length];
        const b = seq[(i + 1) % seq.length] + (i + 1 >= seq.length ? n : 0);
        i++; return (b - a) * u;
      };
    }
  },
  {
    k: 'SWING', make: () => {
      const b = rnd(.16, .42), s = rnd(.25, .62); let up = false;
      return () => { up = !up; return up ? b * (1 + s) : b * (1 - s); };
    }
  },
  {
    k: 'POLYRHYTHM', wild: true, make: () => {
      const p1 = rnd(.2, .5), p2 = p1 * pick([2 / 3, 3 / 4, 3 / 5, 4 / 5, 5 / 7, 7 / 8]);
      let cur = 0, t1 = p1, t2 = p2;
      return () => {
        const nt = Math.min(t1, t2), d = nt - cur; cur = nt;
        if (t1 <= cur + 1e-6) t1 += p1;
        if (t2 <= cur + 1e-6) t2 += p2;
        return d;
      };
    }
  },
  {
    k: 'STUTTER', make: () => {
      const fast = rnd(.045, .085), long = rnd(.4, 1.1), n = rndi(3, 6);
      let i = 0; return () => (++i % n === 0) ? long : fast;
    }
  },
  {
    k: 'GAP', wild: true, make: () => {
      const b = rnd(.18, .4); return () => chance(.18) ? rnd(1.2, 3.2) : b;
    }
  },
  {
    k: 'CLUSTER', make: () => {
      let left = 0; const tight = rnd(.05, .09);
      return () => {
        if (left > 0) { left--; return tight; }
        left = rndi(2, 7); return rnd(.7, 2.2);
      };
    }
  },
  {
    k: 'WALK', make: () => {
      let d = rnd(.2, .5);
      return () => (d = clamp(d * rnd(.65, 1.5), .05, 1.6));
    }
  },
  {
    k: 'GOLDEN', make: () => {
      const b = rnd(.12, .3); let i = 0;
      return () => { i++; return b * (1 + ((i * 0.6180339887) % 1) * 2.2); };
    }
  },
  {
    k: 'FIBONACCI', make: () => {
      const u = rnd(.06, .13), f = [1, 1, 2, 3, 5, 8, 13];
      let i = 0; return () => u * f[i++ % f.length];
    }
  },
  {
    k: 'BOUNCE', wild: true, make: () => {
      let d = rnd(.5, .9); const r = rnd(.62, .8), floor = rnd(.045, .07);
      return () => { d *= r; if (d < floor) d = rnd(.5, .9); return d; };
    }
  },
  {
    k: 'PRIME', make: () => {
      const u = rnd(.04, .09), p = [2, 3, 5, 7, 11, 13, 17, 19, 23];
      let i = rndi(0, 4);
      return () => u * p[i++ % p.length];
    }
  },
  {
    k: 'PALINDROME', make: () => {
      const n = rndi(4, 7), seq = Array.from({ length: n }, () => rnd(.06, .8));
      const full = seq.concat([...seq].reverse());
      let i = 0; return () => full[i++ % full.length];
    }
  },
  {
    k: 'MORSE', make: () => {
      const s = rnd(.07, .13), l = s * rnd(3, 5);
      const bits = Array.from({ length: rndi(5, 11) }, () => chance(.5));
      let i = 0; return () => bits[i++ % bits.length] ? l : s;
    }
  },
  {
    k: 'HEARTBEAT', make: () => {
      const s = rnd(.1, .18), l = rnd(.7, 1.3); let up = false;
      return () => { up = !up; return up ? s : l; };
    }
  },
  {
    k: 'MACHINEGUN', wild: true, make: () => { const b = rnd(.045, .075); return () => b; }
  },
  {
    k: 'SILENCE', wild: true, make: () => {
      let first = true;
      return () => { if (first) { first = false; return rnd(1.6, 3.6); } return rnd(.3, .8); };
    }
  },
  {
    k: 'SINE MOD', make: () => {
      const b = rnd(.15, .4), f = rnd(.25, .9), a = rnd(.4, .85);
      let i = 0; return () => b * (1 + Math.sin(i++ * f) * a);
    }
  },
  {
    k: 'RATCHET', make: () => {
      const bar = rnd(.5, .9); let left = 0, sub = .1;
      return () => {
        if (left > 0) { left--; return sub; }
        const div = rndi(1, 8); sub = bar / div; left = div - 1; return sub;
      };
    }
  },
  {
    k: 'HALF/DOUBLE', wild: true, make: () => {
      let b = rnd(.14, .4); let i = 0;
      return () => { if (++i % rndi(4, 9) === 0) b = clamp(b * (chance(.5) ? .5 : 2), .05, 1.4); return b; };
    }
  },
  {
    k: 'TRIPLET', make: () => {
      const b = rnd(.24, .5); let i = 0;
      return () => (++i % 4 === 0) ? b : b / 3;
    }
  },
  {
    k: 'BINARY', make: () => {
      const u = rnd(.07, .14), mask = rndi(3, 255);
      let i = 0, acc = 0;
      return () => {
        acc = 0;
        do { acc += u; i++; } while (!((mask >> (i % 8)) & 1) && acc < u * 8);
        return acc;
      };
    }
  },
  {
    k: 'AVALANCHE', wild: true, make: () => {
      let d = rnd(.35, .6);
      return () => { d = Math.max(.04, d * .88); return d + rnd(-.01, .01); };
    }
  },
  {
    k: 'DRUNK', make: () => { const b = rnd(.16, .5); return () => b * rnd(.35, 1.9); }
  },
  {
    k: 'FREEZE', wild: true, make: () => {
      let n = 0; return () => (++n === 1 ? rnd(2.2, 4.2) : rnd(.06, .12));
    }
  }
];

const PALETTES = [
  { k: 'neon', h: 190, spread: 40 }, { k: 'ice', h: 200, spread: 25 },
  { k: 'magma', h: 14, spread: 30 }, { k: 'toxic', h: 88, spread: 34 },
  { k: 'candy', h: 322, spread: 40 }, { k: 'sunset', h: 350, spread: 45 },
  { k: 'deep', h: 250, spread: 30 }, { k: 'gold', h: 44, spread: 18 },
  { k: 'vhs', h: 300, spread: 60 }, { k: 'mono', h: 0, spread: 0 }
];

export class Rhythm {
  constructor(canvas, hooks = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;               // {onJudge, onChaos, onEvent}
    this.notes = [];
    this.parts = [];
    this.waves = [];
    this.t = 0;
    this.running = false;
    this.enabled = true;
    this.score = 0; this.combo = 0; this.best = 0;
    this.dir = -1;                    // 右 → 左（片側から片側へ、ずっと同じ向き）
    this.speed = 110;                 // px/s（全ノーツ共通・ゆっくり）
    this.speedTarget = 110;
    this.gapScale = 3;                // 間隔の全体倍率
    this.pal = pick(PALETTES);
    this.nextIn = 1.2;
    this.lastGap = 1.2;
    this.phaseLeft = 0;
    this.newPhase(true);
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
    this.lineY = Math.round(h * 0.79);
    this.jx = Math.round(w * 0.24);   // 判定点
  }

  // ---- フェーズ（間隔の作り方が丸ごと入れ替わる） -----------
  newPhase(first) {
    const def = pick(GENS);
    this.gen = def;
    this.next = def.make();
    this.phaseLeft = rnd(3, 9);
    if (chance(.35)) this.speedTarget = rnd(70, 150);
    this.gapScale = rnd(2.2, 4.2);
    if (chance(.3)) this.pal = pick(PALETTES);
    if (!first) {
      this.hooks.onChaos?.(this.describe());
      if (def.wild) this.hooks.onEvent?.(def.k);
    }
  }

  describe() {
    return `${this.gen.k} / ${this.pal.k}`;
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
    this.score = 0; this.combo = 0; this.best = 0;
    this.nextIn = 1.2;
    this.newPhase(true);
    this.pushHud();
  }

  update(dt) {
    this.t += dt;
    this.speed += (this.speedTarget - this.speed) * Math.min(1, dt * 1.2);

    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) this.newPhase();

    // 生成：間隔だけがカオス
    if (this.enabled) {
      this.nextIn -= dt;
      let guard = 0;
      while (this.nextIn <= 0 && guard++ < 12) {
        this.spawn(this.lastGap);
        // 最低でも 88px は離す（ゆっくり流れるので詰まると団子になる）
        const minGap = 88 / this.speed;
        this.lastGap = clamp(this.next() * this.gapScale, minGap, 8);
        this.nextIn += this.lastGap;
      }
    }

    // 移動：まっすぐ一定速度
    const v = this.dir * this.speed;
    for (const n of this.notes) {
      n.x += v * dt;
      n.age += dt;
      if (!n.hit && !n.missed && (n.x - this.jx) * this.dir > 96) {
        n.missed = true;
        this.judge('MISS');
      }
    }
    this.notes = this.notes.filter(n => n.x > -80 && n.x < this.W + 80);

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += w.sp * dt; w.life -= dt;
      if (w.life <= 0) this.waves.splice(i, 1);
    }
  }

  // 直前の間隔が長いほど「アクセント」＝大きく明るい粒になる
  spawn(gap) {
    if (this.notes.length > 200) return;
    const accent = gap > 2;
    const seed = Math.random();
    this.notes.push({
      x: this.dir < 0 ? this.W + 30 : -30,
      size: (accent ? rnd(9, 12) : rnd(5.5, 7.5)),
      accent,
      hue: Math.round((this.pal.h + (seed - .5) * this.pal.spread) / 6) * 6,
      sat: this.pal.k === 'mono' ? 0 : 92,
      lig: accent ? 74 : 64,
      age: 0, hit: false, missed: false
    });
  }

  // ---- 判定 ------------------------------------------------
  hit() {
    if (!this.enabled) return;
    let target = null, bd = 1e9;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const d = Math.abs(n.x - this.jx);
      if (d < bd) { bd = d; target = n; }
    }
    if (!target || bd > 100) {
      this.waves.push({ x: this.jx, y: this.lineY, r: 6, sp: 150, life: .22, life0: .22, hue: 0, sat: 0 });
      return;
    }
    target.hit = true;
    let label, pts;
    if (bd < 16) { label = 'PERFECT'; pts = 300; }
    else if (bd < 38) { label = 'GREAT'; pts = 180; }
    else { label = 'GOOD'; pts = 80; }
    this.judge(label, pts);
    this.burst(target);
  }

  judge(label, pts = 0) {
    if (label === 'MISS') this.combo = 0;
    else {
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.score += pts + Math.floor(this.combo * 1.5);
    }
    this.pushHud(label);
  }

  pushHud(label) {
    this.hooks.onJudge?.({ label, score: this.score, combo: this.combo, best: this.best });
  }

  burst(n) {
    this.waves.push({ x: n.x, y: this.lineY, r: n.size, sp: 230, life: .36, life0: .36, hue: n.hue, sat: n.sat });
    const cnt = n.accent ? rndi(12, 20) : rndi(6, 12);
    for (let i = 0; i < cnt; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(60, 320);
      this.parts.push({
        x: n.x, y: this.lineY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
        life: rnd(.25, .65), size: rnd(1.4, 3.6), hue: n.hue, sat: n.sat
      });
    }
  }

  // 光の粒はキャンバスに焼いて使い回す（shadowBlur より軽い）
  sprite(hue, sat, lig) {
    this._sp = this._sp || new Map();
    const key = hue + '_' + sat + '_' + lig;
    let s = this._sp.get(key);
    if (s) return s;
    const R = 48;
    s = document.createElement('canvas');
    s.width = s.height = R * 2;
    const c = s.getContext('2d');
    const g = c.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, `hsla(${hue} ${sat}% ${Math.min(96, lig + 26)}% / 1)`);
    g.addColorStop(.28, `hsla(${hue} ${sat}% ${lig}% / .9)`);
    g.addColorStop(.55, `hsla(${hue} ${sat}% ${lig}% / .28)`);
    g.addColorStop(1, `hsla(${hue} ${sat}% ${lig}% / 0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, R * 2, R * 2);
    if (this._sp.size > 160) this._sp.clear();
    this._sp.set(key, s);
    return s;
  }

  // ---- 描画 ------------------------------------------------
  draw() {
    const c = this.ctx, W = this.W, H = this.H, y = this.lineY;
    c.clearRect(0, 0, W, H);
    if (!this.enabled) return;

    // 下側を少し落として見やすく
    const g = c.createLinearGradient(0, H * .6, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = g;
    c.fillRect(0, H * .6, W, H * .4);

    const base = `hsl(${this.pal.h} ${this.pal.k === 'mono' ? 0 : 85}% 70%)`;

    // 一本線
    c.save();
    c.strokeStyle = base;
    c.shadowColor = base; c.shadowBlur = 12;
    c.globalAlpha = .85; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    c.restore();

    // 判定点
    c.save();
    c.strokeStyle = base; c.shadowColor = base; c.shadowBlur = 16; c.lineWidth = 2;
    c.beginPath(); c.arc(this.jx, y, 15, 0, 6.2832); c.stroke();
    c.globalAlpha = .35;
    c.beginPath(); c.moveTo(this.jx, y - 26); c.lineTo(this.jx, y + 26); c.stroke();
    c.restore();

    // ノーツ（線の上をまっすぐ流れる）
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const n of this.notes) {
      if (n.hit) continue;
      const sp = this.sprite(n.hue, n.sat, n.lig);
      // 進行方向の後ろに引く尾
      for (let i = 3; i >= 1; i--) {
        const r = n.size * (2.6 - i * .5);
        c.globalAlpha = .12 * (4 - i);
        const tx = n.x - this.dir * n.size * 1.15 * i;
        c.drawImage(sp, tx - r, y - r, r * 2, r * 2);
      }
      const r = n.size * 2.8;
      c.globalAlpha = 1;
      c.drawImage(sp, n.x - r, y - r, r * 2, r * 2);
      if (n.accent) {
        c.globalAlpha = .75;
        c.strokeStyle = `hsl(${n.hue} ${n.sat}% ${n.lig}%)`;
        c.lineWidth = 1.4;
        c.beginPath(); c.arc(n.x, y, n.size * 2, 0, 6.2832); c.stroke();
      }
    }
    c.restore();

    for (const w of this.waves) {
      c.save();
      c.globalAlpha = clamp(w.life / w.life0, 0, 1) * .8;
      c.strokeStyle = `hsl(${w.hue} ${w.sat}% 72%)`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(w.x, w.y, w.r, 0, 6.2832); c.stroke();
      c.restore();
    }

    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      c.globalAlpha = clamp(p.life * 1.6, 0, 1);
      c.fillStyle = `hsl(${p.hue} ${p.sat}% 68%)`;
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.2832); c.fill();
    }
    c.restore();
  }
}
