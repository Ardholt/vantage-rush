// Gull Rock: dawn on a rocky islet. Striped lighthouse, keeper's cottage, jetty, moored rowing boat.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, gable, roof, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  sea: '#2f9c9a',
  seaDeep: '#1f6f78',
  foam: '#f4efe4',
  rock: '#8c7b86',
  rockDark: '#66596a',
  grass: '#9fb173',
  sand: '#e2bf8e',
  earth: '#9a6b4f',
  wood: '#8a5a3c',
  white: '#f5eee2',
  red: '#d4493f',
  slate: '#4f6178',
  lamp: '#ffe6a0',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(1771);
  const root = new THREE.Group();
  const P = new Painter(THREE, 11);
  const E = new Painter(THREE, 12);
  const mat = lambert(THREE);

  const SEA = 0.3;
  const PL = 1.22;

  // Plinth: resin sea slab over sand and earth, on a wooden board.
  const rim = outline(rand, { n: 22, rx: 4.65, rz: 4.5, wob: 0.035, sq: 2.3 });
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.75, -1.4, 0.06), PAL.wood, { shade: 0.08 });
  P.add(slab(THREE, rim, -1.4, -0.95), PAL.earth, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.95, -0.45), PAL.sand, { jitter: 0.04, shade: 0.08 });
  P.add(slab(THREE, rim, -0.45, SEA), PAL.seaDeep, { shade: 0.05, top: PAL.sea, y0: -0.45, y1: SEA });

  // Water surface (animated): polar grid matching the outline.
  const RINGS = low ? 5 : 8;
  const n = rim.length;
  const wv = [];
  const wIdx = [];
  for (let r = 0; r <= RINGS; r++) {
    for (let i = 0; i < n; i++) {
      const k = r / RINGS;
      if (r === 0 && i > 0) break;
      wv.push(rim[i][0] * k, SEA + 0.04, rim[i][1] * k);
    }
  }
  const vi = (r, i) => (r === 0 ? 0 : 1 + (r - 1) * n + (i % n));
  for (let r = 0; r < RINGS; r++) {
    for (let i = 0; i < n; i++) {
      if (r === 0) wIdx.push(0, vi(1, i + 1), vi(1, i));
      else {
        wIdx.push(vi(r, i), vi(r, i + 1), vi(r + 1, i));
        wIdx.push(vi(r, i + 1), vi(r + 1, i + 1), vi(r + 1, i));
      }
    }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3));
  wg.setIndex(wIdx);
  const waterGeo = wg.toNonIndexed();
  waterGeo.computeVertexNormals();
  const wpos = waterGeo.attributes.position;
  const wCol = new Float32Array(wpos.count * 3);
  {
    const c1 = new THREE.Color(PAL.sea), c2 = new THREE.Color('#5cc0b0'), c = new THREE.Color();
    for (let f = 0; f < wpos.count; f += 3) {
      c.copy(c1).lerp(c2, rand() * 0.35);
      for (let v = 0; v < 3; v++) wCol.set([c.r, c.g, c.b], (f + v) * 3);
    }
  }
  waterGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
  // Swell runs in the vertex shader (no per-frame CPU loop or buffer upload); calm along the rim.
  const rimR = Math.min(...rim.map(([x, z]) => Math.hypot(x, z)));
  const waterMat = lambert(THREE);
  const uTime = { value: 0 };
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float edge = clamp((${rimR.toFixed(3)} - length(position.xz)) / 0.6, 0.0, 1.0);
      transformed.y = ${(SEA + 0.04).toFixed(3)} + edge * 0.0175 * (sin(position.x * 1.7 + uTime * 1.1) + cos(position.z * 1.3 - uTime * 0.8));`);
  };
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.receiveShadow = true;
  root.add(water);

  // Islet: jittered rock lumps under a grass cap.
  const rockDetail = low ? 0 : 1;
  const rock = (x, y, z, sx, sy, sz, col, ry = 0) =>
    P.add(new THREE.IcosahedronGeometry(1, rockDetail), col, { pos: [x, y, z], scl: [sx, sy, sz], ry, jitter: 0.09, shade: 0.12 });
  rock(-0.9, 0.35, -0.6, 2.35, 0.8, 2.05, PAL.rock);
  rock(-2.1, 0.45, -1.35, 1.35, 0.75, 1.25, PAL.rockDark, 0.4);
  rock(0.35, 0.3, -0.25, 1.25, 0.65, 1.2, PAL.rock, 1.1);
  rock(-1.4, 0.35, 0.65, 1.2, 0.6, 0.95, PAL.rockDark, 0.2);
  rock(-0.3, 0.2, -1.95, 1.1, 0.5, 0.8, PAL.rock, 2.2);
  rock(-2.9, 0.25, -0.2, 0.7, 0.45, 0.6, PAL.rock, 0.7);
  P.add(new THREE.CylinderGeometry(1.95, 2.1, 0.26, 13, 1), PAL.grass, { pos: [-0.95, PL - 0.13, -0.6], jitter: 0.07, jitterY: 0.025, shade: 0.08 });
  // shingle beach under the jetty steps
  P.add(new THREE.CylinderGeometry(0.85, 1.0, 0.16, 9), PAL.sand, { pos: [0.75, SEA + 0.05, 0.75], jitter: 0.06, shade: 0.06 });

  // Sea stacks and scattered rocks with foam collars.
  const stack = (x, z, h, w, ry) => {
    P.add(new THREE.CylinderGeometry(w * 0.55, w, h, 7, 2), PAL.rockDark, { pos: [x, SEA + h / 2 - 0.15, z], ry, jitter: 0.1, shade: 0.12, top: PAL.rock, y0: SEA, y1: SEA + h });
    P.add(new THREE.IcosahedronGeometry(w * 0.6, 0), PAL.rock, { pos: [x, SEA + h - 0.1, z], scl: [1, 0.6, 1], ry, jitter: 0.06 });
    P.add(new THREE.RingGeometry(w * 0.95, w * 1.3, 9), PAL.foam, { pos: [x, SEA + 0.06, z], rot: [-Math.PI / 2, 0, 0], jitter: 0.06, jitterY: 0, shade: 0.03 });
  };
  stack(3.05, -2.35, 2.5, 0.55, 0.3);
  stack(3.85, -0.75, 1.55, 0.45, 1.2);
  const pebble = (x, z, s) => {
    P.add(new THREE.IcosahedronGeometry(s, 0), rand() > 0.5 ? PAL.rock : PAL.rockDark, { pos: [x, SEA, z], scl: [1, 0.7, 1], ry: rand() * 6, jitter: s * 0.2 });
    P.add(new THREE.RingGeometry(s * 0.95, s * 1.35, 8), PAL.foam, { pos: [x, SEA + 0.06, z], rot: [-Math.PI / 2, 0, 0], jitter: s * 0.15, jitterY: 0 });
  };
  pebble(2.2, -3.1, 0.3);
  pebble(-3.6, 1.6, 0.35);
  pebble(-2.6, 2.6, 0.22);
  pebble(1.6, -1.6, 0.25);
  pebble(-3.5, -2.4, 0.4);
  // foam collar around the islet
  for (const [r0, a0, al] of [[2.45, 0.2, 1.9], [2.55, 2.3, 1.4], [2.4, 3.9, 2.0], [2.75, 1.0, 0.6], [2.9, 4.6, 0.7]]) {
    P.add(new THREE.RingGeometry(r0, r0 + 0.18 + rand() * 0.1, 7, 1, a0, al), PAL.foam, { pos: [-0.85, SEA + 0.07, -0.55], rot: [-Math.PI / 2, 0, 0], scl: [1.12, 1, 1], jitter: 0.1, jitterY: 0, shade: 0.03 });
  }

  // Lighthouse.
  const L = [-1.75, PL, -1.25];
  P.add(new THREE.CylinderGeometry(0.72, 0.8, 0.28, 9), PAL.rock, { pos: [L[0], PL + 0.14, L[2]], jitter: 0.03 });
  const TB = PL + 0.28, TT = TB + 2.9, R0 = 0.56, R1 = 0.37;
  const bands = 5;
  for (let b = 0; b < bands; b++) {
    const y0 = TB + ((TT - TB) * b) / bands, y1 = TB + ((TT - TB) * (b + 1)) / bands;
    const r0 = R0 + (R1 - R0) * (b / bands), r1 = R0 + (R1 - R0) * ((b + 1) / bands);
    P.add(new THREE.CylinderGeometry(r1, r0, y1 - y0, 14, 1), b % 2 ? PAL.red : PAL.white, { pos: [L[0], (y0 + y1) / 2, L[2]], shade: 0.03 });
  }
  P.add(new THREE.BoxGeometry(0.26, 0.46, 0.1), PAL.slate, { pos: [L[0] + 0.33, TB + 0.23, L[2] + 0.42], ry: 0.65 });
  P.add(new THREE.BoxGeometry(0.12, 0.18, 0.08), PAL.slate, { pos: [L[0] - 0.12, TB + 1.55, L[2] + 0.46], ry: -0.25 });
  P.add(new THREE.CylinderGeometry(0.6, 0.5, 0.1, 14), '#3d3a44', { pos: [L[0], TT + 0.05, L[2]] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    P.add(new THREE.BoxGeometry(0.03, 0.2, 0.03), '#3d3a44', { pos: [L[0] + Math.cos(a) * 0.56, TT + 0.2, L[2] + Math.sin(a) * 0.56] });
  }
  P.add(new THREE.TorusGeometry(0.56, 0.025, 4, 18), '#3d3a44', { pos: [L[0], TT + 0.3, L[2]], rot: [Math.PI / 2, 0, 0] });
  E.add(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 10), PAL.lamp, { pos: [L[0], TT + 0.31, L[2]] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    P.add(new THREE.BoxGeometry(0.04, 0.42, 0.04), '#3d3a44', { pos: [L[0] + Math.cos(a) * 0.31, TT + 0.31, L[2] + Math.sin(a) * 0.31] });
  }
  P.add(new THREE.ConeGeometry(0.44, 0.42, 14), PAL.red, { pos: [L[0], TT + 0.73, L[2]], shade: 0.03 });
  P.add(new THREE.SphereGeometry(0.07, 6, 4), '#3d3a44', { pos: [L[0], TT + 0.98, L[2]] });
  const lampY = TT + 0.31;

  // Keeper's cottage.
  const CM = compose(THREE, { pos: [0.05, PL, -0.2], ry: 0.55 });
  const at = (o) => CM.clone().multiply(compose(THREE, o));
  P.add(new THREE.BoxGeometry(1.0, 0.7, 1.5), PAL.white, { matrix: at({ pos: [0, 0.35, 0] }), jitter: 0.015, shade: 0.04 });
  P.add(new THREE.BoxGeometry(1.08, 0.1, 1.58), PAL.rock, { matrix: at({ pos: [0, 0.05, 0] }), jitter: 0.02 });
  P.add(gable(THREE, 1.0, 0.5, 1.5), PAL.white, { matrix: at({ pos: [0, 0.7, 0] }), shade: 0.03 });
  P.add(roof(THREE, 1.24, 0.62, 1.72, 0.08), PAL.slate, { matrix: at({ pos: [0, 0.58, 0] }), jitter: 0.015, shade: 0.06 });
  P.add(new THREE.BoxGeometry(0.24, 0.62, 0.24), PAL.rock, { matrix: at({ pos: [0.22, 1.05, -0.48] }), jitter: 0.02 });
  P.add(new THREE.BoxGeometry(0.3, 0.06, 0.3), PAL.rockDark, { matrix: at({ pos: [0.22, 1.38, -0.48] }) });
  P.add(new THREE.BoxGeometry(0.06, 0.42, 0.24), PAL.wood, { matrix: at({ pos: [0.52, 0.23, 0.3] }) });
  E.add(new THREE.BoxGeometry(0.04, 0.2, 0.22), PAL.lamp, { matrix: at({ pos: [0.51, 0.42, -0.3] }) });
  E.add(new THREE.BoxGeometry(0.04, 0.2, 0.22), PAL.lamp, { matrix: at({ pos: [-0.51, 0.42, 0.2] }) });
  E.add(new THREE.BoxGeometry(0.2, 0.16, 0.04), PAL.lamp, { matrix: at({ pos: [0, 0.95, 0.76] }) });
  P.add(new THREE.BoxGeometry(0.4, 0.08, 0.18), PAL.wood, { matrix: at({ pos: [0.72, 0.18, -0.25] }) });
  P.add(new THREE.BoxGeometry(0.04, 0.12, 0.04), PAL.wood, { matrix: at({ pos: [0.72, 0.07, -0.33] }) });
  // flagpole with a coral pennant at the cottage's seaward corner
  P.add(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 5), PAL.white, { pos: [0.95, PL + 0.75, 0.75] });
  P.add(new THREE.ConeGeometry(0.13, 0.5, 3), PAL.red, { pos: [0.95 + 0.25, PL + 1.38, 0.75], rot: [0, 0, -Math.PI / 2], scl: [1, 1, 0.15] });

  // Garden fence with a gate gap, on the west side of the cottage.
  for (let i = 0; i < 11; i++) {
    if (i === 4 || i === 5) continue;
    const a = -0.2 + (i / 10) * 2.0;
    const x = -0.85 + Math.cos(a + 1.6) * 1.15, z = 0.45 + Math.sin(a + 1.6) * 0.65;
    P.add(new THREE.BoxGeometry(0.05, 0.28 + rand() * 0.05, 0.05), PAL.white, { pos: [x, PL + 0.14, z], ry: rand(), rot: [rand() * 0.12 - 0.06, rand(), 0] });
  }
  for (let i = 0; i < 5; i++) {
    const s = 0.12 + rand() * 0.05;
    P.add(new THREE.CylinderGeometry(s, s, 0.04, 6), '#d8cbb5', { pos: [-0.95 + i * 0.22 - rand() * 0.05, PL + 0.01, -0.75 + i * 0.12], ry: rand() });
  }
  // Tufts of sea pink.
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, d = 1.2 + rand() * 0.6;
    P.add(new THREE.IcosahedronGeometry(0.08 + rand() * 0.05, 0), '#e58ca0', { pos: [-0.95 + Math.cos(a) * d, PL + 0.03, -0.6 + Math.sin(a) * d * 0.9], scl: [1, 0.6, 1] });
  }

  // Jetty: planks on posts, from the shingle out to deep water.
  const J0 = new THREE.Vector3(0.75, SEA + 0.3, 0.95), JD = new THREE.Vector3(0.8, 0, 0.6), JL = 2.7;
  const jYaw = Math.atan2(JD.x, JD.z);
  const planks = 14;
  for (let i = 0; i < planks; i++) {
    const p = J0.clone().addScaledVector(JD, (i + 0.5) * (JL / planks));
    P.add(new THREE.BoxGeometry(0.62, 0.05, JL / planks - 0.03), i % 3 ? PAL.wood : '#a06d48', { pos: [p.x, p.y + (rand() - 0.5) * 0.02, p.z], ry: jYaw + (rand() - 0.5) * 0.06, shade: 0.08 });
  }
  for (let i = 0; i <= 3; i++) {
    const p = J0.clone().addScaledVector(JD, 0.3 + i * ((JL - 0.4) / 3));
    for (const s of [-1, 1]) {
      const q = p.clone().add(new THREE.Vector3(JD.z * 0.3 * s, 0, -JD.x * 0.3 * s));
      P.add(new THREE.CylinderGeometry(0.055, 0.06, 0.75, 6), '#6e4630', { pos: [q.x, SEA + 0.05, q.z], rot: [0, rand(), (rand() - 0.5) * 0.08] });
    }
  }
  const JE = J0.clone().addScaledVector(JD, JL - 0.15);
  const side = new THREE.Vector3(-JD.z, 0, JD.x);
  const bol = JE.clone().addScaledVector(side, -0.24);
  P.add(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 7), '#3d3a44', { pos: [bol.x, J0.y + 0.13, bol.z] });
  const pots = JE.clone().addScaledVector(JD, -0.55).addScaledVector(side, 0.12);
  P.add(new THREE.BoxGeometry(0.26, 0.18, 0.2), '#c98f4c', { pos: [pots.x, J0.y + 0.12, pots.z], ry: jYaw + 0.2, jitter: 0.01 });
  P.add(new THREE.BoxGeometry(0.24, 0.17, 0.2), '#c98f4c', { pos: [pots.x - 0.05, J0.y + 0.3, pots.z + 0.03], ry: jYaw - 0.15, jitter: 0.01 });
  P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), PAL.red, { pos: [pots.x - 0.25, J0.y + 0.05, pots.z - 0.25] });

  // Rowing boat (animated).
  const boatP = new Painter(THREE, 21);
  const hull = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  {
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const z = hp.getZ(i);
      const t = Math.max(0, z);
      hp.setX(i, hp.getX(i) * (1 - 0.6 * t * t));
    }
  }
  boatP.add(hull, '#e0703e', { scl: [0.42, 0.27, 0.95], shade: 0.05, top: PAL.white, y0: -0.12, y1: 0 });
  boatP.add(new THREE.BoxGeometry(0.62, 0.035, 0.14), PAL.wood, { pos: [0, -0.04, 0.05] });
  boatP.add(new THREE.BoxGeometry(0.46, 0.035, 0.18), PAL.wood, { pos: [0, -0.06, -0.5] });
  boatP.add(new THREE.BoxGeometry(0.04, 0.03, 1.15), PAL.wood, { pos: [0.2, 0.0, -0.05], ry: 0.12, rot: [0, 0.12, 0.2] });
  boatP.add(new THREE.BoxGeometry(0.04, 0.03, 1.15), PAL.wood, { pos: [-0.2, 0.0, -0.05], ry: -0.12, rot: [0, -0.12, -0.2] });
  const boat = boatP.mesh(lambert(THREE, { side: THREE.DoubleSide }));
  const boatHome = JE.clone().addScaledVector(side, 0.68).addScaledVector(JD, -0.5);
  boat.position.set(boatHome.x, SEA + 0.2, boatHome.z);
  boat.rotation.y = jYaw + 0.12;
  root.add(boat);
  // mooring line
  {
    const a = new THREE.Vector3(bol.x, J0.y + 0.2, bol.z);
    const b = new THREE.Vector3(boatHome.x, SEA + 0.12, boatHome.z).addScaledVector(JD, 0.75);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.12;
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(0.012, 0.012, len, 4);
    const dir = b.clone().sub(a).normalize();
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, 1, 1));
    P.add(g, '#d8cbb5', { matrix: m });
  }

  // Buoy (animated with the boat).
  const buoyP = new Painter(THREE, 31);
  buoyP.add(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 8), PAL.red, { pos: [0, 0.05, 0] });
  buoyP.add(new THREE.CylinderGeometry(0.1, 0.16, 0.16, 8), PAL.white, { pos: [0, 0.24, 0] });
  buoyP.add(new THREE.ConeGeometry(0.1, 0.22, 8), PAL.red, { pos: [0, 0.43, 0] });
  const buoy = buoyP.mesh(boat.material);
  buoy.position.set(-3.1, SEA, 2.55);
  root.add(buoy);

  const statics = P.mesh(mat);
  root.add(statics);
  const glow = E.mesh(unlit(THREE), { cast: false, receive: false });
  root.add(glow);
  const halo = halos(THREE, [[L[0], lampY, L[2]]], { color: '#ffd38a', size: 2.4, opacity: 0.85 });
  root.add(halo);

  // Lamp beam: a faint rotating cone pair.
  const bcv = document.createElement('canvas');
  bcv.width = 4; bcv.height = 64;
  {
    const g = bcv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 64);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff2cc', map: new THREE.CanvasTexture(bcv), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beamGeo = new THREE.ConeGeometry(0.7, 5.5, 10, 1, true);
  beamGeo.translate(0, -2.75, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beams = new THREE.Mesh(mergeGeometries([beamGeo, beamGeo.clone().rotateY(Math.PI)]), beamMat);
  beams.position.set(L[0], lampY, L[2]);
  beams.renderOrder = 2;
  root.add(beams);

  // Chimney smoke puffs.
  const PUFFS = low ? 4 : 7;
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshLambertMaterial({ color: '#fffaf2', emissive: '#6b5a55', flatShading: true }), PUFFS);
  root.add(puffs);
  const chim = new THREE.Vector3(0.22, 1.42, -0.48).applyMatrix4(CM);

  // Gulls.
  const gullGeo = new THREE.BufferGeometry();
  gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.12, -0.42, 0.1, -0.06, 0, 0.02, -0.08,
    0, 0, 0.12, 0, 0.02, -0.08, 0.42, 0.1, -0.06,
    0, 0, 0.16, 0, -0.04, -0.14, 0, 0.03, -0.14,
  ], 3));
  gullGeo.computeVertexNormals();
  const GULLS = low ? 2 : 4;
  const gulls = new THREE.InstancedMesh(gullGeo, new THREE.MeshLambertMaterial({ color: '#fbf7f0', side: THREE.DoubleSide, flatShading: true }), GULLS);
  root.add(gulls);
  const gullCfg = [
    { r: 1.6, h: 5.6, s: 0.5, p: 0 },
    { r: 2.4, h: 4.9, s: 0.38, p: 2.1 },
    { r: 2.0, h: 6.2, s: -0.45, p: 4.0 },
    { r: 3.0, h: 5.3, s: 0.3, p: 1.2 },
  ];

  // Light.
  root.add(new THREE.HemisphereLight('#ffe0cc', '#3f8e90', 1.7));
  const key = keyLight(THREE, ctx, { color: '#ffc196', intensity: 2.6, pos: [7, 6, -5], extent: 6.5 });
  root.add(key, key.target);

  const sky = skyDome(THREE, { top: '#c97b98', mid: '#ffd3a1', bottom: '#eaa595', sun: [0.75, 0.08, -0.6], sunColor: '#fff0c0', sunPow: 30, horizon: 0.6 });
  root.add(sky);

  const dummy = new THREE.Object3D();
  function update(t) {
    uTime.value = t;
    boat.position.y = SEA + 0.2 + Math.sin(t * 1.3) * 0.03;
    boat.rotation.z = Math.sin(t * 1.1) * 0.06;
    boat.rotation.x = Math.sin(t * 0.9 + 1) * 0.03;
    buoy.position.y = SEA + Math.sin(t * 1.7 + 2) * 0.04;
    buoy.rotation.z = Math.sin(t * 1.4) * 0.12;
    beams.rotation.y = t * 0.6;
    for (let i = 0; i < PUFFS; i++) {
      const k = ((t * 0.22 + i / PUFFS) % 1);
      dummy.position.set(chim.x + k * 0.9, chim.y + k * 1.1, chim.z + k * 0.6 + Math.sin(k * 6 + i) * 0.06);
      dummy.scale.setScalar(Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.35 + k * 0.9));
      dummy.rotation.set(i, k * 2, 0);
      dummy.updateMatrix();
      puffs.setMatrixAt(i, dummy.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < GULLS; i++) {
      const g = gullCfg[i];
      const a = g.p + t * g.s;
      dummy.position.set(L[0] + 0.6 + Math.cos(a) * g.r, g.h + Math.sin(t * 0.7 + i) * 0.15, L[2] + Math.sin(a) * g.r);
      dummy.rotation.set(0, -a + (g.s > 0 ? 0 : Math.PI), Math.sign(g.s) * 0.35);
      dummy.scale.set(1, 0.6 + 0.6 * Math.sin(t * 6 + i * 1.7), 1);
      dummy.updateMatrix();
      gulls.setMatrixAt(i, dummy.matrix);
    }
    gulls.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#ffd7ae'),
    fog: new THREE.Fog('#ffd7ae', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
