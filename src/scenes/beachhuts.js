// Beach Huts: a warm late afternoon on a shingle bay. A curved row of pastel huts, each its own,
// wooden groynes running into a turquoise sea, an ice-cream bike on the promenade, gulls.
import { Painter, compose, lambert, outline, offsetOutline, slab, gable, roof, skyDome, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  board: '#4f5d73',
  sand: '#d8c3a0',
  sandDark: '#b49c7c',
  wet: '#b8a58a',
  shingle: '#d6cab4',
  prom: '#d9cfbf',
  wall: '#d9cdb8',
  seaDeep: '#1d8fae',
  sea: '#2fb3c2',
  shallow: '#6ed6cc',
  foam: '#f7fbf8',
  timber: '#7e6a58',
  timberDark: '#5f4e42',
  teal: '#2f7f7b',
  white: '#f6f4ee',
  dark: '#3b3340',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(5150);
  const root = new THREE.Group();
  const P = new Painter(THREE, 29);
  const SEA = 0.3;
  const WET = SEA + 0.1; // lower, wet shingle
  const BERM = SEA + 0.28; // upper shingle bank the huts stand on
  const PROM = SEA + 0.8; // promenade

  // Bay frame: S points out to sea, V runs along the beach. u = distance seaward, v = along the beach.
  const S = new THREE.Vector3(0.451, 0, 0.893);
  const V = new THREE.Vector3(0.893, 0, -0.451);
  const shore = (v) => 0.55 + 0.07 * v * v + 0.06 * Math.sin(v * 1.3);
  const dshore = (v) => 0.14 * v + 0.078 * Math.cos(v * 1.3);
  const W = (u, v) => [S.x * u + V.x * v, S.z * u + V.z * v];
  const uv = (x, z) => [x * S.x + z * S.z, x * V.x + z * V.z];
  const seaward = (v) => { const n = S.clone().addScaledVector(V, -dshore(v)).normalize(); return n; };
  const yawOf = (n) => Math.atan2(n.x, n.z);

  // ---- Plinth: board, sand strata, then the beach and the sea as separate top slabs (clipped to the shoreline).
  const rim = outline(rand, { n: 56, rx: 4.7, rz: 4.5, wob: 0.02, sq: 2.4 });
  // The part of the rim on one side of the curve u = f(v): rim points on that side, then the curve
  // itself between the two places where it crosses the rim.
  const clip = (pts, f, keepBelow) => {
    const g = ([x, z]) => { const [u, v] = uv(x, z); return (keepBelow ? f(v) - u : u - f(v)); };
    const n = pts.length;
    const ins = pts.map((p) => g(p) >= 0);
    let start = ins.findIndex((v, i) => v && !ins[(i - 1 + n) % n]);
    if (start < 0) return pts;
    const cross = (a, b) => {
      let lo = 0, hi = 1;
      for (let it = 0; it < 24; it++) {
        const m = (lo + hi) / 2;
        const p = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m];
        if ((g(p) >= 0) === (g(a) >= 0)) lo = m; else hi = m;
      }
      return [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo];
    };
    const out = [cross(pts[(start - 1 + n) % n], pts[start])];
    let i = start;
    while (ins[i % n]) { out.push(pts[i % n]); i++; }
    const exit = cross(pts[(i - 1) % n], pts[i % n]);
    out.push(exit);
    const v0 = uv(...exit)[1], v1 = uv(...out[0])[1];
    for (let k = 1; k < 24; k++) { const v = v0 + ((v1 - v0) * k) / 24; out.push(W(f(v), v)); }
    return out;
  };
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.5, -1.2, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.2, -0.75), PAL.sandDark, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.75, -0.35), PAL.sand, { jitter: 0.04, shade: 0.08 });
  P.add(slab(THREE, clip(rim, shore, false), -0.35, SEA), PAL.seaDeep, { shade: 0.04, top: PAL.sea, y0: -0.3, y1: SEA });
  P.add(slab(THREE, clip(rim, shore, true), -0.35, WET), '#a89377', { jitter: 0.02, jitterY: 0.008, shade: 0.08, top: PAL.wet, y0: WET - 0.05, y1: WET });
  P.add(slab(THREE, clip(rim, (v) => shore(v) - 1.0, true), WET - 0.05, BERM), PAL.shingle, { jitter: 0.03, jitterY: 0.01, shade: 0.08 });
  const promEdge = (v) => shore(v) - 3.55;
  P.add(slab(THREE, clip(rim, promEdge, true), BERM - 0.05, PROM - 0.06), PAL.wall, { jitter: 0.01, jitterY: 0.005, shade: 0.05 });
  P.add(slab(THREE, offsetOutline(clip(rim, (v) => promEdge(v) + 0.06, true), 0.0), PROM - 0.06, PROM), PAL.prom, { shade: 0.04 });
  // sea-wall courses
  for (let v = -4.2; v < 4.2; v += 0.55 + rand() * 0.1) {
    const [x, z] = W(promEdge(v) + 0.005, v);
    P.add(new THREE.BoxGeometry(0.02, 0.03, 0.5), '#cbbfa8', { pos: [x, BERM + 0.25, z], ry: yawOf(seaward(v)) + Math.PI / 2 });
  }

  // paving joints and two planters on the promenade
  for (let k = 1; k < 4; k++) {
    for (let v = -4.2; v < 4.2; v += 0.5) {
      const [x, z] = W(promEdge(v) - k * 0.42, v);
      if (Math.pow(Math.abs(x) / 4.55, 2.4) + Math.pow(Math.abs(z) / 4.35, 2.4) > 1) continue;
      P.add(new THREE.BoxGeometry(0.012, 0.004, 0.46), '#c4b9a8', { pos: [x, PROM + 0.002, z], ry: yawOf(seaward(v)) + Math.PI / 2 });
    }
  }
  for (const v of [-2.9, 0.9]) {
    const [x, z] = W(promEdge(v) - 0.95, v);
    const ry = yawOf(seaward(v)) + Math.PI / 2;
    P.add(new THREE.BoxGeometry(0.22, 0.2, 0.7), '#b9b2a6', { pos: [x, PROM + 0.1, z], ry, jitter: 0.005 });
    P.add(new THREE.BoxGeometry(0.18, 0.04, 0.66), '#4a3a2c', { pos: [x, PROM + 0.2, z], ry });
    for (let i = 0; i < 6; i++) {
      const t = (i / 5 - 0.5) * 0.55;
      const fx = x + V.x * t * (ry ? 1 : 1), fz = z + V.z * t;
      P.add(new THREE.IcosahedronGeometry(0.08, 0), '#5f9a45', { pos: [fx, PROM + 0.26, fz], scl: [1, 0.7, 1] });
      P.add(new THREE.IcosahedronGeometry(0.035, 0), i % 2 ? '#e2443d' : '#f6dc86', { pos: [fx + 0.02, PROM + 0.32, fz] });
    }
  }

  // Shingle: pebbles scattered thicker along the tide line, a dark line of wrack.
  for (let i = 0; i < 120; i++) {
    const v = (rand() * 2 - 1) * 4.2;
    const band = rand();
    const u = band < 0.55 ? shore(v) - 0.15 - rand() * 0.75 : shore(v) - 1.05 - rand() * 1.4;
    const [x, z] = W(u, v);
    if (Math.hypot(x / 4.6, z / 4.4) > 0.97) continue;
    const s = 0.035 + rand() * 0.05;
    const y = band < 0.55 ? WET : BERM;
    const c = ['#a9a39a', '#c8bca8', '#8f8a86', '#e2d8c6', '#b3967c'][Math.floor(rand() * 5)];
    P.add(new THREE.IcosahedronGeometry(s, 0), c, { pos: [x, y + s * 0.3, z], scl: [1.2, 0.6, 1], ry: rand() * 3 });
  }
  for (let v = -3.8; v < 3.8; v += 0.3 + rand() * 0.25) {
    if (rand() < 0.3) continue;
    const [x, z] = W(shore(v) - 0.95 + (rand() - 0.5) * 0.08, v);
    P.add(new THREE.BoxGeometry(0.05, 0.015, 0.22 + rand() * 0.15), '#5d5a3a', { pos: [x, BERM + 0.006, z], ry: yawOf(seaward(v)) + Math.PI / 2 + (rand() - 0.5) * 0.5 });
  }

  // ---- Groynes: weathered posts and planks running from the bank into the sea.
  const gulls = [];
  const groyne = (v0, len, lean) => {
    const n = seaward(v0);
    const yaw = yawOf(n);
    const u0 = shore(v0) - 2.35;
    const [x0, z0] = W(u0, v0);
    const steps = Math.round(len / 0.26);
    const tops = [];
    for (let i = 0; i <= steps; i++) {
      const d = i * (len / steps);
      const x = x0 + n.x * d, z = z0 + n.z * d;
      const [u] = uv(x, z);
      const ground = u > shore(v0) ? SEA - 0.2 : u > shore(v0) - 1.0 ? WET : BERM;
      const top = BERM + 0.35 - (d / len) * 0.38 + (rand() - 0.5) * 0.06;
      const h = top - ground + 0.1;
      if (i === steps - 1 && rand() > 0.5) continue; // a missing post
      P.add(new THREE.BoxGeometry(0.09, h, 0.09), i % 2 ? PAL.timber : PAL.timberDark, { pos: [x, ground - 0.1 + h / 2, z], ry: yaw + (rand() - 0.5) * 0.3, rot: [(rand() - 0.5) * 0.08, yaw, (rand() - 0.5) * 0.1 + lean], jitter: 0.01 });
      tops.push([x, top, z]);
    }
    // planks: one board per bay, slightly lower toward the sea
    for (let i = 0; i < steps; i++) {
      const d = (i + 0.5) * (len / steps);
      const x = x0 + n.x * d, z = z0 + n.z * d;
      const top = BERM + 0.3 - (d / len) * 0.38;
      for (let k = 0; k < (d / len > 0.6 ? 1 : 2); k++) {
        P.add(new THREE.BoxGeometry(0.05, 0.11, len / steps + 0.02), k ? PAL.timberDark : '#8d7a66', { pos: [x - n.z * 0.05, top - 0.07 - k * 0.12, z + n.x * 0.05], ry: yaw, jitter: 0.008 });
      }
      // foam where the sea meets the boards
      const [u] = uv(x, z);
      if (u > shore(v0) + 0.1) P.add(new THREE.BoxGeometry(0.22, 0.02, len / steps), PAL.foam, { pos: [x, SEA + 0.06, z], ry: yaw, jitter: 0.03, jitterY: 0 });
    }
    return tops;
  };
  const g1 = groyne(-2.05, 4.1, 0.03);
  groyne(0.95, 3.8, -0.04);
  groyne(3.25, 3.0, 0.05);
  // a gull standing on a groyne post
  gulls.push([...g1[g1.length - 2], 0.6]);

  // ---- Promenade: railing, steps down to the beach, a lamp post, a bench.
  const stepV0 = -0.95, stepV1 = -0.25;
  for (let v = -4.1; v <= 4.1; v += 0.42) {
    if (v > stepV0 - 0.05 && v < stepV1 + 0.05) continue;
    const [x, z] = W(promEdge(v) - 0.08, v);
    if (Math.hypot(x / 4.6, z / 4.4) > 0.96) continue;
    P.add(new THREE.CylinderGeometry(0.022, 0.03, 0.42, 5), PAL.teal, { pos: [x, PROM + 0.21, z] });
    P.add(new THREE.SphereGeometry(0.035, 5, 3), PAL.teal, { pos: [x, PROM + 0.43, z] });
    const v2 = v + 0.42;
    if (v2 > stepV0 - 0.05 && v2 < stepV1 + 0.05) continue;
    const [x2, z2] = W(promEdge(v2) - 0.08, v2);
    if (Math.hypot(x2 / 4.6, z2 / 4.4) > 0.96) continue;
    const len = Math.hypot(x2 - x, z2 - z);
    for (const y of [0.4, 0.22]) P.add(new THREE.BoxGeometry(0.025, 0.025, len), PAL.teal, { pos: [(x + x2) / 2, PROM + y, (z + z2) / 2], ry: Math.atan2(x2 - x, z2 - z) });
  }
  {
    const vm = (stepV0 + stepV1) / 2;
    const n = seaward(vm);
    const [x, z] = W(promEdge(vm), vm);
    for (let j = 0; j < 4; j++) {
      const h = PROM - BERM - (j * (PROM - BERM)) / 4;
      const out = 0.18 * (j + 1);
      P.add(new THREE.BoxGeometry(0.68, h, 0.2), '#d2c6b2', { pos: [x + n.x * (out - 0.1), BERM - 0.02 + h / 2, z + n.z * (out - 0.1)], ry: yawOf(n), jitter: 0.008 });
    }
  }
  // lamp post with a gull on top
  let lampTop;
  {
    const v = 1.75;
    const [x, z] = W(promEdge(v) - 0.25, v);
    P.add(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 8), PAL.teal, { pos: [x, PROM + 0.09, z] });
    P.add(new THREE.CylinderGeometry(0.035, 0.05, 1.7, 7), PAL.teal, { pos: [x, PROM + 0.95, z] });
    P.add(new THREE.TorusGeometry(0.07, 0.015, 4, 8), PAL.teal, { pos: [x, PROM + 0.5, z], rot: [Math.PI / 2, 0, 0] });
    P.add(new THREE.BoxGeometry(0.4, 0.03, 0.03), PAL.teal, { pos: [x, PROM + 1.7, z], ry: yawOf(seaward(v)) + Math.PI / 2 });
    for (const s of [-1, 1]) {
      const lx = x + V.x * s * 0.2, lz = z + V.z * s * 0.2;
      P.add(new THREE.CylinderGeometry(0.07, 0.05, 0.18, 6), '#fff4d2', { pos: [lx, PROM + 1.6, lz] });
      P.add(new THREE.ConeGeometry(0.1, 0.09, 6), PAL.teal, { pos: [lx, PROM + 1.73, lz] });
    }
    P.add(new THREE.ConeGeometry(0.05, 0.16, 6), PAL.teal, { pos: [x, PROM + 1.82, z] });
    // hanging basket of red flowers
    P.add(new THREE.SphereGeometry(0.11, 7, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#5b4636', { pos: [x - S.x * 0.22, PROM + 1.25, z - S.z * 0.22] });
    P.add(new THREE.IcosahedronGeometry(0.11, 0), '#5f9a45', { pos: [x - S.x * 0.22, PROM + 1.27, z - S.z * 0.22], scl: [1, 0.55, 1] });
    for (let i = 0; i < 4; i++) P.add(new THREE.IcosahedronGeometry(0.035, 0), '#e2443d', { pos: [x - S.x * 0.22 + (rand() - 0.5) * 0.16, PROM + 1.3, z - S.z * 0.22 + (rand() - 0.5) * 0.16] });
    lampTop = [x + V.x * 0.2, PROM + 1.8, z + V.z * 0.2];
    gulls.push([...lampTop, -1.2]);
  }
  // Victorian shelter on the promenade behind the huts: teal posts, a hipped roof with a scalloped valance.
  {
    const v = -1.95;
    const n = seaward(v);
    const [x, z] = W(promEdge(v) - 0.85, v);
    const sm = compose(THREE, { pos: [x, PROM, z], ry: yawOf(n) });
    const st = (o) => sm.clone().multiply(compose(THREE, o));
    for (const [px, pz] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]]) {
      P.add(new THREE.CylinderGeometry(0.03, 0.035, 0.85, 6), PAL.teal, { matrix: st({ pos: [px, 0.425, pz] }) });
    }
    P.add(new THREE.BoxGeometry(1.0, 0.08, 0.7), PAL.white, { matrix: st({ pos: [0, 0.87, 0] }) });
    for (let i = 0; i < 9; i++) P.add(new THREE.ConeGeometry(0.045, 0.07, 4), PAL.white, { matrix: st({ pos: [-0.44 + i * 0.11, 0.8, 0.355], rot: [Math.PI, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.72, 0.42, 4), '#e86a5c', { matrix: st({ pos: [0, 1.12, 0], ry: Math.PI / 4, scl: [1.0, 1, 0.72] }), shade: 0.06 });
    P.add(new THREE.SphereGeometry(0.05, 6, 4), PAL.teal, { matrix: st({ pos: [0, 1.36, 0] }) });
    P.add(new THREE.BoxGeometry(0.9, 0.35, 0.04), '#cfe3e0', { matrix: st({ pos: [0, 0.5, -0.3] }) });
    for (let k = 0; k < 2; k++) P.add(new THREE.BoxGeometry(0.85, 0.025, 0.07), '#9a6b45', { matrix: st({ pos: [0, 0.24, -0.22 + k * 0.08] }) });
    // someone's red umbrella left hooked on the seat
    P.add(new THREE.CylinderGeometry(0.03, 0.006, 0.4, 6), '#c8402e', { matrix: st({ pos: [0.3, 0.3, -0.1], rot: [0, 0, 0.35] }) });
  }

  // bench facing the sea
  {
    const v = 2.75;
    const n = seaward(v);
    const [x, z] = W(promEdge(v) - 0.5, v);
    const bm = compose(THREE, { pos: [x, PROM, z], ry: yawOf(n) });
    const b = (o) => bm.clone().multiply(compose(THREE, o));
    for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(0.75, 0.025, 0.06), '#9a6b45', { matrix: b({ pos: [0, 0.2, -0.06 + k * 0.07] }) });
    for (let k = 0; k < 2; k++) P.add(new THREE.BoxGeometry(0.75, 0.05, 0.02), '#9a6b45', { matrix: b({ pos: [0, 0.3 + k * 0.08, -0.12], rot: [-0.2, 0, 0] }) });
    for (const sx of [-0.33, 0.33]) P.add(new THREE.BoxGeometry(0.03, 0.2, 0.2), PAL.teal, { matrix: b({ pos: [sx, 0.1, 0] }) });
    // a forgotten paper bag of chips on the bench, a gull eyeing it
    P.add(new THREE.BoxGeometry(0.07, 0.03, 0.1), '#f1e4c8', { matrix: b({ pos: [0.2, 0.23, 0.02], ry: 0.4 }) });
    const gp = new THREE.Vector3(0.45, 0, 0.3).applyMatrix4(bm);
    gulls.push([gp.x, PROM, gp.z, yawOf(n) - 2.2]);
  }

  // ---- Ice-cream tricycle at the top of the steps, a striped parasol and a canvas sign.
  let signMesh;
  {
    const v = -0.1;
    const n = seaward(v);
    const [x, z] = W(promEdge(v) - 0.42, v);
    const im = compose(THREE, { pos: [x, PROM, z], ry: yawOf(n) + Math.PI / 2 + 0.25 });
    const it = (o) => im.clone().multiply(compose(THREE, o));
    for (const [wx, wz] of [[-0.2, 0.18], [0.2, 0.18]]) {
      P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), '#2e2b2b', { matrix: it({ pos: [wx, 0.1, wz], rot: [Math.PI / 2, 0, 0] }) });
    }
    P.add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), '#2e2b2b', { matrix: it({ pos: [0, 0.12, -0.42], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.5, 0.3, 0.36), PAL.white, { matrix: it({ pos: [0, 0.34, 0.18] }), jitter: 0.005 });
    P.add(new THREE.BoxGeometry(0.51, 0.06, 0.37), '#f19ab0', { matrix: it({ pos: [0, 0.27, 0.18] }) });
    P.add(new THREE.BoxGeometry(0.51, 0.04, 0.37), '#f19ab0', { matrix: it({ pos: [0, 0.4, 0.18] }) });
    P.add(new THREE.BoxGeometry(0.52, 0.04, 0.38), '#cfd8dc', { matrix: it({ pos: [0, 0.51, 0.18] }) });
    P.add(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 5), '#444', { matrix: it({ pos: [0, 0.28, -0.18], rot: [1.1, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.1, 0.03, 0.16), '#3a3434', { matrix: it({ pos: [0, 0.44, -0.3] }) });
    P.add(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 5), '#444', { matrix: it({ pos: [0, 0.45, -0.42], rot: [0, 0, Math.PI / 2] }) });
    // parasol in alternating wedges
    P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), '#d9d4cc', { matrix: it({ pos: [0.18, 0.85, 0.18] }) });
    for (let i = 0; i < 8; i++) {
      P.add(new THREE.ConeGeometry(0.42, 0.16, 1, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? PAL.white : '#f07f9c', { matrix: it({ pos: [0.18, 1.25, 0.18], rot: [0.08, 0, 0.1] }), shade: 0.02 });
    }
    // cones in a rack on the side
    for (let i = 0; i < 3; i++) {
      P.add(new THREE.ConeGeometry(0.025, 0.08, 5), '#d9a35b', { matrix: it({ pos: [-0.18 + i * 0.06, 0.58, 0.32], rot: [Math.PI, 0, 0] }) });
      P.add(new THREE.SphereGeometry(0.03, 6, 4), ['#fdf3e1', '#f7b7c6', '#a8d8b0'][i], { matrix: it({ pos: [-0.18 + i * 0.06, 0.63, 0.32] }) });
    }
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#fdf6ea'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#e0607e'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ICES', 64, 35);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshLambertMaterial({ map: tex }));
    signMesh.applyMatrix4(it({ pos: [0, 0.335, 0.362] }));
    root.add(signMesh);
    const back = signMesh.clone();
    back.applyMatrix4(new THREE.Matrix4());
    back.position.copy(new THREE.Vector3(0, 0.335, -0.002).applyMatrix4(im));
    back.rotation.y += Math.PI;
    root.add(back);
  }

  // ---- The beach huts: one curved row, each hut its own colour, roof, door and clutter.
  const HUTS = [
    { v: -3.3, w: 0.66, d: 0.66, h: 0.78, col: '#9fdcc3', roof: '#f4f1ea', door: 'shut', trim: '#ffffff', dcol: '#f4f1ea', porthole: true },
    { v: -2.45, w: 0.74, d: 0.7, h: 0.82, col: '#f4a7b9', roof: '#5b6f8a', door: 'open', trim: '#ffffff', dcol: '#f6c9d4', chair: '#3f74b8' },
    { v: -1.57, w: 0.72, d: 0.74, h: 0.94, col: '#f6dc86', roof: '#d9534f', door: 'shut', trim: '#ffffff', dcol: 'stripe' },
    { v: 0.38, w: 0.7, d: 0.7, h: 0.8, col: '#9cc7ea', roof: '#f4f1ea', door: 'open', trim: '#ffffff', dcol: '#cfe3f4', towel: '#f2b134' },
    { v: 1.2, w: 0.68, d: 0.7, h: 0.84, col: '#c7b3e3', roof: '#3f4a5c', door: 'shut', trim: '#f6f4ee', dcol: '#8e72b8' },
    { v: 2.08, w: 0.74, d: 0.72, h: 0.8, col: '#f39a7b', roof: '#f4f1ea', door: 'half', trim: '#ffffff', dcol: '#ffd7c9', bands: '#ffffff' },
    { v: 2.92, w: 0.64, d: 0.66, h: 0.74, col: '#f7f5ef', roof: '#4f86c6', door: 'shut', trim: '#4f86c6', dcol: '#4f86c6', bands: '#4f86c6', tilt: 0.05 },
  ];
  const hutTop = [];
  for (const [hi, h] of HUTS.entries()) {
    const n = seaward(h.v);
    const [x, z] = W(promEdge(h.v) + 0.12 + h.d / 2, h.v);
    const Y0 = BERM + 0.1;
    const hm = compose(THREE, { pos: [x, Y0, z], ry: yawOf(n) + (rand() - 0.5) * 0.12 + (h.tilt || 0) });
    const at = (o) => hm.clone().multiply(compose(THREE, o));
    const { w, d } = h;
    const gh = 0.24 + (hi % 3) * 0.04;
    // sleeper base on short stilts
    P.add(new THREE.BoxGeometry(w + 0.08, 0.06, d + 0.12), '#8a7764', { matrix: at({ pos: [0, -0.03, 0.02] }) });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(new THREE.BoxGeometry(0.06, 0.12, 0.06), PAL.timberDark, { matrix: at({ pos: [sx * (w / 2 - 0.02), -0.08, sz * (d / 2 - 0.02)] }) });
    P.add(new THREE.BoxGeometry(w, h.h, d), h.col, { matrix: at({ pos: [0, h.h / 2, 0] }), jitter: 0.006, shade: 0.03 });
    P.add(gable(THREE, w, gh, d), h.col, { matrix: at({ pos: [0, h.h, 0] }), shade: 0.03 });
    // plank grooves on the sides
    for (const sx of [-1, 1]) for (let k = 1; k < 5; k++) P.add(new THREE.BoxGeometry(0.012, h.h - 0.04, 0.012), new THREE.Color(h.col).multiplyScalar(0.86), { matrix: at({ pos: [sx * (w / 2 + 0.003), h.h / 2, -d / 2 + (k * d) / 5] }) });
    if (h.bands) for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(w + 0.01, 0.07, d + 0.01), h.bands, { matrix: at({ pos: [0, 0.14 + k * 0.24, 0] }) });
    // roof with overhang and a white barge board on the front
    const e = 0.07, s = gh / (w / 2);
    P.add(roof(THREE, w + 2 * e, s * (w / 2 + e), d + 0.16, 0.05), h.roof, { matrix: at({ pos: [0, h.h - e * s, 0.02] }), shade: 0.05 });
    P.add(roof(THREE, w + 2 * e + 0.02, s * (w / 2 + e + 0.01), 0.04, 0.06), h.trim, { matrix: at({ pos: [0, h.h - e * s - 0.005, d / 2 + 0.1] }) });
    P.add(new THREE.ConeGeometry(0.03, 0.12, 4), h.trim, { matrix: at({ pos: [0, h.h + gh + 0.06, d / 2 + 0.1] }) });
    // front step
    P.add(new THREE.BoxGeometry(w * 0.7, 0.05, 0.22), '#9a8670', { matrix: at({ pos: [0, -0.05, d / 2 + 0.13] }) });
    // doors
    const dw = w * 0.36, dh = h.h * 0.78;
    const leaf = (side, ang, col) => {
      const m = at({ pos: [side * dw, 0, d / 2 + 0.01], ry: side * ang }).multiply(compose(THREE, { pos: [-side * dw / 2, dh / 2 + 0.02, 0.012] }));
      P.add(new THREE.BoxGeometry(dw - 0.01, dh, 0.025), col, { matrix: m });
      if (col !== h.col) P.add(new THREE.BoxGeometry(dw * 0.5, dh * 0.3, 0.03), new THREE.Color(col).multiplyScalar(0.9), { matrix: m.clone().multiply(compose(THREE, { pos: [0, dh * 0.18, 0] })) });
    };
    const dcol = h.dcol === 'stripe' ? '#ffffff' : h.dcol;
    if (h.door === 'shut') {
      leaf(-1, 0, dcol); leaf(1, 0, dcol);
      if (h.dcol === 'stripe') for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(dw * 2 - 0.02, 0.07, 0.03), '#f2c14e', { matrix: at({ pos: [0, 0.1 + k * 0.17, d / 2 + 0.03] }) });
      P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6), '#c8a04a', { matrix: at({ pos: [0.04, dh * 0.55, d / 2 + 0.035], rot: [Math.PI / 2, 0, 0] }) });
    } else {
      P.add(new THREE.BoxGeometry(dw * 2, dh, 0.02), PAL.dark, { matrix: at({ pos: [0, dh / 2 + 0.02, d / 2 + 0.003] }) });
      P.add(new THREE.BoxGeometry(dw * 2 - 0.04, 0.025, 0.12), '#a7835c', { matrix: at({ pos: [0, dh * 0.62, d / 2 - 0.05] }) });
      P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6), '#e45d4c', { matrix: at({ pos: [-0.08, dh * 0.62 + 0.04, d / 2 - 0.04] }) });
      P.add(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 7), '#d8d8d8', { matrix: at({ pos: [0.09, dh * 0.62 + 0.05, d / 2 - 0.05] }) });
      leaf(-1, h.door === 'half' ? 0 : 1.75, dcol);
      leaf(1, 1.8, dcol);
    }
    if (h.porthole) P.add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), '#8fb9c9', { matrix: at({ pos: [0, h.h + 0.08, d / 2 + 0.01], rot: [Math.PI / 2, 0, 0] }) });
    // a towel drying over the open door
    if (h.towel) P.add(new THREE.BoxGeometry(0.03, 0.3, 0.18), h.towel, { matrix: at({ pos: [w / 2 + 0.17, dh - 0.1, d / 2 + 0.2], ry: 0.3 }) });
    // a striped deckchair on the shingle in front of the hut
    if (h.chair) {
      const cm = (o) => at({ pos: [0.38, -0.08, d / 2 + 0.75], ry: 0.5 }).multiply(compose(THREE, o));
      for (const sx of [-0.17, 0.17]) {
        P.add(new THREE.BoxGeometry(0.025, 0.025, 0.6), '#c49a6c', { matrix: cm({ pos: [sx, 0.22, -0.05], rot: [-0.75, 0, 0] }) });
        P.add(new THREE.BoxGeometry(0.025, 0.025, 0.42), '#c49a6c', { matrix: cm({ pos: [sx, 0.13, 0.12], rot: [0.6, 0, 0] }) });
        P.add(new THREE.BoxGeometry(0.025, 0.025, 0.24), '#c49a6c', { matrix: cm({ pos: [sx, 0.18, 0.1] }) });
      }
      for (let k = 0; k < 5; k++) P.add(new THREE.BoxGeometry(0.068, 0.012, 0.58), k % 2 ? PAL.white : h.chair, { matrix: cm({ pos: [-0.136 + k * 0.068, 0.2, -0.03], rot: [-0.85, 0, 0] }).multiply(compose(THREE, { pos: [0, 0, 0] })) });
    }
    hutTop.push(new THREE.Vector3(0, h.h + gh, d / 2 + 0.08).applyMatrix4(hm));
  }
  // bunting between the blue and the lilac hut
  {
    const a = hutTop[3], b = hutTop[4];
    const NB = 9;
    const cols = ['#e2443d', '#f6dc86', '#3f74b8', '#ffffff', '#6cc08b'];
    for (let i = 0; i <= NB; i++) {
      const t = i / NB;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.12;
      if (i < NB) {
        const q = a.clone().lerp(b, (i + 1) / NB);
        q.y -= Math.sin(((i + 1) / NB) * Math.PI) * 0.12;
        const len = p.distanceTo(q);
        const m = new THREE.Matrix4().compose(p.clone().lerp(q, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()), new THREE.Vector3(1, 1, 1));
        P.add(new THREE.CylinderGeometry(0.004, 0.004, len, 3), '#ffffff', { matrix: m });
        const f = p.clone().lerp(q, 0.5);
        P.add(new THREE.ConeGeometry(0.035, 0.08, 3), cols[i % cols.length], { pos: [f.x, f.y - 0.05, f.z], rot: [Math.PI, Math.atan2(q.x - p.x, q.z - p.z), 0], scl: [1, 1, 0.25] });
      }
    }
  }

  // ---- On the beach: a windbreak, a towel and bucket, a dinghy hauled up on the shingle.
  {
    const v = 0.15;
    const n = seaward(v);
    const [x, z] = W(shore(v) - 1.35, v);
    const yaw = yawOf(n);
    const cols = ['#e2443d', '#ffffff', '#3f74b8', '#ffffff'];
    const pts = [[-0.55, 0.0], [-0.22, -0.12], [0.1, -0.02], [0.42, -0.16], [0.7, 0.02]];
    const wb = compose(THREE, { pos: [x, BERM, z], ry: yaw + 0.25 });
    const wat = (o) => wb.clone().multiply(compose(THREE, o));
    for (let i = 0; i < pts.length; i++) {
      P.add(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4), '#c49a6c', { matrix: wat({ pos: [pts[i][0], 0.24, pts[i][1] - 0.35] }) });
      if (i < pts.length - 1) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        P.add(new THREE.BoxGeometry(Math.hypot(bx - ax, bz - az), 0.4, 0.012), cols[i], { matrix: wat({ pos: [(ax + bx) / 2, 0.28, (az + bz) / 2 - 0.35], ry: -Math.atan2(bz - az, bx - ax) }) });
      }
    }
    P.add(new THREE.BoxGeometry(0.42, 0.012, 0.8), '#f2b134', { matrix: wat({ pos: [0.1, 0.008, 0.25], ry: 0.1 }) });
    P.add(new THREE.BoxGeometry(0.43, 0.014, 0.12), '#e2443d', { matrix: wat({ pos: [0.1, 0.01, 0.0], ry: 0.1 }) });
    P.add(new THREE.CylinderGeometry(0.065, 0.05, 0.1, 8), '#e2443d', { matrix: wat({ pos: [0.55, 0.05, 0.55] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.2, 0.06), '#3f74b8', { matrix: wat({ pos: [0.62, 0.08, 0.66], rot: [0.5, 0, 0.3] }) });
    P.add(new THREE.SphereGeometry(0.09, 8, 6), '#f6dc86', { matrix: wat({ pos: [-0.25, 0.09, 0.7] }) });
  }
  {
    const v = -1.05;
    const n = seaward(v);
    const [x, z] = W(shore(v) - 1.55, v);
    const hull = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) { const t = Math.max(0, hp.getZ(i)); hp.setX(i, hp.getX(i) * (1 - 0.6 * t * t)); }
    const bm = compose(THREE, { pos: [x, BERM + 0.16, z], rot: [-0.08, yawOf(n) + 0.6, 0.18] });
    const bat = (o) => bm.clone().multiply(compose(THREE, o));
    P.add(hull, '#3f74b8', { matrix: bat({ scl: [0.38, 0.24, 0.85] }), shade: 0.04, top: PAL.white, y0: -0.06, y1: -0.02 });
    P.add(new THREE.BoxGeometry(0.56, 0.03, 0.12), '#c49a6c', { matrix: bat({ pos: [0, -0.04, 0.05] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.03, 1.0), '#c49a6c', { matrix: bat({ pos: [0.12, -0.02, -0.05], rot: [0, 0.1, 0.2] }) });
    P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), '#e8e2d4', { matrix: bat({ pos: [0.0, -0.12, 0.9], rot: [1.45, 0, 0] }) });
    for (const sx of [-0.18, 0.18]) P.add(new THREE.BoxGeometry(0.06, 0.06, 0.25), '#8a7764', { matrix: bat({ pos: [sx, -0.22, 0.2] }) });
  }

  // Static gulls (standing): white body, grey back, yellow beak.
  for (const [x, y, z, ry] of gulls) {
    const gm = compose(THREE, { pos: [x, y, z], ry });
    const ga = (o) => gm.clone().multiply(compose(THREE, o));
    P.add(new THREE.SphereGeometry(0.07, 7, 5), PAL.white, { matrix: ga({ pos: [0, 0.1, 0], scl: [0.8, 0.8, 1.4] }) });
    P.add(new THREE.SphereGeometry(0.05, 6, 4), PAL.white, { matrix: ga({ pos: [0, 0.18, 0.08] }) });
    P.add(new THREE.BoxGeometry(0.12, 0.04, 0.16), '#a9b1ba', { matrix: ga({ pos: [0, 0.14, -0.03], rot: [0.15, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.015, 0.06, 4), '#f2c14e', { matrix: ga({ pos: [0, 0.18, 0.15], rot: [Math.PI / 2, 0, 0] }) });
    for (const sx of [-0.02, 0.02]) P.add(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 3), '#e3a05a', { matrix: ga({ pos: [sx, 0.03, 0] }) });
  }

  root.add(P.mesh(lambert(THREE)));

  // ---- Sea surface: polar grid over the plinth, waves rolling shoreward in the vertex shader.
  const RINGS = low ? 6 : 10;
  const nR = rim.length;
  const wv = [];
  const wIdx = [];
  for (let r = 0; r <= RINGS; r++) {
    for (let i = 0; i < nR; i++) {
      if (r === 0 && i > 0) break;
      const k = r / RINGS;
      wv.push(rim[i][0] * k, SEA + 0.04, rim[i][1] * k);
    }
  }
  const vi = (r, i) => (r === 0 ? 0 : 1 + (r - 1) * nR + (i % nR));
  const keepTri = (...ids) => ids.some((id) => { const x = wv[id * 3], z = wv[id * 3 + 2]; const [u, v] = uv(x, z); return u > shore(v) - 0.2; });
  for (let r = 0; r < RINGS; r++) {
    for (let i = 0; i < nR; i += low ? 2 : 1) {
      const step = low ? 2 : 1;
      const a = vi(r, i), b = vi(r, i + step), c = vi(r + 1, i), d2 = vi(r + 1, i + step);
      if (r === 0) { if (keepTri(0, b, c)) wIdx.push(0, b, c); }
      else {
        if (keepTri(a, b, c)) wIdx.push(a, b, c);
        if (keepTri(b, d2, c)) wIdx.push(b, d2, c);
      }
    }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3));
  wg.setIndex(wIdx);
  const waterGeo = wg.toNonIndexed();
  // make sure every triangle faces up
  {
    const p = waterGeo.attributes.position;
    for (let f = 0; f < p.count; f += 3) {
      const ax = p.getX(f), az = p.getZ(f), bx = p.getX(f + 1), bz = p.getZ(f + 1), cx = p.getX(f + 2), cz = p.getZ(f + 2);
      const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      if (ny < 0) { p.setXYZ(f + 1, cx, p.getY(f + 2), cz); p.setXYZ(f + 2, bx, p.getY(f + 1), bz); }
    }
  }
  const wpos = waterGeo.attributes.position;
  const wCol = new Float32Array(wpos.count * 3);
  {
    const c1 = new THREE.Color(PAL.shallow), c2 = new THREE.Color(PAL.sea), c3 = new THREE.Color(PAL.seaDeep), c = new THREE.Color();
    for (let f = 0; f < wpos.count; f += 3) {
      const x = (wpos.getX(f) + wpos.getX(f + 1) + wpos.getX(f + 2)) / 3, z = (wpos.getZ(f) + wpos.getZ(f + 1) + wpos.getZ(f + 2)) / 3;
      const [u, v] = uv(x, z);
      const d = u - shore(v);
      if (d < 0.9) c.copy(c1).lerp(c2, Math.max(0, d) / 0.9);
      else c.copy(c2).lerp(c3, Math.min(1, (d - 0.9) / 2.2));
      c.multiplyScalar(0.96 + rand() * 0.08);
      for (let v2 = 0; v2 < 3; v2++) wCol.set([c.r, c.g, c.b], (f + v2) * 3);
    }
  }
  waterGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
  waterGeo.computeVertexNormals();
  const rimR = Math.min(...rim.map(([x, z]) => Math.hypot(x, z)));
  const waterMat = lambert(THREE);
  const uTime = { value: 0 };
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float edge = clamp((${rimR.toFixed(3)} - length(position.xz)) / 0.5, 0.0, 1.0);
      float u = dot(position.xz, vec2(${S.x.toFixed(3)}, ${S.z.toFixed(3)}));
      transformed.y = ${(SEA + 0.04).toFixed(3)} + edge * (0.022 * sin(u * 3.2 + uTime * 1.7) + 0.012 * cos(position.x * 2.1 - uTime * 0.9 + position.z));`);
  };
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.receiveShadow = true;
  root.add(water);

  // Foam along the waterline: one strip that washes up and back.
  const foamP = new Painter(THREE, 33);
  {
    const pos = [];
    let prev = null;
    for (let v = -4.6; v <= 4.6; v += 0.2) {
      const n = seaward(v);
      const [x, z] = W(shore(v), v);
      const w0 = 0.05, w1 = 0.12 + 0.05 * Math.sin(v * 3.1);
      const L = [x - n.x * w0, SEA + 0.105, z - n.z * w0], R = [x + n.x * w1, SEA + 0.07, z + n.z * w1];
      if (prev) pos.push(...prev[0], ...L, ...prev[1], ...prev[1], ...L, ...R);
      prev = [L, R];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    foamP.add(g, PAL.foam, { jitter: 0.02, jitterY: 0, shade: 0.02 });
  }
  const foamGeo = foamP.geometry();
  // the foam is clipped to the plinth by discarding outside the rim in the shader
  const foamMat = lambert(THREE, { side: THREE.DoubleSide });
  foamMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\nvarying vec2 vXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = 0.06 * sin(uTime * 1.7 + 1.4);
      transformed.xz += vec2(${S.x.toFixed(3)}, ${S.z.toFixed(3)}) * sw;
      vXZ = transformed.xz;`);
    sh.fragmentShader = 'varying vec2 vXZ;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      if (pow(abs(vXZ.x) / 4.62, 2.4) + pow(abs(vXZ.y) / 4.42, 2.4) > 1.0) discard;`);
  };
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.receiveShadow = true;
  root.add(foam);

  // ---- A sailing dinghy moored off the beach, and a line of swim-area buoys (both bob).
  const boatP = new Painter(THREE, 47);
  {
    const hull = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) { const t = Math.max(0, hp.getZ(i)); hp.setX(i, hp.getX(i) * (1 - 0.65 * t * t)); }
    boatP.add(hull, PAL.white, { scl: [0.36, 0.22, 0.9], shade: 0.03, top: '#e2443d', y0: -0.07, y1: -0.03 });
    boatP.add(new THREE.BoxGeometry(0.5, 0.03, 1.2), '#e9dcc4', { pos: [0, -0.02, -0.1], scl: [1, 1, 1] });
    boatP.add(new THREE.CylinderGeometry(0.018, 0.022, 1.6, 5), '#c49a6c', { pos: [0, 0.78, 0.25] });
    boatP.add(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5), '#c49a6c', { pos: [0, 0.15, -0.15], rot: [Math.PI / 2, 0, 0] });
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.15, 0.22, 0, 0.15, -0.52, 0, 1.52, 0.22], 3));
    boatP.add(sail, '#fbf3df', { shade: 0 });
    const jib = new THREE.BufferGeometry();
    jib.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0.32, 0, 0.1, 0.78, 0, 1.25, 0.3], 3));
    boatP.add(jib, '#e2443d', { shade: 0 });
  }
  const boat = boatP.mesh(lambert(THREE, { side: THREE.DoubleSide }));
  const boatHome = W(shore(-1.3) + 2.2, -1.3);
  boat.position.set(boatHome[0], SEA + 0.12, boatHome[1]);
  boat.rotation.y = yawOf(seaward(-1.3)) + 2.4;
  boat.rotation.order = 'YXZ';
  root.add(boat);
  const buoyP = new Painter(THREE, 49);
  buoyP.add(new THREE.SphereGeometry(0.08, 8, 5), '#f6c443', { pos: [0, 0.03, 0] });
  const NBU = low ? 3 : 5;
  const buoys = new THREE.InstancedMesh(buoyP.geometry(), lambert(THREE), NBU);
  const buoyPos = [];
  for (let i = 0; i < NBU; i++) {
    const v = 1.1 + (i * 2.2) / (NBU - 1) + (rand() - 0.5) * 0.15;
    buoyPos.push(W(shore(v) + 1.55 + Math.sin(i * 1.7) * 0.08, v));
  }
  root.add(buoys);

  // ---- Flying gulls.
  const gullGeo = new THREE.BufferGeometry();
  gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.12, -0.42, 0.1, -0.06, 0, 0.02, -0.08,
    0, 0, 0.12, 0, 0.02, -0.08, 0.42, 0.1, -0.06,
    0, 0, 0.16, 0, -0.04, -0.14, 0, 0.03, -0.14,
  ], 3));
  gullGeo.computeVertexNormals();
  const NG = low ? 2 : 3;
  const flyers = new THREE.InstancedMesh(gullGeo, new THREE.MeshLambertMaterial({ color: '#fbfaf6', side: THREE.DoubleSide, flatShading: true }), NG);
  root.add(flyers);
  const flyCfg = [
    { c: [1.6, 3.3, 1.2], r: 1.4, s: 0.55, p: 0 },
    { c: [0.4, 3.9, 0.4], r: 2.1, s: -0.42, p: 2.0 },
    { c: [2.4, 2.9, -0.4], r: 1.0, s: 0.7, p: 4.1 },
  ];

  // ---- Light: golden hour. A low warm sun raking along the beach from the west, long shadows
  // across the shingle; a cool lilac sky fill keeps the shade sides readable.
  root.add(new THREE.HemisphereLight('#ffe6cc', '#6f6a90', 1.25));
  const key = keyLight(THREE, ctx, { color: '#ffb36b', intensity: 3.6, pos: [8.4, 3.4, 3.2], extent: 7.2 });
  root.add(key, key.target);
  root.add(skyDome(THREE, { top: '#4f6fb8', mid: '#ffc27c', bottom: '#f2a27a', sun: [0.9, 0.12, 0.35], sunColor: '#fff2b8', sunPow: 24, horizon: 0.7 }));

  const dm = new THREE.Object3D();
  function update(t) {
    uTime.value = t;
    boat.position.y = SEA + 0.12 + Math.sin(t * 1.2) * 0.025;
    boat.rotation.z = Math.sin(t * 0.9) * 0.07;
    boat.rotation.x = Math.sin(t * 1.1 + 1) * 0.03;
    for (let i = 0; i < NBU; i++) {
      dm.position.set(buoyPos[i][0], SEA + 0.02 + Math.sin(t * 1.6 + i * 1.3) * 0.02, buoyPos[i][1]);
      dm.rotation.set(0, 0, 0);
      dm.scale.setScalar(1);
      dm.updateMatrix();
      buoys.setMatrixAt(i, dm.matrix);
    }
    buoys.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NG; i++) {
      const g = flyCfg[i];
      const a = g.p + t * g.s;
      dm.position.set(g.c[0] + Math.cos(a) * g.r, g.c[1] + Math.sin(t * 0.6 + i) * 0.2, g.c[2] + Math.sin(a) * g.r);
      dm.rotation.set(0, -a + (g.s > 0 ? 0 : Math.PI), Math.sign(g.s) * 0.35);
      dm.scale.set(0.8, 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7), 0.8);
      dm.updateMatrix();
      flyers.setMatrixAt(i, dm.matrix);
    }
    flyers.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#ffcf9e'),
    fog: new THREE.Fog('#ffc89a', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
