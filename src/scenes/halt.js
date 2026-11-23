// Fir Halt: crisp winter midday at a tiny mountain railway halt. Red carriage, water tower, signal, firs.
import { Painter, compose, lambert, outline, offsetOutline, slab, gable, roof, skyDome, keyLight, disposeTree, rng, glowTexture } from './kit.js';

const PAL = {
  snow: '#f2f6fb',
  ice: '#bcd8ee',
  rock: '#71809a',
  fir: '#2f5f4b',
  fir2: '#3f7458',
  red: '#c93a2f',
  wood: '#7b5a45',
  dark: '#3a4150',
  earth: '#7d6656',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(9090);
  const root = new THREE.Group();
  const P = new Painter(THREE, 61);
  const G = 0.3; // ground level

  // Plinth: snow-capped earth block on a board.
  const rim = outline(rand, { n: 24, rx: 4.75, rz: 4.45, wob: 0.03, sq: 3 });
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.4, -1.1, 0.06), '#6a4a38', { shade: 0.06 });
  P.add(slab(THREE, rim, -1.1, -0.55), '#5d5260', { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.55, 0.05), PAL.earth, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.04), 0.05, G, 0.04), PAL.snow, { jitter: 0.03, jitterY: 0.02, shade: 0.03 });
  // snow drifts
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, d = 1.5 + rand() * 2.5;
    P.add(new THREE.IcosahedronGeometry(0.5 + rand() * 0.5, 1), PAL.snow, { pos: [Math.cos(a) * d, G - 0.05, Math.sin(a) * d * 0.9], scl: [1.2, 0.13, 1], jitter: 0.04, shade: 0.03 });
  }

  // Railway line: from the tunnel mouth (A) out to a buffer stop.
  const A = new THREE.Vector3(-1.0, G, -1.55);
  const D = new THREE.Vector3(0.751, 0, 0.661);
  const N = new THREE.Vector3(-D.z, 0, D.x); // platform side (front-left)
  const yaw = Math.atan2(D.x, D.z);
  const S1 = 6.0;
  const at = (s, n, y = G) => A.clone().addScaledVector(D, s).addScaledVector(N, n).setY(y);
  {
    const mid = at(S1 / 2 - 0.3, 0, G + 0.03);
    P.add(new THREE.BoxGeometry(1.25, 0.08, S1 + 0.6), '#a7adb8', { pos: [mid.x, mid.y, mid.z], ry: yaw, jitter: 0.03, jitterY: 0.01, shade: 0.06 });
    for (let s = -0.4; s < S1 - 0.05; s += 0.3) {
      const p = at(s, 0, G + 0.09);
      P.add(new THREE.BoxGeometry(0.95, 0.05, 0.13), PAL.wood, { pos: [p.x, p.y, p.z], ry: yaw + (rand() - 0.5) * 0.06, shade: 0.08 });
    }
    for (const n of [-0.3, 0.3]) {
      const p = at(S1 / 2 - 0.3, n, G + 0.15);
      P.add(new THREE.BoxGeometry(0.06, 0.07, S1 + 0.4), PAL.dark, { pos: [p.x, p.y, p.z], ry: yaw, shade: 0.02 });
    }
    // buffer stop
    const b = at(S1 - 0.05, 0, G);
    const bm = compose(THREE, { pos: [b.x, b.y, b.z], ry: yaw });
    const bat = (o) => bm.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.9, 0.2, 0.14), PAL.red, { matrix: bat({ pos: [0, 0.5, 0] }) });
    P.add(new THREE.BoxGeometry(0.3, 0.2, 0.15), PAL.snow, { matrix: bat({ pos: [0, 0.5, 0.005] }) });
    for (const x of [-0.3, 0.3]) {
      P.add(new THREE.BoxGeometry(0.08, 0.5, 0.08), PAL.dark, { matrix: bat({ pos: [x, 0.3, 0.05] }) });
      P.add(new THREE.BoxGeometry(0.08, 0.6, 0.08), PAL.dark, { matrix: bat({ pos: [x, 0.25, 0.3], rot: [-0.7, 0, 0] }) });
    }
    P.add(new THREE.BoxGeometry(0.95, 0.06, 0.2), PAL.snow, { matrix: bat({ pos: [0, 0.62, 0] }), jitter: 0.02 });
  }

  // Mountain backdrop with a tunnel portal in its foothill.
  {
    const peak = (x, z, r, h, sx, sz, ry) => {
      P.add(new THREE.ConeGeometry(r, h, 8, 4), PAL.rock, { pos: [x, G - 0.1 + h / 2, z], scl: [sx, 1, sz], ry, jitter: 0.18, jitterY: 0.12, shade: 0.1, top: PAL.snow, y0: G + h * 0.45, y1: G + h * 0.62 });
    };
    peak(-1.7, -3.15, 2.3, 5.3, 1.15, 0.6, 0.2);
    peak(1.0, -3.55, 1.7, 3.4, 1.2, 0.5, 0.9);
    peak(-3.6, -2.3, 1.2, 2.4, 0.9, 0.8, 0.4);
    peak(3.0, -3.2, 1.1, 1.9, 1.0, 0.7, 0.1);
    const f2 = at(-1.05, 0, G);
    P.add(new THREE.IcosahedronGeometry(1, 1), PAL.rock, { pos: [f2.x, G + 0.2, f2.z], scl: [2.0, 1.55, 1.0], ry: yaw, jitter: 0.12, shade: 0.1, top: PAL.snow, y0: G + 0.8, y1: G + 1.25 });
    const pm = compose(THREE, { pos: [A.x - D.x * 0.1, G, A.z - D.z * 0.1], ry: yaw });
    const pat = (o) => pm.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.28, 1.15, 0.35), '#9b9aa8', { matrix: pat({ pos: [-0.62, 0.57, 0] }), jitter: 0.02 });
    P.add(new THREE.BoxGeometry(0.28, 1.15, 0.35), '#9b9aa8', { matrix: pat({ pos: [0.62, 0.57, 0] }), jitter: 0.02 });
    P.add(new THREE.BoxGeometry(1.6, 0.3, 0.38), '#9b9aa8', { matrix: pat({ pos: [0, 1.28, 0] }), jitter: 0.02 });
    P.add(new THREE.BoxGeometry(1.7, 0.08, 0.45), PAL.snow, { matrix: pat({ pos: [0, 1.47, 0] }), jitter: 0.02 });
    P.add(new THREE.BoxGeometry(0.98, 1.13, 0.05), '#1c2230', { matrix: pat({ pos: [0, 0.57, -0.05] }), shade: 0 });
  }

  // Platform, hut, bench, sign, lamp.
  const p0 = 2.4, p1 = 5.3, pn = 1.05;
  {
    const c = at((p0 + p1) / 2, pn, G);
    P.add(new THREE.BoxGeometry(0.95, 0.34, p1 - p0), '#a39a92', { pos: [c.x, G + 0.17, c.z], ry: yaw, jitter: 0.02, shade: 0.05 });
    const e = at((p0 + p1) / 2, pn - 0.45, G);
    P.add(new THREE.BoxGeometry(0.1, 0.06, p1 - p0 + 0.05), '#e6c84a', { pos: [e.x, G + 0.36, e.z], ry: yaw });
    P.add(new THREE.BoxGeometry(0.85, 0.05, p1 - p0 - 0.1), PAL.snow, { pos: [c.x + N.x * 0.04, G + 0.36, c.z + N.z * 0.04], ry: yaw, jitter: 0.03, jitterY: 0.01 });
    // ramp at the near end
    const r = at(p1 + 0.35, pn, G);
    P.add(new THREE.BoxGeometry(0.9, 0.06, 0.8), '#a39a92', { pos: [r.x, G + 0.16, r.z], ry: yaw, rot: [-0.4, yaw, 0] });

    const h = at(2.85, pn + 0.15, G + 0.36);
    const hm = compose(THREE, { pos: [h.x, h.y, h.z], ry: yaw });
    const hat = (o) => hm.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.7, 0.85, 1.1), '#d7a35a', { matrix: hat({ pos: [0.05, 0.425, 0] }), jitter: 0.015, shade: 0.05 });
    for (let k = 0; k < 6; k++) P.add(new THREE.BoxGeometry(0.72, 0.02, 1.12), '#b98845', { matrix: hat({ pos: [0.05, 0.12 + k * 0.13, 0] }) });
    P.add(gable(THREE, 0.7, 0.4, 1.1), '#d7a35a', { matrix: hat({ pos: [0.05, 0.85, 0], ry: Math.PI / 2 }) });
    P.add(roof(THREE, 0.95, 0.52, 1.35, 0.06), PAL.red, { matrix: hat({ pos: [0.05, 0.73, 0], ry: Math.PI / 2 }), shade: 0.05 });
    P.add(roof(THREE, 0.98, 0.53, 1.3, 0.05), PAL.snow, { matrix: hat({ pos: [0.05, 0.79, 0], ry: Math.PI / 2 }), jitter: 0.02, shade: 0.03 });
    P.add(new THREE.BoxGeometry(0.05, 0.55, 0.3), PAL.wood, { matrix: hat({ pos: [-0.31, 0.29, 0.22] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.25, 0.3), PAL.ice, { matrix: hat({ pos: [-0.31, 0.48, -0.25] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.3, 0.05), PAL.snow, { matrix: hat({ pos: [-0.32, 0.48, -0.25] }) });
    P.add(new THREE.BoxGeometry(0.16, 0.45, 0.16), '#8c5a48', { matrix: hat({ pos: [0.25, 1.15, 0.3] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.06, 0.2), PAL.snow, { matrix: hat({ pos: [0.25, 1.4, 0.3] }) });
    // bench
    const bnc = at(4.35, pn + 0.2, G + 0.36);
    P.add(new THREE.BoxGeometry(0.22, 0.05, 0.6), PAL.wood, { pos: [bnc.x, bnc.y + 0.2, bnc.z], ry: yaw });
    P.add(new THREE.BoxGeometry(0.04, 0.2, 0.6), PAL.wood, { pos: [bnc.x + N.x * 0.11, bnc.y + 0.35, bnc.z + N.z * 0.11], ry: yaw });
    P.add(new THREE.BoxGeometry(0.2, 0.04, 0.58), PAL.snow, { pos: [bnc.x, bnc.y + 0.245, bnc.z], ry: yaw, jitter: 0.01 });
    for (const s of [-0.24, 0.24]) {
      const q = bnc.clone().addScaledVector(D, s);
      P.add(new THREE.BoxGeometry(0.2, 0.2, 0.04), PAL.dark, { pos: [q.x, q.y + 0.1, q.z], ry: yaw });
    }
    // lamp post
    const lp = at(3.7, pn + 0.3, G + 0.36);
    P.add(new THREE.CylinderGeometry(0.03, 0.045, 1.3, 6), PAL.dark, { pos: [lp.x, lp.y + 0.65, lp.z] });
    P.add(new THREE.BoxGeometry(0.16, 0.2, 0.16), '#ffe9a8', { pos: [lp.x, lp.y + 1.38, lp.z] });
    P.add(new THREE.ConeGeometry(0.15, 0.12, 4), PAL.dark, { pos: [lp.x, lp.y + 1.53, lp.z], ry: Math.PI / 4 });
  }
  // Station sign (faces the line; text drawn on a canvas).
  let signMesh;
  {
    const s = at(5.0, pn + 0.38, G + 0.36);
    for (const d of [-0.42, 0.42]) {
      const q = s.clone().addScaledVector(D, d);
      P.add(new THREE.BoxGeometry(0.05, 0.85, 0.05), PAL.dark, { pos: [q.x, q.y + 0.42, q.z] });
    }
    P.add(new THREE.BoxGeometry(0.06, 0.28, 1.02), PAL.dark, { pos: [s.x, s.y + 0.78, s.z], ry: yaw });
    P.add(new THREE.BoxGeometry(0.1, 0.04, 1.06), PAL.snow, { pos: [s.x, s.y + 0.94, s.z], ry: yaw });
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = '#2f5f4b'; g.lineWidth = 6; g.strokeRect(5, 5, 246, 54);
    g.fillStyle = '#2f5f4b'; g.font = 'bold 38px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FIR HALT', 128, 35);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.235), new THREE.MeshLambertMaterial({ map: tex }));
    signMesh.position.set(s.x - N.x * 0.035, s.y + 0.78, s.z - N.z * 0.035);
    signMesh.rotation.y = yaw - Math.PI / 2;
    root.add(signMesh);
  }

  // Red carriage at the platform.
  {
    const c = at(4.3, 0, G + 0.17);
    const cm = compose(THREE, { pos: [c.x, c.y, c.z], ry: yaw });
    const cat = (o) => cm.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.8, 0.12, 2.3), PAL.dark, { matrix: cat({ pos: [0, 0.2, 0] }) });
    for (const z of [-0.75, 0.75]) {
      for (const x of [-0.3, 0.3]) P.add(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 10), '#252a35', { matrix: cat({ pos: [x, 0.13, z - 0.17], rot: [0, 0, Math.PI / 2] }) });
      for (const x of [-0.3, 0.3]) P.add(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 10), '#252a35', { matrix: cat({ pos: [x, 0.13, z + 0.17], rot: [0, 0, Math.PI / 2] }) });
    }
    P.add(new THREE.BoxGeometry(0.86, 0.78, 2.2), PAL.red, { matrix: cat({ pos: [0, 0.66, 0] }), jitter: 0.01, shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.88, 0.07, 2.22), '#f0e2c4', { matrix: cat({ pos: [0, 0.62, 0] }) });
    const rf = new THREE.CylinderGeometry(0.5, 0.5, 2.3, 10, 1, false, -Math.PI / 2.6, (Math.PI / 2.6) * 2);
    P.add(rf, '#3b3f4c', { matrix: cat({ pos: [0, 0.83, 0], rot: [Math.PI / 2, 0, 0], scl: [0.96, 1, 0.5] }) });
    const sn = new THREE.CylinderGeometry(0.5, 0.5, 2.1, 10, 1, false, -Math.PI / 3.5, (Math.PI / 3.5) * 2);
    P.add(sn, PAL.snow, { matrix: cat({ pos: [0, 0.86, 0], rot: [Math.PI / 2, 0, 0], scl: [0.9, 1, 0.5] }), jitter: 0.015 });
    for (let k = 0; k < 4; k++) {
      for (const x of [-0.44, 0.44]) P.add(new THREE.BoxGeometry(0.02, 0.24, 0.3), PAL.ice, { matrix: cat({ pos: [x, 0.84, -0.75 + k * 0.5] }) });
    }
    for (const z of [-1.13, 1.13]) {
      P.add(new THREE.BoxGeometry(0.3, 0.5, 0.03), PAL.ice, { matrix: cat({ pos: [0, 0.82, z] }) });
      P.add(new THREE.BoxGeometry(0.1, 0.06, 0.2), PAL.dark, { matrix: cat({ pos: [0, 0.22, z + Math.sign(z) * 0.12] }) });
    }
    P.add(new THREE.BoxGeometry(0.03, 0.42, 0.26), '#8a2a24', { matrix: cat({ pos: [-0.44, 0.6, 0.0] }) });
  }

  // Water tower, across the line.
  {
    const w = at(1.7, -1.45, G);
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
      P.add(new THREE.BoxGeometry(0.09, 1.45, 0.09), PAL.wood, { pos: [w.x + dx, G + 0.72, w.z + dz], rot: [dz * -0.12, 0, dx * 0.12] });
    }
    P.add(new THREE.BoxGeometry(0.85, 0.06, 0.06), PAL.wood, { pos: [w.x, G + 0.75, w.z + 0.33], rot: [0, 0, 0.5] });
    P.add(new THREE.BoxGeometry(0.06, 0.06, 0.85), PAL.wood, { pos: [w.x - 0.33, G + 0.75, w.z], rot: [0.5, 0, 0] });
    P.add(new THREE.CylinderGeometry(0.58, 0.58, 0.85, 12), '#8a5040', { pos: [w.x, G + 1.85, w.z], jitter: 0.01, shade: 0.05 });
    for (const y of [1.55, 2.15]) P.add(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 12), PAL.dark, { pos: [w.x, G + y, w.z] });
    P.add(new THREE.ConeGeometry(0.68, 0.42, 12), PAL.dark, { pos: [w.x, G + 2.48, w.z] });
    P.add(new THREE.ConeGeometry(0.62, 0.3, 12), PAL.snow, { pos: [w.x, G + 2.58, w.z], jitter: 0.02 });
    P.add(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), PAL.dark, { pos: [w.x + N.x * 0.6, G + 1.6, w.z + N.z * 0.6], rot: [0, yaw, 1.1] });
    P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 6), PAL.snow, { pos: [w.x, G + 2.8, w.z] });
  }

  // Signal post near the tunnel, on the platform side.
  const armPivot = at(1.15, 0.7, G);
  const arm = new THREE.Group();
  {
    const p = armPivot;
    P.add(new THREE.CylinderGeometry(0.04, 0.06, 2.4, 6), PAL.dark, { pos: [p.x, G + 1.2, p.z] });
    P.add(new THREE.ConeGeometry(0.07, 0.15, 6), PAL.dark, { pos: [p.x, G + 2.47, p.z] });
    P.add(new THREE.BoxGeometry(0.22, 0.15, 0.22), PAL.dark, { pos: [p.x, G + 0.08, p.z], ry: yaw });
    for (let k = 0; k < 7; k++) P.add(new THREE.BoxGeometry(0.2, 0.025, 0.025), PAL.dark, { pos: [p.x + D.x * 0.08, G + 0.35 + k * 0.27, p.z + D.z * 0.08], ry: yaw + Math.PI / 2 });
    const ag = new Painter(THREE, 71);
    ag.add(new THREE.BoxGeometry(0.75, 0.13, 0.04), PAL.red, { pos: [0.4, 0, 0] });
    ag.add(new THREE.BoxGeometry(0.06, 0.135, 0.045), PAL.snow, { pos: [0.6, 0, 0] });
    ag.add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), '#e8b84a', { pos: [-0.05, -0.05, 0], rot: [Math.PI / 2, 0, 0] });
    const am = ag.mesh(lambert(THREE));
    arm.add(am);
    arm.position.set(p.x - D.x * 0.05, G + 2.15, p.z - D.z * 0.05);
    arm.rotation.y = yaw + Math.PI / 2;
    root.add(arm);
  }

  // Frozen pond and a snowman gazing at it.
  {
    P.add(new THREE.CylinderGeometry(0.85, 0.9, 0.04, 11), PAL.ice, { pos: [2.6, G + 0.0, 2.45], scl: [1.25, 1, 0.85], jitter: 0.05, jitterY: 0, shade: 0.05 });
    P.add(new THREE.CylinderGeometry(0.98, 1.03, 0.03, 11), PAL.snow, { pos: [2.6, G - 0.01, 2.45], scl: [1.25, 1, 0.85], jitter: 0.06, jitterY: 0 });
    const sm = [0.4, 3.2];
    P.add(new THREE.IcosahedronGeometry(0.26, 1), PAL.snow, { pos: [sm[0], G + 0.22, sm[1]], jitter: 0.02, shade: 0.03 });
    P.add(new THREE.IcosahedronGeometry(0.18, 1), PAL.snow, { pos: [sm[0], G + 0.58, sm[1]], jitter: 0.015, shade: 0.03 });
    P.add(new THREE.ConeGeometry(0.035, 0.18, 5), '#e8802e', { pos: [sm[0] + 0.17, G + 0.6, sm[1] - 0.06], rot: [Math.PI / 2, 1.9, 0] });
    P.add(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 7), PAL.dark, { pos: [sm[0], G + 0.8, sm[1]] });
    P.add(new THREE.TorusGeometry(0.15, 0.04, 4, 8), PAL.red, { pos: [sm[0], G + 0.43, sm[1]], rot: [Math.PI / 2, 0, 0] });
  }

  // Fir trees (instanced), kept off the line, platform and buildings.
  const firP = new Painter(THREE, 81);
  firP.add(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 5), PAL.wood, { pos: [0, 0.17, 0] });
  const tiers = [[0.55, 0.7, 0.45], [0.42, 0.62, 0.85], [0.28, 0.5, 1.2]];
  for (const [r, h, y] of tiers) firP.add(new THREE.ConeGeometry(r, h, 7, 1), PAL.fir, { pos: [0, y, 0], ry: y * 3, jitter: 0.025, shade: 0.06, top: PAL.snow, y0: y + h * 0.05, y1: y + h * 0.45 });
  firP.add(new THREE.ConeGeometry(0.29, 0.06, 7, 1), PAL.snow, { pos: [0, 0.94, 0] });
  const firGeo = firP.geometry();
  const spots = [];
  const blocked = (x, z) => {
    const v = new THREE.Vector3(x - A.x, 0, z - A.z);
    const s = v.dot(D), n = v.dot(N);
    if (s > -1.2 && s < S1 + 0.4 && n > -0.9 && n < 1.9) return true;
    if (s > -0.5 && s < S1 && n >= 1.9 && n < 3.4) return true;
    if (Math.hypot(x - at(1.7, -1.45).x, z - at(1.7, -1.45).z) < 1.0) return true;
    if (Math.hypot(x - 2.6, z - 2.45) < 1.35) return true;
    if (Math.hypot(x - 0.4, z - 3.2) < 0.6) return true;
    if (z < -2.2 && Math.abs(x + 1.4) < 2.6) return true;
    return false;
  };
  let tries = 0;
  while (spots.length < 34 && tries++ < 4000) {
    const x = (rand() * 2 - 1) * 4.4, z = (rand() * 2 - 1) * 4.1;
    if (Math.pow(Math.abs(x) / 4.3, 3) + Math.pow(Math.abs(z) / 4.0, 3) > 1) continue;
    if (blocked(x, z)) continue;
    if (spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 0.55)) continue;
    // clustered: prefer the right flank and the front-left corner
    const pref = (x > 1.2 && z < 1.6) || (x < -2.4 && z < 1.0);
    if (!pref && rand() > 0.3) continue;
    spots.push([x, z, 0.45 + rand() * 0.5]);
  }
  // a hero fir by the platform end, taller than the rest
  spots.unshift([at(6.3, 1.9).x, at(6.3, 1.9).z, 1.25]);
  const use = low ? spots.filter((_, i) => i % 2 === 0) : spots;
  const NF = use.length;
  const firs = new THREE.InstancedMesh(firGeo, lambert(THREE), NF);
  firs.castShadow = true;
  firs.receiveShadow = true;
  const dm = new THREE.Object3D();
  const tc = new THREE.Color();
  for (let i = 0; i < NF; i++) {
    const [x, z, s] = use[i];
    dm.position.set(x, G - 0.03, z);
    dm.rotation.set((rand() - 0.5) * 0.08, rand() * 6.28, (rand() - 0.5) * 0.08);
    dm.scale.set(s * (0.9 + rand() * 0.2), s * (0.9 + rand() * 0.3), s * (0.9 + rand() * 0.2));
    dm.updateMatrix();
    firs.setMatrixAt(i, dm.matrix);
    firs.setColorAt(i, tc.setRGB(1, 1, 1).multiplyScalar(0.85 + rand() * 0.3));
  }
  root.add(firs);

  root.add(P.mesh(lambert(THREE)));

  // Snowfall: one Points cloud; the fall and drift run in the vertex shader (no per-frame CPU loop).
  const NSN = low ? 220 : 520;
  const sp = new Float32Array(NSN * 3);
  const sv = new Float32Array(NSN * 2);
  for (let i = 0; i < NSN; i++) {
    sp[i * 3] = (rand() * 2 - 1) * 5.5;
    sp[i * 3 + 1] = rand() * 7.5;
    sp[i * 3 + 2] = (rand() * 2 - 1) * 5.5;
    sv[i * 2] = 0.25 + rand() * 0.3;
    sv[i * 2 + 1] = i;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('fall', new THREE.BufferAttribute(sv, 2));
  const snowMat = new THREE.PointsMaterial({ map: glowTexture(THREE), color: '#ffffff', size: 0.11, transparent: true, depthWrite: false, opacity: 0.95 });
  const uTime = { value: 0 };
  snowMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\nattribute vec2 fall;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.y = ${G.toFixed(3)} + mod(position.y - ${G.toFixed(3)} - fall.x * uTime, 7.5);
      transformed.x -= 0.1714 * cos(uTime * 0.7 + fall.y);`);
  };
  const snow = new THREE.Points(sg, snowMat);
  snow.frustumCulled = false;
  root.add(snow);

  // Light: high cold sun + bright sky/snow bounce.
  root.add(new THREE.HemisphereLight('#d6e9ff', '#f1eee6', 1.75));
  const key = keyLight(THREE, ctx, { color: '#fff4e0', intensity: 2.5, pos: [5, 9, 4], extent: 6.8 });
  root.add(key, key.target);

  root.add(skyDome(THREE, { top: '#4d8fd1', mid: '#d4e8f6', bottom: '#e4eef6', sun: [0.45, 0.75, 0.4], sunColor: '#fff6dd', sunPow: 60, horizon: 0.55 }));

  function update(t) {
    uTime.value = t;
    arm.rotation.z = 0.5 + Math.max(0, Math.sin(t * 0.25)) * 0.05;
  }
  update(0, 0);

  return {
    root,
    background: new THREE.Color('#d4e8f6'),
    fog: new THREE.Fog('#dbeaf6', 22, 58),
    update,
    dispose: () => disposeTree(root),
  };
}
