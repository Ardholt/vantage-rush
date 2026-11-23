// Lantern Lane: blue hour in a stepped alley. Paper lanterns, a noodle stall, a ginger cat on a wall.
import { Painter, lambert, unlit, slab, gable, roof, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  stone: '#6f6c8c',
  stoneDark: '#4c4868',
  plaster: '#b39ab1',
  plaster2: '#cdb7ad',
  roof: '#363256',
  wood: '#5a3b36',
  amber: '#ffbe62',
  red: '#e2543e',
  cat: '#e08a3c',
  leaf: '#d98fb0',
  dark: '#231f38',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(4242);
  const root = new THREE.Group();
  const P = new Painter(THREE, 41);
  const E = new Painter(THREE, 42);

  // Plinth: rectangular board with terraced stone blocks on top.
  const X0 = -4.5, X1 = 4.5, Z0 = -4.4, Z1 = 4.4;
  const rect = [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]];
  const grow = (pts, d) => pts.map(([x, z]) => [x + Math.sign(x) * d, z + Math.sign(z) * d]);
  P.add(slab(THREE, grow(rect, 0.25), -1.25, -0.95, 0.06), '#4a3030', { shade: 0.06 });
  P.add(slab(THREE, rect, -0.95, -0.45), '#5b4152', { jitter: 0.03, shade: 0.1 });
  P.add(slab(THREE, rect, -0.45, 0.0), '#715468', { jitter: 0.03, shade: 0.1 });

  const LX0 = -0.55, LX1 = 1.15; // lane between these x
  const TER = [
    { z0: 2.8, z1: Z1, y: 0.25 },
    { z0: 1.2, z1: 2.8, y: 0.65 },
    { z0: -0.4, z1: 1.2, y: 1.05 },
    { z0: -2.0, z1: -0.4, y: 1.45 },
    { z0: Z0, z1: -2.0, y: 1.85 },
  ];
  for (const t of TER) {
    P.add(new THREE.BoxGeometry(X1 - X0, t.y, t.z1 - t.z0), PAL.stone, { pos: [(X0 + X1) / 2, t.y / 2, (t.z0 + t.z1) / 2], jitter: 0.02, shade: 0.06, top: PAL.stoneDark, y0: t.y, y1: 0 });
  }
  // cobbles on the lane, steps at each riser
  for (let i = 0; i < TER.length; i++) {
    const t = TER[i];
    const rows = Math.round((t.z1 - t.z0) / 0.32);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        if (i > 0 && r === rows - 1) continue;
        const z = t.z0 + (r + 0.5) * ((t.z1 - t.z0) / rows);
        const x = LX0 + (c + 0.5 + (r % 2) * 0.3 - 0.15) * ((LX1 - LX0) / 4);
        P.add(new THREE.BoxGeometry(0.36, 0.04, 0.27), rand() > 0.5 ? '#8a86a3' : '#7a7594', { pos: [x, t.y + 0.015, z], ry: (rand() - 0.5) * 0.15, jitter: 0.02, jitterY: 0.008, shade: 0.08 });
      }
    }
    if (i < TER.length - 1) {
      const zb = t.z0;
      for (let k = 1; k <= 4; k++) {
        const zz = zb + 0.13 * (4 - k);
        P.add(new THREE.BoxGeometry(LX1 - LX0, 0.1 * k, 0.15), '#8f8aa6', { pos: [(LX0 + LX1) / 2, t.y + 0.05 * k, zz + 0.075], jitter: 0.015, shade: 0.06 });
      }
    }
  }

  // Lanterns, gathered as data; drawn later as one instanced mesh + one halo point cloud.
  const lanterns = []; // { x, y, z, s, c }
  const wires = [];
  const lit = (x, y, z, s = 1, c = PAL.amber) => lanterns.push({ x, y, z, s, c, ph: rand() * 6.28 });

  // Houses along the lane.
  function house(side, t, z0, z1, dx, h, look) {
    const wz = z1 - z0;
    const zc = (z0 + z1) / 2;
    const face = side < 0 ? LX0 : LX1;
    const xc = face - (side < 0 ? dx / 2 : -dx / 2);
    const out = side < 0 ? 1 : -1; // facade normal x sign (towards the lane)
    const wall = look % 2 ? PAL.plaster : PAL.plaster2;
    const g1 = 0.78;
    P.add(new THREE.BoxGeometry(dx, 0.16, wz), PAL.stoneDark, { pos: [xc, t.y + 0.08, zc], jitter: 0.015 });
    P.add(new THREE.BoxGeometry(dx, g1, wz), wall, { pos: [xc, t.y + 0.16 + g1 / 2, zc], jitter: 0.02, shade: 0.04 });
    let top = t.y + 0.16 + g1;
    let wdx = dx;
    if (h > 1.2) {
      const up = h - 0.16 - g1;
      wdx = dx + 0.14;
      P.add(new THREE.BoxGeometry(wdx, up, wz + 0.06), look % 3 === 0 ? PAL.plaster2 : wall, { pos: [xc + out * 0.07, top + up / 2, zc], jitter: 0.02, shade: 0.04 });
      P.add(new THREE.BoxGeometry(wdx + 0.04, 0.06, wz + 0.1), PAL.wood, { pos: [xc + out * 0.07, top + 0.02, zc] });
      // upper windows facing the lane
      const n = wz > 1.3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const z = zc + (n === 2 ? (k ? 0.33 : -0.33) : 0);
        const wy = top + up * 0.55;
        const on = rand() > 0.3;
        (on ? E : P).add(new THREE.BoxGeometry(0.04, 0.3, 0.26), on ? '#ffcf7a' : PAL.dark, { pos: [face + out * 0.085, wy, z] });
        P.add(new THREE.BoxGeometry(0.06, 0.04, 0.34), PAL.wood, { pos: [face + out * 0.1, wy - 0.17, z] });
      }
      // a back window too
      const on = rand() > 0.4;
      (on ? E : P).add(new THREE.BoxGeometry(0.04, 0.26, 0.24), on ? '#ffcf7a' : PAL.dark, { pos: [face - out * (dx + 0.02), top + up * 0.55, zc + (rand() - 0.5) * 0.4] });
      top += up;
    }
    // windows on the gable ends, so every side has something to read
    for (const zs of [-1, 1]) {
      const zf = zc + zs * (wz / 2 + 0.02);
      const on = rand() > 0.35;
      (on ? E : P).add(new THREE.BoxGeometry(0.26, 0.28, 0.04), on ? '#ffcf7a' : PAL.dark, { pos: [xc + out * (dx * 0.18), t.y + 0.6, zf] });
      if (h > 1.2) {
        const on2 = rand() > 0.45;
        (on2 ? E : P).add(new THREE.BoxGeometry(0.22, 0.26, 0.04), on2 ? '#ffcf7a' : PAL.dark, { pos: [xc - out * (dx * 0.2), top - 0.4, zf] });
      }
    }
    // ground floor: door + glowing shop window
    const dz = zc + (look % 2 ? 0.35 : -0.35) * Math.min(1, wz / 1.4);
    P.add(new THREE.BoxGeometry(0.05, 0.52, 0.3), PAL.wood, { pos: [face + out * 0.02, t.y + 0.16 + 0.26, dz] });
    E.add(new THREE.BoxGeometry(0.04, 0.3, 0.4), '#ffb85c', { pos: [face + out * 0.02, t.y + 0.16 + 0.42, zc - (dz - zc) * 0.9] });
    lit(face + out * 0.12, t.y + 0.16 + 0.68, dz + (look % 2 ? -0.22 : 0.22), 0.8, look % 3 === 1 ? PAL.red : PAL.amber);
    // roof, ridge along z, eaves over the lane
    const Wr = wdx + 0.42, Hr = 0.42 + (look % 3) * 0.06;
    const drop = Hr * (0.21 / (Wr / 2));
    P.add(roof(THREE, Wr, Hr, wz + 0.26, 0.07), PAL.roof, { pos: [xc + (wdx !== dx ? out * 0.07 : 0), top - drop, zc], jitter: 0.015, shade: 0.07 });
    P.add(gable(THREE, wdx, Hr - drop, wz), wall, { pos: [xc + (wdx !== dx ? out * 0.07 : 0), top, zc], shade: 0.03 });
    return { top: top + Hr - drop, eave: top - drop, xc, zc, back: face - out * dx };
  }

  const L = [];
  // T1..T3: houses both sides
  L.push(house(-1, TER[1], 1.25, 2.75, 2.4, 1.75, 1));
  L.push(house(1, TER[1], 1.3, 2.75, 2.0, 1.55, 2));
  L.push(house(-1, TER[2], -0.35, 1.15, 2.0, 1.6, 3));
  L.push(house(1, TER[2], -0.35, 1.2, 2.6, 1.85, 4));
  L.push(house(-1, TER[3], -1.95, -0.45, 2.8, 2.3, 5));
  L.push(house(1, TER[3], -1.95, -0.45, 1.8, 1.5, 6));
  L.push(house(-1, TER[4], -3.6, -2.05, 2.2, 1.7, 2));
  // right top terrace: the bell tower instead of a house (asymmetric landmark)
  {
    const t = TER[4];
    const bx = 2.4, bz = -3.0;
    P.add(new THREE.BoxGeometry(1.0, 1.6, 1.0), PAL.stone, { pos: [bx, t.y + 0.8, bz], jitter: 0.03, shade: 0.06 });
    P.add(new THREE.BoxGeometry(0.85, 0.08, 0.85), PAL.wood, { pos: [bx, t.y + 1.64, bz] });
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(new THREE.BoxGeometry(0.09, 0.8, 0.09), PAL.wood, { pos: [bx + px * 0.36, t.y + 2.05, bz + pz * 0.36] });
    P.add(new THREE.ConeGeometry(0.85, 0.75, 4, 1), PAL.roof, { pos: [bx, t.y + 2.82, bz], ry: Math.PI / 4, jitter: 0.02 });
    P.add(new THREE.ConeGeometry(0.06, 0.4, 5), PAL.wood, { pos: [bx, t.y + 3.35, bz] });
    P.add(new THREE.CylinderGeometry(0.12, 0.22, 0.32, 9, 1, true), '#c98a3a', { pos: [bx, t.y + 2.15, bz] });
    E.add(new THREE.BoxGeometry(0.04, 0.3, 0.2), '#ffcf7a', { pos: [bx - 0.51, t.y + 1.0, bz] });
    lit(bx - 0.6, t.y + 1.4, bz + 0.6, 1.1, PAL.red);
  }
  // Lane end: a wall with a round doorway, the big lantern above it.
  {
    const t = TER[4];
    const zw = Z0 + 0.25;
    P.add(new THREE.BoxGeometry(LX1 - LX0 + 0.5, 1.5, 0.3), PAL.plaster2, { pos: [(LX0 + LX1) / 2, t.y + 0.75, zw], jitter: 0.02 });
    P.add(new THREE.BoxGeometry(LX1 - LX0 + 0.7, 0.12, 0.45), PAL.roof, { pos: [(LX0 + LX1) / 2, t.y + 1.56, zw] });
    E.add(new THREE.CircleGeometry(0.45, 12), '#ffa94d', { pos: [(LX0 + LX1) / 2, t.y + 0.62, zw + 0.16] });
    lit((LX0 + LX1) / 2, t.y + 1.95, zw + 0.3, 1.9, PAL.red);
    P.add(new THREE.BoxGeometry(0.03, 0.25, 0.03), PAL.dark, { pos: [(LX0 + LX1) / 2, t.y + 2.3, zw + 0.3] });
    P.add(new THREE.BoxGeometry(0.06, 0.06, 0.5), PAL.wood, { pos: [(LX0 + LX1) / 2, t.y + 2.43, zw + 0.15] });
  }
  // Right of the gate: a blossom tree in the top yard.
  const tree = (x, y, z, s) => {
    P.add(new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 0.9 * s, 6), PAL.wood, { pos: [x, y + 0.45 * s, z], rot: [0.15, 0, -0.2] });
    P.add(new THREE.CylinderGeometry(0.04 * s, 0.06 * s, 0.6 * s, 5), PAL.wood, { pos: [x + 0.25 * s, y + 0.95 * s, z], rot: [0, 0, -0.9] });
    for (let k = 0; k < 5; k++) {
      P.add(new THREE.IcosahedronGeometry((0.32 + rand() * 0.18) * s, 0), k % 2 ? PAL.leaf : '#c47aa0', { pos: [x + (rand() - 0.3) * 0.8 * s, y + (1.05 + rand() * 0.45) * s, z + (rand() - 0.5) * 0.6 * s], jitter: 0.05 * s, ry: rand() * 3 });
    }
  };
  tree(3.5, TER[4].y, -3.9, 1.0);
  tree(-3.6, TER[1].y, 2.0, 0.85);

  // Front terrace: noodle stall on the right, the cat's wall on the left.
  {
    const t = TER[0];
    const sx = 2.05, sz = 3.55;
    P.add(new THREE.BoxGeometry(1.5, 0.55, 0.6), PAL.wood, { pos: [sx, t.y + 0.275, sz], jitter: 0.015, shade: 0.08 });
    P.add(new THREE.BoxGeometry(1.6, 0.06, 0.72), '#7a5040', { pos: [sx, t.y + 0.58, sz] });
    for (const [px, pz] of [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.4], [0.75, 0.4]]) P.add(new THREE.BoxGeometry(0.06, 1.3, 0.06), PAL.wood, { pos: [sx + px, t.y + 0.65, sz + pz] });
    // striped awning, sloping down towards the lane
    for (let k = 0; k < 7; k++) {
      P.add(new THREE.BoxGeometry(0.24, 0.04, 1.15), k % 2 ? '#f1e3cf' : PAL.red, { pos: [sx - 0.72 + k * 0.24, t.y + 1.38, sz - 0.02], rot: [0, 0, 0.28], ry: 0, shade: 0.03 });
    }
    for (let k = 0; k < 7; k++) {
      P.add(new THREE.ConeGeometry(0.12, 0.14, 3), k % 2 ? '#f1e3cf' : PAL.red, { pos: [sx - 0.88, t.y + 1.08 + k * 0.0, sz - 0.5 + k * 0.165], rot: [Math.PI, 0, 0], scl: [0.3, 1, 1] });
    }
    // pot, bowls, stools, menu board
    P.add(new THREE.CylinderGeometry(0.2, 0.17, 0.26, 9), '#3a3a4a', { pos: [sx + 0.35, t.y + 0.74, sz - 0.05] });
    P.add(new THREE.CylinderGeometry(0.09, 0.06, 0.06, 7), '#f1e3cf', { pos: [sx - 0.3, t.y + 0.64, sz + 0.1] });
    P.add(new THREE.CylinderGeometry(0.09, 0.06, 0.06, 7), '#f1e3cf', { pos: [sx - 0.05, t.y + 0.64, sz + 0.15] });
    for (const dz of [-0.35, 0.35]) P.add(new THREE.CylinderGeometry(0.13, 0.11, 0.36, 7), PAL.red, { pos: [sx - 1.0, t.y + 0.18, sz + dz] });
    P.add(new THREE.BoxGeometry(0.05, 0.6, 0.4), PAL.dark, { pos: [sx + 0.95, t.y + 0.5, sz + 0.55], rot: [0, 0, 0.18] });
    E.add(new THREE.BoxGeometry(0.02, 0.36, 0.06), '#ffd98f', { pos: [sx + 0.92, t.y + 0.55, sz + 0.5], rot: [0, 0, 0.18] });
    E.add(new THREE.BoxGeometry(0.02, 0.36, 0.06), '#ffd98f', { pos: [sx + 0.92, t.y + 0.55, sz + 0.62], rot: [0, 0, 0.18] });
    lit(sx - 0.85, t.y + 1.0, sz - 0.42, 1.4, PAL.red);
    lit(sx - 0.85, t.y + 1.0, sz + 0.42, 1.4, PAL.red);
    // back wall of the stall area, with crates
    P.add(new THREE.BoxGeometry(0.3, 0.3, 0.3), '#8a6a4a', { pos: [3.6, t.y + 0.15, 3.0], ry: 0.3, jitter: 0.01 });
    P.add(new THREE.BoxGeometry(0.28, 0.28, 0.28), '#8a6a4a', { pos: [3.55, t.y + 0.44, 3.05], ry: -0.2, jitter: 0.01 });
    P.add(new THREE.BoxGeometry(0.3, 0.3, 0.3), '#8a6a4a', { pos: [3.95, t.y + 0.15, 3.35], ry: 0.6, jitter: 0.01 });
  }
  const steamFrom = new THREE.Vector3(2.4, TER[0].y + 0.9, 3.5);
  // left: low garden wall with a gap, the cat sits on the near end
  {
    const t = TER[0];
    P.add(new THREE.BoxGeometry(0.3, 0.62, 1.0), PAL.plaster2, { pos: [LX0 - 0.2, t.y + 0.31, 3.25], jitter: 0.02 });
    P.add(new THREE.BoxGeometry(0.3, 0.62, 0.55), PAL.plaster2, { pos: [LX0 - 0.2, t.y + 0.31, 4.12], jitter: 0.02 });
    P.add(new THREE.BoxGeometry(0.38, 0.07, 1.06), PAL.roof, { pos: [LX0 - 0.2, t.y + 0.66, 3.25] });
    P.add(new THREE.BoxGeometry(0.38, 0.07, 0.6), PAL.roof, { pos: [LX0 - 0.2, t.y + 0.66, 4.12] });
    P.add(new THREE.BoxGeometry(3.6, 0.5, 0.25), PAL.plaster2, { pos: [-2.6, t.y + 0.25, 2.92], jitter: 0.02 });
    // pots and a bench in the little yard
    for (let k = 0; k < 4; k++) {
      const x = -3.9 + k * 0.5, z = 3.9 - (k % 2) * 0.25;
      P.add(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 7), '#b5653f', { pos: [x, t.y + 0.1, z] });
      P.add(new THREE.IcosahedronGeometry(0.17, 0), '#5f7f62', { pos: [x, t.y + 0.28, z], jitter: 0.03 });
    }
    P.add(new THREE.BoxGeometry(1.0, 0.06, 0.3), PAL.wood, { pos: [-2.1, t.y + 0.3, 3.45] });
    P.add(new THREE.BoxGeometry(0.06, 0.28, 0.26), PAL.wood, { pos: [-2.5, t.y + 0.14, 3.45] });
    P.add(new THREE.BoxGeometry(0.06, 0.28, 0.26), PAL.wood, { pos: [-1.7, t.y + 0.14, 3.45] });
  }
  // the cat
  const CAT = [LX0 - 0.2, TER[0].y + 0.7, 3.0];
  P.add(new THREE.SphereGeometry(0.13, 7, 5), PAL.cat, { pos: [CAT[0], CAT[1] + 0.12, CAT[2]], scl: [0.85, 1.15, 1] });
  P.add(new THREE.SphereGeometry(0.09, 7, 5), PAL.cat, { pos: [CAT[0] + 0.02, CAT[1] + 0.31, CAT[2] + 0.05] });
  P.add(new THREE.ConeGeometry(0.035, 0.08, 4), PAL.cat, { pos: [CAT[0] + 0.05, CAT[1] + 0.41, CAT[2] + 0.0] });
  P.add(new THREE.ConeGeometry(0.035, 0.08, 4), PAL.cat, { pos: [CAT[0] - 0.01, CAT[1] + 0.41, CAT[2] + 0.1] });
  const tailGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.34, 5);
  tailGeo.translate(0, 0.17, 0);
  const tail = new THREE.Mesh(tailGeo, new THREE.MeshLambertMaterial({ color: PAL.cat, flatShading: true }));
  tail.position.set(CAT[0] - 0.09, CAT[1] + 0.03, CAT[2] - 0.08);
  root.add(tail);

  // Lantern strings across the lane, one per terrace.
  for (let i = 0; i < TER.length; i++) {
    const t = TER[i];
    const z = i === 0 ? 2.95 : (t.z0 + t.z1) / 2 + (i % 2 ? 0.25 : -0.25);
    const ya = t.y + (i === 0 ? 1.55 : 1.65), yb = ya - 0.12 + (i % 2) * 0.2;
    const za = z - 0.3, zb = z + 0.3;
    const xa = LX0 - 0.05, xb = LX1 + 0.05;
    const N = 12;
    let prev = null;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const p = [xa + (xb - xa) * u, ya + (yb - ya) * u - Math.sin(Math.PI * u) * 0.28, za + (zb - za) * u];
      if (prev) wires.push(...prev, ...p);
      prev = p;
    }
    const cnt = i === 4 ? 3 : 4;
    for (let k = 0; k < cnt; k++) {
      const u = (k + 0.5) / cnt;
      lit(xa + (xb - xa) * u, ya + (yb - ya) * u - Math.sin(Math.PI * u) * 0.28 - 0.13, za + (zb - za) * u, 1, (k + i) % 3 === 0 ? PAL.red : PAL.amber);
    }
  }
  // washing line on terrace 2, high between upper floors
  {
    const y = TER[2].y + 1.62, z = 0.55;
    wires.push(LX0 - 0.1, y, z, LX1 + 0.1, y - 0.05, z - 0.1);
    const cl = ['#e8e2d6', '#9fb6d6', '#e3b34f', '#e8e2d6', '#d97f8e'];
    for (let k = 0; k < cl.length; k++) {
      const u = (k + 0.7) / (cl.length + 0.6);
      const w = 0.16 + rand() * 0.08, h = 0.2 + rand() * 0.14;
      P.add(new THREE.BoxGeometry(w, h, 0.015), cl[k], { pos: [LX0 - 0.1 + (LX1 - LX0 + 0.2) * u, y - h / 2 - 0.01, z - 0.1 * u], ry: Math.PI / 2 + 0.08, rot: [0, Math.PI / 2 + 0.06, (rand() - 0.5) * 0.1], shade: 0.03 });
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
  root.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: '#1a1630' })));

  // Rooftop water tank on the tall house (landmark seen from everywhere).
  {
    const h = L[4];
    P.add(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 9), '#5d6d8c', { pos: [h.xc - 0.55, h.top - 0.05, h.zc + 0.35], jitter: 0.01 });
    P.add(new THREE.ConeGeometry(0.3, 0.14, 9), '#4a587a', { pos: [h.xc - 0.55, h.top + 0.24, h.zc + 0.35] });
    for (const d of [-0.18, 0.18]) P.add(new THREE.BoxGeometry(0.05, 0.4, 0.05), PAL.wood, { pos: [h.xc - 0.55 + d, h.top - 0.35, h.zc + 0.35] });
  }
  // A blade sign sticking out over the lane from house 3, facing down the lane.
  {
    const h = L[3];
    P.add(new THREE.BoxGeometry(0.4, 0.04, 0.04), PAL.wood, { pos: [LX1 - 0.12, TER[2].y + 1.35, 0.95] });
    P.add(new THREE.BoxGeometry(0.06, 0.55, 0.26), PAL.red, { pos: [LX1 - 0.28, TER[2].y + 1.05, 0.95] });
    E.add(new THREE.BoxGeometry(0.075, 0.38, 0.06), '#ffe1a6', { pos: [LX1 - 0.28, TER[2].y + 1.05, 0.95] });
    void h;
  }

  // Back yards: sheds, bushes, barrels; stones proud of the terrace risers.
  function yard(x0, x1, t, seedSide) {
    const zc = (t.z0 + t.z1) / 2;
    const w = Math.abs(x1 - x0);
    if (w < 0.6) return;
    const xm = (x0 + x1) / 2;
    const pick = (seedSide + Math.floor(rand() * 3)) % 3;
    if (pick === 0 && w > 1.0) {
      P.add(new THREE.BoxGeometry(Math.min(0.9, w - 0.2), 0.55, 0.8), '#7c6070', { pos: [xm, t.y + 0.275, zc + 0.2], jitter: 0.02 });
      P.add(new THREE.BoxGeometry(Math.min(1.05, w - 0.05), 0.06, 1.0), PAL.roof, { pos: [xm, t.y + 0.6, zc + 0.2], rot: [0.18, 0, 0] });
      P.add(new THREE.BoxGeometry(0.04, 0.4, 0.28), PAL.wood, { pos: [xm, t.y + 0.2, zc + 0.61] });
    } else if (pick === 1) {
      for (let k = 0; k < 3; k++) P.add(new THREE.IcosahedronGeometry(0.22 + rand() * 0.14, 0), k % 2 ? '#4f6e5a' : '#5d7d63', { pos: [xm + (rand() - 0.5) * (w - 0.4), t.y + 0.18, zc + (rand() - 0.5) * 1.0], jitter: 0.04 });
    } else {
      for (let k = 0; k < 2; k++) P.add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 8), '#7a5a48', { pos: [xm + (k - 0.5) * 0.35, t.y + 0.18, zc - 0.3 + k * 0.1] });
      P.add(new THREE.BoxGeometry(0.06, 1.0, 0.06), PAL.wood, { pos: [xm + 0.3, t.y + 0.5, zc + 0.5] });
      wires.push(xm + 0.3, t.y + 0.95, zc + 0.5, xm - 0.4, t.y + 0.9, zc + 0.6);
      P.add(new THREE.BoxGeometry(0.2, 0.22, 0.015), '#d6cfc2', { pos: [xm, t.y + 0.8, zc + 0.56] });
    }
  }
  for (let i = 1; i < TER.length; i++) {
    const t = TER[i];
    const lh = L.find((h) => h.xc < 0 && h.zc > t.z0 && h.zc < t.z1);
    const rh = L.find((h) => h.xc > 0 && h.zc > t.z0 && h.zc < t.z1);
    if (lh) yard(X0 + 0.1, lh.back + 0.0, t, i);
    if (rh) yard(rh.back, X1 - 0.1, t, i + 1);
  }
  for (let i = 1; i < TER.length; i++) {
    const t = TER[i];
    for (let k = 0; k < 9; k++) {
      const x = X0 + 0.3 + rand() * (X1 - X0 - 0.6);
      if (x > LX0 - 0.1 && x < LX1 + 0.1) continue;
      P.add(new THREE.BoxGeometry(0.3 + rand() * 0.25, 0.14 + rand() * 0.08, 0.06), rand() > 0.5 ? '#7d7a99' : '#5f5b7c', { pos: [x, (TER[i - 1].y + 0.05) + rand() * (t.y - TER[i - 1].y - 0.15), t.z1 + 0.02], jitter: 0.015 });
    }
  }
  for (let k = 0; k < 16; k++) {
    const x = X0 + 0.3 + rand() * (X1 - X0 - 0.6);
    P.add(new THREE.BoxGeometry(0.3 + rand() * 0.25, 0.13 + rand() * 0.08, 0.06), rand() > 0.5 ? '#7d7a99' : '#5f5b7c', { pos: [x, 0.15 + rand() * 1.5, Z0 - 0.02], jitter: 0.015 });
  }
  // parapet along the back of the top terrace, with pots
  for (const [a, b] of [[X0 + 0.1, LX0 - 0.35], [LX1 + 0.35, X1 - 0.1]]) {
    P.add(new THREE.BoxGeometry(b - a, 0.32, 0.18), PAL.plaster2, { pos: [(a + b) / 2, TER[4].y + 0.16, Z0 + 0.12], jitter: 0.02 });
    P.add(new THREE.BoxGeometry(b - a + 0.06, 0.05, 0.24), PAL.roof, { pos: [(a + b) / 2, TER[4].y + 0.34, Z0 + 0.12] });
    for (let k = 0; k < 2; k++) {
      const x = a + (k + 0.5) * ((b - a) / 2);
      P.add(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 7), '#b5653f', { pos: [x, TER[4].y + 0.45, Z0 + 0.12] });
      P.add(new THREE.IcosahedronGeometry(0.14, 0), k % 2 ? PAL.leaf : '#5f7f62', { pos: [x, TER[4].y + 0.6, Z0 + 0.12], jitter: 0.03 });
    }
  }
  for (const xs of [X0, X1]) {
    for (let k = 0; k < 22; k++) {
      const z = Z0 + 0.3 + rand() * (Z1 - Z0 - 0.6);
      const t = TER.find((q) => z > q.z0 && z < q.z1);
      if (!t || t.y < 0.4) continue;
      P.add(new THREE.BoxGeometry(0.06, 0.13 + rand() * 0.08, 0.3 + rand() * 0.25), rand() > 0.5 ? '#7d7a99' : '#5f5b7c', { pos: [xs + Math.sign(xs) * 0.02, 0.1 + rand() * (t.y - 0.25), z], jitter: 0.015 });
    }
  }

  const mat = lambert(THREE);
  root.add(P.mesh(mat));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));

  // Lanterns: instanced bodies + one halo cloud.
  const NL = lanterns.length;
  const lg = new THREE.SphereGeometry(0.1, 8, 5);
  lg.scale(1, 1.25, 1);
  const lmesh = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: '#ffffff' }), NL);
  const tmpC = new THREE.Color();
  lanterns.forEach((l, i) => lmesh.setColorAt(i, tmpC.set(l.c)));
  root.add(lmesh);
  const haloPts = halos(THREE, lanterns.map((l) => [l.x, l.y, l.z]), { color: '#ff9f45', size: 1.6, opacity: 0.95 });
  root.add(haloPts);
  const hpos = haloPts.geometry.attributes.position;

  // Steam from the pot.
  const NS = low ? 3 : 6;
  const steam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: '#cbbcd8', transparent: true, opacity: 0.55, depthWrite: false }), NS);
  root.add(steam);

  // Light: cool moon key + violet sky fill, two warm lane lights.
  root.add(new THREE.HemisphereLight('#8f97e6', '#5a3a60', 2.1));
  const key = keyLight(THREE, ctx, { color: '#b4c0ff', intensity: 1.9, pos: [-6, 9, 4], extent: 6.5 });
  root.add(key, key.target);
  const warm = [[0.3, TER[1].y + 1.3, 2.0], [0.3, TER[3].y + 1.3, -1.2], [1.6, TER[0].y + 1.0, 3.4]];
  for (const w of low ? warm.slice(0, 1) : warm) {
    const pl = new THREE.PointLight('#ff9a48', 4.5, 5, 1.6);
    pl.position.set(...w);
    root.add(pl);
  }

  const sky = skyDome(THREE, { top: '#1a1d55', mid: '#6e4a86', bottom: '#2a2148', sun: [0.55, 0.02, -0.85], sunColor: '#8a4262', sunPow: 8, horizon: 0.32, stars: 1 });
  root.add(sky);

  const dummy = new THREE.Object3D();
  function update(t) {
    for (let i = 0; i < NL; i++) {
      const l = lanterns[i];
      const sw = Math.sin(t * 1.4 + l.ph) * 0.035 * l.s;
      dummy.position.set(l.x + sw, l.y - Math.abs(sw) * 0.2, l.z + sw * 0.4);
      dummy.rotation.set(0, l.ph, -sw * 2);
      dummy.scale.setScalar(l.s);
      dummy.updateMatrix();
      lmesh.setMatrixAt(i, dummy.matrix);
      hpos.setXYZ(i, l.x + sw, l.y, l.z + sw * 0.4);
    }
    lmesh.instanceMatrix.needsUpdate = true;
    hpos.needsUpdate = true;
    tail.rotation.set(0.6 + Math.sin(t * 0.9) * 0.25, 0, -0.5 + Math.sin(t * 1.7) * 0.35);
    for (let i = 0; i < NS; i++) {
      const k = (t * 0.35 + i / NS) % 1;
      dummy.position.set(steamFrom.x + Math.sin(k * 5 + i) * 0.06, steamFrom.y + k * 0.9, steamFrom.z + k * 0.1);
      dummy.rotation.set(i, k, 0);
      dummy.scale.setScalar(Math.sin(Math.PI * k) * (0.6 + k));
      dummy.updateMatrix();
      steam.setMatrixAt(i, dummy.matrix);
    }
    steam.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#3b2d5c'),
    fog: new THREE.Fog('#4a3566', 22, 55),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
