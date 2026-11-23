// Glasshouse: an allotment at golden hour after a shower. A Victorian glasshouse with a vent propped open,
// raised beds of cabbages and runner beans, a shed and water butt, a scarecrow, a barrow, puddles, a robin on a fork.
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, gable, roof, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  board: '#3f3a36',
  clay: '#7a6150',
  soilSide: '#4f3d31',
  grass: '#8ea552',
  grass2: '#76913f',
  path: '#8a6646',
  soil: '#45342a',
  plank: '#866b52',
  plankDark: '#6a543f',
  brick: '#97503d',
  frame: '#eeeee6',
  glass: '#d4ebe6',
  shed: '#3f7f86',
  felt: '#3b3d43',
  butt: '#3d6a45',
  cabbage: '#86b07a',
  cabbage2: '#5e9064',
  leaf: '#4f8040',
  cane: '#b59a6a',
  puddle: '#f2c48a',
  coat: '#3e4d6b',
  sack: '#d5c296',
  robin: '#7a5a43',
  breast: '#e0662e',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(2468);
  const root = new THREE.Group();
  const P = new Painter(THREE, 37);
  const G = 0.3;

  // ---- Plinth: a squared-off allotment plot, wet clay and soil strata on a dark board, cool green turf on top.
  const rim = outline(rand, { n: 28, rx: 4.6, rz: 4.4, wob: 0.02, sq: 3.6 });
  P.add(slab(THREE, offsetOutline(rim, 0.26), -1.4, -1.1, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.1, -0.55), PAL.clay, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.55, -0.05), PAL.soilSide, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.03), -0.05, G, 0.04), PAL.grass, { jitter: 0.03, jitterY: 0.012, shade: 0.06 });
  // low-contrast patches in the turf: lusher where it stays wet, worn near the paths
  for (let i = 0; i < 14; i++) {
    const x = (rand() * 2 - 1) * 3.8, z = (rand() * 2 - 1) * 3.6;
    P.add(new THREE.CylinderGeometry(0.4 + rand() * 0.5, 0.5 + rand() * 0.5, 0.008, 8), rand() > 0.5 ? '#9db25c' : '#7e9846', { pos: [x, G + 0.002, z], scl: [1.3, 1, 0.9], ry: rand() * 3, jitter: 0.08, jitterY: 0 });
  }
  // tussocks in the turf, clustered along the edges and by the fence
  for (let i = 0; i < 26; i++) {
    const a = rand() * 6.28, d = 3.0 + rand() * 1.2;
    const x = Math.cos(a) * d * 1.02, z = Math.sin(a) * d * 0.98;
    if (Math.pow(Math.abs(x) / 4.4, 3.6) + Math.pow(Math.abs(z) / 4.2, 3.6) > 1) continue;
    const r = 0.06 + rand() * 0.08;
    P.add(new THREE.IcosahedronGeometry(r, 0), rand() > 0.5 ? PAL.grass2 : '#a0ae58', { pos: [x, G + r * 0.3, z], scl: [1.3, 0.7, 1.1], ry: rand() * 3 });
  }

  // ---- Paths: a trodden mud path from the front gap to the glasshouse door, a spur to the shed.
  const ribbon = (pts, w, col, y = G + 0.012) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
    const N = 30, pos = [];
    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const p = c.getPointAt(i / N), d = c.getTangentAt(i / N);
      const ww = w * (1 + 0.15 * Math.sin(i * 2.3));
      L.push([p.x - d.z * ww, p.y, p.z + d.x * ww]);
      R.push([p.x + d.z * ww, p.y, p.z - d.x * ww]);
    }
    for (let i = 0; i < N; i++) pos.push(...L[i], ...L[i + 1], ...R[i], ...R[i], ...L[i + 1], ...R[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    P.add(g, col, { jitter: 0.03, jitterY: 0, shade: 0.08 });
    return c;
  };
  const mainPath = ribbon([[0.55, 4.35], [0.75, 3.0], [0.55, 1.6], [0.8, 0.3], [0.85, -0.9], [0.55, -1.55]], 0.36, PAL.path);
  ribbon([[0.85, -0.6], [1.6, -1.1], [2.45, -1.55]], 0.26, '#73604c', G + 0.01);
  // boards laid across the wettest stretch
  for (let i = 0; i < 4; i++) {
    const p = mainPath.getPointAt(0.22 + i * 0.045), d = mainPath.getTangentAt(0.22 + i * 0.045);
    P.add(new THREE.BoxGeometry(0.62, 0.035, 0.17), i % 2 ? PAL.plank : PAL.plankDark, { pos: [p.x, G + 0.035, p.z], ry: Math.atan2(d.x, d.z) + Math.PI / 2 + (rand() - 0.5) * 0.15, jitter: 0.01 });
  }

  // ---- Puddles (ripple rings are drawn by the puddle shader; each puddle carries its own local coords).
  const PUD = [[0.68, 2.25, 0.42, 0.26, 0.2], [0.82, 0.7, 0.3, 0.2, 1.1], [1.85, -1.05, 0.34, 0.22, 2.3], [-0.55, 0.05, 0.28, 0.2, 0.4], [-0.15, 3.55, 0.22, 0.16, 3.0]];
  const pudGeo = (() => {
    const pos = [], loc = [];
    for (const [cx, cz, rx, rz, ph] of PUD) {
      const n = 11;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const w = 1 + (rand() - 0.5) * 0.3;
        pts.push([Math.cos(a) * rx * w, Math.sin(a) * rz * w]);
      }
      for (let i = 0; i < n; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
        pos.push(cx, G + 0.026, cz, cx + bx, G + 0.026, cz + bz, cx + ax, G + 0.026, cz + az);
        loc.push(0, 0, ph, bx, bz, ph, ax, az, ph);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('pud', new THREE.Float32BufferAttribute(loc, 3));
    g.computeVertexNormals();
    return g;
  })();
  // muddy rims around the puddles
  for (const [cx, cz, rx, rz] of PUD) P.add(new THREE.CylinderGeometry(1, 1, 0.02, 11), '#5c4636', { pos: [cx, G + 0.012, cz], scl: [rx + 0.07, 1, rz + 0.07], jitter: 0.03, jitterY: 0 });

  // ---- The glasshouse: brick base, white frame, pitched glass roof with cresting, one vent propped open.
  const GH = compose(THREE, { pos: [-1.3, G, -1.6], ry: 0.06 });
  const gat = (o) => GH.clone().multiply(compose(THREE, o));
  const GL = 3.0, GW = 1.8, WALL = 0.38, EAVE = 1.3, RIDGE = 2.0;
  const glassParts = [];
  const pane = (w, h, o) => { const g = new THREE.PlaneGeometry(w, h); g.applyMatrix4(gat(o)); glassParts.push(g); };
  {
    // brick base wall with a stone cap
    for (const [x, z, w, d] of [[0, -GW / 2, GL, 0.12], [0, GW / 2, GL, 0.12], [-GL / 2, 0, 0.12, GW], [GL / 2, -0.5, 0.12, GW - 1.0]]) {
      P.add(new THREE.BoxGeometry(w, WALL, d), PAL.brick, { matrix: gat({ pos: [x, WALL / 2, z] }), jitter: 0.008, shade: 0.08 });
      P.add(new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04), '#d8d4c8', { matrix: gat({ pos: [x, WALL + 0.02, z] }) });
    }
    // brick courses
    for (let k = 1; k < 4; k++) for (const z of [-GW / 2 - 0.061, GW / 2 + 0.061]) P.add(new THREE.BoxGeometry(GL, 0.012, 0.004), '#7f4031', { matrix: gat({ pos: [0, k * 0.095, z] }) });
    // posts along both long sides, rafters on both roof slopes
    const half = GW / 2, slope = Math.atan2(RIDGE - EAVE, half), rl = Math.hypot(half, RIDGE - EAVE);
    const NB = 10;
    for (let i = 0; i <= NB; i++) {
      const x = -GL / 2 + (i * GL) / NB;
      for (const s of [-1, 1]) {
        P.add(new THREE.BoxGeometry(0.045, EAVE - WALL, 0.045), PAL.frame, { matrix: gat({ pos: [x, (WALL + EAVE) / 2, s * half] }) });
        P.add(new THREE.BoxGeometry(0.04, 0.04, rl), PAL.frame, { matrix: gat({ pos: [x, (EAVE + RIDGE) / 2, s * half / 2], rot: [s * slope, 0, 0] }) });
      }
      // a glazing bar halfway between posts on the walls
    }
    for (const s of [-1, 1]) {
      P.add(new THREE.BoxGeometry(GL + 0.12, 0.06, 0.07), PAL.frame, { matrix: gat({ pos: [0, EAVE, s * half] }) });
      P.add(new THREE.BoxGeometry(GL, 0.03, 0.03), PAL.frame, { matrix: gat({ pos: [0, (WALL + EAVE) / 2 + 0.12, s * (half + 0.01)] }) });
      // gutters
      P.add(new THREE.BoxGeometry(GL + 0.14, 0.05, 0.07), '#c9ccc8', { matrix: gat({ pos: [0, EAVE - 0.02, s * (half + 0.07)] }) });
    }
    P.add(new THREE.BoxGeometry(GL + 0.16, 0.07, 0.07), PAL.frame, { matrix: gat({ pos: [0, RIDGE, 0] }) });
    // cresting and finials
    for (let i = 0; i < 16; i++) P.add(new THREE.ConeGeometry(0.035, 0.12, 4), PAL.frame, { matrix: gat({ pos: [-GL / 2 + 0.1 + (i * (GL - 0.2)) / 15, RIDGE + 0.09, 0] }) });
    for (const s of [-1, 1]) {
      P.add(new THREE.CylinderGeometry(0.02, 0.025, 0.25, 5), PAL.frame, { matrix: gat({ pos: [s * (GL / 2 + 0.03), RIDGE + 0.13, 0] }) });
      P.add(new THREE.SphereGeometry(0.05, 6, 4), PAL.frame, { matrix: gat({ pos: [s * (GL / 2 + 0.03), RIDGE + 0.28, 0] }) });
    }
    // gable ends: posts and the triangle frame; the east end has the door
    for (const s of [-1, 1]) {
      const x = s * GL / 2;
      for (const z of [-0.45, 0, 0.45]) {
        const top = EAVE + (RIDGE - EAVE) * (1 - Math.abs(z) / half);
        if (s > 0 && z === 0) continue;
        P.add(new THREE.BoxGeometry(0.045, top - WALL, 0.045), PAL.frame, { matrix: gat({ pos: [x, (WALL + top) / 2, z] }) });
      }
      for (const zs of [-1, 1]) P.add(new THREE.BoxGeometry(0.05, 0.05, rl + 0.08), PAL.frame, { matrix: gat({ pos: [x, (EAVE + RIDGE) / 2, zs * half / 2], rot: [zs * slope, 0, 0] }) });
      // glass on the gable triangle and walls
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([0, EAVE, -half, 0, EAVE, half, 0, RIDGE, 0], 3));
      tri.applyMatrix4(gat({ pos: [x, 0, 0] }));
      glassParts.push(tri);
      if (s < 0) pane(GW, EAVE - WALL, { pos: [x, (WALL + EAVE) / 2, 0], ry: Math.PI / 2 });
      else {
        pane(0.5, EAVE - WALL, { pos: [x, (WALL + EAVE) / 2, -0.6], ry: Math.PI / 2 });
        pane(0.5, EAVE, { pos: [x, EAVE / 2, 0.65], ry: Math.PI / 2 });
        // door frame and an ajar door
        P.add(new THREE.BoxGeometry(0.06, EAVE + 0.15, 0.06), PAL.frame, { matrix: gat({ pos: [x, (EAVE + 0.15) / 2, -0.33] }) });
        P.add(new THREE.BoxGeometry(0.06, EAVE + 0.15, 0.06), PAL.frame, { matrix: gat({ pos: [x, (EAVE + 0.15) / 2, 0.37] }) });
        P.add(new THREE.BoxGeometry(0.06, 0.06, 0.76), PAL.frame, { matrix: gat({ pos: [x, EAVE + 0.15, 0.02] }) });
        const dm = (o) => gat({ pos: [x, 0, 0.35], ry: -0.7 }).multiply(compose(THREE, o));
        for (const zz of [-0.02, -0.64]) P.add(new THREE.BoxGeometry(0.04, EAVE, 0.04), PAL.frame, { matrix: dm({ pos: [0, EAVE / 2, zz] }) });
        for (const yy of [0.03, 0.42, EAVE - 0.03]) P.add(new THREE.BoxGeometry(0.04, 0.04, 0.64), PAL.frame, { matrix: dm({ pos: [0, yy, -0.33] }) });
        P.add(new THREE.BoxGeometry(0.03, 0.38, 0.6), '#cfd6d2', { matrix: dm({ pos: [0, 0.22, -0.33] }) });
        { const g = new THREE.PlaneGeometry(0.6, EAVE - 0.47); g.applyMatrix4(dm({ pos: [0, 0.44 + (EAVE - 0.47) / 2, -0.33], ry: Math.PI / 2 })); glassParts.push(g); }
      }
    }
    // long walls and roof glass; the vent panel on the front slope is propped open
    for (const s of [-1, 1]) {
      pane(GL, EAVE - WALL, { pos: [0, (WALL + EAVE) / 2, s * half] });
      if (s > 0) {
        pane(0.9, rl, { pos: [-1.05, (EAVE + RIDGE) / 2, half / 2], rot: [-(Math.PI / 2 - slope), 0, 0] });
        pane(1.5, rl, { pos: [0.75, (EAVE + RIDGE) / 2, half / 2], rot: [-(Math.PI / 2 - slope), 0, 0] });
        // vent: hinged at the ridge, opened by 0.35 rad
        const vm = (o) => gat({ pos: [-0.3, RIDGE - 0.02, 0.01], rot: [slope - 0.35, 0, 0] }).multiply(compose(THREE, o));
        for (const xx of [-0.29, 0.29]) P.add(new THREE.BoxGeometry(0.04, 0.035, rl * 0.55), PAL.frame, { matrix: vm({ pos: [xx, 0.01, rl * 0.275] }) });
        P.add(new THREE.BoxGeometry(0.62, 0.035, 0.04), PAL.frame, { matrix: vm({ pos: [0, 0.01, rl * 0.55] }) });
        { const g = new THREE.PlaneGeometry(0.58, rl * 0.55); g.applyMatrix4(vm({ pos: [0, 0.012, rl * 0.275], rot: [-Math.PI / 2, 0, 0] })); glassParts.push(g); }
        pane(0.6, rl * 0.45, { pos: [-0.3, EAVE + (RIDGE - EAVE) * 0.225, half * 0.775], rot: [-(Math.PI / 2 - slope), 0, 0] });
        P.add(new THREE.BoxGeometry(0.02, 0.22, 0.02), '#555', { matrix: gat({ pos: [-0.3, RIDGE - 0.32, half * 0.6], rot: [0.5, 0, 0] }) });
      } else pane(GL, rl, { pos: [0, (EAVE + RIDGE) / 2, -half / 2], rot: [Math.PI / 2 - slope, 0, 0] });
    }
    // inside: staging along the back with pots, tomato plants along the front glass
    P.add(new THREE.BoxGeometry(GL - 0.3, 0.05, 0.45), PAL.plank, { matrix: gat({ pos: [-0.05, 0.62, -half + 0.32] }) });
    for (const x of [-1.2, 0, 1.15]) P.add(new THREE.BoxGeometry(0.05, 0.6, 0.4), PAL.plankDark, { matrix: gat({ pos: [x, 0.3, -half + 0.32] }) });
    for (let i = 0; i < 9; i++) {
      const x = -1.25 + i * 0.29 + (rand() - 0.5) * 0.06, z = -half + 0.25 + (rand() - 0.5) * 0.12;
      P.add(new THREE.CylinderGeometry(0.06, 0.045, 0.09, 6), '#b5603c', { matrix: gat({ pos: [x, 0.69, z] }) });
      if (i % 3 !== 1) P.add(new THREE.IcosahedronGeometry(0.07 + rand() * 0.04, 0), i % 2 ? '#5f9447' : '#7aa356', { matrix: gat({ pos: [x, 0.79, z] }), jitter: 0.01 });
    }
    for (let i = 0; i < 6; i++) {
      const x = -1.2 + i * 0.42 + (rand() - 0.5) * 0.08, z = half - 0.35;
      P.add(new THREE.BoxGeometry(0.02, 1.15, 0.02), PAL.cane, { matrix: gat({ pos: [x, 0.58, z] }) });
      for (let k = 0; k < 3; k++) P.add(new THREE.IcosahedronGeometry(0.11 - k * 0.015, 0), PAL.leaf, { matrix: gat({ pos: [x + (rand() - 0.5) * 0.08, 0.35 + k * 0.3, z + (rand() - 0.5) * 0.08] }), scl: [1, 1.3, 1], jitter: 0.015 });
      for (let k = 0; k < 3; k++) P.add(new THREE.IcosahedronGeometry(0.035, 0), rand() > 0.3 ? '#d8402f' : '#e8a13a', { matrix: gat({ pos: [x + (rand() - 0.5) * 0.14, 0.35 + rand() * 0.6, z + 0.08] }) });
    }
    // soil floor inside
    P.add(new THREE.BoxGeometry(GL - 0.15, 0.02, GW - 0.15), '#5b4535', { matrix: gat({ pos: [0, 0.01, 0] }) });
    // a watering can by the door
    const wc = (o) => gat({ pos: [GL / 2 + 0.35, 0, -0.45], ry: 0.6 }).multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 8), '#4f7f6d', { matrix: wc({ pos: [0, 0.1, 0] }) });
    P.add(new THREE.CylinderGeometry(0.012, 0.02, 0.25, 5), '#4f7f6d', { matrix: wc({ pos: [0.15, 0.17, 0], rot: [0, 0, -0.9] }) });
    P.add(new THREE.TorusGeometry(0.07, 0.012, 4, 8, Math.PI), '#4f7f6d', { matrix: wc({ pos: [-0.02, 0.2, 0] }) });
  }

  // ---- Shed with a felt roof, gutter, downpipe into the water butt; a sign on the door.
  let signMesh;
  {
    const SM = compose(THREE, { pos: [2.55, G, -2.55], ry: -0.12 });
    const sat = (o) => SM.clone().multiply(compose(THREE, o));
    const W = 1.35, D = 1.05, Hh = 1.1;
    P.add(new THREE.BoxGeometry(W + 0.06, 0.08, D + 0.06), '#6b6560', { matrix: sat({ pos: [0, 0.04, 0] }) });
    P.add(new THREE.BoxGeometry(W, Hh, D), PAL.shed, { matrix: sat({ pos: [0, 0.08 + Hh / 2, 0] }), jitter: 0.008, shade: 0.04 });
    for (let k = 0; k < 8; k++) P.add(new THREE.BoxGeometry(W + 0.012, 0.012, D + 0.012), '#336a70', { matrix: sat({ pos: [0, 0.2 + k * 0.13, 0] }) });
    P.add(gable(THREE, W, 0.35, D), PAL.shed, { matrix: sat({ pos: [0, 0.08 + Hh, 0], ry: 0 }) });
    P.add(roof(THREE, W + 0.2, 0.35 * (W + 0.2) / W, D + 0.2, 0.05), PAL.felt, { matrix: sat({ pos: [0, 0.08 + Hh - 0.05, 0] }), jitter: 0.008, shade: 0.06 });
    // door on the front (+z), window on the west side
    P.add(new THREE.BoxGeometry(0.42, 0.85, 0.03), '#c9563a', { matrix: sat({ pos: [0.25, 0.52, D / 2 + 0.01] }) });
    for (const y of [0.25, 0.8]) P.add(new THREE.BoxGeometry(0.42, 0.06, 0.035), '#a8452f', { matrix: sat({ pos: [0.25, y, D / 2 + 0.02] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.04, 0.04), '#2e2b2b', { matrix: sat({ pos: [0.1, 0.55, D / 2 + 0.04] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.3, 0.45), '#a7b8b6', { matrix: sat({ pos: [-W / 2 - 0.005, 0.8, 0.05] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.34, 0.04), '#e8e6dc', { matrix: sat({ pos: [-W / 2 - 0.01, 0.8, 0.05] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.04, 0.49), '#e8e6dc', { matrix: sat({ pos: [-W / 2 - 0.01, 0.8, 0.05] }) });
    // gutter, downpipe, water butt on bricks at the front-left corner
    P.add(new THREE.BoxGeometry(0.07, 0.05, D + 0.2), '#2f3135', { matrix: sat({ pos: [-W / 2 - 0.12, 0.08 + Hh - 0.07, 0] }) });
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 5), '#2f3135', { matrix: sat({ pos: [-W / 2 - 0.12, 0.08 + Hh - 0.35, D / 2 + 0.05] }) });
    const bx = -W / 2 - 0.2, bz = D / 2 + 0.25;
    for (const dx of [-0.1, 0.1]) P.add(new THREE.BoxGeometry(0.1, 0.12, 0.22), '#8d4a3a', { matrix: sat({ pos: [bx + dx, 0.06, bz] }) });
    P.add(new THREE.CylinderGeometry(0.23, 0.21, 0.62, 10), PAL.butt, { matrix: sat({ pos: [bx, 0.43, bz] }), shade: 0.05 });
    for (const y of [0.25, 0.6]) P.add(new THREE.CylinderGeometry(0.235, 0.235, 0.03, 10), '#33573a', { matrix: sat({ pos: [bx, y, bz] }) });
    P.add(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10), '#2f4f35', { matrix: sat({ pos: [bx, 0.76, bz] }) });
    P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 5), '#b8b8b0', { matrix: sat({ pos: [bx + 0.22, 0.24, bz], rot: [0, 0, Math.PI / 2] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.12, 0.03), '#2f3135', { matrix: sat({ pos: [bx + 0.06, 0.82, bz - 0.04], rot: [0, 0, 0.6] }) });
    // a tea mug on the windowsill
    P.add(new THREE.BoxGeometry(0.06, 0.03, 0.5), '#e8e6dc', { matrix: sat({ pos: [-W / 2 - 0.04, 0.62, 0.05] }) });
    P.add(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 7), '#e9c54c', { matrix: sat({ pos: [-W / 2 - 0.05, 0.67, 0.18] }) });
    // stacked pots and canes leaning on the east side
    for (let i = 0; i < 4; i++) P.add(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 7), '#b5603c', { matrix: sat({ pos: [W / 2 + 0.2, 0.05 + i * 0.05, 0.25] }) });
    for (let i = 0; i < 5; i++) P.add(new THREE.CylinderGeometry(0.01, 0.01, 1.3, 3), PAL.cane, { matrix: sat({ pos: [W / 2 + 0.12, 0.62, -0.2 + i * 0.05], rot: [0, 0, 0.18 + (rand() - 0.5) * 0.06] }) });
    // plot sign on the door
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#f0ece0'; g.fillRect(0, 0, 128, 64);
    g.strokeStyle = '#3d5a4f'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 56);
    g.fillStyle = '#3d5a4f'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('No. 7', 64, 34);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshLambertMaterial({ map: tex }));
    signMesh.applyMatrix4(sat({ pos: [0.25, 0.95, D / 2 + 0.04] }));
    root.add(signMesh);
  }

  // ---- Raised beds: plank boxes of dark soil.
  const bed = (cx, cz, w, d, ry) => {
    const m = compose(THREE, { pos: [cx, G, cz], ry });
    const at = (o) => m.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(w - 0.08, 0.2, d - 0.08), PAL.soil, { matrix: at({ pos: [0, 0.1, 0] }), jitter: 0.015, jitterY: 0.01, shade: 0.08 });
    for (const s of [-1, 1]) {
      P.add(new THREE.BoxGeometry(w, 0.24, 0.06), s > 0 ? PAL.plank : PAL.plankDark, { matrix: at({ pos: [0, 0.12, s * (d / 2 - 0.03)] }), jitter: 0.006 });
      P.add(new THREE.BoxGeometry(0.06, 0.24, d - 0.12), PAL.plankDark, { matrix: at({ pos: [s * (w / 2 - 0.03), 0.12, 0] }), jitter: 0.006 });
      for (const t of [-1, 1]) P.add(new THREE.BoxGeometry(0.07, 0.3, 0.07), '#5a4634', { matrix: at({ pos: [s * (w / 2 - 0.04), 0.13, t * (d / 2 - 0.04)] }) });
    }
    return at;
  };
  // Bed A: cabbages (instanced below), the scarecrow at its west end.
  const bedA = bed(-1.75, 1.05, 2.3, 1.15, 0.07);
  // Bed B: runner beans on two cane wigwams.
  const bedB = bed(2.45, 0.55, 1.25, 1.75, -0.12);
  // Bed C: freshly dug, a fork left standing in it with the robin on its handle.
  const bedC = bed(-1.45, 3.05, 1.7, 0.95, 0.16);
  // Bed D: rhubarb and a forcing pot at the front right.
  const bedD = bed(2.75, 2.95, 1.2, 0.95, -0.05);

  // dug ridges in bed C
  for (let i = 0; i < 4; i++) P.add(new THREE.CylinderGeometry(0.06, 0.08, 1.45, 5), '#3d2e25', { matrix: bedC({ pos: [0, 0.2, -0.3 + i * 0.2], rot: [0, 0, Math.PI / 2] }), jitter: 0.02 });
  // the fork
  const forkTop = new THREE.Vector3(0.45, 0.95, 0.05).applyMatrix4(bedC({}));
  {
    const fm = (o) => bedC({ pos: [0.45, 0.2, 0.05], rot: [0.08, 0.3, -0.1] }).multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.018, 0.02, 0.62, 5), '#b08a5a', { matrix: fm({ pos: [0, 0.38, 0] }) });
    P.add(new THREE.BoxGeometry(0.14, 0.03, 0.03), '#b08a5a', { matrix: fm({ pos: [0, 0.71, 0] }) });
    for (const sx of [-0.07, 0.07]) P.add(new THREE.BoxGeometry(0.02, 0.08, 0.02), '#b08a5a', { matrix: fm({ pos: [sx, 0.67, 0], rot: [0, 0, sx * -4] }) });
    P.add(new THREE.BoxGeometry(0.17, 0.04, 0.025), '#7c8288', { matrix: fm({ pos: [0, 0.06, 0] }) });
    for (let i = 0; i < 4; i++) P.add(new THREE.BoxGeometry(0.015, 0.16, 0.015), '#7c8288', { matrix: fm({ pos: [-0.06 + i * 0.04, -0.03, 0] }) });
    forkTop.copy(new THREE.Vector3(0, 0.74, 0).applyMatrix4(fm({})));
  }
  // rhubarb: big leaves on red stalks, and a terracotta forcing pot
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + rand() * 0.3;
    const x = -0.2 + Math.cos(a) * 0.18, z = Math.sin(a) * 0.15;
    P.add(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 4), '#b8334a', { matrix: bedD({ pos: [x, 0.35, z], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }) });
    P.add(new THREE.IcosahedronGeometry(0.2, 0), '#4f7e3b', { matrix: bedD({ pos: [x + Math.cos(a) * 0.15, 0.52, z + Math.sin(a) * 0.12] }), scl: [1.2, 0.3, 1.0], jitter: 0.03 });
  }
  P.add(new THREE.CylinderGeometry(0.14, 0.2, 0.42, 9), '#b5603c', { matrix: bedD({ pos: [0.32, 0.4, 0.1] }), shade: 0.06 });
  P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 9), '#9f5232', { matrix: bedD({ pos: [0.32, 0.63, 0.1] }) });

  // bean wigwams: canes tied at the top, leaves climbing, red flowers
  for (const [lx, lz, hh] of [[0, -0.4, 1.55], [0.05, 0.42, 1.35]]) {
    const top = new THREE.Vector3(lx, 0.2 + hh, lz);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      const base = new THREE.Vector3(lx + Math.cos(a) * 0.3, 0.2, lz + Math.sin(a) * 0.3);
      const mid = base.clone().lerp(top, 0.5);
      const dir = top.clone().sub(base);
      const len = dir.length() + 0.15;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      P.add(new THREE.CylinderGeometry(0.012, 0.015, len, 4), PAL.cane, { matrix: bedB({}).multiply(new THREE.Matrix4().compose(mid.clone().addScaledVector(dir, 0.07), q, new THREE.Vector3(1, 1, 1))) });
      for (let k = 0; k < 4; k++) {
        const f = 0.15 + k * 0.2 + rand() * 0.08;
        if (f > 0.85 || rand() < 0.15) continue;
        const p = base.clone().lerp(top, f);
        P.add(new THREE.IcosahedronGeometry(0.09 + rand() * 0.04, 0), rand() > 0.5 ? PAL.leaf : '#5e9446', { matrix: bedB({ pos: [p.x, p.y, p.z] }), jitter: 0.015 });
        if (rand() > 0.6) P.add(new THREE.IcosahedronGeometry(0.025, 0), '#e0452f', { matrix: bedB({ pos: [p.x + 0.06, p.y + 0.03, p.z + 0.04] }) });
      }
    }
    P.add(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6), '#d9c79a', { matrix: bedB({ pos: [top.x, top.y - 0.04, top.z] }) });
  }

  // ---- Scarecrow at the west end of the cabbage bed (sleeves and scarf move a little in update).
  const scarf = new THREE.Group();
  {
    const sm = (o) => bedA({ pos: [-0.85, 0.2, -0.05], ry: 0.5 }).multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 5), '#7a6048', { matrix: sm({ pos: [0, 0.72, 0] }) });
    P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), '#7a6048', { matrix: sm({ pos: [0, 1.08, 0], rot: [0, 0, Math.PI / 2 + 0.06] }) });
    P.add(new THREE.CylinderGeometry(0.14, 0.2, 0.55, 6), PAL.coat, { matrix: sm({ pos: [0, 0.88, 0] }), jitter: 0.015 });
    for (const s of [-1, 1]) {
      P.add(new THREE.CylinderGeometry(0.06, 0.08, 0.36, 5), PAL.coat, { matrix: sm({ pos: [s * 0.27, 1.07 + s * 0.01, 0], rot: [0, 0, s * -Math.PI / 2 + 0.15 * s] }), jitter: 0.01 });
      P.add(new THREE.ConeGeometry(0.06, 0.12, 5), '#e2c66b', { matrix: sm({ pos: [s * 0.49, 1.06, 0], rot: [0, 0, s * -Math.PI / 2] }), jitter: 0.01 });
    }
    for (let i = 0; i < 3; i++) P.add(new THREE.CylinderGeometry(0.013, 0.013, 0.01, 6), '#d8b04a', { matrix: sm({ pos: [0, 0.75 + i * 0.12, 0.17 - i * 0.012], rot: [Math.PI / 2 - 0.2, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.12, 0.14, 6), '#e2c66b', { matrix: sm({ pos: [0, 0.58, 0], rot: [Math.PI, 0, 0] }), jitter: 0.02 });
    P.add(new THREE.IcosahedronGeometry(0.13, 1), PAL.sack, { matrix: sm({ pos: [0, 1.32, 0] }), jitter: 0.01 });
    for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.02, 5, 3), '#2b2b2b', { matrix: sm({ pos: [s * 0.045, 1.35, 0.115] }) });
    P.add(new THREE.BoxGeometry(0.08, 0.012, 0.01), '#7a4a3a', { matrix: sm({ pos: [0, 1.27, 0.125], rot: [0, 0, 0.15] }) });
    P.add(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 10), '#5b4a3a', { matrix: sm({ pos: [0.01, 1.42, 0], rot: [0.12, 0, -0.1] }) });
    P.add(new THREE.CylinderGeometry(0.09, 0.12, 0.17, 8), '#5b4a3a', { matrix: sm({ pos: [0.02, 1.5, 0.01], rot: [0.12, 0, -0.1] }) });
    // red scarf: the knot is static, the loose end swings
    P.add(new THREE.TorusGeometry(0.1, 0.035, 4, 8), '#c8402e', { matrix: sm({ pos: [0, 1.19, 0], rot: [Math.PI / 2, 0, 0] }) });
    const sp = new Painter(THREE, 39);
    sp.add(new THREE.BoxGeometry(0.06, 0.24, 0.02), '#c8402e', { pos: [0, -0.12, 0] });
    sp.add(new THREE.BoxGeometry(0.062, 0.03, 0.022), '#f0e6d2', { pos: [0, -0.2, 0] });
    scarf.add(sp.mesh(lambert(THREE)));
    scarf.applyMatrix4(sm({ pos: [0.06, 1.17, 0.09] }));
    root.add(scarf);
  }

  // ---- Wheelbarrow on the path, half full of weeds; a bucket.
  {
    const p = mainPath.getPointAt(0.12);
    const bm = (o) => compose(THREE, { pos: [p.x - 0.62, G, p.z - 0.15], ry: 2.6 }).multiply(compose(THREE, o));
    const tray = new THREE.CylinderGeometry(0.34, 0.24, 0.24, 4, 1, true);
    P.add(tray, '#3f7a5c', { matrix: bm({ pos: [0, 0.38, 0], ry: Math.PI / 4, scl: [1.0, 1, 1.4] }), shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.32, 0.02, 0.45), '#33634a', { matrix: bm({ pos: [0, 0.27, 0] }) });
    P.add(new THREE.IcosahedronGeometry(0.2, 0), '#557f3d', { matrix: bm({ pos: [0, 0.45, 0.02] }), scl: [1.2, 0.5, 1.6], jitter: 0.03 });
    for (const sx of [-0.16, 0.16]) {
      P.add(new THREE.BoxGeometry(0.035, 0.035, 0.9), '#8a6a4a', { matrix: bm({ pos: [sx, 0.3, -0.1], rot: [-0.18, 0, 0] }) });
      P.add(new THREE.BoxGeometry(0.03, 0.26, 0.03), '#2e2b2b', { matrix: bm({ pos: [sx, 0.13, -0.18] }) });
    }
    P.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), '#2e2b2b', { matrix: bm({ pos: [0, 0.13, 0.42], rot: [0, 0, Math.PI / 2] }) });
    P.add(new THREE.CylinderGeometry(0.11, 0.09, 0.18, 8), '#b7bcc0', { matrix: bm({ pos: [0.5, 0.09, -0.3] }) });
  }

  // ---- A cold frame in the front-left corner (lid propped on a brick) and a seedling tray.
  {
    const cm = (o) => compose(THREE, { pos: [-3.35, G, 2.2], ry: 0.35 }).multiply(compose(THREE, o));
    for (const [x, z, w, d, h] of [[0, -0.33, 0.95, 0.06, 0.34], [0, 0.33, 0.95, 0.06, 0.2], [-0.45, 0, 0.06, 0.66, 0.27], [0.45, 0, 0.06, 0.66, 0.27]]) {
      P.add(new THREE.BoxGeometry(w, h, d), PAL.plank, { matrix: cm({ pos: [x, h / 2, z] }), jitter: 0.005 });
    }
    P.add(new THREE.BoxGeometry(0.86, 0.04, 0.58), PAL.soil, { matrix: cm({ pos: [0, 0.12, 0] }) });
    for (let i = 0; i < 10; i++) P.add(new THREE.IcosahedronGeometry(0.035, 0), '#86b35c', { matrix: cm({ pos: [-0.35 + (i % 5) * 0.17, 0.16, -0.15 + Math.floor(i / 5) * 0.28] }) });
    const lm = (o) => cm({ pos: [0, 0.34, -0.33], rot: [-0.55, 0, 0] }).multiply(compose(THREE, o));
    for (const x of [-0.46, 0.46]) P.add(new THREE.BoxGeometry(0.04, 0.035, 0.7), PAL.frame, { matrix: lm({ pos: [x, 0, 0.35] }) });
    P.add(new THREE.BoxGeometry(0.96, 0.035, 0.04), PAL.frame, { matrix: lm({ pos: [0, 0, 0.7] }) });
    P.add(new THREE.BoxGeometry(0.96, 0.035, 0.04), PAL.frame, { matrix: lm({ pos: [0, 0, 0.01] }) });
    { const g = new THREE.PlaneGeometry(0.9, 0.68); g.applyMatrix4(lm({ pos: [0, 0.01, 0.35], rot: [-Math.PI / 2, 0, 0] })); glassParts.push(g); }
    P.add(new THREE.BoxGeometry(0.1, 0.06, 0.2), '#8d4a3a', { matrix: cm({ pos: [0.3, 0.37, 0.25] }) });
  }
  // an old kitchen chair and an upturned crate by the shed: the tea break spot
  {
    const ch = (o) => compose(THREE, { pos: [3.55, G, -1.15], ry: -0.9 }).multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.3, 0.03, 0.3), '#c9b48f', { matrix: ch({ pos: [0, 0.3, 0] }) });
    for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) P.add(new THREE.BoxGeometry(0.03, 0.3, 0.03), '#c9b48f', { matrix: ch({ pos: [x, 0.15, z] }) });
    for (const x of [-0.13, 0.13]) P.add(new THREE.BoxGeometry(0.03, 0.35, 0.03), '#c9b48f', { matrix: ch({ pos: [x, 0.48, -0.13] }) });
    for (const y of [0.52, 0.62]) P.add(new THREE.BoxGeometry(0.28, 0.05, 0.02), '#c9b48f', { matrix: ch({ pos: [0, y, -0.13] }) });
    const cr = (o) => compose(THREE, { pos: [3.2, G, -0.7], ry: 0.3 }).multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.4, 0.28, 0.3), '#b5875a', { matrix: cr({ pos: [0, 0.14, 0] }), jitter: 0.008 });
    P.add(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 7), '#c8402e', { matrix: cr({ pos: [0.08, 0.38, 0] }) });
    P.add(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 7), '#3b3d43', { matrix: cr({ pos: [0.08, 0.5, 0] }) });
    P.add(new THREE.BoxGeometry(0.12, 0.02, 0.16), '#e8e2cf', { matrix: cr({ pos: [-0.1, 0.29, 0.02], ry: 0.4 }) });
  }

  // ---- Compost bays of old pallets in the back-left corner; a rustic fence along the back.
  for (const [x, z] of [[-3.65, -2.95], [-3.65, -2.0]]) {
    for (const [dx, dz, w, d] of [[0, -0.42, 0.85, 0.05], [0, 0.42, 0.85, 0.05], [-0.42, 0, 0.05, 0.85]]) {
      for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(w || 0.05, 0.08, d || 0.05), k % 2 ? PAL.plank : '#9a8064', { pos: [x + dx, G + 0.08 + k * 0.13, z + dz], ry: (rand() - 0.5) * 0.04 });
    }
    P.add(new THREE.IcosahedronGeometry(0.4, 1), '#4a3a2c', { pos: [x + 0.05, G + 0.12, z], scl: [1, 0.6, 1], jitter: 0.06 });
    P.add(new THREE.IcosahedronGeometry(0.16, 0), '#6b8a45', { pos: [x + 0.1, G + 0.33, z + 0.1], jitter: 0.03 });
  }
  for (let x = -4.1; x < 4.2; x += 0.62 + rand() * 0.1) {
    if (x > 1.4 && x < 3.6) continue; // behind the shed
    const z = -4.0 + Math.abs(x) * 0.03 + (rand() - 0.5) * 0.05;
    if (Math.pow(Math.abs(x) / 4.4, 3.6) + Math.pow(Math.abs(z) / 4.25, 3.6) > 1) continue;
    P.add(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 5), '#6a5a48', { pos: [x, G + 0.28, z], rot: [(rand() - 0.5) * 0.15, 0, (rand() - 0.5) * 0.15] });
  }
  P.add(new THREE.BoxGeometry(5.2, 0.008, 0.008), '#8a8a86', { pos: [-1.5, G + 0.48, -3.98] });
  P.add(new THREE.BoxGeometry(5.2, 0.008, 0.008), '#8a8a86', { pos: [-1.5, G + 0.3, -3.98] });
  // bramble and nettles along the fence
  for (let i = 0; i < 9; i++) {
    const x = -3.9 + rand() * 5.0, z = -3.75 - rand() * 0.25;
    P.add(new THREE.IcosahedronGeometry(0.16 + rand() * 0.14, 0), rand() > 0.5 ? '#4d6e3c' : '#5a7a44', { pos: [x, G + 0.1, z], scl: [1.3, 0.8, 1], jitter: 0.04 });
  }
  // a stand of foxgloves by the glasshouse corner (the one warm colour against the glass)
  for (let i = 0; i < 4; i++) {
    const x = 0.35 + i * 0.13 + (rand() - 0.5) * 0.05, z = -0.35 + (rand() - 0.5) * 0.15;
    const h = 0.45 + rand() * 0.2;
    P.add(new THREE.CylinderGeometry(0.01, 0.012, h, 3), '#4f7e3b', { pos: [x, G + h / 2, z] });
    P.add(new THREE.ConeGeometry(0.05, h * 0.5, 5), '#b9649a', { pos: [x, G + h * 0.85, z], jitter: 0.01 });
    P.add(new THREE.IcosahedronGeometry(0.07, 0), '#55803f', { pos: [x, G + 0.05, z], scl: [1.3, 0.5, 1.3] });
  }

  // ---- Golden-hour extras: sunflowers by the glasshouse door, a bench, pumpkins, lit lamps.
  const E = new Painter(THREE, 47);
  const glowPts = [];
  {
    const SF = [[0.55, -2.95, 1.95], [0.95, -3.2, 2.2], [1.3, -2.85, 1.75], [0.75, -2.55, 1.55], [1.15, -2.4, 1.35], [0.45, -3.4, 1.8]];
    for (const [x, z, h] of SF) {
      P.add(new THREE.CylinderGeometry(0.025, 0.035, h, 5), '#557a2e', { pos: [x, G + h / 2, z], rot: [(rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.08] });
      for (let k = 0; k < 3; k++) {
        const a = rand() * 6.28;
        P.add(new THREE.ConeGeometry(0.12, 0.3, 4), '#5f8a32', { pos: [x + Math.cos(a) * 0.12, G + h * (0.3 + k * 0.2), z + Math.sin(a) * 0.12], rot: [0, -a, Math.PI / 2 - 0.4], scl: [1, 1, 0.25] });
      }
      // head turned to the setting sun (west, a little south)
      const fm = (o) => compose(THREE, { pos: [x, G + h, z], ry: -1.2 }).multiply(compose(THREE, o));
      P.add(new THREE.CylinderGeometry(0.3, 0.26, 0.04, 12), '#f2b21c', { matrix: fm({ rot: [Math.PI / 2 - 0.25, 0, 0] }), jitter: 0.03, jitterY: 0.03, shade: 0.08 });
      P.add(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 9), '#5a3418', { matrix: fm({ pos: [0, 0.01, 0.03], rot: [Math.PI / 2 - 0.25, 0, 0] }) });
    }
    // bench along the west end of the glasshouse, facing the sunset
    const bn = (o) => compose(THREE, { pos: [-3.55, G, -0.2], ry: -Math.PI / 2 }).multiply(compose(THREE, o));
    for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(1.1, 0.04, 0.1), k % 2 ? '#d07a3e' : '#c46c34', { matrix: bn({ pos: [0, 0.32, -0.12 + k * 0.12] }) });
    for (let k = 0; k < 2; k++) P.add(new THREE.BoxGeometry(1.1, 0.09, 0.035), '#c46c34', { matrix: bn({ pos: [0, 0.5 + k * 0.13, -0.2], rot: [-0.15, 0, 0] }) });
    for (const sx of [-0.48, 0.48]) {
      P.add(new THREE.BoxGeometry(0.05, 0.32, 0.36), '#3a3a3a', { matrix: bn({ pos: [sx, 0.16, 0] }) });
      P.add(new THREE.BoxGeometry(0.05, 0.42, 0.05), '#3a3a3a', { matrix: bn({ pos: [sx, 0.5, -0.22], rot: [-0.15, 0, 0] }) });
    }
    // pumpkins on the grass between the bean bed and the rhubarb
    for (const [x, z, r] of [[1.75, 1.95, 0.2], [2.08, 2.12, 0.15], [1.6, 1.62, 0.13], [3.6, 1.95, 0.17]]) {
      P.add(new THREE.SphereGeometry(r, 9, 5), '#e2731e', { pos: [x, G + r * 0.65, z], scl: [1.15, 0.75, 1.15], shade: 0.06 });
      P.add(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 5), '#4f6a2a', { pos: [x, G + r * 1.3, z], rot: [0.3, 0, 0.2] });
    }
    // lanterns hanging under the glasshouse ridge, the shed window lit
    for (const lx of [0.6, -0.6]) {
      const l = new THREE.Vector3(lx, 1.6, 0).applyMatrix4(GH);
      E.add(new THREE.BoxGeometry(0.14, 0.18, 0.14), '#ffd27a', { pos: [l.x, l.y, l.z] });
      glowPts.push([l.x, l.y, l.z]);
    }
    const SM = compose(THREE, { pos: [2.55, G, -2.55], ry: -0.12 });
    const w = new THREE.Vector3(-1.35 / 2 - 0.02, 0.8, 0.05).applyMatrix4(SM);
    E.add(new THREE.BoxGeometry(0.03, 0.26, 0.4), '#ffcf70', { pos: [w.x, w.y, w.z], ry: -0.12 });
    glowPts.push([w.x - 0.1, w.y, w.z]);
  }

  root.add(P.mesh(lambert(THREE)));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));
  root.add(halos(THREE, glowPts, { color: '#ffc46a', size: 1.6, opacity: 0.8 }));

  // ---- Cabbages (instanced): a heart and four outer leaves; one gap where something got there first.
  const cabP = new Painter(THREE, 41);
  cabP.add(new THREE.IcosahedronGeometry(0.11, 1), PAL.cabbage, { pos: [0, 0.1, 0], scl: [1, 0.85, 1], jitter: 0.008, shade: 0.06 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    cabP.add(new THREE.IcosahedronGeometry(0.11, 0), PAL.cabbage2, { pos: [Math.cos(a) * 0.1, 0.07, Math.sin(a) * 0.1], rot: [Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5], scl: [1.0, 0.35, 0.8], jitter: 0.01 });
  }
  const cabGeo = cabP.geometry();
  const cabs = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      if (r === 1 && c === 3) continue;
      if (c === 0 && r !== 1) continue; // the scarecrow's end
      cabs.push(new THREE.Vector3(-0.85 + c * 0.32 + (rand() - 0.5) * 0.06, 0.2, -0.33 + r * 0.33 + (rand() - 0.5) * 0.06).applyMatrix4(bedA({})));
    }
  }
  const useCab = low ? cabs.filter((_, i) => i % 3 !== 2) : cabs;
  const cabMesh = new THREE.InstancedMesh(cabGeo, lambert(THREE), useCab.length);
  cabMesh.castShadow = true;
  cabMesh.receiveShadow = true;
  const dm = new THREE.Object3D();
  const tc = new THREE.Color();
  useCab.forEach((p, i) => {
    dm.position.copy(p);
    dm.rotation.set((rand() - 0.5) * 0.15, rand() * 6.28, (rand() - 0.5) * 0.15);
    dm.scale.setScalar(0.85 + rand() * 0.35);
    dm.updateMatrix();
    cabMesh.setMatrixAt(i, dm.matrix);
    cabMesh.setColorAt(i, tc.setRGB(1, 1, 1).multiplyScalar(0.85 + rand() * 0.25));
  });
  root.add(cabMesh);

  // ---- Glass: one transparent mesh for every pane.
  const glassGeo = (() => {
    const parts = glassParts.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; });
    const pos = [];
    for (const g of parts) pos.push(...g.attributes.position.array);
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.computeVertexNormals();
    return out;
  })();
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshLambertMaterial({ color: '#ffe2b0', emissive: '#b8742e', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  glass.renderOrder = 2;
  root.add(glass);

  // ---- Puddles: sky-coloured, with drip rings expanding in the fragment shader.
  const uTime = { value: 0 };
  const pudMat = new THREE.MeshLambertMaterial({ color: PAL.puddle, emissive: '#8a5a2c' });
  pudMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'attribute vec3 pud;\nvarying vec3 vPud;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPud = pud;');
    sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vPud;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float k = fract(uTime * 0.35 + vPud.z * 0.37);
      vec2 c = vec2(sin(vPud.z * 3.1), cos(vPud.z * 2.3)) * 0.06;
      float d = length(vPud.xy - c);
      float ring = (1.0 - smoothstep(0.0, 0.012, abs(d - k * 0.26))) * (1.0 - k);
      float k2 = fract(k + 0.5);
      float ring2 = (1.0 - smoothstep(0.0, 0.01, abs(d - k2 * 0.2))) * (1.0 - k2) * 0.6;
      diffuseColor.rgb += vec3(0.22) * (ring + ring2);`);
  };
  const puddles = new THREE.Mesh(pudGeo, pudMat);
  puddles.receiveShadow = true;
  root.add(puddles);

  // ---- The robin on the fork handle (bobs and turns its head now and then).
  const robin = new THREE.Group();
  {
    const rp = new Painter(THREE, 43);
    rp.add(new THREE.SphereGeometry(0.055, 7, 5), PAL.robin, { pos: [0, 0.06, 0], scl: [0.85, 0.9, 1.15] });
    rp.add(new THREE.SphereGeometry(0.045, 7, 5), PAL.breast, { pos: [0, 0.055, 0.025], scl: [0.9, 1, 0.8] });
    rp.add(new THREE.SphereGeometry(0.035, 6, 4), PAL.robin, { pos: [0, 0.11, 0.035] });
    rp.add(new THREE.SphereGeometry(0.028, 6, 4), PAL.breast, { pos: [0, 0.1, 0.05] });
    rp.add(new THREE.ConeGeometry(0.008, 0.03, 4), '#2b2b2b', { pos: [0, 0.11, 0.075], rot: [Math.PI / 2, 0, 0] });
    rp.add(new THREE.BoxGeometry(0.03, 0.01, 0.07), PAL.robin, { pos: [0, 0.06, -0.08], rot: [-0.5, 0, 0] });
    for (const sx of [-0.015, 0.015]) rp.add(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 3), '#5a4a3a', { pos: [sx, 0.015, 0] });
    robin.add(rp.mesh(lambert(THREE)));
    robin.position.copy(forkTop);
    robin.scale.setScalar(1.6);
    robin.rotation.y = 0.9;
    root.add(robin);
  }

  // ---- Light: golden hour. A low amber sun from the west rakes across the plot; long shadows.
  root.add(new THREE.HemisphereLight('#ffe2bf', '#5e6a4a', 1.3));
  const key = keyLight(THREE, ctx, { color: '#ffb066', intensity: 3.4, pos: [-8.5, 3.8, 3.2], extent: 7.0 });
  root.add(key, key.target);
  root.add(skyDome(THREE, { top: '#5c78b8', mid: '#ffc786', bottom: '#f1a77c', sun: [-0.9, 0.1, 0.35], sunColor: '#fff0b8', sunPow: 22, horizon: 0.65 }));

  function update(t) {
    uTime.value = t;
    scarf.rotation.z = Math.sin(t * 1.3) * 0.15;
    scarf.rotation.x = Math.sin(t * 0.9 + 1) * 0.1;
    const hop = Math.max(0, Math.sin(t * 0.7)) > 0.97 ? 0.02 : 0;
    robin.position.y = forkTop.y + hop;
    robin.rotation.y = 0.9 + (Math.sin(t * 0.45) > 0.3 ? 0.6 : 0) + Math.sin(t * 3.0) * 0.03;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f6c895'),
    fog: new THREE.Fog('#f6c895', 22, 55),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
