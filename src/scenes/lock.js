// Lock Seven: late autumn afternoon at a canal lock. Brick chamber with mitre gates and balance beams,
// a painted narrowboat waiting in the lock, the keeper's cottage, a humpback bridge, russet trees.
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, gable, roof, skyDome, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  grass: '#8f9550',
  grass2: '#a7a258',
  path: '#b89d74',
  earth: '#7a5338',
  clay: '#9c6a48',
  board: '#4b3326',
  water: '#304c43',
  water2: '#4f6c5a',
  brick: '#a2513a',
  brick2: '#8d4430',
  coping: '#d2c3a6',
  timber: '#3a2e28',
  white: '#efe6d4',
  cream: '#ecdcbc',
  slate: '#4c4f60',
  green: '#2f5c44',
  red: '#b0362b',
  gold: '#e3b450',
  bark: '#5b4434',
  dark: '#26242a',
  glow: '#ffcf86',
};
// Autumn canopy colours, mixed per tree.
const LEAF = ['#c4542a', '#d9772f', '#e8a23a', '#a8402c', '#d6b04a', '#b8662e', '#8c3a26'];

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

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(7007);
  const root = new THREE.Group();
  const P = new Painter(THREE, 71);
  const E = new Painter(THREE, 72); // unlit warm windows

  const G = 0.75; // bank level
  const ZC = 0.55; // canal centre line (z); the canal runs along x
  const CW = 0.8; // half width of the open canal
  const LW = 0.6; // half width inside the lock chamber
  const WU = 0.5; // upper pound water level
  const WL = 0.15; // lower pound + chamber water level
  const XG1 = -1.45; // top gates (upstream, -x)
  const XG2 = 1.75; // bottom gates
  const XB = 3.05; // humpback bridge

  // Plinth: board, clay and earth strata; the canal is cut through as a resin water layer.
  const rim = outline(rand, { n: 40, rx: 4.8, rz: 4.4, wob: 0.025, sq: 3.2 });
  P.add(slab(THREE, offsetOutline(rim, 0.3), -1.5, -1.18, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.18, -0.62), PAL.clay, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.62, 0.0), PAL.earth, { jitter: 0.04, shade: 0.1 });
  const chan = clip(clip(rim, 0, 1, ZC + CW), 0, -1, -(ZC - CW));
  P.add(slab(THREE, chan, 0.0, WL), PAL.water, { shade: 0.04 });
  P.add(slab(THREE, clip(chan, 1, 0, XG1 - 0.25), WL, WU), PAL.water, { shade: 0.04 });
  const north = clip(rim, 0, 1, ZC - CW);
  const south = clip(rim, 0, -1, -(ZC + CW));
  P.add(slab(THREE, north, 0.0, G), PAL.grass, { jitter: 0.03, jitterY: 0.02, shade: 0.07, top: PAL.grass2, y0: G - 0.05, y1: G });
  P.add(slab(THREE, south, 0.0, G), PAL.grass, { jitter: 0.03, jitterY: 0.02, shade: 0.07, top: PAL.grass2, y0: G - 0.05, y1: G });
  // earth showing on the bank faces below the turf
  P.add(slab(THREE, offsetOutline(north, -0.02), 0.0, G - 0.12), PAL.earth, { shade: 0.08 });
  P.add(slab(THREE, offsetOutline(south, -0.02), 0.0, G - 0.12), PAL.earth, { shade: 0.08 });

  // Towpath along the south bank, gravel with worn edges.
  for (let x = -4.4; x < 4.5; x += 0.55) {
    if (Math.abs(x - XB) < 0.75) continue;
    const w = 0.5 + rand() * 0.08;
    P.add(new THREE.BoxGeometry(0.62, 0.03, w), PAL.path, { pos: [x, G + 0.01, ZC + CW + 0.42 + (rand() - 0.5) * 0.06], ry: (rand() - 0.5) * 0.08, jitter: 0.04, jitterY: 0.005, shade: 0.06 });
  }

  // Lock chamber: brick walls with stone coping, an iron ladder, the cill under the top gates.
  for (const s of [-1, 1]) {
    const zc = ZC + s * (LW + CW) / 2;
    const len = XG2 - XG1 + 0.5;
    const xc = (XG1 + XG2) / 2;
    P.add(new THREE.BoxGeometry(len, G - 0.02, CW - LW), PAL.brick, { pos: [xc, (G - 0.02) / 2, zc], jitter: 0.012, shade: 0.12 });
    // brick courses: slightly darker bands on the chamber face
    for (let k = 0; k < 4; k++) {
      const y = WL + 0.08 + k * 0.13;
      P.add(new THREE.BoxGeometry(len - 0.04, 0.025, 0.02), PAL.brick2, { pos: [xc, y, ZC + s * (LW + 0.002)], jitter: 0.004, shade: 0.05 });
    }
    // coping stones, irregular lengths
    let x = XG1 - 0.25;
    while (x < XG2 + 0.25) {
      const l = Math.min(0.32 + rand() * 0.25, XG2 + 0.25 - x);
      P.add(new THREE.BoxGeometry(l - 0.015, 0.07, CW - LW + 0.12), PAL.coping, { pos: [x + l / 2, G + 0.0, zc + s * 0.02], ry: (rand() - 0.5) * 0.02, jitter: 0.01, shade: 0.06 });
      x += l;
    }
  }
  // wing walls and coping along the lower pound (brick-lined cut down to the bridge)
  for (const s of [-1, 1]) {
    const zc = ZC + s * (CW + 0.06);
    P.add(new THREE.BoxGeometry(XB - XG2 - 0.3, 0.06, 0.16), PAL.coping, { pos: [(XB + XG2) / 2 - 0.1, G + 0.0, zc], jitter: 0.012, shade: 0.06 });
    P.add(new THREE.BoxGeometry(XB - XG2 - 0.3, G - WL, 0.06), PAL.brick2, { pos: [(XB + XG2) / 2 - 0.1, (G + WL) / 2, ZC + s * (CW - 0.02)], jitter: 0.01, shade: 0.1 });
  }
  // upper pound edge stones
  for (const s of [-1, 1]) {
    let x = -4.6;
    while (x < XG1 - 0.3) {
      const l = 0.3 + rand() * 0.3;
      P.add(new THREE.BoxGeometry(l - 0.02, 0.06, 0.14), rand() > 0.3 ? PAL.coping : '#bfae90', { pos: [x + l / 2, G + 0.0, ZC + s * (CW + 0.05)], ry: (rand() - 0.5) * 0.04, jitter: 0.012, shade: 0.06 });
      x += l;
    }
  }
  P.add(new THREE.BoxGeometry(0.27, WU - WL - 0.02, LW * 2), PAL.brick2, { pos: [XG1 - 0.13, (WU + WL) / 2, ZC], jitter: 0.01, shade: 0.08 });
  {
    const lx = 0.9, lz = ZC - LW + 0.03;
    for (const dx of [-0.08, 0.08]) P.add(new THREE.BoxGeometry(0.025, G - WL + 0.05, 0.025), PAL.dark, { pos: [lx + dx, (G + WL) / 2, lz] });
    for (let k = 0; k < 5; k++) P.add(new THREE.BoxGeometry(0.18, 0.02, 0.02), PAL.dark, { pos: [lx, WL + 0.1 + k * 0.11, lz + 0.01] });
  }

  // Mitre gates (point upstream) with black-and-white balance beams over the lockside.
  function gates(xg, h0, h1, beamOut) {
    const tip = [xg - 0.24, ZC];
    for (const s of [-1, 1]) {
      const hinge = [xg, ZC + s * LW];
      const dx = tip[0] - hinge[0], dz = tip[1] - hinge[1];
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dz, dx);
      const cx = (tip[0] + hinge[0]) / 2, cz = (tip[1] + hinge[1]) / 2;
      const gm = compose(THREE, { pos: [cx, 0, cz], ry: yaw });
      const gat = (o) => gm.clone().multiply(compose(THREE, o));
      P.add(new THREE.BoxGeometry(len, h1 - h0, 0.09), PAL.timber, { matrix: gat({ pos: [0, (h0 + h1) / 2, 0] }), jitter: 0.006, shade: 0.08 });
      for (const y of [h0 + 0.12, (h0 + h1) / 2, h1 - 0.06]) P.add(new THREE.BoxGeometry(len + 0.02, 0.05, 0.11), '#2c241f', { matrix: gat({ pos: [0, y, 0] }) });
      P.add(new THREE.BoxGeometry(len + 0.04, 0.05, 0.13), PAL.white, { matrix: gat({ pos: [0, h1 + 0.02, 0] }) });
      // paddle gear on the walkway
      P.add(new THREE.BoxGeometry(0.06, 0.2, 0.06), PAL.dark, { matrix: gat({ pos: [-len * 0.15, h1 + 0.12, 0] }) });
      P.add(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 6), '#4a4a50', { matrix: gat({ pos: [-len * 0.15, h1 + 0.22, 0.02], rot: [Math.PI / 2, 0, 0] }) });
      // balance beam: from the hinge post out across the lockside, angled away from the water
      const by = h1 + 0.2;
      const BL = 1.55;
      const bdir = [beamOut * 0.6, s];
      const bl = Math.hypot(bdir[0], bdir[1]);
      const ux = bdir[0] / bl, uz = bdir[1] / bl;
      const mx = hinge[0] + ux * (BL / 2 - 0.12), mz = hinge[1] + uz * (BL / 2 - 0.12);
      const byaw = Math.atan2(-uz, ux);
      P.add(new THREE.BoxGeometry(BL, 0.13, 0.13), PAL.dark, { pos: [mx, by, mz], ry: byaw, jitter: 0.008, shade: 0.05 });
      P.add(new THREE.BoxGeometry(0.28, 0.135, 0.135), PAL.white, { pos: [hinge[0] + ux * (BL - 0.25), by, hinge[1] + uz * (BL - 0.25)], ry: byaw });
      P.add(new THREE.BoxGeometry(0.1, by - G + 0.05, 0.1), PAL.timber, { pos: [hinge[0], (by + G) / 2, hinge[1]] });
      // worn stepping bricks where the keeper pushes the beam
      for (let k = 0; k < 4; k++) {
        const r = BL - 0.15 + k * 0.17;
        const a = (s * 0.5) / r;
        P.add(new THREE.BoxGeometry(0.16, 0.025, 0.07), PAL.coping, { pos: [hinge[0] + ux * r + Math.cos(a) * 0.0, G + 0.01, hinge[1] + uz * r + s * k * 0.07], ry: byaw + 0.3 * s * k, shade: 0.05 });
      }
    }
    return tip;
  }
  gates(XG1, WL - 0.02, G + 0.1, 1.0);
  gates(XG2, WL - 0.02, G + 0.12, 1.0);
  // water leaking through the top gate paddles into the chamber
  for (const dz of [-0.28, 0.22]) {
    P.add(new THREE.BoxGeometry(0.22, 0.05, 0.12), '#dfe8df', { pos: [XG1 + 0.02, WL + 0.18, ZC + dz], rot: [0, 0, -0.9], jitter: 0.015, shade: 0.06 });
    P.add(new THREE.IcosahedronGeometry(0.14, 0), '#e9efe6', { pos: [XG1 + 0.2, WL + 0.02, ZC + dz], scl: [1.6, 0.25, 1.2], jitter: 0.03 });
  }

  // Humpback bridge: arched brick profile extruded across the cut, stone parapets and coping.
  {
    const half = 1.55, hump = 0.42, span = CW + 0.02, archTop = G - 0.04;
    const prof = (u) => G + hump * Math.pow(Math.cos((u / half) * Math.PI / 2), 1.3);
    const sh = new THREE.Shape();
    const N = 10;
    sh.moveTo(-half - 0.25, 0.0);
    sh.lineTo(-half - 0.25, G);
    for (let i = 0; i <= N; i++) { const u = -half + (2 * half * i) / N; sh.lineTo(u, prof(u)); }
    sh.lineTo(half + 0.25, G);
    sh.lineTo(half + 0.25, 0.0);
    sh.lineTo(span, 0.0);
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; sh.lineTo(Math.cos(a) * span, WL + Math.sin(a) * (archTop - WL)); }
    sh.lineTo(-span, 0.0);
    sh.closePath();
    const depth = 0.95;
    const bg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 });
    bg.translate(0, 0, -depth / 2);
    P.add(bg, PAL.brick, { pos: [XB, 0, ZC], ry: Math.PI / 2, jitter: 0.012, shade: 0.12 });
    // arch ring voussoirs in a paler brick on both faces
    for (const f of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const a = ((i + 0.5) / 9) * Math.PI;
        const r = span + 0.06;
        P.add(new THREE.BoxGeometry(0.035, 0.13, 0.17), '#c47a55', { pos: [XB + f * (depth / 2 + 0.01), WL + Math.sin(a) * (archTop - WL + 0.06), ZC - Math.cos(a) * r], rot: [-(a - Math.PI / 2), 0, 0], shade: 0.08 });
      }
      // parapet: segments following the hump
      for (let i = 0; i < N; i++) {
        const u0 = -half + (2 * half * i) / N, u1 = -half + (2 * half * (i + 1)) / N;
        const y0 = prof(u0), y1 = prof(u1);
        const l = Math.hypot(u1 - u0, y1 - y0);
        const a = Math.atan2(y1 - y0, u1 - u0);
        P.add(new THREE.BoxGeometry(0.11, 0.24, l + 0.02), PAL.brick2, { pos: [XB + f * (depth / 2 - 0.05), (y0 + y1) / 2 + 0.12, ZC - (u0 + u1) / 2], rot: [a, 0, 0], jitter: 0.008, shade: 0.08 });
        P.add(new THREE.BoxGeometry(0.16, 0.05, l + 0.03), PAL.coping, { pos: [XB + f * (depth / 2 - 0.05), (y0 + y1) / 2 + 0.26, ZC - (u0 + u1) / 2], rot: [a, 0, 0], jitter: 0.006, shade: 0.05 });
      }
      // end piers
      for (const e of [-1, 1]) P.add(new THREE.BoxGeometry(0.2, 0.42, 0.2), PAL.coping, { pos: [XB + f * (depth / 2 - 0.05), G + 0.21, ZC + e * (half + 0.12)], jitter: 0.01 });
    }
    // deck surface
    for (let i = 0; i < N; i++) {
      const u0 = -half + (2 * half * i) / N, u1 = -half + (2 * half * (i + 1)) / N;
      const y0 = prof(u0), y1 = prof(u1);
      const l = Math.hypot(u1 - u0, y1 - y0);
      P.add(new THREE.BoxGeometry(depth - 0.2, 0.03, l + 0.02), PAL.path, { pos: [XB, (y0 + y1) / 2 + 0.005, ZC - (u0 + u1) / 2], rot: [Math.atan2(y1 - y0, u1 - u0), 0, 0], shade: 0.05 });
    }
  }

  // Lock-keeper's cottage on the north bank: cream walls, slate roof, red chimney, green door.
  const CM = compose(THREE, { pos: [-0.35, G, -2.05], ry: 0.12 });
  const cat = (o) => CM.clone().multiply(compose(THREE, o));
  {
    P.add(new THREE.BoxGeometry(1.75, 0.08, 1.15), PAL.coping, { matrix: cat({ pos: [0, 0.04, 0] }), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(1.6, 0.95, 1.0), PAL.cream, { matrix: cat({ pos: [0, 0.55, 0] }), jitter: 0.012, shade: 0.04 });
    P.add(gable(THREE, 1.0, 0.55, 1.6), PAL.cream, { matrix: cat({ pos: [0, 1.02, 0], ry: Math.PI / 2 }), shade: 0.03 });
    P.add(roof(THREE, 1.32, 0.7, 1.82, 0.08), PAL.slate, { matrix: cat({ pos: [0, 0.88, 0], ry: Math.PI / 2 }), jitter: 0.012, shade: 0.08 });
    P.add(new THREE.BoxGeometry(1.86, 0.06, 0.08), '#3d3f4d', { matrix: cat({ pos: [0, 1.6, 0] }) });
    // chimney on the east gable
    P.add(new THREE.BoxGeometry(0.26, 0.85, 0.3), PAL.brick, { matrix: cat({ pos: [0.68, 1.45, -0.05] }), jitter: 0.012, shade: 0.08 });
    P.add(new THREE.BoxGeometry(0.32, 0.06, 0.36), PAL.coping, { matrix: cat({ pos: [0.68, 1.88, -0.05] }) });
    for (const dx of [-0.05, 0.06]) P.add(new THREE.CylinderGeometry(0.04, 0.045, 0.14, 6), '#b2603f', { matrix: cat({ pos: [0.68 + dx, 1.97, -0.05] }) });
    // canal-side front: door, two windows with sills, porch hood
    P.add(new THREE.BoxGeometry(0.26, 0.5, 0.04), PAL.green, { matrix: cat({ pos: [-0.2, 0.33, 0.51] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.03, 0.05), PAL.gold, { matrix: cat({ pos: [-0.12, 0.33, 0.54] }) });
    P.add(roof(THREE, 0.46, 0.12, 0.2, 0.035), PAL.slate, { matrix: cat({ pos: [-0.2, 0.66, 0.6], ry: 0 }) });
    for (const [x, y] of [[0.35, 0.42], [-0.6, 0.42], [0.35, 0.85], [-0.45, 0.85]]) {
      const lit = !(x < 0 && y > 0.6);
      (lit ? E : P).add(new THREE.BoxGeometry(0.26, 0.24, 0.03), lit ? PAL.glow : '#3c4652', { matrix: cat({ pos: [x, y, 0.51] }) });
      P.add(new THREE.BoxGeometry(0.03, 0.26, 0.04), PAL.white, { matrix: cat({ pos: [x, y, 0.52] }) });
      P.add(new THREE.BoxGeometry(0.32, 0.03, 0.08), PAL.white, { matrix: cat({ pos: [x, y - 0.14, 0.53] }) });
    }
    // gable windows (so the side views have something to read)
    E.add(new THREE.BoxGeometry(0.03, 0.22, 0.2), PAL.glow, { matrix: cat({ pos: [-0.81, 0.5, 0.1] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.2, 0.18), '#3c4652', { matrix: cat({ pos: [0.81, 0.5, 0.15] }) });
    // lean-to woodstore with a stack of logs
    P.add(new THREE.BoxGeometry(0.5, 0.5, 0.7), PAL.timber, { matrix: cat({ pos: [-1.05, 0.3, -0.1] }), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(0.62, 0.05, 0.82), PAL.slate, { matrix: cat({ pos: [-1.08, 0.58, -0.1], rot: [0, 0, 0.35] }) });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) {
      P.add(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), k % 2 ? '#b98a5e' : '#a07048', { matrix: cat({ pos: [-1.33, 0.12 + r * 0.11, -0.28 + k * 0.13 + r * 0.06], rot: [Math.PI / 2, 0, 0] }) });
    }
    // pumpkins on the doorstep
    for (const [x, z, s, c] of [[-0.48, 0.72, 0.11, '#e0782a'], [-0.36, 0.8, 0.075, '#e89a35'], [0.05, 0.74, 0.09, '#d26324']]) {
      P.add(new THREE.SphereGeometry(s, 8, 5), c, { matrix: cat({ pos: [x, s * 0.75, z], scl: [1, 0.75, 1] }), shade: 0.05 });
      P.add(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 4), '#4d6b2f', { matrix: cat({ pos: [x, s * 1.4, z] }) });
    }
    // picket fence round the front garden, gate left open
    for (let i = 0; i < 15; i++) {
      if (i === 5 || i === 6) continue;
      const x = -0.95 + i * 0.15;
      P.add(new THREE.BoxGeometry(0.04, 0.24 + rand() * 0.04, 0.03), PAL.white, { matrix: cat({ pos: [x, 0.13, 1.05] }), rot: [0, 0, 0], jitter: 0.004 });
    }
    P.add(new THREE.BoxGeometry(0.72, 0.03, 0.02), PAL.white, { matrix: cat({ pos: [-0.62, 0.18, 1.05] }) });
    P.add(new THREE.BoxGeometry(1.1, 0.03, 0.02), PAL.white, { matrix: cat({ pos: [0.43, 0.18, 1.05] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.22, 0.3), PAL.white, { matrix: cat({ pos: [-0.22, 0.13, 1.2], ry: 0.4 }) });
    // flower border and garden path
    for (let i = 0; i < 8; i++) P.add(new THREE.IcosahedronGeometry(0.07 + rand() * 0.04, 0), ['#d14d3b', '#e8a23a', '#8c3a6a', '#6e7f3a'][i % 4], { matrix: cat({ pos: [-0.85 + i * 0.22 + (i > 3 ? 0.3 : 0), 0.06, 0.88 + rand() * 0.06], scl: [1, 0.7, 1] }) });
    for (let i = 0; i < 4; i++) P.add(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 6), PAL.coping, { matrix: cat({ pos: [-0.2 + (rand() - 0.5) * 0.06, 0.01, 0.65 + i * 0.16], ry: rand() }) });
  }
  {
    // back of the cottage: kitchen window, back door, water butt
    E.add(new THREE.BoxGeometry(0.24, 0.22, 0.03), PAL.glow, { matrix: cat({ pos: [0.2, 0.48, -0.51] }) });
    P.add(new THREE.BoxGeometry(0.3, 0.03, 0.08), PAL.white, { matrix: cat({ pos: [0.2, 0.35, -0.53] }) });
    P.add(new THREE.BoxGeometry(0.24, 0.48, 0.04), '#6b4a34', { matrix: cat({ pos: [-0.35, 0.32, -0.51] }) });
    P.add(new THREE.CylinderGeometry(0.12, 0.11, 0.3, 8), '#3f5a46', { matrix: cat({ pos: [0.62, 0.23, -0.65] }) });
    for (const y of [0.13, 0.31]) P.add(new THREE.TorusGeometry(0.12, 0.01, 3, 10), PAL.dark, { matrix: cat({ pos: [0.62, y, -0.65], rot: [Math.PI / 2, 0, 0] }) });
  }
  // Mooring bollards and a lifebuoy on a post below the bottom gates.
  for (const [x, s] of [[XG2 + 0.55, 1], [XG2 + 1.0, -1], [XG1 - 1.2, 1]]) {
    const z = ZC + s * (CW + 0.2);
    P.add(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 7), PAL.dark, { pos: [x, G + 0.08, z] });
    P.add(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 7), PAL.white, { pos: [x, G + 0.18, z] });
  }
  {
    const x = XG2 + 0.35, z = ZC - CW - 0.45;
    P.add(new THREE.BoxGeometry(0.06, 0.62, 0.06), PAL.timber, { pos: [x, G + 0.31, z] });
    P.add(new THREE.BoxGeometry(0.2, 0.2, 0.03), PAL.timber, { pos: [x, G + 0.5, z + 0.035] });
    P.add(new THREE.TorusGeometry(0.1, 0.03, 5, 12), '#e8642c', { pos: [x, G + 0.48, z + 0.07] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      P.add(new THREE.BoxGeometry(0.035, 0.065, 0.065), PAL.white, { pos: [x + Math.cos(a) * 0.1, G + 0.48 + Math.sin(a) * 0.1, z + 0.07], rot: [0, 0, a] });
    }
  }
  // Sign by the top gate: LOCK 7, painted on a board.
  let sign;
  {
    const sx = XG1 - 0.6, sz = ZC + CW + 0.95;
    for (const d of [-0.28, 0.28]) P.add(new THREE.BoxGeometry(0.05, 0.62, 0.05), PAL.timber, { pos: [sx + d, G + 0.31, sz] });
    P.add(new THREE.BoxGeometry(0.72, 0.28, 0.04), PAL.white, { pos: [sx, G + 0.56, sz - 0.03] });
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const g = cv.getContext('2d');
    g.fillStyle = '#efe6d4'; g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#26242a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84);
    g.fillStyle = '#26242a'; g.font = 'bold 50px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LOCK 7', 128, 52);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    sign = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.25), new THREE.MeshLambertMaterial({ map: tex }));
    sign.position.set(sx, G + 0.56, sz - 0.055);
    sign.rotation.y = Math.PI;
    root.add(sign);
    const back = sign.clone();
    back.position.z = sz - 0.005;
    back.rotation.y = 0;
    root.add(back);
  }

  // People: the keeper leaning on the bottom gate beam, the boater at the tiller.
  function person(x, z, ry, coat, hat, lean = 0) {
    const m = compose(THREE, { pos: [x, G, z], ry, rot: [0, ry, lean] });
    const at = (o) => m.clone().multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 5), '#3b3a46', { matrix: at({ pos: [0.04, 0.15, 0] }) });
    P.add(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 5), '#3b3a46', { matrix: at({ pos: [-0.04, 0.15, 0] }) });
    P.add(new THREE.CylinderGeometry(0.08, 0.1, 0.34, 6), coat, { matrix: at({ pos: [0, 0.46, 0] }) });
    P.add(new THREE.SphereGeometry(0.07, 7, 5), '#e7b892', { matrix: at({ pos: [0, 0.7, 0] }) });
    P.add(new THREE.CylinderGeometry(0.075, 0.085, 0.06, 7), hat, { matrix: at({ pos: [0, 0.77, 0] }) });
    P.add(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 8), hat, { matrix: at({ pos: [0, 0.745, 0] }) });
    return at;
  }
  {
    // keeper: back pressed against the bottom gate's south beam, arms along it
    const hx = XG2 + 1.05, hz = ZC + LW + 0.95;
    const at = person(hx + 0.05, hz + 0.18, -2.2, '#5a6e3a', '#3a3530', -0.18);
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 4), '#5a6e3a', { matrix: at({ pos: [0.12, 0.52, -0.08], rot: [1.1, 0, -0.4] }) });
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 4), '#5a6e3a', { matrix: at({ pos: [-0.12, 0.52, -0.08], rot: [1.1, 0, 0.4] }) });
    P.add(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 8), '#d7c8a8', { matrix: at({ pos: [0, 0.6, 0.09], rot: [1.4, 0, 0] }) });
  }

  // Narrowboat waiting low in the chamber (animated as one group).
  const boatP = new Painter(THREE, 73);
  {
    const L = 2.55, W = 0.25;
    const hull = [];
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + (i / 6) * Math.PI; hull.push([-L / 2 + 0.12 + Math.cos(a) * 0.14, Math.sin(a) * W]); }
    hull.push([L / 2 - 0.55, W], [L / 2 - 0.15, W * 0.6], [L / 2, 0], [L / 2 - 0.15, -W * 0.6], [L / 2 - 0.55, -W]);
    hull.reverse();
    boatP.add(slab(THREE, hull, -0.12, 0.13), '#1f1e24', { shade: 0.04 });
    boatP.add(slab(THREE, offsetOutline(hull, 0.012), 0.1, 0.15), PAL.red, { shade: 0.04 });
    boatP.add(slab(THREE, offsetOutline(hull, -0.03), 0.15, 0.16), '#2b2a2f', { shade: 0.03 });
    // cabin
    const c0 = -0.85, c1 = 0.72;
    boatP.add(new THREE.BoxGeometry(c1 - c0, 0.3, 0.42), PAL.green, { pos: [(c0 + c1) / 2, 0.3, 0], shade: 0.03 });
    boatP.add(new THREE.BoxGeometry(c1 - c0 + 0.005, 0.045, 0.425), PAL.gold, { pos: [(c0 + c1) / 2, 0.42, 0] });
    boatP.add(new THREE.BoxGeometry(c1 - c0 + 0.005, 0.07, 0.425), PAL.red, { pos: [(c0 + c1) / 2, 0.19, 0] });
    boatP.add(new THREE.BoxGeometry(c1 - c0 + 0.06, 0.04, 0.48), '#7a2c24', { pos: [(c0 + c1) / 2, 0.47, 0] });
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {
      const x = c0 + 0.2 + k * 0.3;
      boatP.add(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), k === 2 ? PAL.glow : '#1b2a2a', { pos: [x, 0.3, s * 0.215], rot: [Math.PI / 2, 0, 0] });
      boatP.add(new THREE.TorusGeometry(0.045, 0.01, 3, 8), PAL.gold, { pos: [x, 0.3, s * 0.218] });
    }
    // painted panel (roses-and-castles style blocks) at the stern end of the cabin
    for (const s of [-1, 1]) {
      boatP.add(new THREE.BoxGeometry(0.2, 0.14, 0.01), '#e8d29a', { pos: [c0 + 0.12, 0.31, s * 0.216] });
      boatP.add(new THREE.SphereGeometry(0.035, 6, 4), '#c8352b', { pos: [c0 + 0.09, 0.31, s * 0.222], scl: [1, 1, 0.3] });
      boatP.add(new THREE.SphereGeometry(0.03, 6, 4), '#2f7a4a', { pos: [c0 + 0.16, 0.3, s * 0.222], scl: [1, 1, 0.3] });
    }
    // roof clutter: plant pots, water can, coiled rope, chimney with brass band
    boatP.add(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), PAL.dark, { pos: [0.45, 0.6, 0.06] });
    boatP.add(new THREE.CylinderGeometry(0.048, 0.048, 0.03, 6), PAL.gold, { pos: [0.45, 0.68, 0.06] });
    for (const [x, c] of [[-0.25, '#c8352b'], [-0.12, '#e8a23a'], [0.0, '#c8352b']]) {
      boatP.add(new THREE.CylinderGeometry(0.045, 0.035, 0.06, 6), '#b8673e', { pos: [x, 0.52, -0.1] });
      boatP.add(new THREE.IcosahedronGeometry(0.055, 0), c, { pos: [x, 0.58, -0.1] });
    }
    boatP.add(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 7), '#c8352b', { pos: [0.18, 0.54, 0.1] });
    boatP.add(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), '#c8352b', { pos: [0.25, 0.56, 0.1], rot: [0, 0, -0.9] });
    boatP.add(new THREE.TorusGeometry(0.07, 0.02, 4, 10), '#d7c8a8', { pos: [-0.6, 0.5, 0.05], rot: [Math.PI / 2, 0, 0] });
    // bow: well deck with a cratch
    boatP.add(gable(THREE, 0.4, 0.22, 0.38), PAL.green, { pos: [c1 + 0.2, 0.15, 0], ry: 0 });
    // stern: tiller and rudder
    boatP.add(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 4), PAL.gold, { pos: [-L / 2 - 0.02, 0.32, 0], rot: [0, 0, 1.25] });
    boatP.add(new THREE.BoxGeometry(0.16, 0.22, 0.02), '#1f1e24', { pos: [-L / 2 - 0.08, 0.0, 0] });
    // the boater, standing on the stern counter
    const bm = new THREE.Matrix4().makeTranslation(-L / 2 + 0.2, 0.12, 0);
    const bat = (o) => bm.clone().multiply(compose(THREE, o));
    boatP.add(new THREE.CylinderGeometry(0.08, 0.1, 0.36, 6), '#b9533a', { matrix: bat({ pos: [0, 0.2, 0] }) });
    boatP.add(new THREE.SphereGeometry(0.07, 7, 5), '#e7b892', { matrix: bat({ pos: [0, 0.45, 0] }) });
    boatP.add(new THREE.SphereGeometry(0.075, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#e3c24a', { matrix: bat({ pos: [0, 0.47, 0] }) });
  }
  const boat = boatP.mesh(lambert(THREE));
  const boatHome = new THREE.Vector3(0.15, WL + 0.02, ZC + 0.18);
  boat.position.copy(boatHome);
  boat.rotation.y = 0.04;
  root.add(boat);

  // A second boat moored in the upper pound by the towpath: a blue working butty with a cargo of logs under a tarp.
  {
    const bx = -3.15, bz = ZC + 0.4, by = WU - 0.08;
    P.add(new THREE.BoxGeometry(1.9, 0.2, 0.44), '#1f2a44', { pos: [bx, by + 0.1, bz], jitter: 0.005 });
    P.add(new THREE.BoxGeometry(1.92, 0.06, 0.46), '#2f6aa8', { pos: [bx, by + 0.22, bz] });
    P.add(new THREE.ConeGeometry(0.23, 0.36, 4), '#2f6aa8', { pos: [bx + 1.1, by + 0.16, bz], rot: [0, Math.PI / 4, -Math.PI / 2], scl: [1, 1, 0.95] });
    P.add(new THREE.BoxGeometry(0.42, 0.3, 0.4), '#e8d29a', { pos: [bx - 0.7, by + 0.38, bz] });
    P.add(new THREE.BoxGeometry(0.46, 0.04, 0.44), '#c8352b', { pos: [bx - 0.7, by + 0.55, bz] });
    E.add(new THREE.BoxGeometry(0.12, 0.1, 0.41), PAL.glow, { pos: [bx - 0.7, by + 0.4, bz] });
    P.add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5), PAL.dark, { pos: [bx - 0.6, by + 0.65, bz + 0.08] });
    P.add(gable(THREE, 0.42, 0.24, 1.15), '#6f7a3a', { pos: [bx + 0.18, by + 0.25, bz], ry: Math.PI / 2, jitter: 0.015, shade: 0.08 });
    for (const dx of [-0.4, 0.1, 0.6]) P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 3), '#d7c8a8', { pos: [bx + dx, by + 0.4, bz], rot: [Math.PI / 2, 0, 0] });
  }

  // Heron fishing at the upper pound edge.
  {
    const hx = -3.35, hz = ZC - CW - 0.12;
    const m = compose(THREE, { pos: [hx, G, hz], ry: -0.4 });
    const at = (o) => m.clone().multiply(compose(THREE, o));
    for (const dx of [-0.03, 0.03]) P.add(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 3), '#b89a5a', { matrix: at({ pos: [dx, 0.16, -0.02] }) });
    // body tilted tail-down, darker folded wings over a pale breast
    P.add(new THREE.SphereGeometry(0.1, 8, 6), '#c9ced6', { matrix: at({ pos: [0, 0.4, 0], scl: [0.75, 0.85, 1.55], rot: [-0.55, 0, 0] }) });
    for (const sx of [-1, 1]) P.add(new THREE.SphereGeometry(0.08, 6, 4), '#7d8594', { matrix: at({ pos: [sx * 0.045, 0.42, -0.04], scl: [0.45, 0.8, 1.7], rot: [-0.5, 0, 0] }) });
    // S-curved neck, head, black crest stripe, long yellow bill pointed at the water
    P.add(new THREE.CylinderGeometry(0.02, 0.028, 0.18, 5), '#e8ebef', { matrix: at({ pos: [0, 0.55, 0.1], rot: [0.75, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 5), '#e8ebef', { matrix: at({ pos: [0, 0.66, 0.15], rot: [-0.25, 0, 0] }) });
    P.add(new THREE.SphereGeometry(0.035, 6, 4), '#eef0f2', { matrix: at({ pos: [0, 0.73, 0.15], scl: [0.9, 0.9, 1.2] }) });
    P.add(new THREE.BoxGeometry(0.075, 0.012, 0.1), '#22252e', { matrix: at({ pos: [0, 0.755, 0.12], rot: [0.35, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.014, 0.17, 4), '#e3b450', { matrix: at({ pos: [0, 0.7, 0.26], rot: [Math.PI / 2 + 0.35, 0, 0] }) });
  }

  // Trees: gnarled trunks and clustered russet canopies, gathered where a lockside would grow them.
  const canopies = []; // [x, y, z, r] for the falling leaves
  function tree(x, z, h, r, cols, lean = [0, 0]) {
    const top = [x + lean[0] * h, G + h, z + lean[1] * h];
    const tl = Math.hypot(top[0] - x, h, top[2] - z);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(top[0] - x, h, top[2] - z).normalize());
    const tm = new THREE.Matrix4().compose(new THREE.Vector3((x + top[0]) / 2, G + h / 2 - 0.04, (z + top[2]) / 2), q, new THREE.Vector3(1, 1, 1));
    P.add(new THREE.CylinderGeometry(0.06 + h * 0.025, 0.1 + h * 0.04, tl, 6), PAL.bark, { matrix: tm, jitter: 0.015, shade: 0.08 });
    // two limbs
    for (let k = 0; k < 2; k++) {
      const a = rand() * 6.28;
      P.add(new THREE.CylinderGeometry(0.025, 0.045, r * 0.9, 5), PAL.bark, { pos: [top[0] + Math.cos(a) * r * 0.25, top[1] - r * 0.15, top[2] + Math.sin(a) * r * 0.25], rot: [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8] });
    }
    const n = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rand() * 0.6, d = i === 0 ? 0 : r * (0.45 + rand() * 0.3);
      const s = r * (i === 0 ? 0.75 : 0.45 + rand() * 0.25);
      const y = top[1] + (i === 0 ? r * 0.25 : (rand() - 0.35) * r * 0.6);
      const col = cols[Math.floor(rand() * cols.length)];
      const lighter = new THREE.Color(col).lerp(new THREE.Color('#ffd27a'), 0.28);
      P.add(new THREE.IcosahedronGeometry(s, 1), col, { pos: [top[0] + Math.cos(a) * d, y, top[2] + Math.sin(a) * d], scl: [1, 0.82, 1], ry: rand() * 6, jitter: s * 0.12, shade: 0.1, top: lighter, y0: y - s * 0.2, y1: y + s * 0.8 });
    }
    canopies.push([top[0], top[1], top[2], r]);
  }
  tree(-2.6, -3.0, 1.9, 0.95, [LEAF[0], LEAF[1], LEAF[6]], [0.08, 0.05]);
  tree(-3.7, -1.8, 1.45, 0.75, [LEAF[2], LEAF[4], LEAF[1]], [-0.06, 0.02]);
  tree(-1.5, -3.6, 1.2, 0.6, [LEAF[3], LEAF[0]], [0, -0.05]);
  tree(1.5, -3.2, 1.6, 0.85, [LEAF[2], LEAF[4], LEAF[5]], [0.04, -0.03]);
  tree(3.6, -1.75, 1.3, 0.7, [LEAF[1], LEAF[3], LEAF[5]], [0.1, 0.04]);
  tree(3.75, 2.75, 2.1, 1.0, [LEAF[0], LEAF[3], LEAF[6], LEAF[1]], [-0.07, -0.02]);
  // A row of dark Lombardy poplars on the south-west bank: the one evergreen-looking landmark, upstream side only.
  for (const [x, z, h] of [[-4.0, 2.35, 2.5], [-3.4, 2.75, 3.0], [-2.85, 3.1, 2.25]]) {
    P.add(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 5), PAL.bark, { pos: [x, G + 0.3, z] });
    P.add(new THREE.IcosahedronGeometry(1, 1), '#2f4a2a', { pos: [x, G + 0.35 + h / 2, z], scl: [0.36, h / 2, 0.36], ry: x, jitter: 0.03, shade: 0.12, top: '#6a8a3a', y0: G + 0.4, y1: G + h + 0.4 });
  }
  tree(-2.4, 3.55, 0.85, 0.42, [LEAF[2], LEAF[4]], [0.0, 0.08]);
  // hawthorn hedge along the north bank behind the lock, with gaps
  for (let x = 0.5; x < 3.4; x += 0.26) {
    if (x > 2.3 && x < 2.7) continue;
    const s = 0.2 + rand() * 0.08;
    const z = -3.7 + x * 0.12 + (rand() - 0.5) * 0.1;
    P.add(new THREE.IcosahedronGeometry(s, 1), rand() > 0.4 ? '#76732f' : '#8c6a2c', { pos: [x, G + s * 0.8, z], scl: [1.5, 1.1, 0.9], ry: (rand() - 0.5) * 0.3, jitter: 0.035, shade: 0.1, top: '#a39a45', y0: G, y1: G + 0.5 });
    if (rand() > 0.4) P.add(new THREE.IcosahedronGeometry(0.035, 0), '#b8302a', { pos: [x + (rand() - 0.5) * 0.2, G + s * (1.1 + rand() * 0.5), z + s * 0.75] });
  }
  // reeds and seed heads by the upper pound
  for (let i = 0; i < 26; i++) {
    const x = -4.3 + rand() * 2.4, z = ZC + (rand() > 0.55 ? -1 : 1) * (CW + 0.18 + rand() * 0.25);
    const h = 0.22 + rand() * 0.25;
    P.add(new THREE.ConeGeometry(0.025, h, 3), rand() > 0.4 ? '#a99350' : '#8c8a45', { pos: [x, G + h / 2, z], rot: [(rand() - 0.5) * 0.3, rand() * 3, (rand() - 0.5) * 0.3] });
  }
  // grass tussocks
  for (let i = 0; i < 30; i++) {
    const x = (rand() * 2 - 1) * 4.3, z = (rand() * 2 - 1) * 4.0;
    if (Math.abs(z - ZC) < CW + 0.9) continue;
    if (Math.abs(x + 0.35) < 1.2 && Math.abs(z + 2.0) < 1.0) continue;
    if (Math.pow(Math.abs(x) / 4.5, 3) + Math.pow(Math.abs(z) / 4.1, 3) > 1) continue;
    P.add(new THREE.ConeGeometry(0.09 + rand() * 0.06, 0.12, 5), rand() > 0.5 ? '#9a9a52' : '#7f8445', { pos: [x, G + 0.05, z], ry: rand() * 3, jitter: 0.02 });
  }

  // Leaf litter: drifts of fallen leaves under the trees, a few afloat on the upper pound.
  {
    const leafGeo = () => new THREE.CircleGeometry(0.05, 3);
    let placed = 0;
    for (const [cx, , cz, r] of canopies) {
      const n = low ? 14 : 30;
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28, d = Math.pow(rand(), 0.7) * r * 1.6;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (Math.abs(z - ZC) < CW + 0.1) continue;
        if (Math.pow(Math.abs(x) / 4.75, 3.2) + Math.pow(Math.abs(z) / 4.35, 3.2) > 1) continue;
        P.add(leafGeo(), LEAF[Math.floor(rand() * LEAF.length)], { pos: [x, G + 0.015 + rand() * 0.01, z], rot: [-Math.PI / 2 + (rand() - 0.5) * 0.3, rand() * 6, 0], scl: [1 + rand() * 0.6, 1, 1], shade: 0.08 });
        placed++;
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = -4.3 + rand() * 2.6, z = ZC + (rand() - 0.5) * CW * 1.6;
      P.add(leafGeo(), LEAF[Math.floor(rand() * 4)], { pos: [x, WU + 0.035, z], rot: [-Math.PI / 2, rand() * 6, 0], shade: 0.06 });
    }
    for (let i = 0; i < 8; i++) {
      const x = XG2 + 0.4 + rand() * 1.0, z = ZC + (rand() - 0.5) * CW * 1.4;
      P.add(leafGeo(), LEAF[Math.floor(rand() * 4)], { pos: [x, WL + 0.035, z], rot: [-Math.PI / 2, rand() * 6, 0], shade: 0.06 });
    }
    void placed;
  }

  root.add(P.mesh(lambert(THREE)));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));

  // Water surfaces: three gently rippling sheets (upper pound, chamber, lower pound) in one mesh.
  const uTime = { value: 0 };
  {
    const parts = [];
    const sheet = (x0, x1, z0, z1, y, nx, nz) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      parts.push(g.toNonIndexed());
    };
    const xL = Math.min(...rim.map((p) => p[0])) - 0.2, xR = Math.max(...rim.map((p) => p[0])) + 0.2;
    sheet(xL, XG1 - 0.26, ZC - CW, ZC + CW, WU + 0.02, 14, 4);
    sheet(XG1 + 0.01, XG2 - 0.02, ZC - LW, ZC + LW, WL + 0.02, 8, 3);
    sheet(XG2 + 0.0, xR, ZC - CW, ZC + CW, WL + 0.02, 10, 4);
    const P2 = new Painter(THREE, 74);
    for (const g of parts) P2.add(g, PAL.water2, { shade: 0.05 });
    const wg = P2.geometry();
    // clip the sheets to the plinth outline by dropping triangles outside it
    const pos = wg.attributes.position, col = wg.attributes.color;
    const inside = (x, z) => Math.pow(Math.abs(x) / 4.78, 3.2) + Math.pow(Math.abs(z) / 4.38, 3.2) <= 1;
    const keepP = [], keepC = [];
    const deep = new THREE.Color(PAL.water);
    for (let f = 0; f < pos.count; f += 3) {
      let ok = true;
      for (let v = 0; v < 3; v++) if (!inside(pos.getX(f + v), pos.getZ(f + v))) ok = false;
      if (!ok) continue;
      const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
      const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
      // slow banding instead of per-face noise,
      const band = 0.5 + 0.5 * Math.sin(cx * 1.7 + cz * 2.9) * Math.cos(cx * 0.6 - cz * 1.3);
      const c = deep.clone().lerp(new THREE.Color(PAL.water2), band);
      if (cx > XG1 && cx < XG1 + 0.6) c.lerp(new THREE.Color('#dfe8df'), 0.35); // churn below the leaking gates
      for (let v = 0; v < 3; v++) {
        keepP.push(pos.getX(f + v), pos.getY(f + v), pos.getZ(f + v));
        keepC.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(keepC, 3));
    g.computeVertexNormals();
    wg.dispose();
    const wm = lambert(THREE);
    wm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float churn = 1.0 + 2.5 * smoothstep(0.7, 0.0, abs(position.x - (${(XG1 + 0.2).toFixed(2)})));
        transformed.y += churn * 0.008 * (sin(position.x * 3.1 + uTime * 1.3) + cos(position.z * 4.3 - uTime * 0.9));`);
    };
    const water = new THREE.Mesh(g, wm);
    water.receiveShadow = true;
    root.add(water);
  }

  // Chimney smoke (instanced puffs).
  const PUFFS = low ? 4 : 7;
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshLambertMaterial({ color: '#f3ece4', emissive: '#6e5a50', flatShading: true }), PUFFS);
  root.add(puffs);
  const chim = new THREE.Vector3(0.68, 2.0, -0.05).applyMatrix4(CM);

  // Falling leaves: small triangles that drift and spin down from the canopies, all in the vertex shader.
  {
    const NL = low ? 18 : 44;
    const pos = [], cen = [], fall = [], colr = [];
    const tc = new THREE.Color();
    for (let i = 0; i < NL; i++) {
      const [cx, cy, cz, r] = canopies[i % canopies.length];
      const c = [cx + (rand() - 0.5) * r * 1.6, G + rand() * (cy - G + r * 0.3), cz + (rand() - 0.5) * r * 1.6];
      const sp = 0.12 + rand() * 0.12, ph = rand() * 6.28, H = cy - G + r * 0.3;
      tc.set(LEAF[i % LEAF.length]);
      const tri = [[0, 0.05, 0], [-0.035, -0.03, 0], [0.04, -0.025, 0]];
      for (const v of tri) {
        pos.push(...v);
        cen.push(...c);
        fall.push(sp, ph, H);
        colr.push(tc.r, tc.g, tc.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('cen', new THREE.Float32BufferAttribute(cen, 3));
    g.setAttribute('fall', new THREE.Float32BufferAttribute(fall, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute vec3 cen;\nattribute vec3 fall;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float a = uTime * 2.2 + fall.y * 3.0;
        float b = uTime * 1.3 + fall.y;
        vec3 p = position;
        p = vec3(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a), p.z);
        p = vec3(p.x, p.y * cos(b) - p.z * sin(b), p.y * sin(b) + p.z * cos(b));
        float y = ${G.toFixed(3)} + 0.02 + mod(cen.y - ${G.toFixed(3)} - fall.x * uTime, fall.z);
        vec3 transformed = p + vec3(cen.x + 0.22 * sin(uTime * 0.7 + fall.y), y, cen.z + 0.16 * cos(uTime * 0.55 + fall.y * 1.7));`);
    };
    const leaves = new THREE.Mesh(g, m);
    leaves.frustumCulled = false;
    root.add(leaves);
  }

  // Light: low golden sun from the west, warm sky fill, earthy bounce.
  root.add(new THREE.HemisphereLight('#ffe2bd', '#6a5a3a', 1.55));
  const key = keyLight(THREE, ctx, { color: '#ffbf7a', intensity: 2.9, pos: [-9, 4.2, 3.5], extent: 7 });
  root.add(key, key.target);
  root.add(skyDome(THREE, { top: '#4a78a8', mid: '#f9cf92', bottom: '#d9a476', sun: [-0.88, 0.12, 0.42], sunColor: '#ffd890', sunPow: 40, horizon: 0.28 }));

  const dummy = new THREE.Object3D();
  function update(t) {
    uTime.value = t;
    boat.position.y = boatHome.y + Math.sin(t * 0.9) * 0.012;
    boat.rotation.z = Math.sin(t * 0.7) * 0.012;
    boat.rotation.x = Math.sin(t * 1.1 + 1) * 0.01;
    for (let i = 0; i < PUFFS; i++) {
      const k = (t * 0.18 + i / PUFFS) % 1;
      dummy.position.set(chim.x + k * 0.9 + Math.sin(k * 5 + i) * 0.05, chim.y + k * 1.2, chim.z - k * 0.25);
      dummy.scale.setScalar(Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.35 + k * 0.9));
      dummy.rotation.set(i, k * 2, 0);
      dummy.updateMatrix();
      puffs.setMatrixAt(i, dummy.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f2c48e'),
    fog: new THREE.Fog('#efc595', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
