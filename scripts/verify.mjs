// End-to-end verification in headless Chrome. Real mouse/keyboard events only (Playwright input -> CDP).
// Usage: node scripts/verify.mjs   (needs dist/index.html; writes shots/*.png and proof/results.json)
import { chromium } from 'playwright-core';
import { rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const ud = root + 'scratch/profile-verify';
const URL_FILE = 'file://' + root + 'dist/index.html';
const R = { checks: [], times: {}, started: new Date().toISOString() };
const check = (name, ok, detail) => { R.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail ?? ''); };
const memGB = () => Number(/MemAvailable:\s+(\d+)/.exec(readFileSync('/proc/meminfo', 'utf8'))[1]) / 1048576;
const swapMB = () => { const m = readFileSync('/proc/meminfo', 'utf8'); return (Number(/SwapTotal:\s+(\d+)/.exec(m)[1]) - Number(/SwapFree:\s+(\d+)/.exec(m)[1])) / 1024 | 0; };
const guard = (label) => { const g = memGB(); console.log(`[mem] ${label}: MemAvailable ${g.toFixed(1)} GB, swap used ${swapMB()} MB`); if (g < 3) { console.log('ABORT: MemAvailable < 3 GB'); process.exit(2); } };

rmSync(ud, { recursive: true, force: true });
guard('start');
const launch = (extra = {}) => chromium.launchPersistentContext(ud, { executablePath: '/usr/bin/google-chrome', headless: true, viewport: { width: 1920, height: 1080 },
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'], ...extra });
const shot = (p, n) => p.screenshot({ path: `${root}shots/${n}.png` });
const rush = (p, f) => p.evaluate(f);
const waitState = (p, s, t = 60000) => p.waitForFunction((s) => window.__rush.state === s, s, { timeout: t });
const truthOf = (p) => p.evaluate(() => { const me = window.__rush.session; const q = me.rounds[me.i].pose; const s = Math.sin(q.polar); return { x: s * Math.sin(q.az) * q.dist, z: s * Math.cos(q.az) * q.dist, id: me.rounds[me.i].id }; });
async function clickMap(p, x, z) {
  x = Math.max(-14.5, Math.min(14.5, x)); z = Math.max(-14.5, Math.min(14.5, z)); // keep the click on the map // world offset from the diorama centre -> screen px, then a real click
  const b = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await p.mouse.move(b.l + b.w / 2, b.t + b.h / 2);
  await p.mouse.click(b.l + (x / 30 + 0.5) * b.w, b.t + (z / 30 + 0.5) * b.h);
}
const board = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('vantage-rush.top10.v1') || '[]'));

let ctx = await launch();
let p = ctx.pages()[0] || await ctx.newPage();
const reqs = [];
p.on('request', (r) => reqs.push(r.url()));
p.on('pageerror', (e) => console.log('pageerror', e.message));

// ---- 1. attract
let t = Date.now();
await p.goto(URL_FILE);
await p.waitForFunction(() => document.querySelectorAll('.cards canvas').length >= 3, null, { timeout: 120000 });
R.times.attractReadyMs = Date.now() - t;
check('attract screen shows title, 3 postcards, empty board', await p.evaluate(() => document.querySelector('h1').textContent.includes('Vantage') && document.querySelectorAll('.cards canvas').length === 3 && /No scores yet/.test(document.getElementById('board').textContent)), `ready in ${R.times.attractReadyMs} ms`);
await shot(p, '01-attract');

// ---- 2. a full session by real clicks
guard('before session 1');
const sessionStart = Date.now();
await p.mouse.click(400, 400);
await waitState(p, 'play');
const scoresLog = [];
for (let i = 0; i < 3; i++) {
  if (i) await waitState(p, 'play');
  const tr = await truthOf(p);
  const sceneId = tr.id;
  if (i === 0) await shot(p, '02-round1-play');
  if (i === 0) await clickMap(p, tr.x + 0.4, tr.z - 0.3);   // near-perfect
  else if (i === 1) { await p.waitForTimeout(3000); await clickMap(p, tr.x + 6, tr.z + 3); } // a miss, a bit slow
  else { /* round 3: no click -> timeout path */ await p.waitForTimeout(500); await shot(p, '04-round3-play'); for (let k = 0; k < 4; k++) { await p.mouse.move(300 + k * 7, 300); await p.waitForTimeout(5000); } }
  await waitState(p, 'reveal', 40000);
  const s = await rush(p, () => ({ scores: window.__rush.session.scores.slice(), dists: window.__rush.session.dists.slice() }));
  scoresLog.push({ round: i + 1, sceneId, ...s });
  if (i === 0) await shot(p, '03-round1-reveal');
  if (i === 2) await shot(p, '05-round3-timeout-reveal');
}
await waitState(p, 'results', 20000);
R.times.sessionMs = Date.now() - sessionStart;
const fin = await rush(p, () => window.__rush.session.scores.slice());
R.session1 = { rounds: scoresLog, final: fin, total: fin.reduce((a, b) => a + b, 0) };
check('3 rounds completed by real clicks, results reached', fin.length === 3, JSON.stringify(R.session1));
check('round 1 (near-exact click) scored >= 900', fin[0] >= 900, fin[0]);
check('round 2 (miss) scored lower than round 1 but > 0', fin[1] > 0 && fin[1] < fin[0], fin[1]);
check('round 3 (no click) timed out with 0', fin[2] === 0, fin[2]);
check('whole session (click start -> results) under 3 minutes', R.times.sessionMs < 180000, `${(R.times.sessionMs / 1000).toFixed(1)} s`);
await shot(p, '06-results-initials');

// ---- 3. initials by mouse + arrow keys, save
await p.locator('.slot').nth(0).locator('button', { hasText: '▲' }).click();       // A -> B (mouse)
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); // slot 2: A -> C (keys)
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');          // slot 3: A -> Z
const init = await p.evaluate(() => [...document.querySelectorAll('.slot .ch')].map((e) => e.textContent).join(''));
check('initials entry by mouse and arrow keys gives BCZ', init === 'BCZ', init);
await shot(p, '07-initials-entered');
await p.keyboard.press('Enter');
await p.waitForSelector('.board li.me');
const b1 = await board(p);
check('score saved to localStorage top-10', b1.length === 1 && b1[0].name === 'BCZ' && b1[0].score === R.session1.total, JSON.stringify(b1));
await shot(p, '08-leaderboard-after-save');

// ---- 4. persistence across reload
await p.reload();
await p.waitForFunction(() => document.querySelectorAll('.cards canvas').length >= 3, null, { timeout: 120000 });
const shown = await p.evaluate(() => document.getElementById('board').textContent);
check('leaderboard persists across reload and shows on attract', /BCZ/.test(shown) && shown.includes(String(R.session1.total)), shown.slice(0, 80));
await shot(p, '09-attract-after-reload');

// ---- 5. idle reset: second player reaches results, walks away without saving
guard('before session 2');
await p.keyboard.press('x');                                  // any key starts
await waitState(p, 'play');
for (let i = 0; i < 3; i++) { if (i) await waitState(p, 'play'); const tr = await truthOf(p); await clickMap(p, tr.x + 1, tr.z + 1); await waitState(p, 'reveal', 40000); await p.locator('.next').click(); }
await waitState(p, 'results', 20000);
const s2 = await rush(p, () => window.__rush.session.scores.reduce((a, b) => a + b, 0));
check('session 2 reached results with a top-10-worthy score (initials prompt visible)', await p.locator('.slot').count() === 3, `score ${s2}`);
const idleStart = Date.now();
await shot(p, '10-results-before-idle');
await waitState(p, 'attract', 40000);
const idleMs = Date.now() - idleStart;
R.times.idleResetMs = idleMs;
check('auto-reset to attract after ~20 s idle', idleMs >= 19000 && idleMs <= 24000, `${idleMs} ms`);
const after = await p.evaluate(() => ({ session: window.__rush.session, ls: Object.keys(localStorage), ss: Object.keys(sessionStorage), results: !!document.querySelector('.total'), slots: document.querySelectorAll('.slot').length, hud: !!document.querySelector('.hud'), canvasesInPlay: !!document.getElementById('map') }));
check('reset left no player state (session null, no play/results DOM, storage = leaderboard key only)', after.session === null && !after.results && !after.slots && !after.hud && !after.canvasesInPlay && after.ls.length === 1 && after.ls[0] === 'vantage-rush.top10.v1' && after.ss.length === 0, JSON.stringify(after));
const b2 = await board(p);
check('unsaved second score was discarded; leaderboard unchanged', JSON.stringify(b2.map((e) => e.name + e.score)) === JSON.stringify(b1.map((e) => e.name + e.score)), JSON.stringify(b2));
await shot(p, '11-attract-after-idle-reset');

// ---- 6. new player after reset starts from a clean slate
await p.mouse.click(300, 300);
await waitState(p, 'play');
const fresh = await rush(p, () => ({ i: window.__rush.session.i, scores: window.__rush.session.scores.length, round: document.querySelector('.hud span').textContent, score: document.getElementById('sc').textContent }));
check('next player starts at round 1 with score 0', fresh.i === 0 && fresh.scores === 0 && /1 \/ 3/.test(fresh.round) && fresh.score === '0', JSON.stringify(fresh));
await ctx.close();

// ---- 7. network off: http://127.0.0.1 static server + context offline + all DNS blocked; plus file:// again
guard('before offline run');
const srv = spawn('node', [root + 'scripts/serve.mjs', '8099'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
ctx = await launch();
await ctx.setOffline(true);
p = ctx.pages()[0] || await ctx.newPage();
const reqs2 = [];
p.on('request', (r) => reqs2.push(r.url()));
const fails = [];
p.on('requestfailed', (r) => fails.push(r.url()));
await p.goto(URL_FILE);
await p.waitForFunction(() => document.querySelectorAll('.cards canvas').length >= 3, null, { timeout: 120000 });
const offTxt = await p.evaluate(() => document.getElementById('board').textContent);
check('network-off via file:// (context offline, DNS blocked, static server): attract loads, leaderboard still there', /BCZ/.test(offTxt), offTxt.slice(0, 60));
await p.mouse.click(300, 300);
await waitState(p, 'play');
check('network-off: round 1 renders and is playable', true);
await shot(p, '12-offline-play');
const external = [...reqs, ...reqs2].filter((u) => !/^(file:|data:|blob:|http:\/\/127\.0\.0\.1)/.test(u));
check('no request to any non-local URL during the whole run', external.length === 0, `${reqs.length + reqs2.length} requests; non-local: ${JSON.stringify(external)}`);
await ctx.close();
// static-server path: DNS for everything but 127.0.0.1 is blocked (Chrome's offline emulation also blocks loopback, so it is not set here)
ctx = await launch();
p = ctx.pages()[0] || await ctx.newPage();
await p.goto('http://127.0.0.1:8099/');
await p.waitForFunction(() => document.querySelectorAll('.cards canvas').length >= 3, null, { timeout: 120000 });
await p.mouse.click(300, 300);
await waitState(p, 'play');
check('static-server load (http://127.0.0.1, external DNS blocked): attract and round 1 work', true);
await ctx.close();
srv.kill();

rmSync(ud, { recursive: true, force: true });
R.finished = new Date().toISOString();
R.allPass = R.checks.every((c) => c.ok);
mkdirSync(root + 'proof', { recursive: true });
writeFileSync(root + 'proof/results.json', JSON.stringify(R, null, 2));
console.log(R.allPass ? 'ALL PASS' : 'SOME FAILED');
