// Rain Tram: blue hour, steady rain at a city tram stop. A yellow tram at the shelter, overhead wires,
// a corner café with warm windows, a newsstand, people under umbrellas, wet glossy street.
import { Painter, compose, lambert, unlit, slab, gable, roof, skyDome, halos, keyLight, disposeTree, rng, glowTexture } from './kit.js';

const PAL = {
  asphalt: '#353c4e',
  asphalt2: '#3f4759',
  pave: '#59607a',
  pave2: '#4d546c',
  kerb: '#8c93a6',
  setts: '#4a4f62',
  board: '#2a2b38',
  soil: '#3d3437',
  brickU: '#55453f',
  rail: '#9aa3b5',
  pole: '#26343a',
  tram: '#e8b53c',
  tramDark: '#b8862a',
  cream: '#f1e6cc',
  roofT: '#d9d6cf',
  glow: '#ffc874',
  glowCool: '#fff1cf',
  window: '#28324a',
  plaster: '#7d8a88',
  brick: '#8a4b3e',
  cafe: '#d8c8a8',
  green: '#2e5a48',
  slate: '#4c5570',
  skin: '#e2b08c',
  dark: '#262a36',
};

// Clip a closed polygon [[x,z],...] to the half-plane a*x + b*z <= c (Sutherland-Hodgman).
function clip(pts, a, b, c) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
const box = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const within = (pts, x0, x1, z0, z1) => clip(clip(clip(clip(pts, -1, 0, -x0), 1, 0, x1), 0, -1, -z0), 0, 1, z1);

function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(3131);
  const root = new THREE.Group();
  const P = new Painter(THREE, 31); // matt lambert
  const W = new Painter(THREE, 32); // wet, glossy surfaces
  const E = new Painter(THREE, 33); // unlit glow (windows, lamps)
  const uTime = { value: 0 };

  const G = 0.25; // street
  const PV = 0.36; // pavement
  const S0 = -0.75, S1 = 1.55; // street edges (z)
  const TZ = 0.4; // track centre
  const SX0 = -0.9, SX1 = 0.3; // side street (x) running north
  const N0 = -2.1; // building line

  // Plinth: a city block cut out of the ground: board, soil with a sewer pipe, brick undercroft, road base.
  const rim = [[-4.6, -4.3], [4.6, -4.3], [4.6, 3.05], [3.35, 4.3], [-4.6, 4.3]];
  const grow = (pts, d) => pts.map(([x, z]) => [x + Math.sign(x) * d, z + Math.sign(z) * d]);
  P.add(slab(THREE, grow(rim, 0.25), -1.3, -1.0, 0.05), PAL.board, { shade: 0.05 });
  P.add(slab(THREE, rim, -1.0, -0.5), PAL.soil, { jitter: 0.03, shade: 0.1 });
  P.add(slab(THREE, rim, -0.5, -0.05), PAL.brickU, { jitter: 0.02, shade: 0.12 });
  P.add(slab(THREE, rim, -0.05, 0.0), '#6a6f80', { shade: 0.03 });
  // the old sewer showing in the cut face (front and side)
  P.add(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10), '#7a6a5e', { pos: [-1.6, -0.62, 4.25], rot: [Math.PI / 2, 0, 0] });
  P.add(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 10), '#15161c', { pos: [-1.6, -0.62, 4.27], rot: [Math.PI / 2, 0, 0] });
  P.add(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8), '#5b6e78', { pos: [4.56, -0.3, -1.2], rot: [0, 0, Math.PI / 2] });

  // Ground: street, side street, pavements and the little square, all wet.
  W.add(slab(THREE, within(rim, -9, 9, S0, S1), 0.0, G), PAL.asphalt, { shade: 0.05 });
  W.add(slab(THREE, within(rim, SX0, SX1, -9, S0), 0.0, G), PAL.asphalt, { shade: 0.05 });
  W.add(slab(THREE, within(rim, -9, SX0, -9, S0), 0.0, PV), PAL.pave2, { shade: 0.04 });
  W.add(slab(THREE, within(rim, SX1, 9, -9, S0), 0.0, PV), PAL.pave2, { shade: 0.04 });
  W.add(slab(THREE, within(rim, -9, 9, S1, 9), 0.0, PV), PAL.pave2, { shade: 0.04 });
  // asphalt patches and puddle sheen (lighter, sky-coloured)
  for (let i = 0; i < 14; i++) {
    const x = -4.2 + rand() * 8.4, z = S0 + 0.15 + rand() * (S1 - S0 - 0.3);
    if (Math.abs(z - TZ) < 0.42) continue;
    W.add(new THREE.CylinderGeometry(0.2 + rand() * 0.35, 0.2, 0.01, 7), rand() > 0.5 ? PAL.asphalt2 : '#4a5a7c', { pos: [x, G + 0.002, z], scl: [1.6, 1, 0.7], ry: rand() * 0.4, jitter: 0.04, jitterY: 0 });
  }
  // kerbs
  const kerb = (x0, x1, z, along = 'x') => {
    if (along === 'x') W.add(new THREE.BoxGeometry(x1 - x0, PV - G + 0.02, 0.12), PAL.kerb, { pos: [(x0 + x1) / 2, (PV + G) / 2, z], jitter: 0.008, shade: 0.06 });
    else W.add(new THREE.BoxGeometry(0.12, PV - G + 0.02, x1 - x0), PAL.kerb, { pos: [z, (PV + G) / 2, (x0 + x1) / 2], jitter: 0.008, shade: 0.06 });
  };
  kerb(-4.6, SX0, S0 - 0.06);
  kerb(SX1, 4.6, S0 - 0.06);
  kerb(-4.6, 4.6, S1 + 0.06);
  kerb(-4.3, S0, SX0 - 0.06, 'z');
  kerb(-4.3, S0, SX1 + 0.06, 'z');
  // paving flags: a loose grid with uneven tones
  const flags = (x0, x1, z0, z1, s) => {
    for (let x = x0; x < x1 - 0.05; x += s) for (let z = z0; z < z1 - 0.05; z += s) {
      const w = Math.min(s, x1 - x) - 0.03, d = Math.min(s, z1 - z) - 0.03;
      if (x + w / 2 > 3.35 + (4.3 - (z + d / 2)) && z > 3.0) continue;
      const c = rand();
      W.add(new THREE.BoxGeometry(w, 0.02, d), c > 0.7 ? PAL.pave : c > 0.25 ? '#535a73' : '#454c63', { pos: [x + w / 2 + 0.015, PV + 0.008, z + d / 2 + 0.015], ry: (rand() - 0.5) * 0.02, jitterY: 0.004, jitter: 0.004, shade: 0.03 });
    }
  };
  flags(-4.55, SX0 - 0.12, N0, S0 - 0.12, 0.44);
  flags(SX1 + 0.12, 4.55, N0, S0 - 0.12, 0.44);
  flags(-4.55, 4.55, S1 + 0.12, 2.95, 0.44);
  // the square: small setts in a fan, darker
  for (let i = 0; i < (low ? 60 : 130); i++) {
    const x = -4.5 + rand() * 7.9, z = 3.0 + rand() * 1.25;
    if (x > 3.3 + (4.3 - z) - 0.1) continue;
    W.add(new THREE.BoxGeometry(0.16, 0.025, 0.16), rand() > 0.5 ? PAL.setts : '#555a6e', { pos: [x, PV + 0.01, z], ry: rand() * 0.5, jitter: 0.01, jitterY: 0.004 });
  }

  // Tram track: rails, sleepers buried, a crossing in the side street.
  for (const dz of [-0.27, 0.27]) {
    P.add(new THREE.BoxGeometry(9.2, 0.03, 0.05), PAL.rail, { pos: [0, G + 0.012, TZ + dz], shade: 0.02 });
    W.add(new THREE.BoxGeometry(9.2, 0.008, 0.12), '#252a35', { pos: [0, G + 0.003, TZ + dz] });
  }
  // zebra crossing from the side street to the stop
  for (let k = 0; k < 6; k++) W.add(new THREE.BoxGeometry(0.75, 0.01, 0.2), '#c9ccd4', { pos: [SX0 + 0.6 + 0.0, G + 0.005, S0 + 0.22 + k * 0.38], jitter: 0.01, jitterY: 0, shade: 0.05 });

  // Buildings along the north side.
  const win = (x, y, z, w, h, face, lit, painter = null) => {
    // face: 'z+' 'z-' 'x+' 'x-' sets which way the window looks
    const d = 0.03;
    const geo = face[0] === 'z' ? new THREE.BoxGeometry(w, h, d) : new THREE.BoxGeometry(d, h, w);
    (painter || (lit ? E : P)).add(geo, lit ? (rand() > 0.3 ? PAL.glow : PAL.glowCool) : PAL.window, { pos: [x, y, z] });
    const s = face[1] === '+' ? 1 : -1;
    if (face[0] === 'z') P.add(new THREE.BoxGeometry(w + 0.1, 0.04, 0.08), '#c9c3b5', { pos: [x, y - h / 2 - 0.02, z + s * 0.03] });
    else P.add(new THREE.BoxGeometry(0.08, 0.04, w + 0.1), '#c9c3b5', { pos: [x + s * 0.03, y - h / 2 - 0.02, z] });
  };
  // A: grey-green townhouse with a shuttered shop
  {
    const x0 = -4.6, x1 = -2.7, H = 2.9, z0 = -4.3;
    P.add(new THREE.BoxGeometry(x1 - x0, H, N0 - z0), PAL.plaster, { pos: [(x0 + x1) / 2, PV + H / 2, (z0 + N0) / 2], jitter: 0.012, shade: 0.04 });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.08, 0.08, N0 - z0 + 0.08), '#a7b0ab', { pos: [(x0 + x1) / 2, PV + 1.0, (z0 + N0) / 2] });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.12, 0.1, N0 - z0 + 0.12), '#a7b0ab', { pos: [(x0 + x1) / 2, PV + H, (z0 + N0) / 2] });
    // shop shutter + fascia
    P.add(new THREE.BoxGeometry(1.2, 0.72, 0.04), '#3d4d4a', { pos: [-3.75, PV + 0.4, N0 + 0.02] });
    for (let k = 0; k < 8; k++) P.add(new THREE.BoxGeometry(1.2, 0.012, 0.05), '#2b3634', { pos: [-3.75, PV + 0.1 + k * 0.085, N0 + 0.025] });
    P.add(new THREE.BoxGeometry(1.4, 0.18, 0.06), '#7a2e34', { pos: [-3.75, PV + 0.88, N0 + 0.03] });
    P.add(new THREE.BoxGeometry(0.3, 0.6, 0.04), '#2a2f3d', { pos: [-2.98, PV + 0.32, N0 + 0.02] });
    for (const [x, r] of [[-4.15, 0], [-3.65, 1], [-3.15, 1], [-4.15, 2], [-3.15, 2]]) win(x, PV + 1.45 + (r ? 0.75 * (r - 1) + 0.0 : 0) + (r === 2 ? 0.75 : 0), N0 + 0.01, 0.3, 0.42, 'z+', rand() > 0.45);
    win(-3.65, PV + 2.2, N0 + 0.01, 0.3, 0.42, 'z+', true);
    for (const x of [-4.25, -3.15]) P.add(new THREE.BoxGeometry(0.28, 0.55, 0.32), PAL.brick, { pos: [x, PV + H + 0.3, -3.6], jitter: 0.01 });
    for (const x of [-4.31, -4.19, -3.21, -3.09]) P.add(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 6), '#b06a4a', { pos: [x, PV + H + 0.63, -3.6] });
    // gable side windows facing the street end
    win(-4.61, PV + 1.6, -3.2, 0.3, 0.4, 'x-', true);
    // corner clock tower: cream turret, lit clock faces, verdigris spire. The landmark of the street's west end.
    const tx = -4.05, tz = -2.6, ty = PV + H, th = 1.55;
    P.add(new THREE.BoxGeometry(0.82, th, 0.82), '#d6c6a6', { pos: [tx, ty + th / 2, tz], jitter: 0.008, shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.92, 0.1, 0.92), '#a7b0ab', { pos: [tx, ty + 0.05, tz] });
    P.add(new THREE.BoxGeometry(0.94, 0.1, 0.94), '#a7b0ab', { pos: [tx, ty + th, tz] });
    for (const [dx, dz, ry] of [[0, 0.415, 0], [0, -0.415, 0], [0.415, 0, Math.PI / 2], [-0.415, 0, Math.PI / 2]]) {
      E.add(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 14), '#ffe6b0', { pos: [tx + dx, ty + th - 0.42, tz + dz], rot: [Math.PI / 2, ry, 0] });
      P.add(new THREE.TorusGeometry(0.26, 0.025, 3, 14), '#2e2a26', { pos: [tx + dx * 1.03, ty + th - 0.42, tz + dz * 1.03], ry });
      P.add(new THREE.BoxGeometry(0.03, 0.18, 0.012), '#2e2a26', { pos: [tx + dx * 1.06, ty + th - 0.36, tz + dz * 1.06], ry });
      P.add(new THREE.BoxGeometry(0.13, 0.03, 0.012), '#2e2a26', { pos: [tx + dx * 1.06 + (ry ? 0 : 0.05), ty + th - 0.42, tz + dz * 1.06 + (ry ? 0.05 : 0)], ry });
      // louvred belfry slot below the clock
      P.add(new THREE.BoxGeometry(0.26, 0.4, 0.03), '#3a3f52', { pos: [tx + dx * 1.01, ty + 0.45, tz + dz * 1.01], ry });
    }
    P.add(new THREE.ConeGeometry(0.66, 1.35, 4), '#5fa58e', { pos: [tx, ty + th + 0.72, tz], ry: Math.PI / 4, shade: 0.1, top: '#8cc8a8', y0: ty + th, y1: ty + th + 1.4 });
    P.add(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4), '#d8b85a', { pos: [tx, ty + th + 1.55, tz] });
    P.add(new THREE.SphereGeometry(0.05, 6, 4), '#e8c86a', { pos: [tx, ty + th + 1.5, tz] });
  }
  // B: tall brick house with a balcony
  {
    const x0 = -2.7, x1 = SX0, H = 3.45, z0 = -4.3;
    P.add(new THREE.BoxGeometry(x1 - x0, H, N0 - z0), PAL.brick, { pos: [(x0 + x1) / 2, PV + H / 2, (z0 + N0) / 2], jitter: 0.012, shade: 0.06 });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.12, N0 - z0 + 0.1), '#c9b9a1', { pos: [(x0 + x1) / 2, PV + H, (z0 + N0) / 2] });
    P.add(new THREE.BoxGeometry(0.36, 0.7, 0.05), '#22303f', { pos: [-1.35, PV + 0.36, N0 + 0.02] });
    P.add(new THREE.BoxGeometry(0.5, 0.06, 0.2), '#c9b9a1', { pos: [-1.35, PV + 0.03, N0 + 0.1] });
    E.add(new THREE.BoxGeometry(0.1, 0.14, 0.1), PAL.glow, { pos: [-1.05, PV + 0.85, N0 + 0.08] });
    win(-2.2, PV + 0.55, N0 + 0.01, 0.42, 0.5, 'z+', true);
    for (const r of [0, 1, 2]) for (const x of [-2.25, -1.4]) win(x, PV + 1.35 + r * 0.72, N0 + 0.01, 0.32, 0.48, 'z+', (r + (x > -2 ? 1 : 0)) % 3 !== 0);
    // balcony on the second floor with pots
    P.add(new THREE.BoxGeometry(0.75, 0.05, 0.3), '#c9b9a1', { pos: [-1.4, PV + 1.82, N0 + 0.15] });
    for (let k = 0; k < 8; k++) P.add(new THREE.BoxGeometry(0.02, 0.26, 0.02), PAL.dark, { pos: [-1.74 + k * 0.097, PV + 1.97, N0 + 0.29] });
    P.add(new THREE.BoxGeometry(0.76, 0.025, 0.025), PAL.dark, { pos: [-1.4, PV + 2.1, N0 + 0.29] });
    for (const [x, c] of [[-1.65, '#4f7a3a'], [-1.2, '#c0473f']]) {
      P.add(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 6), '#a0563a', { pos: [x, PV + 1.9, N0 + 0.14] });
      P.add(new THREE.IcosahedronGeometry(0.09, 0), c, { pos: [x, PV + 2.0, N0 + 0.14] });
    }
    // side wall onto the side street: drainpipe and a lit window
    P.add(new THREE.CylinderGeometry(0.025, 0.025, H, 5), PAL.dark, { pos: [SX0 + 0.03, PV + H / 2, N0 - 0.1] });
    win(SX0 + 0.01, PV + 2.1, -3.2, 0.3, 0.45, 'x+', true);
    win(SX0 + 0.01, PV + 1.35, -3.2, 0.3, 0.45, 'x+', false);
    P.add(new THREE.BoxGeometry(0.4, 0.5, 0.4), '#7d4639', { pos: [-2.4, PV + H + 0.25, -3.8] });
  }
  // C: the corner café, two storeys, striped awning and warm windows.
  let cafeSign;
  {
    const x0 = SX1, x1 = 4.6, H = 2.25, z0 = -4.3, cx = (x0 + x1) / 2;
    P.add(new THREE.BoxGeometry(x1 - x0, H, N0 - z0), PAL.cafe, { pos: [cx, PV + H / 2, (z0 + N0) / 2], jitter: 0.012, shade: 0.04 });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.06, 0.95, N0 - z0 + 0.06), PAL.green, { pos: [cx, PV + 0.475, (z0 + N0) / 2], jitter: 0.006, shade: 0.04 });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.07, N0 - z0 + 0.1), '#e8dcc3', { pos: [cx, PV + H, (z0 + N0) / 2] });
    // mansard roof
    P.add(roof(THREE, N0 - z0 + 0.25, 0.75, x1 - x0 + 0.2, 0.07), PAL.slate, { pos: [cx, PV + H - 0.02, (z0 + N0) / 2], ry: Math.PI / 2, jitter: 0.01, shade: 0.06 });
    P.add(gable(THREE, N0 - z0, 0.7, x1 - x0 - 0.02), PAL.slate, { pos: [cx, PV + H, (z0 + N0) / 2], ry: Math.PI / 2 });
    for (const x of [1.2, 2.5, 3.7]) {
      P.add(new THREE.BoxGeometry(0.36, 0.38, 0.4), PAL.cafe, { pos: [x, PV + H + 0.3, N0 - 0.35] });
      P.add(gable(THREE, 0.44, 0.18, 0.46), PAL.slate, { pos: [x, PV + H + 0.49, N0 - 0.35] });
      win(x, PV + H + 0.3, N0 - 0.14, 0.2, 0.24, 'z+', x !== 2.5);
    }
    P.add(new THREE.BoxGeometry(0.3, 0.6, 0.3), '#8a5a48', { pos: [4.0, PV + H + 0.6, -3.5] });
    // big ground-floor windows onto the main street
    for (const x of [0.95, 1.95, 3.25, 4.15]) {
      E.add(new THREE.BoxGeometry(x > 4 ? 0.55 : 0.8, 0.56, 0.03), PAL.glow, { pos: [x, PV + 0.52, N0 + 0.02] });
      P.add(new THREE.BoxGeometry(0.04, 0.6, 0.04), PAL.cream, { pos: [x, PV + 0.52, N0 + 0.04] });
    }
    // door at the corner end
    P.add(new THREE.BoxGeometry(0.34, 0.72, 0.04), '#5b3a2a', { pos: [2.6, PV + 0.36, N0 + 0.03] });
    E.add(new THREE.BoxGeometry(0.22, 0.3, 0.02), PAL.glow, { pos: [2.6, PV + 0.5, N0 + 0.06] });
    // side windows onto the side street
    for (const z of [-2.6, -3.5]) E.add(new THREE.BoxGeometry(0.03, 0.5, 0.6), PAL.glow, { pos: [SX1 - 0.005, PV + 0.52, z] });
    for (const z of [-2.6, -3.5]) win(SX1 - 0.01, PV + 1.5, z, 0.4, 0.42, 'x-', z < -3);
    // upper windows
    for (const x of [0.9, 1.8, 2.7, 3.6]) win(x, PV + 1.5, N0 + 0.01, 0.4, 0.5, 'z+', x === 1.8 || x === 3.6);
    // striped awning, sloping out over the pavement
    const AW0 = 0.6, AW1 = 4.5, n = 13;
    for (let i = 0; i < n; i++) {
      const w = (AW1 - AW0) / n;
      P.add(new THREE.BoxGeometry(w + 0.002, 0.03, 0.7), i % 2 ? '#e9e1cf' : '#2f6b52', { pos: [AW0 + (i + 0.5) * w, PV + 1.0, N0 + 0.33], rot: [0.32, 0, 0], shade: 0.02 });
      P.add(new THREE.BoxGeometry(w + 0.002, 0.13, 0.02), i % 2 ? '#e9e1cf' : '#2f6b52', { pos: [AW0 + (i + 0.5) * w, PV + 0.85, N0 + 0.67], shade: 0.02 });
    }
    // a red neon blade sign on the café's east corner: HOTEL, stacked, the street's east-end landmark
    P.add(new THREE.BoxGeometry(0.06, 1.25, 0.06), PAL.dark, { pos: [4.3, PV + 1.95, N0 + 0.08] });
    P.add(new THREE.BoxGeometry(0.16, 1.2, 0.5), '#3a1f28', { pos: [4.3, PV + 1.95, N0 + 0.36] });
    for (const sx of [-1, 1]) {
      E.add(new THREE.BoxGeometry(0.02, 1.08, 0.38), '#ff5a5a', { pos: [4.3 + sx * 0.085, PV + 1.95, N0 + 0.36] });
      for (let k = 0; k < 5; k++) E.add(new THREE.BoxGeometry(0.025, 0.12, 0.2), '#ffe2c8', { pos: [4.3 + sx * 0.09, PV + 2.38 - k * 0.21, N0 + 0.36] });
    }
    E.add(new THREE.BoxGeometry(0.18, 0.04, 0.52), '#ffd27a', { pos: [4.3, PV + 2.57, N0 + 0.36] });
    // café sign above the awning
    const tex = canvasTex(THREE, 256, 64, (g) => {
      g.fillStyle = '#1f3d33'; g.fillRect(0, 0, 256, 64);
      g.strokeStyle = '#e8c87a'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
      g.fillStyle = '#f3dfa6'; g.font = 'italic bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Café', 128, 34);
    });
    cafeSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: tex }));
    cafeSign.position.set(1.95, PV + 1.22, N0 + 0.03);
    root.add(cafeSign);
    // pavement tables with tipped chairs, and a cat sheltering under the awning
    for (const [x, z] of [[1.4, N0 + 0.42], [3.55, N0 + 0.45]]) {
      P.add(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 10), '#c8ccd6', { pos: [x, PV + 0.38, z] });
      P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.37, 5), PAL.dark, { pos: [x, PV + 0.19, z] });
      for (const s of [-1, 1]) {
        P.add(new THREE.BoxGeometry(0.16, 0.02, 0.16), PAL.dark, { pos: [x + s * 0.26, PV + 0.27, z + 0.05], rot: [0, 0, s * 0.5] });
        P.add(new THREE.BoxGeometry(0.02, 0.27, 0.02), PAL.dark, { pos: [x + s * 0.3, PV + 0.13, z + 0.1] });
      }
    }
    const cx2 = 2.98, cz2 = N0 + 0.2;
    P.add(new THREE.SphereGeometry(0.08, 7, 5), '#2a2a30', { pos: [cx2, PV + 0.07, cz2], scl: [1.4, 0.8, 0.9] });
    P.add(new THREE.SphereGeometry(0.05, 6, 4), '#2a2a30', { pos: [cx2 + 0.11, PV + 0.13, cz2 + 0.02] });
    for (const dz of [-0.025, 0.025]) P.add(new THREE.ConeGeometry(0.018, 0.04, 3), '#2a2a30', { pos: [cx2 + 0.12, PV + 0.18, cz2 + dz + 0.02] });
    P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4), '#2a2a30', { pos: [cx2 - 0.15, PV + 0.07, cz2 + 0.06], rot: [0.3, 0, 1.2] });
  }
  // back side of the block (seen from behind): yard wall, and a few lit back windows so the rear reads warm
  for (const [x, y, lit] of [[-4.1, 1.5, true], [-3.3, 2.25, false], [-2.3, 1.4, true], [-1.4, 2.8, true], [-2.2, 2.1, false], [0.9, 1.5, false], [1.9, 1.5, true], [3.0, 0.6, true], [3.9, 1.5, true]]) {
    win(x, PV + y, -4.31, 0.32, 0.44, 'z-', lit);
  }
  P.add(new THREE.BoxGeometry(9.15, 0.08, 0.05), '#6a6f80', { pos: [0, PV + 0.04, -4.27] });

  // Overhead line: poles both sides, span wires, the contact wire over the track.
  const poles = [[-3.55, -0.95], [-3.4, 1.75], [0.65, -0.95], [0.85, 1.75], [3.75, -0.95], [3.6, 1.75]];
  const WY = 3.05; // contact wire height
  for (const [x, z] of poles) {
    P.add(new THREE.CylinderGeometry(0.05, 0.07, WY + 0.35, 7), PAL.pole, { pos: [x, PV + (WY + 0.35) / 2 - 0.1, z], rot: [z < 0 ? -0.03 : 0.03, 0, 0] });
    P.add(new THREE.CylinderGeometry(0.09, 0.09, 0.25, 7), PAL.pole, { pos: [x, PV + 0.12, z] });
    P.add(new THREE.SphereGeometry(0.06, 6, 4), PAL.pole, { pos: [x, PV + WY + 0.28, z] });
  }
  const wire = (a, b, r = 0.012, sag = 0) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const segs = sag ? 4 : 1;
    for (let i = 0; i < segs; i++) {
      const p0 = A.clone().lerp(B, i / segs), p1 = A.clone().lerp(B, (i + 1) / segs);
      p0.y -= sag * Math.sin(Math.PI * i / segs); p1.y -= sag * Math.sin(Math.PI * (i + 1) / segs);
      const len = p0.distanceTo(p1);
      const m = new THREE.Matrix4().compose(p0.clone().lerp(p1, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()), new THREE.Vector3(1, 1, 1));
      P.add(new THREE.CylinderGeometry(r, r, len, 3), PAL.dark, { matrix: m });
    }
  };
  for (let i = 0; i < poles.length; i += 2) {
    const [xa, za] = poles[i], [xb, zb] = poles[i + 1];
    wire([xa, PV + WY + 0.15, za], [xb, PV + WY + 0.15, zb], 0.01, 0.06);
  }
  wire([-4.65, PV + WY, TZ], [4.65, PV + WY, TZ], 0.013);
  wire([-4.65, PV + WY - 0.03, TZ + 0.2], [4.65, PV + WY - 0.03, TZ + 0.2], 0.009);
  // a street lamp arm on the middle south pole
  {
    const [x, z] = poles[3];
    P.add(new THREE.BoxGeometry(0.04, 0.04, 0.7), PAL.pole, { pos: [x, PV + 2.55, z - 0.33] });
    P.add(new THREE.ConeGeometry(0.16, 0.14, 6), PAL.pole, { pos: [x, PV + 2.5, z - 0.68] });
    E.add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), '#ffd28a', { pos: [x, PV + 2.42, z - 0.68] });
  }

  // Tram shelter on the south pavement: glass panels in a dark frame, bench, timetable, lit advert.
  const SH = { x0: -2.75, x1: -1.05, z: 2.55 };
  const glass = new Painter(THREE, 34);
  {
    const { x0, x1, z } = SH;
    const h = 1.35;
    for (const x of [x0, (x0 + x1) / 2, x1]) P.add(new THREE.BoxGeometry(0.05, h, 0.05), PAL.dark, { pos: [x, PV + h / 2, z] });
    for (const x of [x0, x1]) P.add(new THREE.BoxGeometry(0.05, h, 0.05), PAL.dark, { pos: [x, PV + h / 2, z - 0.6] });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.25, 0.06, 0.85), PAL.dark, { pos: [(x0 + x1) / 2, PV + h + 0.03, z - 0.3], rot: [0.06, 0, 0] });
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.25, 0.02, 0.85), '#4a6a8a', { pos: [(x0 + x1) / 2, PV + h + 0.07, z - 0.3], rot: [0.06, 0, 0] });
    glass.add(new THREE.BoxGeometry(x1 - x0, h - 0.15, 0.02), '#a9c3dd', { pos: [(x0 + x1) / 2, PV + h / 2 + 0.05, z] });
    for (const x of [x0, x1]) glass.add(new THREE.BoxGeometry(0.02, h - 0.15, 0.55), '#a9c3dd', { pos: [x, PV + h / 2 + 0.05, z - 0.3] });
    // bench
    P.add(new THREE.BoxGeometry(1.1, 0.04, 0.22), '#6b4a3a', { pos: [(x0 + x1) / 2 + 0.1, PV + 0.32, z - 0.14] });
    for (const dx of [-0.4, 0.5]) P.add(new THREE.BoxGeometry(0.04, 0.3, 0.18), PAL.dark, { pos: [(x0 + x1) / 2 + dx, PV + 0.15, z - 0.14] });
    // lit advert panel at the street end (both faces glow)
    P.add(new THREE.BoxGeometry(0.08, 1.0, 0.52), PAL.dark, { pos: [x1 + 0.0, PV + 0.65, z - 0.3] });
    E.add(new THREE.BoxGeometry(0.09, 0.85, 0.42), '#d7ecff', { pos: [x1, PV + 0.65, z - 0.3] });
    E.add(new THREE.BoxGeometry(0.095, 0.3, 0.32), '#ff8a7a', { pos: [x1, PV + 0.72, z - 0.3] });
    E.add(new THREE.BoxGeometry(0.095, 0.08, 0.3), '#3a6ad0', { pos: [x1, PV + 0.43, z - 0.3] });
    // stop flag on a post at the kerb
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 5), PAL.dark, { pos: [x0 - 0.35, PV + 0.95, S1 + 0.25] });
    P.add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12), '#2f6b52', { pos: [x0 - 0.35, PV + 1.82, S1 + 0.25], rot: [Math.PI / 2, 0, 0] });
    E.add(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 12), '#f3e3a6', { pos: [x0 - 0.35, PV + 1.82, S1 + 0.25], rot: [Math.PI / 2, 0, 0] });
    P.add(new THREE.BoxGeometry(0.18, 0.26, 0.03), '#e9e1cf', { pos: [x0 - 0.35, PV + 1.4, S1 + 0.27] });
  }
  const glassMesh = glass.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false }), { cast: false, receive: false });
  glassMesh.renderOrder = 2;

  // Newsstand kiosk with racks and the vendor.
  {
    const kx = 2.5, kz = 2.4;
    const km = compose(THREE, { pos: [kx, PV, kz], ry: -0.08 });
    const at = (o) => km.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(1.0, 1.05, 0.8), '#2e5a48', { matrix: at({ pos: [0, 0.525, 0] }), jitter: 0.008, shade: 0.04 });
    P.add(new THREE.BoxGeometry(1.15, 0.08, 0.95), '#1e3a30', { matrix: at({ pos: [0, 1.48, 0] }) });
    P.add(new THREE.BoxGeometry(1.0, 0.4, 0.8), '#2e5a48', { matrix: at({ pos: [0, 1.25, 0] }) });
    P.add(new THREE.ConeGeometry(0.75, 0.3, 4), '#1e3a30', { matrix: at({ pos: [0, 1.67, 0], ry: Math.PI / 4, scl: [1, 1, 0.82] }) });
    E.add(new THREE.BoxGeometry(0.8, 0.38, 0.03), PAL.glow, { matrix: at({ pos: [0, 1.25, -0.41] }) });
    E.add(new THREE.BoxGeometry(0.9, 0.12, 0.02), '#f6e7b8', { matrix: at({ pos: [0, 1.48, -0.48] }) });
    // vendor inside the hatch
    P.add(new THREE.SphereGeometry(0.08, 7, 5), PAL.skin, { matrix: at({ pos: [0.15, 1.22, -0.3] }) });
    P.add(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 7), '#6b2f2f', { matrix: at({ pos: [0.15, 1.31, -0.3] }) });
    P.add(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 7), '#7a6a52', { matrix: at({ pos: [0.15, 1.1, -0.3] }) });
    // magazine racks on the street face, a riot of covers
    const covers = ['#e14b4b', '#f2c94c', '#56b6c9', '#f5f0e6', '#d36ba6', '#7ccf7a', '#ff8a3d', '#4a6fd1'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      P.add(new THREE.BoxGeometry(0.15, 0.2, 0.02), covers[(r * 5 + c * 3) % covers.length], { matrix: at({ pos: [-0.36 + c * 0.18, 0.3 + r * 0.24, -0.43 - r * 0.0], rot: [0.25, 0, 0] }) });
    }
    // back: side door and a weathered poster for a circus
    P.add(new THREE.BoxGeometry(0.34, 0.8, 0.02), '#244a3b', { matrix: at({ pos: [-0.25, 0.42, 0.41] }) });
    P.add(new THREE.BoxGeometry(0.3, 0.42, 0.02), '#e9d8b0', { matrix: at({ pos: [0.22, 0.6, 0.41] }) });
    P.add(new THREE.BoxGeometry(0.22, 0.12, 0.022), '#c23a32', { matrix: at({ pos: [0.22, 0.68, 0.412] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.05, 0.022), '#2f5a8c', { matrix: at({ pos: [0.22, 0.5, 0.412] }) });
    // bundle of papers under a plastic sheet beside it
    P.add(new THREE.BoxGeometry(0.35, 0.22, 0.25), '#e8e3d6', { matrix: at({ pos: [0.72, 0.11, -0.1] }) });
    P.add(new THREE.BoxGeometry(0.38, 0.03, 0.28), '#9cc0d8', { matrix: at({ pos: [0.72, 0.235, -0.1], rot: [0.05, 0, 0.04] }) });
    const tex = canvasTex(THREE, 256, 64, (g) => {
      g.fillStyle = '#f6e7b8'; g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#1e3a30'; g.font = 'bold 42px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('NEWS', 128, 34);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.11), new THREE.MeshBasicMaterial({ map: tex }));
    sign.applyMatrix4(at({ pos: [0, 1.48, -0.495], ry: Math.PI }));
    root.add(sign);
  }

  // Plane tree in an iron grate, bench beneath it, a bike at a stand.
  {
    const tx = -3.55, tz = 3.55;
    P.add(new THREE.BoxGeometry(0.7, 0.02, 0.7), '#22262f', { pos: [tx, PV + 0.01, tz] });
    P.add(new THREE.CylinderGeometry(0.09, 0.14, 2.0, 7), '#8a8270', { pos: [tx, PV + 1.0, tz], rot: [0.04, 0, -0.05], jitter: 0.015 });
    for (const [a, l, t] of [[0.4, 0.9, 0.7], [2.5, 0.8, 0.8], [4.4, 0.7, 0.6]]) P.add(new THREE.CylinderGeometry(0.03, 0.06, l, 5), '#8a8270', { pos: [tx + Math.cos(a) * 0.25, PV + 1.9, tz + Math.sin(a) * 0.25], rot: [Math.sin(a) * t, 0, -Math.cos(a) * t] });
    for (let i = 0; i < 7; i++) {
      const a = rand() * 6.28, d = i ? 0.35 + rand() * 0.35 : 0;
      const s = 0.38 + rand() * 0.2, y = PV + 2.35 + (rand() - 0.4) * 0.45;
      P.add(new THREE.IcosahedronGeometry(s, 1), rand() > 0.5 ? '#355a46' : '#2b4c40', { pos: [tx + Math.cos(a) * d, y, tz + Math.sin(a) * d], scl: [1, 0.8, 1], jitter: 0.05, shade: 0.1, top: '#4f7a62', y0: y - s * 0.3, y1: y + s });
    }
    // bench
    P.add(new THREE.BoxGeometry(0.9, 0.04, 0.24), '#6b4a3a', { pos: [-2.55, PV + 0.3, 3.85], ry: 0.1 });
    P.add(new THREE.BoxGeometry(0.9, 0.2, 0.04), '#6b4a3a', { pos: [-2.56, PV + 0.45, 3.97], ry: 0.1 });
    for (const dx of [-0.38, 0.38]) P.add(new THREE.BoxGeometry(0.04, 0.3, 0.24), PAL.dark, { pos: [-2.55 + dx, PV + 0.15, 3.85 + dx * 0.1] });
    // bike stand + bike (wheels as rings)
    const bx = 0.55, bz = 3.75;
    P.add(new THREE.TorusGeometry(0.22, 0.02, 4, 10), PAL.dark, { pos: [bx, PV + 0.22, bz], ry: 0.2, rot: [0, 0.2, 0] });
    for (const dx of [-0.32, 0.32]) P.add(new THREE.TorusGeometry(0.17, 0.018, 4, 12), '#22252e', { pos: [bx + dx, PV + 0.18, bz + dx * 0.2], rot: [0, 0.2, 0] });
    P.add(new THREE.BoxGeometry(0.6, 0.03, 0.03), '#c0473f', { pos: [bx, PV + 0.32, bz], ry: -0.2, rot: [0, -0.2, 0.15] });
    P.add(new THREE.BoxGeometry(0.03, 0.25, 0.03), '#c0473f', { pos: [bx - 0.08, PV + 0.25, bz], rot: [0, 0, 0.3] });
    P.add(new THREE.BoxGeometry(0.12, 0.03, 0.06), PAL.dark, { pos: [bx - 0.12, PV + 0.4, bz - 0.02] });
    P.add(new THREE.BoxGeometry(0.03, 0.03, 0.22), '#9aa3b5', { pos: [bx + 0.28, PV + 0.45, bz + 0.06], ry: -0.2 });
    // a red pillar box at the square's corner
    P.add(new THREE.CylinderGeometry(0.14, 0.15, 0.68, 10), '#c23a32', { pos: [2.55, PV + 0.34, 3.55] });
    P.add(new THREE.SphereGeometry(0.15, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#c23a32', { pos: [2.55, PV + 0.68, 3.55] });
    P.add(new THREE.BoxGeometry(0.14, 0.025, 0.03), PAL.dark, { pos: [2.55, PV + 0.52, 3.41] });
  }

  // The tram: yellow and cream, lit inside, trolley pole up to the wire.
  const TR = { x: -1.45, len: 3.5 };
  {
    const tm = compose(THREE, { pos: [TR.x, G, TZ], ry: 0 });
    const at = (o) => tm.clone().multiply(compose(THREE, o));
    const L = TR.len, Wd = 0.84;
    // bogies and skirt
    for (const x of [-1.0, 1.0]) {
      P.add(new THREE.BoxGeometry(0.75, 0.16, Wd - 0.12), '#1d2029', { matrix: at({ pos: [x, 0.12, 0] }) });
      for (const dx of [-0.22, 0.22]) for (const s of [-1, 1]) P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), '#2a2d36', { matrix: at({ pos: [x + dx, 0.1, s * 0.3], rot: [Math.PI / 2, 0, 0] }) });
    }
    // body with rounded ends: a stadium plan extruded
    const plan = [];
    const r = Wd / 2;
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI; plan.push([L / 2 - r * 0.55 + Math.cos(a) * r * 0.55, Math.sin(a) * r]); }
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + (i / 6) * Math.PI; plan.push([-L / 2 + r * 0.55 + Math.cos(a) * r * 0.55, Math.sin(a) * r]); }
    const pts = plan.map(([x, z]) => [x, z]);
    P.add(slab(THREE, pts, 0.2, 0.68), PAL.tram, { matrix: at({}), shade: 0.03 });
    P.add(slab(THREE, pts.map(([x, z]) => [x * 1.003, z * 1.03]), 0.6, 0.66), PAL.cream, { matrix: at({}), shade: 0.02 });
    P.add(slab(THREE, pts.map(([x, z]) => [x * 1.003, z * 1.03]), 0.22, 0.27), PAL.tramDark, { matrix: at({}), shade: 0.02 });
    // window band: lit glass with yellow pillars
    E.add(slab(THREE, pts.map(([x, z]) => [x * 0.985, z * 0.97]), 0.68, 1.12), '#e9b866', { matrix: at({}) });
    const nP = 9;
    for (let i = 0; i <= nP; i++) {
      const x = -L / 2 + 0.45 + (i / nP) * (L - 0.9);
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.07, 0.44, 0.03), PAL.tram, { matrix: at({ pos: [x, 0.9, s * (Wd / 2 - 0.01)] }) });
    }
    for (const s of [-1, 1]) {
      P.add(new THREE.BoxGeometry(0.06, 0.44, 0.18), PAL.tram, { matrix: at({ pos: [s * (L / 2 - 0.05), 0.9, 0.28] }) });
      P.add(new THREE.BoxGeometry(0.06, 0.44, 0.18), PAL.tram, { matrix: at({ pos: [s * (L / 2 - 0.05), 0.9, -0.28] }) });
    }
    P.add(slab(THREE, pts, 1.12, 1.2), PAL.cream, { matrix: at({}), shade: 0.02 });
    // roof: shallow curved top
    const rf = new THREE.CylinderGeometry(0.6, 0.6, L - 0.25, 12, 1, false, -0.78, 1.56);
    P.add(rf, '#a9a59c', { matrix: at({ pos: [0, 0.82, 0], rot: [0, 0, Math.PI / 2], scl: [1, 1, 0.75] }) });
    // doors on the stop side (+z), one open with the step lit
    P.add(new THREE.BoxGeometry(0.42, 0.85, 0.03), '#7a5a20', { matrix: at({ pos: [1.05, 0.65, Wd / 2 + 0.005] }) });
    E.add(new THREE.BoxGeometry(0.4, 0.82, 0.02), '#ffd590', { matrix: at({ pos: [-0.85, 0.64, Wd / 2 + 0.01] }) });
    P.add(new THREE.BoxGeometry(0.42, 0.04, 0.14), '#9aa3b5', { matrix: at({ pos: [-0.85, 0.22, Wd / 2 + 0.06] }) });
    // passengers silhouetted against the lit windows
    for (const [x, s] of [[-0.3, 0.3], [0.25, -0.2], [0.75, 0.25], [-1.25, -0.1]]) {
      P.add(new THREE.SphereGeometry(0.07, 6, 4), '#3a3240', { matrix: at({ pos: [x, 0.98, s] }) });
      P.add(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 6), '#3a3240', { matrix: at({ pos: [x, 0.82, s] }) });
    }
    // headlights, number box, destination blind
    for (const s of [-1, 1]) {
      E.add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), '#fff4d6', { matrix: at({ pos: [s * (L / 2 + 0.005), 0.45, 0], rot: [0, 0, Math.PI / 2] }) });
      P.add(new THREE.BoxGeometry(0.06, 0.16, 0.5), PAL.dark, { matrix: at({ pos: [s * (L / 2 - 0.12), 1.29, 0] }) });
      P.add(new THREE.BoxGeometry(0.1, 0.06, 0.6), '#c23a32', { matrix: at({ pos: [s * (L / 2 - 0.2), 0.3, 0] }) });
    }
    // trolley pole up to the contact wire, with its base on the roof
    P.add(new THREE.BoxGeometry(0.3, 0.08, 0.24), '#2a2d36', { matrix: at({ pos: [-0.6, 1.33, 0] }) });
    const base = new THREE.Vector3(-0.6, 1.36, 0).applyMatrix4(tm);
    const tip = new THREE.Vector3(base.x + 1.35, PV + WY - 0.02, TZ);
    wire([base.x, base.y, base.z], [tip.x, tip.y, tip.z], 0.02);
    P.add(new THREE.BoxGeometry(0.12, 0.04, 0.05), PAL.dark, { pos: [tip.x, tip.y + 0.02, tip.z] });
  }
  const tramSign = (() => {
    const tex = canvasTex(THREE, 256, 64, (g) => {
      g.fillStyle = '#111317'; g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#ffd25a'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('7  DEPOT', 128, 34);
    });
    const m = new THREE.MeshBasicMaterial({ map: tex });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.12), m);
      p.position.set(TR.x + s * (TR.len / 2 - 0.085), G + 1.29, TZ);
      p.rotation.y = s * Math.PI / 2;
      root.add(p);
    }
    return m;
  })();
  void tramSign;

  // People: umbrellas of every colour, one runner with a newspaper over his head.
  function person(x, z, ry, coat, opts = {}) {
    const y = opts.y ?? PV;
    const m = compose(THREE, { pos: [x, y, z], rot: [opts.lean || 0, ry, 0] });
    const at = (o) => m.clone().multiply(compose(THREE, o));
    const sc = opts.s || 1;
    for (const dx of [-0.045, 0.045]) P.add(new THREE.CylinderGeometry(0.035 * sc, 0.04 * sc, 0.32 * sc, 5), opts.legs || '#2a2c38', { matrix: at({ pos: [dx * sc, 0.16 * sc, opts.stride ? dx * 1.6 : 0], rot: [opts.stride ? -dx * 7 : 0, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.085 * sc, 0.11 * sc, 0.4 * sc, 7), coat, { matrix: at({ pos: [0, 0.5 * sc, 0] }) });
    P.add(new THREE.SphereGeometry(0.075 * sc, 7, 5), PAL.skin, { matrix: at({ pos: [0, 0.79 * sc, 0] }) });
    if (opts.hat) P.add(new THREE.SphereGeometry(0.08 * sc, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), opts.hat, { matrix: at({ pos: [0, 0.81 * sc, 0] }) });
    if (opts.umbrella) {
      const u = opts.umbrella;
      const tilt = opts.tilt || 0;
      P.add(new THREE.CylinderGeometry(0.01, 0.01, 0.6 * sc, 4), PAL.dark, { matrix: at({ pos: [0.09 * sc, 0.8 * sc, 0.02], rot: [tilt, 0, -0.1] }) });
      const cm = at({ pos: [0.12 * sc, 1.12 * sc, 0.02 + tilt * 0.3], rot: [tilt, 0, -0.1] });
      P.add(new THREE.ConeGeometry(0.36 * sc, 0.17 * sc, 8), u, { matrix: cm, shade: 0.1 });
      if (opts.trim) P.add(new THREE.ConeGeometry(0.37 * sc, 0.05 * sc, 8, 1, true), opts.trim, { matrix: cm.clone().multiply(compose(THREE, { pos: [0, -0.07 * sc, 0] })) });
      P.add(new THREE.SphereGeometry(0.02, 4, 3), PAL.dark, { matrix: cm.clone().multiply(compose(THREE, { pos: [0, 0.1 * sc, 0] })) });
    }
    return at;
  }
  // waiting under the shelter, umbrella furled
  {
    const at = person(-2.2, 2.32, 0.2, '#6b6f8a', { hat: '#3a2e2e' });
    P.add(new THREE.CylinderGeometry(0.02, 0.035, 0.55, 5), '#2f6b52', { matrix: at({ pos: [0.13, 0.28, 0.05], rot: [0, 0, -0.15] }) });
    person(-1.55, 2.38, 2.6, '#a05a3a', { s: 0.95 });
  }
  person(-0.6, 1.95, 3.0, '#30405a', { umbrella: '#d6403a', tilt: 0.2 });
  person(1.75, 3.45, -1.3, '#4a3b56', { umbrella: '#f2c94c', stride: true });
  person(1.9, -1.25, 1.6, '#2c4a5a', { umbrella: '#2fa39a', tilt: -0.1 });
  person(2.25, -1.15, 1.6, '#5a4048', { umbrella: '#273a6e', trim: '#e9e1cf', s: 1.05 });
  // a child in a yellow coat stamping in a puddle, pink umbrella with white spots
  {
    const px = -1.15, pz = 3.55;
    W.add(new THREE.CylinderGeometry(0.45, 0.45, 0.01, 10), '#3e5480', { pos: [px, PV + 0.022, pz + 0.05], scl: [1.3, 1, 0.8], jitter: 0.05, jitterY: 0 });
    const at = person(px, pz, 0.6, '#f2c94c', { s: 0.62, umbrella: '#e889b5', legs: '#c23a32', hat: '#f2c94c', tilt: 0.3 });
    P.add(new THREE.SphereGeometry(0.035, 4, 3), '#ffffff', { matrix: at({ pos: [0.14, 0.75, 0.12] }) });
    P.add(new THREE.SphereGeometry(0.03, 4, 3), '#ffffff', { matrix: at({ pos: [-0.05, 0.75, 0.25] }) });
  }
  // dog in a red coat, by the teal umbrella
  {
    const dx = 1.55, dz = -1.05;
    P.add(new THREE.BoxGeometry(0.24, 0.1, 0.1), '#c9a77a', { pos: [dx, PV + 0.16, dz] });
    P.add(new THREE.BoxGeometry(0.16, 0.06, 0.11), '#c23a32', { pos: [dx, PV + 0.22, dz] });
    P.add(new THREE.BoxGeometry(0.1, 0.09, 0.08), '#c9a77a', { pos: [dx + 0.15, PV + 0.24, dz] });
    for (const [ox, oz] of [[-0.08, -0.03], [-0.08, 0.03], [0.08, -0.03], [0.08, 0.03]]) P.add(new THREE.BoxGeometry(0.025, 0.12, 0.025), '#c9a77a', { pos: [dx + ox, PV + 0.06, dz + oz] });
    P.add(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 3), PAL.dark, { pos: [dx + 0.2, PV + 0.45, dz - 0.05], rot: [0, 0, 0.45] });
  }
  // the runner: out of the side street, newspaper over his head, sprinting for the open door
  {
    const at = person(-0.45, -1.25, 0.25, '#7a6a52', { y: G, lean: 0.25, stride: true });
    P.add(new THREE.BoxGeometry(0.34, 0.015, 0.26), '#e8e3d6', { matrix: at({ pos: [0, 0.92, 0.04], rot: [0.15, 0, 0.1] }) });
    for (const s of [-1, 1]) P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 4), '#7a6a52', { matrix: at({ pos: [s * 0.1, 0.78, 0.02], rot: [0, 0, s * 0.35] }) });
    P.add(new THREE.BoxGeometry(0.12, 0.14, 0.05), '#5b3a2a', { matrix: at({ pos: [0.14, 0.4, -0.05] }) });
  }

  // Merge static meshes.
  root.add(P.mesh(lambert(THREE)));
  const wetMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.32, metalness: 0.15 });
  root.add(W.mesh(wetMat, { cast: false, receive: true }));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));
  root.add(glassMesh);

  // Wet reflections: soft streaks under every warm light, always stretched towards the viewer (vertex shader).
  {
    const src = [
      // [x, z, length, width, colour]
      [0.95, N0 + 0.75, 1.3, 0.55, '#ffb35c'], [1.95, N0 + 0.8, 1.4, 0.6, '#ffb35c'], [3.25, N0 + 0.8, 1.3, 0.55, '#ffb35c'], [4.15, N0 + 0.75, 1.0, 0.4, '#ffb35c'],
      [poles[3][0], poles[3][1] - 0.7, 2.0, 0.35, '#ffcf7a'],
      [TR.x - 0.6, TZ + 0.85, 1.1, 0.5, '#ffd590'], [TR.x + 0.6, TZ + 0.85, 1.1, 0.5, '#ffd590'], [TR.x, TZ - 0.9, 1.6, 0.6, '#ffd590'],
      [TR.x + TR.len / 2 + 0.6, TZ, 1.2, 0.25, '#fff4d6'], [TR.x - TR.len / 2 - 0.6, TZ, 1.2, 0.25, '#fff4d6'],
      [SH.x1 + 0.15, SH.z - 0.1, 0.8, 0.3, '#d7ecff'], [2.5, 1.75, 0.8, 0.45, '#ffc874'],
    ];
    const pos = [], cen = [], col = [], uv = [];
    const c = new THREE.Color();
    for (const [x, z, l, w, cc] of src) {
      const y = (z > S0 && z < S1) || (x > SX0 && x < SX1 && z < S0) ? G + 0.012 : PV + 0.03;
      c.set(cc);
      const quad = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (const [u, v] of quad) {
        pos.push(v * w * 0.5, 0, u * l * 0.5);
        cen.push(x, y, z);
        col.push(c.r, c.g, c.b);
        uv.push((v + 1) / 2, (u + 1) / 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('cen', new THREE.Float32BufferAttribute(cen, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const tex = canvasTex(THREE, 32, 64, (g2) => {
      const gr = g2.createRadialGradient(16, 32, 0, 16, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 32, 64);
      g2.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) { g2.fillStyle = `rgba(0,0,0,${0.15 + (i % 3) * 0.12})`; g2.fillRect(0, 4 + i * 7, 32, 2); }
    });
    const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute vec3 cen;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        vec3 wc = (modelMatrix * vec4(cen, 1.0)).xyz;
        vec2 d = normalize(cameraPosition.xz - wc.xz + vec2(1e-4));
        vec2 n = vec2(-d.y, d.x);
        float wob = 1.0 + 0.04 * sin(uTime * 3.0 + cen.x * 7.0);
        vec3 transformed = cen + vec3(n.x * position.x + d.x * position.z * wob, 0.0, n.y * position.x + d.y * position.z * wob);`);
    };
    const streaks = new THREE.Mesh(g, m);
    streaks.frustumCulled = false;
    streaks.renderOrder = 1;
    root.add(streaks);
  }

  // Rain: short line streaks falling in the vertex shader; ripples ring out in the puddles.
  {
    const NR = low ? 260 : 400;
    const pos = [], fall = [];
    const H = 6.5;
    for (let i = 0; i < NR; i++) {
      const x = (rand() * 2 - 1) * 4.9, z = (rand() * 2 - 1) * 4.6, y = G + rand() * H;
      const sp = 4.2 + rand() * 1.6, len = 0.16 + rand() * 0.1;
      pos.push(x, y, z, x, y, z);
      fall.push(sp, 0, sp, len);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('fall', new THREE.Float32BufferAttribute(fall, 2));
    const m = new THREE.LineBasicMaterial({ color: '#a9bfe6', transparent: true, opacity: 0.26, depthWrite: false, fog: false });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute vec2 fall;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y = ${G.toFixed(3)} + mod(position.y - ${G.toFixed(3)} - fall.x * uTime, ${H.toFixed(2)}) + fall.y;
        transformed.x += fall.y * 0.18;`);
    };
    const rain = new THREE.LineSegments(g, m);
    rain.frustumCulled = false;
    root.add(rain);

    const rings = [];
    for (let i = 0; i < (low ? 10 : 22); i++) {
      const onStreet = rand() > 0.35;
      const x = -4.2 + rand() * 7.8, z = onStreet ? S0 + 0.2 + rand() * (S1 - S0 - 0.4) : S1 + 0.3 + rand() * 2.4;
      rings.push([x, onStreet ? G + 0.015 : PV + 0.03, z, rand()]);
    }
    const rpos = [], rcen = [], rph = [];
    for (const [x, y, z, ph] of rings) {
      const rg = new THREE.RingGeometry(0.8, 1.0, 10).toNonIndexed();
      rg.rotateX(-Math.PI / 2);
      const p = rg.attributes.position;
      for (let k = 0; k < p.count; k++) {
        rpos.push(p.getX(k), 0, p.getZ(k));
        rcen.push(x, y, z);
        rph.push(ph);
      }
      rg.dispose();
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
    rg.setAttribute('cen', new THREE.Float32BufferAttribute(rcen, 3));
    rg.setAttribute('ph', new THREE.Float32BufferAttribute(rph, 1));
    const rm = new THREE.MeshBasicMaterial({ color: '#c9d8f5', transparent: true, depthWrite: false, opacity: 0.5, fog: false });
    rm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute vec3 cen;\nattribute float ph;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float k = fract(uTime * 0.9 + ph * 7.0);
        vFade = 1.0 - k;
        vec3 transformed = cen + position * (0.03 + k * 0.13);`);
      sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= vFade;\n#include <opaque_fragment>');
    };
    const ripples = new THREE.Mesh(rg, rm);
    ripples.frustumCulled = false;
    root.add(ripples);
  }

  // Glow halos around lamps, headlights and the café.
  root.add(halos(THREE, [
    [poles[3][0], PV + 2.38, poles[3][1] - 0.68],
    [TR.x + TR.len / 2 + 0.05, G + 0.45, TZ], [TR.x - TR.len / 2 - 0.05, G + 0.45, TZ],
    [SH.x0 - 0.35, PV + 1.82, S1 + 0.3],
    [-4.05, PV + 2.9 + 1.13, -2.1], [-4.05, PV + 2.9 + 1.13, -3.1],
  ], { color: '#ffd9a0', size: 1.3, opacity: 0.8 }));
  root.add(halos(THREE, [[1.4, PV + 0.6, N0 + 0.3], [3.6, PV + 0.6, N0 + 0.3], [4.3, PV + 1.95, N0 + 0.36]], { color: '#ffb35c', size: 2.2, opacity: 0.45 }));

  // Light: cool blue hour fill, a dim moon-ish key for soft shadows, warm point lights at the café, lamp, tram.
  root.add(new THREE.HemisphereLight('#8aa8e4', '#3a3a50', 2.15));
  const key = keyLight(THREE, ctx, { color: '#a8bcff', intensity: 1.1, pos: [-4, 9, 6], extent: 6.8 });
  root.add(key, key.target);
  const pls = [
    ['#ffa24a', 7.5, 5.0, [2.2, PV + 0.75, N0 + 0.75]],
    ['#ffc26a', 8.0, 5.5, [poles[3][0], PV + 2.2, poles[3][1] - 0.7]],
    ['#ffd9a0', 5.0, 3.6, [TR.x, G + 1.0, TZ + 0.8]],
  ];
  for (const [c, i, d, p] of low ? pls.slice(0, 2) : pls) {
    const pl = new THREE.PointLight(c, i, d, 1.4);
    pl.position.set(...p);
    root.add(pl);
  }
  root.add(skyDome(THREE, { top: '#16264a', mid: '#3a6a9a', bottom: '#1e2c46', sun: [0.2, 0.05, -1], sunColor: '#2f5a7a', sunPow: 6, horizon: 0.35 }));

  function update(t) {
    uTime.value = t;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#2a4468'),
    fog: new THREE.Fog('#2e4a6c', 20, 52),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
