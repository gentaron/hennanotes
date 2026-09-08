import { store } from './store.js';
import { Rhythm } from './rhythm.js';

const $ = id => document.getElementById(id);
const library = $('library'), viewer = $('viewer');
const grid = $('grid'), fileInput = $('fileInput'), dropzone = $('dropzone');
const slide = $('slide'), stage = $('stage'), fx = $('fx');

let items = [];      // {id, url, name}
let idx = 0;
let rhythm = null;
let autoTimer = null;

// ---------- 小物 ----------
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1700);
}

// ---------- ライブラリ ----------
async function refresh() {
  for (const it of items) URL.revokeObjectURL(it.url);
  const recs = await store.all();
  items = recs.map(r => ({ id: r.id, name: r.name, url: URL.createObjectURL(r.blob) }));
  grid.innerHTML = '';
  items.forEach((it, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.innerHTML =
      `<img src="${it.url}" alt="" loading="lazy">` +
      `<span class="idx">${i + 1}</span>` +
      `<button class="del" aria-label="削除">×</button>`;
    cell.querySelector('img').addEventListener('click', () => openViewer(i));
    cell.querySelector('.del').addEventListener('click', async e => {
      e.stopPropagation();
      await store.remove(it.id);
      refresh();
    });
    grid.appendChild(cell);
  });
  $('count').textContent = `${items.length} 枚`;
}

async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  for (const f of list) await store.add(f);
  await refresh();
  toast(`${list.length} 枚 追加`);
}

$('btnAdd').addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value = ''; });

['dragenter', 'dragover'].forEach(ev =>
  dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('hot'); }));
['dragleave', 'drop'].forEach(ev =>
  dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('hot'); }));
dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

$('btnClear').addEventListener('click', async () => {
  if (!items.length) return;
  if (!confirm('保存した画像を全部消す？')) return;
  await store.clear();
  refresh();
});

$('btnPlay').addEventListener('click', () => {
  if (!items.length) return toast('先に画像を追加してね');
  openViewer(0);
});

// ---------- ビューア ----------
function show(i) {
  if (!items.length) return;
  idx = (i + items.length) % items.length;
  slide.src = items[idx].url;
  $('backdrop').src = items[idx].url;
  slide.style.transition = 'transform .22s ease-out, opacity .22s';
  slide.style.transform = 'translateX(0)';
  slide.style.opacity = '1';
  $('pos').textContent = `${idx + 1} / ${items.length}`;
}

function step(d) {
  const dir = d > 0 ? -1 : 1;
  slide.style.transition = 'transform .14s ease-in, opacity .14s';
  slide.style.transform = `translateX(${dir * 40}px)`;
  slide.style.opacity = '.15';
  setTimeout(() => show(idx + d), 130);
}

function openViewer(i) {
  library.classList.add('hidden');
  viewer.classList.remove('hidden');
  show(i);
  if (!rhythm) {
    rhythm = new Rhythm(fx, {
      onJudge: onJudge,
      onChaos: txt => { $('chaosName').textContent = txt; },
      onEvent: name => banner(name)
    });
  }
  rhythm.resize();
  rhythm.reset();
  rhythm.start();
  $('chaosName').textContent = rhythm.describe();
  if (!openViewer._hinted) { openViewer._hinted = true; toast('スワイプで送る / 下をタップ・Space で叩く'); }
  if (document.documentElement.requestFullscreen && window.matchMedia('(max-width: 900px)').matches) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

function closeViewer() {
  viewer.classList.add('hidden');
  library.classList.remove('hidden');
  rhythm?.stop();
  stopAuto();
  document.exitFullscreen?.().catch(() => {});
}

$('btnBack').addEventListener('click', closeViewer);

$('btnGame').addEventListener('click', e => {
  if (!rhythm) return;
  rhythm.enabled = !rhythm.enabled;
  e.target.classList.toggle('on', rhythm.enabled);
  e.target.textContent = rhythm.enabled ? 'ノーツ ON' : 'ノーツ OFF';
});

function stopAuto() {
  clearInterval(autoTimer); autoTimer = null;
  const b = $('btnAuto');
  b.textContent = '自動 OFF'; b.classList.remove('on');
}
$('btnAuto').addEventListener('click', e => {
  if (autoTimer) return stopAuto();
  autoTimer = setInterval(() => step(1), 3600);
  e.target.textContent = '自動 ON'; e.target.classList.add('on');
});

// 判定表示
const JUDGE_COLOR = { PERFECT: '#66e6ff', GREAT: '#8dff9e', GOOD: '#ffd76a', MISS: '#ff5c6c' };
function onJudge({ label, score, combo, best }) {
  $('score').textContent = score.toLocaleString();
  $('combo').textContent = combo > 1 ? `${combo} COMBO` : '';
  if (!label) return;
  const el = $('judgeText');
  el.textContent = label;
  el.style.color = JUDGE_COLOR[label] || '#fff';
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  if (label !== 'MISS') blip(label);
}

function banner(name) {
  const el = $('eventBanner');
  el.textContent = name;
  el.style.color = `hsl(${Math.random() * 360} 95% 68%)`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
}

// ちいさな効果音
let actx = null;
function blip(label) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = label === 'PERFECT' ? 'triangle' : 'square';
    o.frequency.value = label === 'PERFECT' ? 880 : label === 'GREAT' ? 660 : 440;
    g.gain.setValueAtTime(.08, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0008, actx.currentTime + .12);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + .13);
  } catch (e) { /* 音は出なくても遊べる */ }
}

// ---------- 操作（自由スライド + 叩く） ----------
let drag = null;
stage.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, moved: false, t: Date.now() };
  slide.style.transition = 'none';
  stage.setPointerCapture?.(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 6) drag.moved = true;
  slide.style.transform = `translateX(${dx}px)`;
  slide.style.opacity = String(1 - Math.min(Math.abs(dx) / 420, .6));
});
stage.addEventListener('pointerup', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const fast = Date.now() - drag.t < 260 && Math.abs(dx) > 34;
  if (dx < -60 || (fast && dx < 0)) show(idx + 1);
  else if (dx > 60 || (fast && dx > 0)) show(idx - 1);
  else if (!drag.moved) show(e.clientX > window.innerWidth / 2 ? idx + 1 : idx - 1);
  else show(idx);
  drag = null;
});
stage.addEventListener('pointercancel', () => { if (drag) { show(idx); drag = null; } });

const hitzone = $('hitzone');
hitzone.addEventListener('pointerdown', e => { e.preventDefault(); rhythm?.hit(); });

window.addEventListener('keydown', e => {
  if (viewer.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') show(idx + 1);
  else if (e.key === 'ArrowLeft') show(idx - 1);
  else if (e.key === 'Escape') closeViewer();
  else if (e.key === ' ' || e.key === 'Enter' || e.key === 'f' || e.key === 'j') { e.preventDefault(); rhythm?.hit(); }
});

// ---------- PWA ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  $('btnInstall').classList.remove('hidden');
});
$('btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('btnInstall').classList.add('hidden');
});
window.addEventListener('appinstalled', () => {
  $('btnInstall').classList.add('hidden');
  toast('インストール完了');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

refresh();
