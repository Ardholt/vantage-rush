import { SCENES } from './data/scenes.js';
import { ROUND_SECS, MAP_HALF, TOL, camGround, roundScore } from './data/rules.js';
import * as board from './data/board.js';
import { renderShot, hasGL } from './render.js';

const IDLE_MS = 20000;   // no input for this long (anywhere but the attract screen) -> back to attract, nothing kept
const REVEAL_MS = 5000;  // reveal auto-advances; a click skips it
const ROUNDS = 3;
const app = document.getElementById('app');

let state = 'boot';      // boot | attract | loading | play | reveal | results
let session = null;      // everything about the current player; null between players
let lastAct = performance.now();
let raf = 0, timers = [];
let attractCards = [];   // pre-rendered postcards for the attract loop (not player data)

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clear = () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; app.replaceChildren(); };
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickShot = (s) => s.shots[Math.floor(Math.random() * s.shots.length)];
/* ---------- sound: synthesized with Web Audio (no files); the audio context starts on the first click ---------- */
let actx = null, muted = false;
const sfx = (() => {
  const ensure = () => {
    const ua = navigator.userActivation, ok = !ua || ua.isActive;
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C && ok) actx = new C(); }
    if (actx && actx.state === 'suspended' && ok) actx.resume();
    return actx;
  };
  const tone = (f0, f1, delay, dur, vol, type = 'sine') => {
    const c = ensure(); if (!c || muted) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  return {
    unlock: ensure,
    tick: () => tone(1200, 800, 0, 0.06, 0.12, 'square'),
    chime: () => [660, 880, 1100].forEach((f, i) => tone(f, f, i * 0.09, 0.4, 0.16)),
    low: () => tone(150, 85, 0, 0.5, 0.22, 'triangle'),
  };
})();
const muteBtn = el('button', 'mute', 'SOUND: ON');
muteBtn.tabIndex = -1;
muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
muteBtn.onclick = () => { sfx.unlock(); muted = !muted; muteBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON'; muteBtn.blur(); };
document.body.append(muteBtn);
const UNLOCK = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
const unlockAudio = () => { if (sfx.unlock()) UNLOCK.forEach((t) => removeEventListener(t, unlockAudio, true)); };
UNLOCK.forEach((t) => addEventListener(t, unlockAudio, { capture: true, passive: true }));


/* ---------- reset: drop the player, keep only the leaderboard (it lives in localStorage) ---------- */
function reset() {
  session = null;
  clear();
  attract();
}

/* ---------- attract ---------- */
function boardHTML(list, hi) {
  const rows = list.map((e, i) => `<li class="${hi === e ? 'me' : ''}"><i>${i + 1}</i><span>${e.name}</span><b>${e.score}</b></li>`).join('');
  return `<h2>TOP 10 · THIS BOOTH</h2>${rows ? `<ol>${rows}</ol>` : '<div class="none">No scores yet. Be the first!</div>'}`;
}

function attract() {
  state = 'attract';
  clear();
  const s = el('div', 'screen');
  s.innerHTML = '<h1>Vantage <b>Rush</b></h1><div class="sub">Three photos. Find where the photographer stood. Under 3 minutes.</div>';
  const row = el('div', 'row');
  const cards = el('div', 'cards');
  const bd = el('div', 'board', boardHTML(board.load()));
  bd.id = 'board';
  row.append(cards, bd);
  s.append(row, el('div', 'cta', 'CLICK OR PRESS ANY KEY TO START'));
  app.append(s);
  let n = 0;
  const show = () => {
    cards.replaceChildren();
    attractCards.slice(n % Math.max(1, attractCards.length)).concat(attractCards).slice(0, 3).forEach((c, i) => {
      const cv = c.cloneNode(); cv.getContext('2d').drawImage(c, 0, 0);
      cv.style.setProperty('--r', ['-4deg', '2deg', '-1.5deg'][i]);
      cards.append(cv);
    });
    n++;
    later(show, 3000);
  };
  if (attractCards.length) show();
  else warmAttract().then(() => { if (state === 'attract') show(); });
}

let warming = null;
function warmAttract() {
  if (warming) return warming;
  warming = (async () => {
    for (const sc of shuffle(SCENES).slice(0, 4)) {
      try { attractCards.push((await renderShot(sc.id, pickShot(sc).pose, { w: 240 })).postcard); } catch (e) { console.error(e); }
      await new Promise((r) => setTimeout(r, 50));
    }
  })();
  return warming;
}

/* ---------- a session ---------- */
function startSession() {
  clear();
  const picks = shuffle(SCENES).slice(0, ROUNDS).map((sc) => ({ id: sc.id, title: sc.title, pose: pickShot(sc).pose }));
  session = { rounds: picks, i: 0, scores: [], dists: [] };
  startRound();
}

async function startRound() {
  const me = session;
  state = 'loading';
  clear();
  const s = el('div', 'screen', `<div class="sub" style="font-size:5vmin">Round ${me.i + 1} of ${ROUNDS}</div><div class="sub">Developing the photo...</div>`);
  app.append(s);
  await new Promise((r) => setTimeout(r, 30)); // let the loader paint
  let imgs;
  try { imgs = await renderShot(me.rounds[me.i].id, me.rounds[me.i].pose, { map: true }); }
  catch (e) { console.error(e); return fail('This browser could not draw the 3D scene.'); }
  if (session !== me) return; // reset while rendering
  lastAct = performance.now();
  play(me, imgs);
}

function fail(msg) { clear(); state = 'attract'; app.append(el('div', 'screen', `<div id="err">${msg}</div>`)); }

function play(me, imgs) {
  state = 'play';
  clear();
  const rd = me.rounds[me.i];
  const truth = camGround(rd.pose);
  const hud = el('div', 'hud', `<span>ROUND ${me.i + 1} / ${ROUNDS}</span><span class="q">Where did the photographer stand? Click the map.</span><span>SCORE <b id="sc">${me.scores.reduce((a, b) => a + b, 0)}</b></span>`);
  const bar = el('div', 'bar', '<div></div>');
  const area = el('div', 'play');
  const pc = imgs.postcard.cloneNode(); pc.getContext('2d').drawImage(imgs.postcard, 0, 0); pc.id = 'pc';
  const map = document.createElement('canvas'); map.width = map.height = 900; map.id = 'map';
  area.append(pc, map);
  app.append(hud, bar, area);
  const g = map.getContext('2d');
  const toPx = (x, z) => [(x / (2 * MAP_HALF) + 0.5) * 900, (z / (2 * MAP_HALF) + 0.5) * 900];
  const ring = (r) => { const [cx, cy] = toPx(0, 0); g.beginPath(); g.arc(cx, cy, (r / (2 * MAP_HALF)) * 900, 0, 7); g.stroke(); };
  const draw = (hover, guess, showTruth) => {
    g.drawImage(imgs.map, 0, 0);
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([10, 10]); ring(5); ring(10); g.setLineDash([]);
    g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
    g.shadowColor = '#000a'; g.shadowBlur = 6; g.fillText('N', 450, 40); g.shadowBlur = 0;
    if (hover && !guess) {
      g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.beginPath(); g.arc(hover[0], hover[1], 26, 0, 7); g.moveTo(hover[0] - 40, hover[1]); g.lineTo(hover[0] + 40, hover[1]); g.moveTo(hover[0], hover[1] - 40); g.lineTo(hover[0], hover[1] + 40); g.stroke();
    }
    if (showTruth) {
      const [tx, ty] = toPx(truth.x, truth.z);
      if (guess) { g.strokeStyle = '#ffd24a'; g.lineWidth = 4; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(guess[0], guess[1]); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]); }
      // the camera: a blue disc with a wedge pointing at the diorama's centre
      const a = Math.atan2(-truth.z, -truth.x);
      g.fillStyle = 'rgba(47,168,255,.35)'; g.beginPath(); g.moveTo(tx, ty); g.arc(tx, ty, 120, a - 0.5, a + 0.5); g.closePath(); g.fill();
      g.fillStyle = '#2fa8ff'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(tx, ty, 18, 0, 7); g.fill(); g.stroke();
    }
    if (guess) { g.fillStyle = '#ffd24a'; g.strokeStyle = '#061a3d'; g.lineWidth = 5; g.beginPath(); g.arc(guess[0], guess[1], 14, 0, 7); g.fill(); g.stroke(); }
  };
  draw();
  const t0 = performance.now();
  let done = false;
  const bg = bar.firstChild;
  const tick = () => {
    if (done) return;
    const left = ROUND_SECS - (performance.now() - t0) / 1000;
    bg.style.transform = `scaleX(${Math.max(0, left / ROUND_SECS)})`;
    bar.classList.toggle('low', left < 8);
    if (left <= 0) return finish(null, 0);
    raf = requestAnimationFrame(tick);
  };
  tick();
  const pos = (e) => { const r = map.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 900, ((e.clientY - r.top) / r.height) * 900]; };
  map.addEventListener('pointermove', (e) => { if (!done) draw(pos(e)); });
  map.addEventListener('pointerdown', (e) => { if (!done) { sfx.tick(); finish(pos(e), ROUND_SECS - (performance.now() - t0) / 1000); } });

  function finish(px, left) {
    done = true;
    cancelAnimationFrame(raf);
    let d = null, pts = 0;
    if (px) {
      const gx = (px[0] / 900 - 0.5) * 2 * MAP_HALF, gz = (px[1] / 900 - 0.5) * 2 * MAP_HALF;
      d = Math.hypot(gx - truth.x, gz - truth.z);
      pts = roundScore(d, left);
    }
    me.scores.push(pts); me.dists.push(d);
    state = 'reveal';
    draw(null, px, true);
    (px && d < TOL ? sfx.chime : sfx.low)();
    document.getElementById('sc').textContent = me.scores.reduce((a, b) => a + b, 0);
    const word = d == null ? 'Out of time' : d < 1.5 ? 'Spot on!' : d < 3 ? 'So close!' : d < 6 ? 'Getting warm' : 'Way off';
    area.append(el('div', 'pop', `<div class="sm">${rd.title} · ${word}</div><div class="big">+${pts}</div><div class="sm">${d == null ? 'no click' : d.toFixed(1) + ' units away'}</div>`));
    const last = me.i === ROUNDS - 1;
    const nb = el('button', 'btn next', last ? 'RESULTS ▶' : 'NEXT ROUND ▶');
    const go = () => { if (session !== me) return; me.i++; last ? results(me) : startRound(); };
    nb.onclick = go;
    app.append(nb);
    later(go, REVEAL_MS);
  }
}

/* ---------- results + initials ---------- */
function results(me) {
  state = 'results';
  clear();
  const total = me.scores.reduce((a, b) => a + b, 0);
  const s = el('div', 'screen');
  s.innerHTML = `<div class="total"><small>YOUR SCORE</small>${total}</div>
    <div class="rounds">${me.rounds.map((r, i) => `<span>${r.title} <b>${me.scores[i]}</b></span>`).join('')}</div>`;
  const slot = el('div');
  const idle = el('div', 'idle');
  idle.id = 'idle';
  s.append(slot, idle);
  app.append(s);
  const showBoard = (res) => {
    slot.replaceChildren();
    const row = el('div', 'row');
    const bd = el('div', 'board', boardHTML(res ? res.all : board.load(), res && res.entry));
    const again = el('button', 'btn', 'PLAY AGAIN');
    again.onclick = () => { reset(); startSession(); };
    row.append(bd, again);
    slot.append(row);
  };
  if (!board.qualifies(total)) { showBoard(); return; }
  const letters = [0, 0, 0]; let cur = 0;
  const box = el('div');
  const render = () => {
    box.replaceChildren();
    box.append(el('div', 'sub', total > 0 ? 'You made the top 10! Pick your initials.' : ''));
    const init = el('div', 'init');
    letters.forEach((v, i) => {
      const c = el('div', 'slot' + (i === cur ? ' on' : ''));
      const up = el('button', '', '▲'), dn = el('button', '', '▼');
      up.onclick = () => { cur = i; letters[i] = (letters[i] + 1) % 26; render(); };
      dn.onclick = () => { cur = i; letters[i] = (letters[i] + 25) % 26; render(); };
      c.append(up, el('div', 'ch', String.fromCharCode(65 + v)), dn);
      init.append(c);
    });
    const save = el('button', 'btn', 'SAVE SCORE');
    save.onclick = commit;
    const skip = el('button', 'btn ghost', 'Skip');
    skip.onclick = () => showBoard();
    box.append(init, el('div', 'row', ''), save, skip);
    box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2vmin';
  };
  const commit = () => { state = 'results'; showBoard(board.add(letters.map((v) => String.fromCharCode(65 + v)).join(''), total)); entering = null; };
  let entering = (e) => {
    if (e.key === 'ArrowLeft') cur = (cur + 2) % 3;
    else if (e.key === 'ArrowRight') cur = (cur + 1) % 3;
    else if (e.key === 'ArrowUp') letters[cur] = (letters[cur] + 1) % 26;
    else if (e.key === 'ArrowDown') letters[cur] = (letters[cur] + 25) % 26;
    else if (e.key === 'Enter') return commit();
    else if (/^[a-z]$/i.test(e.key)) { letters[cur] = e.key.toUpperCase().charCodeAt(0) - 65; cur = Math.min(2, cur + 1); }
    else return;
    e.preventDefault(); render();
  };
  me.keys = (e) => entering && entering(e);
  render();
  slot.append(box);
}

/* ---------- global input + idle ---------- */
const touch = () => { lastAct = performance.now(); };
addEventListener('pointermove', touch);
addEventListener('pointerdown', (e) => { touch(); sfx.unlock(); if (state === 'attract' && hasGL()) { e.preventDefault(); startSession(); } });
addEventListener('keydown', (e) => {
  touch();
  if (state === 'attract') { if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'F5' && e.key !== 'F12') startSession(); }
  else if (state === 'results' && session && session.keys) session.keys(e);
  else if (state === 'reveal' && (e.key === 'Enter' || e.key === ' ')) document.querySelector('.next')?.click();
});
addEventListener('storage', (e) => { if (e.key === board.KEY && state === 'attract') { const b = document.getElementById('board'); if (b) b.innerHTML = boardHTML(board.load()); } });
setInterval(() => {
  if (state === 'attract' || state === 'boot' || state === 'loading') return;
  const left = IDLE_MS - (performance.now() - lastAct);
  const i = document.getElementById('idle');
  if (i) i.textContent = `Back to the start in ${Math.max(0, Math.ceil(left / 1000))} s`;
  if (left <= 0) reset();
}, 250);

window.__rush = { get state() { return state; }, get session() { return session; }, get idleLeftMs() { return IDLE_MS - (performance.now() - lastAct); }, ROUND_SECS, TOL };

if (!hasGL()) fail('Vantage Rush needs WebGL. Please open it in a current Chrome, Edge or Firefox.');
else attract();
