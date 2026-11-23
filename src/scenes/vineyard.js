// Cypress Row: hot late-summer midday on a terraced hill. Farmhouse with a dovecote tower and a pergola on top,
// vine rows following the contours, a white gravel road lined with cypresses to a little chapel, a parked scooter.
import { Painter, compose, lambert, outline, offsetOutline, slab, gable, roof, skyDome, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  board: '#6b4a35',
  terra: '#a5543a',
  lime: '#d9c7a2',
  straw: '#d2b06a',
  straw2: '#c7a35c',
  wall: '#cfb68c', // dry-stone terrace walls
  soil: '#b98550',
  gravel: '#f4efe3',
  stucco: '#e2b274',
  stucco2: '#e8c999',
  stone: '#efe3c8',
  tile: '#c4603a',
  tileDark: '#a24c2f',
  shutter: '#6d8a5c',
  dark: '#3a2c27',
  wood: '#7a5638',
  vine: '#6f8f3f',
  vine2: '#8a9a45',
  grape: '#4b2a4f',
  cypress: '#33502e',
  cypress2: '#4b6a38',
  olive: '#8f9c6a',
  oliveTop: '#b0b98c',
  bark: '#6a5848',
  scooter: '#9fd0c4',
  cream: '#f4ecd8',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(7331);
  const root = new THREE.Group();
  const P = new Painter(THREE, 17);
  const G = 0.3; // base ground level

  // ---- Plinth: limestone and red earth strata on a board, dry straw on top.
  const rim = outline(rand, { n: 30, rx: 4.7, rz: 4.5, wob: 0.025, sq: 2.6 });
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.45, -1.15, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.15, -0.6), PAL.terra, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.6, -0.25), PAL.lime, { jitter: 0.04, shade: 0.08 });
  P.add(slab(THREE, rim, -0.25, G), '#9c6a43', { jitter: 0.03, jitterY: 0.01, shade: 0.08, top: PAL.straw, y0: G - 0.08, y1: G - 0.02 });
  // clumps of scrub (rosemary, broom) in a few clusters near the rim and at the foot of the hill
  for (const [cx, cz, n] of [[3.9, 0.3, 4], [-3.9, 0.6, 3], [1.2, -3.9, 4], [-2.3, -3.7, 3], [3.4, 2.7, 3], [-0.6, 2.25, 3]]) {
    for (let i = 0; i < n; i++) {
      const x = cx + (rand() - 0.5) * 0.8, z = cz + (rand() - 0.5) * 0.6;
      const r = 0.09 + rand() * 0.09;
      P.add(new THREE.IcosahedronGeometry(r, 0), rand() > 0.6 ? '#9aa36a' : '#7f8f55', { pos: [x, G + r * 0.4, z], scl: [1.2, 0.75, 1], ry: rand() * 3, jitter: r * 0.2 });
      if (rand() > 0.7) P.add(new THREE.IcosahedronGeometry(0.035, 0), '#e8c33c', { pos: [x, G + r * 0.9, z] });
    }
  }

  // ---- Terraced hill: three dry-stone terraces, centred back-left of the plinth.
  const H = { x: -1.0, z: -0.8 };
  const TER = [
    { rx: 3.15, rz: 2.85, top: G + 0.45 },
    { rx: 2.25, rz: 2.0, top: G + 0.9 },
    { rx: 1.4, rz: 1.25, top: G + 1.35 },
  ];
  const wob = (a, k) => 1 + 0.035 * Math.sin(3 * a + k * 1.7) + 0.025 * Math.sin(7 * a + k * 0.9);
  const ellAt = (k, a, f = 1) => {
    const T = TER[k], w = wob(a, k) * f;
    return [H.x + T.rx * w * Math.cos(a), H.z + T.rz * w * Math.sin(a)];
  };
  const ellNormal = (k, a) => {
    const T = TER[k];
    const nx = Math.cos(a) / T.rx, nz = Math.sin(a) / T.rz;
    const l = Math.hypot(nx, nz);
    return [nx / l, nz / l];
  };
  for (let k = 0; k < TER.length; k++) {
    const pts = [];
    for (let i = 0; i < 40; i++) pts.push(ellAt(k, (i / 40) * Math.PI * 2));
    const top = TER[k].top;
    P.add(slab(THREE, pts, G - 0.05, top), PAL.wall, { jitter: 0.035, jitterY: 0.01, shade: 0.12, top: k === 2 ? '#c99d63' : PAL.soil, y0: top - 0.07, y1: top - 0.02 });
    // a darker capstone course along each wall
    const cap = [];
    for (let i = 0; i < 40; i++) cap.push(ellAt(k, (i / 40) * Math.PI * 2, 1.008));
    P.add(slab(THREE, cap, top - 0.07, top - 0.01), '#bba27a', { jitter: 0.02, jitterY: 0.005, shade: 0.1 });
  }

  // Stone steps climbing each wall at the front-right (zig-zagging slightly).
  const aS = 0.75;
  const stairA = (k) => aS + k * 0.1 - (k === 2 ? 0.25 : 0);
  for (let k = 0; k < TER.length; k++) {
    const a = stairA(k);
    const [wx, wz] = ellAt(k, a);
    const [nx, nz] = ellNormal(k, a);
    const yaw = Math.atan2(nx, nz);
    const yb = k === 0 ? G : TER[k - 1].top;
    const yt = TER[k].top;
    for (let j = 0; j < 3; j++) {
      const out = (3 - j) * 0.2, inn = 0.2;
      const len = out + inn, c = (out - inn) / 2;
      const h = ((yt - yb) * (j + 1)) / 3;
      P.add(new THREE.BoxGeometry(0.5, h, len), '#e3d4b3', { pos: [wx + nx * c, yb + h / 2, wz + nz * c], ry: yaw + (rand() - 0.5) * 0.06, jitter: 0.012, shade: 0.06 });
    }
  }
  const footA = stairA(0);
  const foot = (() => { const [x, z] = ellAt(0, footA); const [nx, nz] = ellNormal(0, footA); return [x + nx * 0.85, z + nz * 0.85]; })();

  // ---- White gravel road: from the front edge, past the steps, round to the chapel.
  const roadCurve = new THREE.CatmullRomCurve3([
    [2.5, 4.2], [2.2, 3.15], [2.1, 2.3], [2.45, 1.45], [2.85, 0.4], [2.95, -0.7], [2.7, -1.65],
  ].map(([x, z]) => new THREE.Vector3(x, G + 0.012, z)));
  {
    const N = 40, W = 0.27;
    const pos = [];
    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = roadCurve.getPointAt(t), d = roadCurve.getTangentAt(t);
      const w = W * (1 + 0.12 * Math.sin(i * 1.7) + (t > 0.85 ? (t - 0.85) * 2 : 0));
      L.push([p.x - d.z * w, p.y, p.z + d.x * w]);
      R.push([p.x + d.z * w, p.y, p.z - d.x * w]);
    }
    for (let i = 0; i < N; i++) pos.push(...L[i], ...L[i + 1], ...R[i], ...R[i], ...L[i + 1], ...R[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    P.add(g, PAL.gravel, { jitter: 0.03, jitterY: 0, shade: 0.04 });
    // edge stones
    for (let i = 0; i < 26; i++) {
      const t = rand();
      const p = roadCurve.getPointAt(t), d = roadCurve.getTangentAt(t);
      const s = rand() > 0.5 ? 1 : -1;
      P.add(new THREE.IcosahedronGeometry(0.04 + rand() * 0.04, 0), '#d8ccb2', { pos: [p.x + d.z * s * 0.32, G + 0.02, p.z - d.x * s * 0.32], scl: [1, 0.6, 1], ry: rand() * 3 });
    }
    // a short spur from the road to the foot of the steps
    const r0 = roadCurve.getPointAt(0.42);
    const sx = foot[0] - r0.x, sz = foot[1] - r0.z;
    P.add(new THREE.BoxGeometry(0.42, 0.02, Math.hypot(sx, sz) + 0.3), PAL.gravel, { pos: [(foot[0] + r0.x) / 2, G + 0.01, (foot[1] + r0.z) / 2], ry: Math.atan2(sx, sz), jitter: 0.03, jitterY: 0 });
  }

  // ---- Farmhouse on the hilltop: L-shaped stucco house, dovecote tower, terracotta roofs, green shutters.
  const Y3 = TER[2].top;
  const HM = compose(THREE, { pos: [H.x - 0.2, Y3, H.z - 0.25], ry: 0.38 });
  const hat = (o) => HM.clone().multiply(compose(THREE, o));
  // Box with a pitched roof; ridge along local X. s = pitch (rise per half width), e = eave overhang.
  function block(cx, cz, W, D, Hh, col, ry = 0, s = 0.55, e = 0.08) {
    const bm = (o) => hat({ pos: [cx, 0, cz], ry }).multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(W, Hh, D), col, { matrix: bm({ pos: [0, Hh / 2, 0] }), jitter: 0.012, shade: 0.04 });
    P.add(gable(THREE, D, s * (D / 2), W), col, { matrix: bm({ pos: [0, Hh, 0], ry: Math.PI / 2 }), shade: 0.03 });
    P.add(roof(THREE, D + 2 * e, s * (D / 2 + e), W + 0.16, 0.06), PAL.tile, { matrix: bm({ pos: [0, Hh - e * s, 0], ry: Math.PI / 2 }), jitter: 0.012, shade: 0.08 });
    // ridge tiles
    P.add(new THREE.CylinderGeometry(0.04, 0.04, W + 0.16, 5), PAL.tileDark, { matrix: bm({ pos: [0, Hh + s * (D / 2) - 0.0, 0], rot: [0, 0, Math.PI / 2] }) });
    return bm;
  }
  const main = block(0, 0, 1.45, 0.85, 0.95, PAL.stucco);
  const wing = block(-0.42, 0.72, 0.62, 0.62, 0.62, PAL.stucco2, Math.PI / 2, 0.5);
  // stone quoins at the corners of the main block
  for (const [x, z] of [[-0.725, 0.425], [0.725, 0.425], [0.725, -0.425], [-0.725, -0.425]]) {
    for (let i = 0; i < 4; i++) P.add(new THREE.BoxGeometry(0.1, 0.12, 0.1), PAL.stone, { matrix: hat({ pos: [x, 0.12 + i * 0.24, z], ry: i % 2 ? 0 : 0.0 }), scl: 1 });
  }
  // windows with shutters (front = local +z, back = -z)
  const win = (bm, x, y, z, face = 1, open = true) => {
    P.add(new THREE.BoxGeometry(0.16, 0.22, 0.03), PAL.dark, { matrix: bm({ pos: [x, y, z + face * 0.005] }) });
    if (open) {
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.09, 0.24, 0.025), PAL.shutter, { matrix: bm({ pos: [x + s * 0.14, y, z + face * 0.03], ry: s * face * 0.5 }) });
    } else P.add(new THREE.BoxGeometry(0.19, 0.25, 0.025), PAL.shutter, { matrix: bm({ pos: [x, y, z + face * 0.02] }) });
    P.add(new THREE.BoxGeometry(0.22, 0.03, 0.06), PAL.stone, { matrix: bm({ pos: [x, y - 0.13, z + face * 0.02] }) });
  };
  win(main, -0.35, 0.68, 0.425, 1, true);
  win(main, 0.1, 0.68, 0.425, 1, false);
  win(main, 0.45, 0.68, 0.425, 1, true);
  win(main, -0.4, 0.68, -0.425, -1, false);
  win(main, 0.35, 0.68, -0.425, -1, true);
  win(main, 0.35, 0.3, -0.425, -1, false);
  // arched door with a stone surround and a step
  P.add(new THREE.BoxGeometry(0.28, 0.42, 0.04), PAL.wood, { matrix: main({ pos: [0.12, 0.21, 0.43] }) });
  P.add(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8, 1, false, -Math.PI / 2, Math.PI), PAL.wood, { matrix: main({ pos: [0.12, 0.42, 0.43], rot: [Math.PI / 2, 0, 0] }) });
  P.add(new THREE.BoxGeometry(0.42, 0.05, 0.16), PAL.stone, { matrix: main({ pos: [0.12, 0.025, 0.5] }) });
  // terracotta pots by the door, one with a lemon tree
  P.add(new THREE.CylinderGeometry(0.08, 0.06, 0.13, 7), '#b5582f', { matrix: main({ pos: [0.42, 0.065, 0.58] }) });
  P.add(new THREE.IcosahedronGeometry(0.12, 0), '#5f7f35', { matrix: main({ pos: [0.42, 0.26, 0.58] }), jitter: 0.02 });
  for (const [dx, dy] of [[0.06, 0.28], [-0.05, 0.22], [0.02, 0.33]]) P.add(new THREE.IcosahedronGeometry(0.025, 0), '#f2d24a', { matrix: main({ pos: [0.42 + dx, dy, 0.64] }) });
  P.add(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 7), '#b5582f', { matrix: main({ pos: [-0.12, 0.05, 0.6] }) });
  P.add(new THREE.IcosahedronGeometry(0.07, 0), '#d1495b', { matrix: main({ pos: [-0.12, 0.14, 0.6] }), scl: [1, 0.7, 1] });
  win(wing, 0, 0.36, 0.31, 1, true);
  // chimney
  P.add(new THREE.BoxGeometry(0.16, 0.36, 0.16), PAL.stucco2, { matrix: main({ pos: [-0.45, 1.25, -0.12] }), jitter: 0.01 });
  P.add(new THREE.BoxGeometry(0.22, 0.05, 0.22), PAL.tile, { matrix: main({ pos: [-0.45, 1.45, -0.12] }) });
  // dovecote tower rising from the east end of the house
  {
    const tx = 0.52, tz = -0.08, th = 1.75;
    P.add(new THREE.BoxGeometry(0.58, th, 0.58), PAL.stucco2, { matrix: hat({ pos: [tx, th / 2, tz] }), jitter: 0.012, shade: 0.05 });
    P.add(new THREE.BoxGeometry(0.64, 0.06, 0.64), PAL.stone, { matrix: hat({ pos: [tx, th - 0.02, tz] }) });
    P.add(new THREE.ConeGeometry(0.52, 0.3, 4), PAL.tile, { matrix: hat({ pos: [tx, th + 0.15, tz], ry: Math.PI / 4 }), shade: 0.08 });
    // pigeon holes on two faces
    for (const [fx, fz, ry] of [[0, 0.295, 0], [0.295, 0, Math.PI / 2], [0, -0.295, 0]]) {
      for (let i = -1; i <= 1; i++) P.add(new THREE.BoxGeometry(0.07, 0.09, 0.02), PAL.dark, { matrix: hat({ pos: [tx + fx + (ry ? 0 : i * 0.13), th - 0.22, tz + fz + (ry ? i * 0.13 : 0)], ry }) });
      P.add(new THREE.BoxGeometry(0.5, 0.025, 0.06), PAL.stone, { matrix: hat({ pos: [tx + fx, th - 0.29, tz + fz], ry }) });
    }
    win(hat, tx, 1.2, tz + 0.29, 1, true);
  }
  // pergola off the front of the house, with a vine roof, a table and a wine flask
  const PG = (o) => hat({ pos: [-0.2, 0, 1.05], ry: 0.0 }).multiply(compose(THREE, o));
  {
    const pw = 0.95, pd = 0.7, ph = 0.72;
    for (const [x, z] of [[-pw / 2, -pd / 2], [pw / 2, -pd / 2], [-pw / 2, pd / 2], [pw / 2, pd / 2]]) {
      P.add(new THREE.BoxGeometry(0.06, ph, 0.06), PAL.wood, { matrix: PG({ pos: [x, ph / 2, z], rot: [(rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.04] }) });
    }
    for (const z of [-pd / 2, pd / 2]) P.add(new THREE.BoxGeometry(pw + 0.2, 0.05, 0.06), PAL.wood, { matrix: PG({ pos: [0, ph, z] }) });
    for (let i = 0; i < 6; i++) P.add(new THREE.BoxGeometry(0.035, 0.035, pd + 0.2), PAL.wood, { matrix: PG({ pos: [-pw / 2 + 0.05 + i * ((pw - 0.1) / 5), ph + 0.04, 0], ry: (rand() - 0.5) * 0.05 }) });
    // leafy canopy, thicker on the house side
    for (let i = 0; i < 7; i++) {
      const x = -pw / 2 + rand() * pw, z = -pd / 2 + rand() * pd * 0.8;
      P.add(new THREE.IcosahedronGeometry(0.16 + rand() * 0.06, 0), i % 3 ? PAL.vine : PAL.vine2, { matrix: PG({ pos: [x, ph + 0.1, z] }), scl: [1.3, 0.45, 1.1], jitter: 0.03 });
    }
    // grape bunches hanging through the slats
    for (const [x, z] of [[-0.2, 0.05], [0.25, -0.1], [0.05, 0.2]]) P.add(new THREE.ConeGeometry(0.045, 0.12, 5), PAL.grape, { matrix: PG({ pos: [x, ph - 0.04, z], rot: [Math.PI, 0, 0] }) });
    // table, two chairs, flask and glasses
    P.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), '#efe9da', { matrix: PG({ pos: [0.05, 0.3, 0.02] }) });
    P.add(new THREE.CylinderGeometry(0.025, 0.04, 0.3, 5), PAL.dark, { matrix: PG({ pos: [0.05, 0.15, 0.02] }) });
    P.add(new THREE.SphereGeometry(0.05, 7, 5), '#5b7f3a', { matrix: PG({ pos: [0.0, 0.36, 0.0] }) });
    P.add(new THREE.CylinderGeometry(0.012, 0.015, 0.07, 5), '#5b7f3a', { matrix: PG({ pos: [0.0, 0.43, 0.0] }) });
    P.add(new THREE.CylinderGeometry(0.05, 0.035, 0.03, 7), '#d9b778', { matrix: PG({ pos: [0.0, 0.33, 0.0] }) });
    for (const [x, z] of [[0.15, 0.08], [0.1, -0.1]]) P.add(new THREE.CylinderGeometry(0.018, 0.014, 0.05, 6), '#8a2f3c', { matrix: PG({ pos: [x, 0.34, z] }) });
    for (const [x, ry] of [[-0.25, 0.4], [0.33, -0.9]]) {
      const cm = (o) => PG({ pos: [x, 0, 0.05], ry }).multiply(compose(THREE, o));
      P.add(new THREE.BoxGeometry(0.16, 0.025, 0.16), '#2f5c4b', { matrix: cm({ pos: [0, 0.18, 0] }) });
      P.add(new THREE.BoxGeometry(0.16, 0.18, 0.025), '#2f5c4b', { matrix: cm({ pos: [0, 0.28, -0.08] }) });
      for (const [lx, lz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) P.add(new THREE.BoxGeometry(0.02, 0.18, 0.02), '#2f5c4b', { matrix: cm({ pos: [lx, 0.09, lz] }) });
    }
  }
  // gravel yard around the house
  P.add(new THREE.CylinderGeometry(0.75, 0.85, 0.02, 9), '#e2d3b0', { pos: [H.x + 0.25, Y3 + 0.005, H.z + 0.55], scl: [1.2, 1, 0.8], jitter: 0.06, jitterY: 0 });

  // Washing line from the house corner to a pole (the sheets are animated meshes below).
  const lineA = new THREE.Vector3(-0.73, 0.75, -0.3).applyMatrix4(HM);
  const lineB = new THREE.Vector3(H.x - 1.35, Y3 + 0.78, H.z + 0.05);
  P.add(new THREE.CylinderGeometry(0.02, 0.025, 0.8, 5), PAL.wood, { pos: [lineB.x, Y3 + 0.4, lineB.z] });
  {
    const len = lineA.distanceTo(lineB);
    const m = new THREE.Matrix4().compose(lineA.clone().lerp(lineB, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lineB.clone().sub(lineA).normalize()), new THREE.Vector3(1, 1, 1));
    P.add(new THREE.CylinderGeometry(0.006, 0.006, len, 3), '#f4f0e6', { matrix: m });
  }

  // ---- Chapel at the end of the road, with a bell-gable.
  {
    const CM = compose(THREE, { pos: [2.45, G, -2.55], ry: 0.25 });
    const cat = (o) => CM.clone().multiply(compose(THREE, o));
    const W = 0.85, D = 1.2, Hh = 0.9, s = 0.7, e = 0.07;
    P.add(new THREE.BoxGeometry(W + 0.1, 0.08, D + 0.1), '#cdbd9c', { matrix: cat({ pos: [0, 0.04, 0] }), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(W, Hh, D), PAL.stone, { matrix: cat({ pos: [0, Hh / 2, 0] }), jitter: 0.012, shade: 0.04 });
    P.add(gable(THREE, W, s * W / 2, D), PAL.stone, { matrix: cat({ pos: [0, Hh, 0] }) });
    P.add(roof(THREE, W + 2 * e, s * (W / 2 + e), D + 0.14, 0.06), PAL.tile, { matrix: cat({ pos: [0, Hh - e * s, -0.03] }), jitter: 0.01, shade: 0.08 });
    // apse at the back
    P.add(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 10, 1, false, Math.PI / 2, Math.PI), PAL.stone, { matrix: cat({ pos: [0, 0.35, -D / 2], ry: 0 }) });
    P.add(new THREE.ConeGeometry(0.37, 0.25, 10, 1, false, Math.PI / 2, Math.PI), PAL.tile, { matrix: cat({ pos: [0, 0.82, -D / 2] }) });
    // bell-gable above the facade
    const fz = D / 2 - 0.05;
    P.add(new THREE.BoxGeometry(0.48, 0.55, 0.12), PAL.stone, { matrix: cat({ pos: [0, Hh + 0.55, fz] }), jitter: 0.01 });
    P.add(gable(THREE, 0.56, 0.18, 0.14), PAL.tile, { matrix: cat({ pos: [0, Hh + 0.82, fz] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.24, 0.14), '#4b3d36', { matrix: cat({ pos: [0, Hh + 0.6, fz] }) });
    P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8, 1, false, -Math.PI / 2, Math.PI), '#4b3d36', { matrix: cat({ pos: [0, Hh + 0.72, fz], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.075, 0.14, 8), '#b3843a', { matrix: cat({ pos: [0, Hh + 0.62, fz] }) });
    // door, rose window, bench outside
    P.add(new THREE.BoxGeometry(0.28, 0.45, 0.03), '#5b3a2a', { matrix: cat({ pos: [0, 0.3, D / 2 + 0.005] }) });
    P.add(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 8, 1, false, -Math.PI / 2, Math.PI), '#5b3a2a', { matrix: cat({ pos: [0, 0.52, D / 2 + 0.005], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 8), '#4b3d36', { matrix: cat({ pos: [0, 0.78, D / 2 + 0.005], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.42, 0.04, 0.12), PAL.wood, { matrix: cat({ pos: [0.62, 0.18, 0.2], ry: Math.PI / 2 }) });
    for (const z of [0.05, 0.35]) P.add(new THREE.BoxGeometry(0.1, 0.16, 0.04), '#cdbd9c', { matrix: cat({ pos: [0.62, 0.08, z] }) });
  }

  // ---- Scooter parked at the foot of the steps, a crate of grapes on its rack.
  {
    const SM = compose(THREE, { pos: [foot[0] + 0.3, G, foot[1] + 0.35], ry: -0.6 });
    const sat = (o) => SM.clone().multiply(compose(THREE, o));
    const wheel = (z) => {
      P.add(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), '#2a2626', { matrix: sat({ pos: [0, 0.075, z], rot: [0, 0, Math.PI / 2] }) });
      P.add(new THREE.CylinderGeometry(0.035, 0.035, 0.055, 8), '#c9c3b8', { matrix: sat({ pos: [0, 0.075, z], rot: [0, 0, Math.PI / 2] }) });
    };
    wheel(0.27); wheel(-0.25);
    P.add(new THREE.SphereGeometry(0.15, 9, 6), PAL.scooter, { matrix: sat({ pos: [0, 0.2, -0.2] }), scl: 1 });
    P.add(new THREE.SphereGeometry(1, 9, 6), PAL.scooter, { matrix: sat({ pos: [0, 0.2, -0.2], scl: [0.13, 0.11, 0.2] }) });
    P.add(new THREE.BoxGeometry(0.15, 0.04, 0.3), '#4a4644', { matrix: sat({ pos: [0, 0.12, 0.07] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.42, 0.05), PAL.scooter, { matrix: sat({ pos: [0, 0.3, 0.24], rot: [-0.25, 0, 0] }) });
    P.add(new THREE.SphereGeometry(0.075, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), PAL.scooter, { matrix: sat({ pos: [0, 0.12, 0.27], scl: [1, 0.6, 1.2] }) });
    P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 5), '#3a3636', { matrix: sat({ pos: [0, 0.55, 0.3], rot: [0, 0, Math.PI / 2] }) });
    P.add(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 8), '#fff6d6', { matrix: sat({ pos: [0, 0.53, 0.33], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.12, 0.05, 0.24), '#5a3a2c', { matrix: sat({ pos: [0, 0.33, -0.13] }), jitter: 0.008 });
    // crate of grapes on the rack
    P.add(new THREE.BoxGeometry(0.2, 0.1, 0.17), '#c99b5e', { matrix: sat({ pos: [0, 0.38, -0.36] }) });
    for (let i = 0; i < 4; i++) P.add(new THREE.IcosahedronGeometry(0.045, 0), PAL.grape, { matrix: sat({ pos: [-0.05 + (i % 2) * 0.1, 0.44, -0.4 + (i >> 1) * 0.08] }) });
    // kickstand tilt cue: a small straw hat hung on the handlebar
    P.add(new THREE.CylinderGeometry(0.09, 0.1, 0.015, 9), '#e6cf86', { matrix: sat({ pos: [0.16, 0.5, 0.3], rot: [0.2, 0, 1.2] }) });
    P.add(new THREE.CylinderGeometry(0.05, 0.055, 0.05, 9), '#e6cf86', { matrix: sat({ pos: [0.15, 0.5, 0.3], rot: [0.2, 0, 1.2] }) });
  }

  // ---- Harvest under way: crates of grapes in a picked gap of the lower vine rows.
  const pickA = 1.55;
  {
    const [x, z] = ellAt(0, pickA, 0.82);
    for (let i = 0; i < 4; i++) {
      const cx = x + (i % 2) * 0.24 - 0.1 + (rand() - 0.5) * 0.04, cz = z + (i > 1 ? 0.0 : 0.02) + (rand() - 0.5) * 0.05;
      const cy = TER[0].top + (i > 1 ? 0.12 : 0) + 0.05;
      P.add(new THREE.BoxGeometry(0.22, 0.1, 0.17), '#c99b5e', { pos: [cx, cy, cz], ry: (rand() - 0.5) * 0.3 });
      if (i !== 2) for (let j = 0; j < 3; j++) P.add(new THREE.IcosahedronGeometry(0.04, 0), PAL.grape, { pos: [cx - 0.06 + j * 0.06, cy + 0.06, cz] });
    }
    // a ladder leaning on the wall below
    const [lx, lz] = ellAt(0, pickA + 0.1, 1.04);
    const [nx, nz] = ellNormal(0, pickA + 0.1);
    const lm = compose(THREE, { pos: [lx + nx * 0.08, G, lz + nz * 0.08], rot: [0, Math.atan2(nx, nz), 0] });
    for (const s of [-0.09, 0.09]) P.add(new THREE.BoxGeometry(0.025, 0.62, 0.025), PAL.wood, { matrix: lm.clone().multiply(compose(THREE, { pos: [s, 0.28, 0.06], rot: [0.28, 0, 0] })) });
    for (let i = 0; i < 4; i++) P.add(new THREE.BoxGeometry(0.18, 0.02, 0.02), PAL.wood, { matrix: lm.clone().multiply(compose(THREE, { pos: [0, 0.1 + i * 0.14, 0.11 - i * 0.04] })) });
  }

  // ---- Round hay bales left in the stubble at the front.
  for (const [x, z, ry, up] of [[0.25, 3.15, 0.3, 0], [-0.55, 3.55, 1.4, 0], [0.95, 3.75, -0.2, 1]]) {
    P.add(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 11), '#dcb965', { pos: [x, G + (up ? 0.21 : 0.3), z], rot: up ? [0, ry, 0] : [0, ry, Math.PI / 2], jitter: 0.015, shade: 0.06 });
    P.add(new THREE.CylinderGeometry(0.2, 0.2, 0.43, 9), '#c9a24d', { pos: [x, G + (up ? 0.212 : 0.3), z], rot: up ? [0, ry, 0] : [0, ry, Math.PI / 2] });
  }
  // stubble rows on the field in front of the hill
  for (let i = 0; i < 6; i++) {
    const z = 2.55 + i * 0.32;
    P.add(new THREE.BoxGeometry(2.6 - i * 0.15, 0.02, 0.07), '#c2a35e', { pos: [-0.2 + (rand() - 0.5) * 0.2, G + 0.012, z], ry: 0.08, jitter: 0.02, jitterY: 0 });
  }

  // ---- Olive trees: gnarled trunks, silvery canopies (clustered front-left, one by the road).
  const olive = (x, z, s, seed) => {
    const r = rng(seed);
    P.add(new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 0.55 * s, 6), PAL.bark, { pos: [x, G + 0.27 * s, z], rot: [(r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4], jitter: 0.02 });
    P.add(new THREE.CylinderGeometry(0.04 * s, 0.06 * s, 0.4 * s, 5), PAL.bark, { pos: [x + 0.1 * s, G + 0.55 * s, z], rot: [0, 0, -0.6], jitter: 0.015 });
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = 0.18 * s;
      P.add(new THREE.IcosahedronGeometry((0.28 + r() * 0.12) * s, 0), PAL.olive, { pos: [x + Math.cos(a) * d, G + (0.75 + r() * 0.2) * s, z + Math.sin(a) * d], scl: [1.15, 0.72, 1.0], ry: r() * 3, jitter: 0.04 * s, top: PAL.oliveTop, y0: G + 0.75 * s, y1: G + 1.05 * s });
    }
  };
  olive(-3.35, 1.95, 1.05, 3);
  olive(-2.5, 2.9, 0.9, 4);
  olive(-3.55, 3.05, 0.75, 5);
  olive(-1.6, 2.35, 0.7, 6);
  olive(3.85, 1.6, 0.85, 7);
  olive(4.0, -1.7, 0.7, 8);
  olive(-2.95, -3.45, 0.65, 9);

  // ---- A lone umbrella pine on the back-left shoulder: bare leaning trunk, flat dark crown.
  {
    const px = -3.95, pz = -2.85;
    P.add(new THREE.CylinderGeometry(0.06, 0.1, 2.3, 6), '#7a5a46', { pos: [px + 0.18, G + 1.12, pz + 0.1], rot: [0.08, 0, -0.16], jitter: 0.02 });
    P.add(new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5), '#7a5a46', { pos: [px + 0.55, G + 2.05, pz + 0.05], rot: [0, 0, -0.9] });
    const crown = [[0.38, 2.4, 0.15, 0.75], [0.75, 2.3, -0.2, 0.55], [0.05, 2.32, -0.3, 0.55], [0.55, 2.45, 0.4, 0.5]];
    for (const [dx, y, dz, r] of crown) P.add(new THREE.IcosahedronGeometry(r, 1), '#46613a', { pos: [px + dx, G + y, pz + dz], scl: [1.0, 0.32, 0.9], ry: rand() * 3, jitter: 0.05, top: '#5f7b45', y0: G + y - 0.05, y1: G + y + 0.15 });
  }

  // ---- Vines on the contour rows (instanced; each plant = a leafy head on the trellis and a bunch of grapes;
  // kept to 23 triangles: they are drawn twice, once into the shadow map).
  const vineP = new Painter(THREE, 19);
  vineP.add(new THREE.IcosahedronGeometry(0.15, 0), PAL.vine, { pos: [0, 0.25, 0], scl: [0.75, 1.1, 1.25], jitter: 0.02, top: PAL.vine2, y0: 0.12, y1: 0.4 });
  vineP.add(new THREE.ConeGeometry(0.05, 0.11, 3, 1, true), PAL.grape, { pos: [0.085, 0.15, 0.03], rot: [Math.PI, 0, 0] });
  const vineGeo = vineP.geometry();
  const vines = [];
  const near = (a, b, w) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < w;
  for (let k = 0; k < 2; k++) {
    for (const f of [0.3, 0.72]) {
      // row radius between this terrace's wall (k) and the next one up (k+1)
      const rowAt = (a) => {
        const [ox, oz] = ellAt(k, a, 0.94), [ix, iz] = ellAt(k + 1, a, 1.06);
        return [ix + (ox - ix) * f, iz + (oz - iz) * f];
      };
      let a = rand() * 0.2;
      while (a < Math.PI * 2) {
        const [x, z] = rowAt(a);
        const [x2, z2] = rowAt(a + 0.01);
        const step = 0.2 + rand() * 0.04;
        a += step / (Math.hypot(x2 - x, z2 - z) / 0.01);
        if (near(a, stairA(k), 0.2) || near(a, stairA(k + 1), 0.22)) continue;
        if (k === 0 && f > 0.5 && near(a, pickA, 0.18)) continue; // the picked gap with the crates
        if (k === 0 && f < 0.5 && near(a, pickA + 0.05, 0.1)) continue;
        vines.push([x, TER[k].top, z, Math.atan2(x2 - x, z2 - z)]);
      }
    }
  }
  const useV = low ? vines.filter((_, i) => i % 3 !== 2) : vines;
  const vineMesh = new THREE.InstancedMesh(vineGeo, lambert(THREE), useV.length);
  vineMesh.castShadow = true;
  vineMesh.receiveShadow = true;
  const dm = new THREE.Object3D();
  const tc = new THREE.Color();
  useV.forEach(([x, y, z, ry], i) => {
    dm.position.set(x, y - 0.01, z);
    dm.rotation.set((rand() - 0.5) * 0.1, ry + (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.1);
    const s = 0.85 + rand() * 0.3;
    dm.scale.set(s, s * (0.9 + rand() * 0.2), s);
    dm.updateMatrix();
    vineMesh.setMatrixAt(i, dm.matrix);
    vineMesh.setColorAt(i, tc.setRGB(1, 1, 1).multiplyScalar(0.85 + rand() * 0.25));
  });
  root.add(vineMesh);

  // ---- Cypresses: the row along the road, a pair by the chapel, one sentinel by the house.
  const cyP = new Painter(THREE, 23);
  cyP.add(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 5), PAL.bark, { pos: [0, 0.1, 0] });
  const prof = [[0.0, 0.08], [0.12, 0.18], [0.165, 0.45], [0.16, 0.8], [0.12, 1.15], [0.06, 1.45], [0.0, 1.66]].map(([r, y]) => new THREE.Vector2(r, y));
  cyP.add(new THREE.LatheGeometry(prof, 7), PAL.cypress, { jitter: 0.025, shade: 0.08, top: PAL.cypress2, y0: 0.3, y1: 1.6 });
  const cyGeo = cyP.geometry();
  const cys = [];
  {
    let t = 0.03;
    let i = 0;
    while (t < 0.97) {
      const p = roadCurve.getPointAt(t), d = roadCurve.getTangentAt(t);
      const side = 0.5 + (rand() - 0.5) * 0.08;
      if (!(t > 0.36 && t < 0.47) && i !== 5) cys.push([p.x + d.z * side, p.z - d.x * side, 0.85 + rand() * 0.6 + (i === 2 ? 0.35 : 0)]);
      t += 0.085 + rand() * 0.05;
      i++;
    }
  }
  cys.push([1.9, -2.95, 1.35], [3.15, -3.15, 1.05], [H.x - 1.25, H.z - 0.75, 1.15]);
  const useC = low ? cys.filter((_, i) => i % 3 !== 1) : cys;
  const cyMat = lambert(THREE);
  const uTime = { value: 0 };
  cyMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
      #else
      float ph = 0.0;
      #endif
      transformed.x += sin(uTime * 1.1 + ph) * 0.018 * position.y * position.y;`);
  };
  const cyMesh = new THREE.InstancedMesh(cyGeo, cyMat, useC.length);
  cyMesh.castShadow = true;
  cyMesh.receiveShadow = true;
  useC.forEach(([x, z, s], i) => {
    const ground = Math.hypot((x - H.x) / TER[0].rx, (z - H.z) / TER[0].rz) < 0.97 ? TER[0].top : G;
    dm.position.set(x, ground - 0.02, z);
    dm.rotation.set((rand() - 0.5) * 0.05, rand() * 6.28, (rand() - 0.5) * 0.05);
    dm.scale.set(s * (0.85 + rand() * 0.25), s, s * (0.85 + rand() * 0.25));
    dm.updateMatrix();
    cyMesh.setMatrixAt(i, dm.matrix);
    cyMesh.setColorAt(i, tc.setRGB(1, 1, 1).multiplyScalar(0.88 + rand() * 0.2));
  });
  root.add(cyMesh);

  root.add(P.mesh(lambert(THREE)));

  // ---- Washing on the line (three cloths that sway).
  const sheets = [];
  {
    const cols = ['#f7f3ea', '#9cc3d8', '#f1d36b'];
    const sizes = [[0.3, 0.34], [0.2, 0.26], [0.16, 0.2]];
    for (let i = 0; i < 3; i++) {
      const sp = new Painter(THREE, 31 + i);
      const [w, h] = sizes[i];
      sp.add(new THREE.BoxGeometry(w, h, 0.01), cols[i], { pos: [0, -h / 2, 0], shade: 0.02 });
      if (i === 0) sp.add(new THREE.BoxGeometry(w + 0.002, 0.03, 0.012), '#d0605a', { pos: [0, -h + 0.06, 0] });
      const m = sp.mesh(lambert(THREE), { cast: true, receive: false });
      const t = 0.25 + i * 0.25;
      const p = lineA.clone().lerp(lineB, t);
      p.y -= Math.sin(t * Math.PI) * 0.04;
      m.position.copy(p);
      m.rotation.y = Math.atan2(lineB.x - lineA.x, lineB.z - lineA.z) - Math.PI / 2;
      m.rotation.order = 'YXZ';
      root.add(m);
      sheets.push(m);
    }
  }

  // ---- Two doves circling the chapel's bell.
  const doveGeo = new THREE.BufferGeometry();
  doveGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.09, -0.26, 0.06, -0.04, 0, 0.015, -0.06,
    0, 0, 0.09, 0, 0.015, -0.06, 0.26, 0.06, -0.04,
    0, 0, 0.12, 0, -0.03, -0.1, 0, 0.02, -0.1,
  ], 3));
  doveGeo.computeVertexNormals();
  const NDOVE = low ? 1 : 2;
  const doves = new THREE.InstancedMesh(doveGeo, new THREE.MeshLambertMaterial({ color: '#fbf8f2', side: THREE.DoubleSide, flatShading: true }), NDOVE);
  root.add(doves);
  const doveC = new THREE.Vector3(1.4, 3.6, -1.8);

  // ---- Light: high midday sun, warm haze bounce from the dry ground.
  root.add(new THREE.HemisphereLight('#f5ecd6', '#b58a58', 1.45));
  const key = keyLight(THREE, ctx, { color: '#fff2d8', intensity: 2.9, pos: [2.5, 12, 3.2], extent: 6.6 });
  root.add(key, key.target);
  root.add(skyDome(THREE, { top: '#7aa3c4', mid: '#dfe4dc', bottom: '#f0e4c9', sun: [0.2, 0.95, 0.25], sunColor: '#fff8e0', sunPow: 40, horizon: 0.6 }));

  function update(t) {
    uTime.value = t;
    for (let i = 0; i < sheets.length; i++) sheets[i].rotation.x = 0.12 + Math.sin(t * 1.6 + i * 1.3) * 0.12;
    for (let i = 0; i < NDOVE; i++) {
      const a = t * (0.45 + i * 0.12) + i * 3.1;
      const r = 1.3 + i * 0.6;
      dm.position.set(doveC.x + Math.cos(a) * r, doveC.y + i * 0.5 + Math.sin(t * 0.8 + i) * 0.12, doveC.z + Math.sin(a) * r * 0.8);
      dm.rotation.set(0, -a, 0.3);
      dm.scale.set(1, 0.6 + 0.5 * Math.sin(t * 7 + i * 2), 1);
      dm.updateMatrix();
      doves.setMatrixAt(i, dm.matrix);
    }
    doves.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f0e4c9'),
    fog: new THREE.Fog('#ece4d0', 22, 58),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
