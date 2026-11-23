// Roof Garden: golden hour on a city rooftop. Wooden water tank on legs, raised beds and sunflowers,
// a pigeon loft, string lights, a deck chair someone just left, washing on the line, the neighbours' roofs.
import { Painter, compose, lambert, unlit, gable, roof, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  brick: '#a9543c',
  brick2: '#8f4636',
  brick3: '#b8694a',
  stucco: '#e2c6a0',
  coping: '#d8c7ad',
  felt: '#a69588',
  deck: '#a87650',
  deck2: '#94653f',
  wood: '#7a5238',
  tank: '#a5693f',
  iron: '#3b3640',
  teal: '#2f8f8a',
  teal2: '#5fb3a6',
  cream: '#f2e3c4',
  slate: '#5d5a6b',
  soil: '#4a3428',
  leaf: '#6f9a46',
  leaf2: '#8fb456',
  sun: '#f2b632',
  terracotta: '#c0643f',
  bulb: '#ffe0a0',
};

// Sky with a distant skyline drawn into the horizon band (direction-based, so it sits at infinity).
function citySky(THREE) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      cTop: { value: new THREE.Color('#6f8db3') },
      cMid: { value: new THREE.Color('#ffc07a') },
      cLow: { value: new THREE.Color('#d9a088') },
      cDeep: { value: new THREE.Color('#9c7480') },
      cFar: { value: new THREE.Color('#c88576') },
      cNear: { value: new THREE.Color('#8e5a64') },
      cSun: { value: new THREE.Color('#fff0c4') },
      sunDir: { value: new THREE.Vector3(-0.88, 0.1, 0.35).normalize() },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; gl_Position.z = p.w * 0.99999; }`,
    fragmentShader: `uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cLow; uniform vec3 cDeep; uniform vec3 cFar; uniform vec3 cNear; uniform vec3 cSun; uniform vec3 sunDir;
      varying vec3 vDir;
      float hsh(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        float az = atan(d.z, d.x);
        vec3 c = h > 0.0 ? mix(cMid, cTop, smoothstep(0.0, 0.7, h)) : mix(cMid, cLow, smoothstep(0.0, -0.3, h));
        float s = max(dot(d, sunDir), 0.0);
        c += cSun * (pow(s, 40.0) * 1.2 + 0.45 * pow(s, 5.0));
        // far row: low, pale blocks
        float f1 = floor(az * 34.0 + 0.3);
        float t1 = 0.012 + hsh(f1) * 0.035;
        if (h < t1) c = mix(c, cFar, 0.75);
        // near row: taller, darker, with the odd lit window
        float f2 = floor(az * 17.0);
        float r2 = hsh(f2 + 3.1);
        float t2 = 0.004 + r2 * r2 * 0.075 + step(0.93, hsh(f2 + 9.0)) * 0.04;
        if (h < t2) {
          c = mix(c, cNear, 0.9);
          vec2 g = vec2(fract(az * 17.0 * 7.0), fract(h * 160.0));
          float lit = step(0.86, hsh(floor(az * 119.0) * 3.7 + floor(h * 160.0)));
          c = mix(c, vec3(1.0, 0.82, 0.5), lit * step(0.3, g.x) * step(g.x, 0.7) * step(0.35, g.y) * step(g.y, 0.75) * smoothstep(-0.02, 0.01, h));
        }
        if (h < 0.0) c = mix(c, mix(cLow, cDeep, smoothstep(-0.1, -0.7, h)), smoothstep(0.0, -0.2, h) * 0.85);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.matrixAutoUpdate = false;
  return m;
}

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(5151);
  const root = new THREE.Group();
  const P = new Painter(THREE, 51);
  const E = new Painter(THREE, 52);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  const G = 0.55; // our roof
  const BASE = -1.25;
  const bar = (a, b, r, col, o = {}) => {
    const len = a.distanceTo(b);
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize()), v(1, 1, 1));
    P.add(o.round ? new THREE.CylinderGeometry(r, r, len, 5) : new THREE.BoxGeometry(r, len, r), col, { matrix: m, ...o });
  };

  // Plinth: the top storey of our building and slices of the neighbours, on a dark board.
  P.add(new THREE.BoxGeometry(9.9, 0.3, 9.5), '#3b2e2c', { pos: [0, BASE - 0.15, 0], jitter: 0.02, shade: 0.05 });
  const blocks = [
    // x0, x1, z0, z1, top, colour
    [-4.6, 3.2, -2.9, 4.4, G, PAL.brick],
    [-4.6, 1.3, -4.4, -2.9, G - 0.35, PAL.brick3],
    [1.3, 3.2, -4.4, -2.9, G + 0.35, PAL.stucco],
    [3.2, 4.6, -4.4, 4.4, G - 0.5, PAL.brick2],
  ];
  for (const [x0, x1, z0, z1, top, col] of blocks) {
    P.add(new THREE.BoxGeometry(x1 - x0, top - BASE, z1 - z0), col, { pos: [(x0 + x1) / 2, (top + BASE) / 2, (z0 + z1) / 2], jitter: 0.015, shade: 0.06 });
    // cornice band
    P.add(new THREE.BoxGeometry(x1 - x0 + 0.08, 0.1, z1 - z0 + 0.08), col === PAL.stucco ? '#cdb08a' : PAL.coping, { pos: [(x0 + x1) / 2, top - 0.25, (z0 + z1) / 2] });
  }
  // brick courses: faint darker bands on our facade
  for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(7.84, 0.025, 7.34), PAL.brick2, { pos: [-0.7, BASE + 0.35 + k * 0.38, 0.75] });
  // windows of the flat below: some lit, one with a plant, on the front and the left
  const win = (x, y, z, face, lit) => {
    const m = compose(THREE, { pos: [x, y, z], ry: face });
    const w = (o) => m.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.5, 0.06, 0.12), PAL.coping, { matrix: w({ pos: [0, -0.33, 0.04] }) });
    P.add(new THREE.BoxGeometry(0.46, 0.08, 0.06), PAL.coping, { matrix: w({ pos: [0, 0.33, 0.02] }) });
    (lit ? E : P).add(new THREE.BoxGeometry(0.4, 0.6, 0.03), lit ? '#ffc977' : '#4f5470', { matrix: w({ pos: [0, 0, 0.005] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.6, 0.04), PAL.cream, { matrix: w({ pos: [0, 0, 0.02] }) });
  };
  [[-3.6, 0], [-2.2, 1], [-0.8, 0], [0.6, 0], [2.1, 1]].forEach(([x, lit]) => win(x, -0.35, 4.4, 0, lit));
  [[3.4, 0], [1.8, 1], [0.2, 0], [-1.6, 0]].forEach(([z, lit]) => win(-4.6, -0.35, z, -Math.PI / 2, lit));
  [[-3.4, 1], [-1.6, 0], [0.2, 0]].forEach(([x, lit]) => win(x, -0.6, -4.4, Math.PI, lit));
  [[3.5, 0], [1.6, 1], [-0.5, 0], [-2.4, 1]].forEach(([z, lit]) => win(4.6, -0.6, z, Math.PI / 2, lit));
  // a geranium box under one front window
  P.add(new THREE.BoxGeometry(0.5, 0.12, 0.14), PAL.terracotta, { pos: [-0.8, -0.74, 4.5] });
  for (let i = 0; i < 4; i++) P.add(new THREE.IcosahedronGeometry(0.07, 0), i % 2 ? '#d6403a' : PAL.leaf, { pos: [-0.98 + i * 0.12, -0.63, 4.5] });

  // Our roof: felt, a deck in the front-right, parapets with coping.
  P.add(new THREE.BoxGeometry(7.7, 0.03, 7.2), PAL.felt, { pos: [-0.7, G + 0.015, 0.75], jitter: 0.01, jitterY: 0, shade: 0.05 });
  for (const [x, z, sx, sz] of [[-1.6, -1.8, 0.9, 0.6], [1.2, -0.6, 0.7, 0.5], [-3.5, 0.7, 0.6, 0.9]]) {
    P.add(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 7), '#8a7b74', { pos: [x, G + 0.035, z], scl: [sx, 1, sz], jitter: 0.06, jitterY: 0 });
  }
  const DK = { x0: 0.6, x1: 3.0, z0: 1.4, z1: 4.2 };
  for (let i = 0, x = DK.x0 + 0.1; x < DK.x1; i++, x += 0.2) {
    P.add(new THREE.BoxGeometry(0.18, 0.06, DK.z1 - DK.z0 - (i % 3) * 0.04), i % 3 ? PAL.deck : PAL.deck2, { pos: [x, G + 0.06, (DK.z0 + DK.z1) / 2], ry: (rand() - 0.5) * 0.01, shade: 0.06 });
  }
  const parapet = (x0, z0, x1, z1, h) => {
    const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0);
    P.add(new THREE.BoxGeometry(0.2, h, len), PAL.brick, { pos: [(x0 + x1) / 2, G + h / 2, (z0 + z1) / 2], ry: yaw, jitter: 0.01, shade: 0.05 });
    P.add(new THREE.BoxGeometry(0.28, 0.06, len + 0.08), PAL.coping, { pos: [(x0 + x1) / 2, G + h + 0.03, (z0 + z1) / 2], ry: yaw, jitter: 0.008, shade: 0.04 });
  };
  parapet(-4.5, 4.3, 3.1, 4.3, 0.36);
  parapet(-4.5, -2.8, -4.5, 4.3, 0.36);
  parapet(3.1, -2.8, 3.1, 4.3, 0.5);
  parapet(-4.5, -2.8, 1.3, -2.8, 0.42);

  // Neighbour (back): a pitched slate roof with two chimney stacks, one with a TV aerial.
  {
    const top = G - 0.35;
    P.add(gable(THREE, 1.5, 0.75, 5.9), PAL.brick3, { pos: [-1.65, top, -3.65], ry: Math.PI / 2 });
    P.add(roof(THREE, 1.75, 0.87, 6.0, 0.08), PAL.slate, { pos: [-1.65, top - 0.1, -3.65], ry: Math.PI / 2, jitter: 0.012, shade: 0.07 });
    const stack = (x, z, h, pots) => {
      P.add(new THREE.BoxGeometry(0.42, h, 0.6), PAL.brick2, { pos: [x, top + h / 2, z], jitter: 0.012, shade: 0.06 });
      P.add(new THREE.BoxGeometry(0.5, 0.07, 0.68), PAL.coping, { pos: [x, top + h, z] });
      pots.forEach((p, i) => P.add(new THREE.CylinderGeometry(0.07, 0.09, p, 7), PAL.terracotta, { pos: [x, top + h + p / 2, z - 0.15 + i * 0.3], jitter: 0.004 }));
      return top + h;
    };
    stack(-3.6, -3.55, 1.25, [0.26, 0.2]);
    const h2 = stack(0.4, -3.7, 1.45, [0.24, 0.3]);
    bar(v(0.4, h2, -3.88), v(0.4, h2 + 0.95, -3.88), 0.025, PAL.iron);
    for (const [y, l] of [[0.85, 0.7], [0.65, 0.55], [0.45, 0.4]]) bar(v(0.4 - l / 2, h2 + y, -3.88), v(0.4 + l / 2, h2 + y, -3.88), 0.018, PAL.iron);
  }
  // Neighbour (back-right): a taller stucco corner with a cornice and a vent cowl.
  P.add(new THREE.BoxGeometry(2.0, 0.12, 1.6), '#cdb08a', { pos: [2.25, G + 0.41, -3.65] });
  P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 6), '#9a9aa2', { pos: [1.8, G + 0.7, -4.0] });
  const cowl = new THREE.Group();
  {
    const cp = new Painter(THREE, 53);
    cp.add(new THREE.SphereGeometry(0.17, 8, 5), '#b4b4bc', { scl: [1, 0.9, 1.3] });
    cp.add(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 8), '#8e8e98', { pos: [0, -0.02, 0.2], rot: [Math.PI / 2, 0, 0] });
    cowl.add(cp.mesh(lambert(THREE)));
    cowl.position.set(1.8, G + 1.02, -4.0);
    root.add(cowl);
  }
  // Neighbour (right): a lower flat roof with a skylight and an air-con box.
  {
    const top = G - 0.5;
    P.add(new THREE.BoxGeometry(1.3, 0.025, 8.7), '#8a7f84', { pos: [3.9, top + 0.012, 0], shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.75, 0.2, 1.0), '#c9c3b8', { pos: [3.95, top + 0.1, 1.9] });
    P.add(gable(THREE, 0.75, 0.25, 1.0), '#9fc4c8', { pos: [3.95, top + 0.2, 1.9] });
    P.add(new THREE.BoxGeometry(0.8, 0.5, 0.55), '#c9c6c0', { pos: [3.9, top + 0.25, -1.4], jitter: 0.008 });
    P.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), '#4a4652', { pos: [3.9, top + 0.51, -1.4] });
    P.add(new THREE.BoxGeometry(0.08, 0.06, 1.6), '#9a9aa2', { pos: [3.5, top + 0.05, -2.3] });
  }

  // Hero: wooden water tank on a steel stand, with a ladder and a conical cap.
  const TK = v(2.05, G, -1.75);
  const LEG = 1.85, TR = 0.85, TH = 1.35;
  {
    const legs = [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]];
    for (const [dx, dz] of legs) {
      bar(v(TK.x + dx * 1.12, G, TK.z + dz * 1.12), v(TK.x + dx, G + LEG, TK.z + dz), 0.09, PAL.iron);
      P.add(new THREE.BoxGeometry(0.24, 0.1, 0.24), '#8f8a86', { pos: [TK.x + dx * 1.12, G + 0.05, TK.z + dz * 1.12] });
    }
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[[0, 1, 3, 2][i]], [bx, bz] = legs[[1, 3, 2, 0][i]];
      bar(v(TK.x + ax * 1.08, G + 0.35, TK.z + az * 1.08), v(TK.x + bx * 1.0, G + LEG - 0.1, TK.z + bz * 1.0), 0.035, PAL.iron);
      bar(v(TK.x + bx * 1.08, G + 0.35, TK.z + bz * 1.08), v(TK.x + ax * 1.0, G + LEG - 0.1, TK.z + az * 1.0), 0.035, PAL.iron);
      bar(v(TK.x + ax * 1.06, G + 0.9, TK.z + az * 1.06), v(TK.x + bx * 1.06, G + 0.9, TK.z + bz * 1.06), 0.05, PAL.iron);
    }
    P.add(new THREE.BoxGeometry(1.55, 0.1, 1.55), PAL.iron, { pos: [TK.x, G + LEG + 0.05, TK.z] });
    // staves
    const ST = 18;
    for (let i = 0; i < ST; i++) {
      const a = (i / ST) * Math.PI * 2;
      P.add(new THREE.BoxGeometry(0.29, TH, 0.07), i % 4 ? PAL.tank : '#8e5a39', { pos: [TK.x + Math.cos(a) * TR, G + LEG + 0.1 + TH / 2, TK.z + Math.sin(a) * TR], ry: -a + Math.PI / 2, rot: [0, -a + Math.PI / 2, (rand() - 0.5) * 0.02], shade: 0.08 });
    }
    for (const y of [0.15, 0.55, 0.95, 1.25]) P.add(new THREE.TorusGeometry(TR + 0.045, 0.022, 3, 22), PAL.iron, { pos: [TK.x, G + LEG + 0.1 + y, TK.z], rot: [Math.PI / 2, 0, 0] });
    const capY = G + LEG + 0.1 + TH;
    P.add(new THREE.ConeGeometry(TR + 0.12, 0.62, 18, 1), '#8a5a3c', { pos: [TK.x, capY + 0.3, TK.z], jitter: 0.01, shade: 0.06 });
    P.add(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 6), PAL.iron, { pos: [TK.x, capY + 0.66, TK.z] });
    // hatch on the cap, propped open
    P.add(new THREE.BoxGeometry(0.3, 0.03, 0.3), '#8a5a3c', { pos: [TK.x + 0.35, capY + 0.32, TK.z + 0.3], rot: [-0.9, 0.7, 0] });
    // ladder up the front-left leg
    const l0 = v(TK.x - 0.95, G, TK.z + 0.55), l1 = v(TK.x - 0.88, capY + 0.15, TK.z + 0.5);
    for (const o of [-0.17, 0.17]) bar(l0.clone().add(v(0, 0, o)), l1.clone().add(v(0, 0, o)), 0.035, PAL.iron);
    for (let k = 1; k < 13; k++) {
      const p = l0.clone().lerp(l1, k / 13);
      bar(p.clone().add(v(0, 0, -0.17)), p.clone().add(v(0, 0, 0.17)), 0.025, PAL.iron);
    }
    // overflow pipe down to the roof
    bar(v(TK.x + 0.7, G + LEG + 0.3, TK.z + 0.5), v(TK.x + 0.7, G, TK.z + 0.5), 0.05, '#4e5a5c', { round: true });
  }
  const capTop = G + LEG + 0.1 + TH + 0.72;

  // Stair-access hut with a teal door, a lamp and a gutter.
  const HU = compose(THREE, { pos: [-3.05, G, -1.75], ry: 0.04 });
  const hu = (o) => HU.clone().multiply(compose(THREE, o));
  P.add(new THREE.BoxGeometry(1.5, 1.75, 1.45), PAL.stucco, { matrix: hu({ pos: [0, 0.875, 0] }), jitter: 0.012, shade: 0.05 });
  P.add(new THREE.BoxGeometry(1.7, 0.1, 1.65), '#6f6a72', { matrix: hu({ pos: [0, 1.8, 0], rot: [0, 0.04, 0.05] }) });
  P.add(new THREE.BoxGeometry(0.06, 1.05, 0.62), PAL.teal, { matrix: hu({ pos: [0.76, 0.55, 0.15] }) });
  P.add(new THREE.BoxGeometry(0.07, 1.15, 0.72), PAL.cream, { matrix: hu({ pos: [0.755, 0.58, 0.15] }) });
  P.add(new THREE.SphereGeometry(0.03, 5, 3), '#d9b25a', { matrix: hu({ pos: [0.8, 0.55, 0.38] }) });
  P.add(new THREE.BoxGeometry(0.4, 0.1, 0.5), '#8f8a86', { matrix: hu({ pos: [0.95, 0.05, 0.15] }) });
  P.add(new THREE.BoxGeometry(0.14, 0.08, 0.12), PAL.iron, { matrix: hu({ pos: [0.82, 1.35, 0.15] }) });
  E.add(new THREE.SphereGeometry(0.06, 6, 4), PAL.bulb, { matrix: hu({ pos: [0.84, 1.27, 0.15] }) });
  P.add(new THREE.BoxGeometry(0.06, 1.75, 0.06), '#7e8a8c', { matrix: hu({ pos: [0.76, 0.87, -0.72] }) });
  P.add(new THREE.BoxGeometry(0.02, 0.3, 0.3), '#7aa9b0', { matrix: hu({ pos: [-0.76, 1.1, -0.2] }) });
  const lampPos = v(0.84, 1.27, 0.15).applyMatrix4(HU);

  // Washing line from the hut to the tank stand (cloths sway, see update).
  const W0 = v(0.5, 1.6, -0.72).applyMatrix4(HU), W1 = v(TK.x - 0.62, G + 1.6, TK.z - 0.62);
  const sagAt = (a, b, s, sag) => a.clone().lerp(b, s).add(v(0, -sag * 4 * s * (1 - s), 0));
  for (let i = 0; i < 10; i++) bar(sagAt(W0, W1, i / 10, 0.18), sagAt(W0, W1, (i + 1) / 10, 0.18), 0.012, '#e8e0d0');

  // String lights: three strands from a pole by the deck.
  const POLE = v(0.55, G, 1.25);
  bar(POLE, POLE.clone().add(v(0, 2.3, 0)), 0.05, PAL.wood);
  P.add(new THREE.BoxGeometry(0.3, 0.12, 0.3), '#8f8a86', { pos: [POLE.x, G + 0.06, POLE.z] });
  const strands = [
    [POLE.clone().add(v(0, 2.25, 0)), v(-2.3, G + 1.75, -1.3)],
    [POLE.clone().add(v(0, 2.25, 0)), v(TK.x - 0.62, G + 1.95, TK.z + 0.62)],
    [POLE.clone().add(v(0, 2.25, 0)), v(3.0, G + 1.2, 4.15)],
    [v(3.0, G + 1.2, 4.15), v(-0.6, G + 0.95, 4.2)],
  ];
  const bulbs = [];
  for (const [a, b] of strands) {
    const n = Math.max(6, Math.round(a.distanceTo(b) / 0.32));
    for (let i = 0; i < 8; i++) bar(sagAt(a, b, i / 8, 0.32), sagAt(a, b, (i + 1) / 8, 0.32), 0.012, '#2b2a30');
    for (let i = 1; i < n; i++) {
      const p = sagAt(a, b, i / n, 0.32).add(v(0, -0.05, 0));
      bulbs.push(p);
      E.add(new THREE.IcosahedronGeometry(0.045, 0), i % 5 === 3 ? '#ffb38a' : PAL.bulb, { pos: [p.x, p.y, p.z] });
    }
  }
  // the deck-end post
  bar(v(3.0, G, 4.15), v(3.0, G + 1.25, 4.15), 0.045, PAL.wood);

  // Deck chair (striped sling), a crate with a mug and a book left face-down, a teal parasol.
  {
    const CM = compose(THREE, { pos: [1.85, G + 0.09, 2.6], ry: -0.55 });
    const c = (o) => CM.clone().multiply(compose(THREE, o));
    for (const x of [-0.27, 0.27]) {
      P.add(new THREE.BoxGeometry(0.04, 0.04, 1.05), PAL.wood, { matrix: c({ pos: [x, 0.42, -0.05], rot: [0.85, 0, 0] }) });
      P.add(new THREE.BoxGeometry(0.04, 0.04, 0.75), PAL.wood, { matrix: c({ pos: [x, 0.25, 0.2], rot: [-0.75, 0, 0] }) });
      P.add(new THREE.BoxGeometry(0.04, 0.04, 0.45), PAL.wood, { matrix: c({ pos: [x, 0.35, 0.35] }) });
    }
    for (let k = 0; k < 5; k++) P.add(new THREE.BoxGeometry(0.1, 0.02, 0.95), k % 2 ? PAL.cream : PAL.teal, { matrix: c({ pos: [-0.2 + k * 0.1, 0.38, 0.0], rot: [0.75, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.4, 0.32, 0.32), '#b08a5a', { matrix: c({ pos: [0.55, 0.16, 0.3] }), jitter: 0.01 });
    P.add(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 8), PAL.teal2, { matrix: c({ pos: [0.6, 0.37, 0.38] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.03, 0.14), '#c94a3a', { matrix: c({ pos: [0.48, 0.34, 0.22], rot: [0, 0.4, 0] }) });
    P.add(new THREE.BoxGeometry(0.18, 0.036, 0.12), PAL.cream, { matrix: c({ pos: [0.48, 0.335, 0.22], rot: [0, 0.4, 0] }) });
    // parasol, tilted toward the low sun
    const pb = v(2.45, G + 0.06, 3.35);
    const tilt = [0.0, 0, 0.32];
    P.add(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 8), '#4a4652', { pos: [pb.x, pb.y + 0.06, pb.z] });
    const PM = compose(THREE, { pos: [pb.x, pb.y, pb.z], rot: tilt });
    const pm = (o) => PM.clone().multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 5), PAL.cream, { matrix: pm({ pos: [0, 1.05, 0] }) });
    for (let k = 0; k < 8; k++) {
      P.add(new THREE.ConeGeometry(1.0, 0.38, 2, 1, true, (k / 8) * Math.PI * 2, Math.PI / 4), k % 2 ? PAL.cream : PAL.teal, { matrix: pm({ pos: [0, 2.05, 0] }), shade: 0.02 });
    }
    P.add(new THREE.SphereGeometry(0.05, 5, 4), PAL.cream, { matrix: pm({ pos: [0, 2.27, 0] }) });
  }

  // Raised beds of salvaged planks, with lettuces, tomatoes on canes and sunflowers.
  const bed = (x, z, w, d, h, ry) => {
    const M = compose(THREE, { pos: [x, G, z], ry });
    const b = (o) => M.clone().multiply(compose(THREE, o));
    for (let k = 0; k < 3; k++) {
      const y = 0.08 + k * (h / 3);
      const col = (k + Math.round(x)) % 2 ? PAL.wood : '#8c6244';
      P.add(new THREE.BoxGeometry(w, h / 3 - 0.01, 0.06), col, { matrix: b({ pos: [0, y, d / 2] }), shade: 0.07 });
      P.add(new THREE.BoxGeometry(w, h / 3 - 0.01, 0.06), col, { matrix: b({ pos: [0, y, -d / 2] }), shade: 0.07 });
      P.add(new THREE.BoxGeometry(0.06, h / 3 - 0.01, d), col, { matrix: b({ pos: [w / 2, y, 0] }), shade: 0.07 });
      P.add(new THREE.BoxGeometry(0.06, h / 3 - 0.01, d), col, { matrix: b({ pos: [-w / 2, y, 0] }), shade: 0.07 });
    }
    P.add(new THREE.BoxGeometry(w - 0.06, 0.04, d - 0.06), PAL.soil, { matrix: b({ pos: [0, h - 0.06, 0] }), jitter: 0.02 });
    return (lx, lz) => v(lx, h - 0.04, lz).applyMatrix4(M);
  };
  const lettuce = (p, s) => {
    P.add(new THREE.IcosahedronGeometry(0.13 * s, 0), PAL.leaf2, { pos: [p.x, p.y + 0.07 * s, p.z], scl: [1, 0.7, 1], ry: rand() * 6, jitter: 0.02 });
    P.add(new THREE.IcosahedronGeometry(0.08 * s, 0), '#a9c96a', { pos: [p.x, p.y + 0.13 * s, p.z], ry: rand() * 6 });
  };
  const tomato = (p) => {
    for (const [dx, dz] of [[-0.08, 0], [0.08, 0.05], [0, -0.08]]) bar(v(p.x + dx, p.y, p.z + dz), v(p.x, p.y + 0.95, p.z), 0.018, '#b39b6a');
    for (let k = 0; k < 3; k++) P.add(new THREE.IcosahedronGeometry(0.17 - k * 0.03, 0), PAL.leaf, { pos: [p.x + (rand() - 0.5) * 0.1, p.y + 0.25 + k * 0.25, p.z + (rand() - 0.5) * 0.1], scl: [1, 1.1, 1], ry: rand() * 6, jitter: 0.02 });
    for (let k = 0; k < 4; k++) P.add(new THREE.IcosahedronGeometry(0.04, 0), k % 3 ? '#d8402e' : '#e98a3a', { pos: [p.x + (rand() - 0.5) * 0.3, p.y + 0.2 + rand() * 0.55, p.z + (rand() - 0.5) * 0.3] });
  };
  const sunflower = (p, h, face) => {
    bar(p, v(p.x + 0.04, p.y + h, p.z), 0.03, '#5f8a3a', { round: true });
    for (let k = 0; k < 3; k++) P.add(new THREE.ConeGeometry(0.1, 0.24, 3), PAL.leaf, { pos: [p.x, p.y + 0.3 + k * h * 0.25, p.z], rot: [0, k * 2.1, 1.3], scl: [1, 1, 0.3] });
    const M = compose(THREE, { pos: [p.x + 0.04, p.y + h, p.z], ry: face, rot: [0.25, face, 0] });
    P.add(new THREE.CylinderGeometry(0.22, 0.2, 0.04, 12), PAL.sun, { matrix: M.clone().multiply(compose(THREE, { rot: [Math.PI / 2, 0, 0] })), jitter: 0.02, shade: 0.04 });
    P.add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 9), '#5a3a22', { matrix: M.clone().multiply(compose(THREE, { pos: [0, 0, 0.02], rot: [Math.PI / 2, 0, 0] })) });
  };
  {
    const a = bed(-0.55, 2.85, 2.3, 0.85, 0.5, 0.06);
    [[-0.85, -0.18, 1], [-0.5, 0.15, 0.9], [-0.15, -0.15, 1.1], [0.2, 0.17, 0.85], [0.6, -0.1, 1]].forEach(([x, z, s]) => lettuce(a(x, z), s));
    tomato(a(0.92, 0.05));
    const b = bed(-1.6, 0.45, 1.25, 1.25, 0.62, -0.12);
    tomato(b(-0.3, -0.25));
    tomato(b(0.25, 0.2));
    lettuce(b(0.3, -0.35), 0.8);
    lettuce(b(-0.32, 0.32), 0.9);
    const c = bed(-0.05, -1.95, 0.7, 1.65, 0.55, 0.0);
    // sunflowers all turned to the low western sun; one stands a head taller than the rest
    sunflower(c(0.0, -0.55), 1.55, -1.3);
    sunflower(c(0.1, 0.0), 2.05, -1.2);
    sunflower(c(-0.12, 0.5), 1.35, -1.4);
    lettuce(c(0.15, 0.55), 0.7);
  }
  // pots along the front parapet and a teal watering can with a coiled hose
  for (const [x, z, s, col] of [[-4.15, 3.9, 1.0, PAL.leaf], [-3.75, 3.95, 0.7, '#d6403a'], [-4.15, 3.35, 0.8, PAL.leaf2], [-2.4, 3.95, 0.85, PAL.leaf]]) {
    P.add(new THREE.CylinderGeometry(0.17 * s, 0.12 * s, 0.25 * s, 8), PAL.terracotta, { pos: [x, G + 0.125 * s, z], jitter: 0.005 });
    P.add(new THREE.IcosahedronGeometry(0.17 * s, 0), col === '#d6403a' ? PAL.leaf : col, { pos: [x, G + 0.3 * s, z], ry: rand() * 6 });
    if (col === '#d6403a') for (let k = 0; k < 4; k++) P.add(new THREE.IcosahedronGeometry(0.045, 0), col, { pos: [x + (rand() - 0.5) * 0.2, G + 0.38 * s, z + (rand() - 0.5) * 0.2] });
  }
  {
    const wc = v(0.3, G, 1.9);
    P.add(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 9), PAL.teal, { pos: [wc.x, wc.y + 0.13, wc.z] });
    bar(v(wc.x + 0.1, wc.y + 0.12, wc.z), v(wc.x + 0.35, wc.y + 0.32, wc.z + 0.05), 0.03, PAL.teal, { round: true });
    P.add(new THREE.TorusGeometry(0.1, 0.015, 3, 10, Math.PI), PAL.teal, { pos: [wc.x, wc.y + 0.3, wc.z] });
    P.add(new THREE.TorusGeometry(0.28, 0.035, 4, 14), '#3d7a52', { pos: [-1.0, G + 0.04, -0.75], rot: [Math.PI / 2, 0, 0] });
    P.add(new THREE.TorusGeometry(0.2, 0.035, 4, 14), '#3d7a52', { pos: [-1.0, G + 0.1, -0.75], rot: [Math.PI / 2, 0, 0.3] });
  }

  // Paving slabs from the hut door to the deck, tar seams on the felt.
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    const x = -2.0 + k * 2.55 + (rand() - 0.5) * 0.08, z = -1.55 + k * 2.75 + Math.sin(k * 3) * 0.25;
    P.add(new THREE.BoxGeometry(0.46, 0.04, 0.46), i % 3 ? '#b8ad9f' : '#a99e91', { pos: [x, G + 0.03, z], ry: 0.75 + (rand() - 0.5) * 0.2, shade: 0.04 });
  }
  for (const [x, z, l, ry] of [[-1.0, -2.3, 3.4, 1.57], [1.0, 0.2, 2.8, 0.1], [-2.6, 1.2, 2.2, 0.05], [-0.5, 3.75, 3.0, 1.6]]) {
    P.add(new THREE.BoxGeometry(0.05, 0.01, l), '#4f4646', { pos: [x, G + 0.035, z], ry });
  }
  // Bistro table and two folding chairs under the lights.
  {
    const T = v(0.95, G, -0.25);
    P.add(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 12), PAL.teal2, { pos: [T.x, G + 0.6, T.z] });
    P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 5), PAL.iron, { pos: [T.x, G + 0.3, T.z] });
    P.add(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 8), PAL.iron, { pos: [T.x, G + 0.015, T.z] });
    // two glasses and a bottle: someone is expected
    P.add(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 6), '#e9e2d0', { pos: [T.x - 0.12, G + 0.67, T.z + 0.05] });
    P.add(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 6), '#e9e2d0', { pos: [T.x + 0.1, G + 0.67, T.z - 0.1] });
    P.add(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 7), '#3d6b4a', { pos: [T.x + 0.02, G + 0.72, T.z + 0.12] });
    for (const [a, d] of [[0.4, 0.55], [2.9, 0.5]]) {
      const C = compose(THREE, { pos: [T.x + Math.sin(a) * d, G, T.z + Math.cos(a) * d], ry: a + Math.PI });
      const c = (o) => C.clone().multiply(compose(THREE, o));
      P.add(new THREE.BoxGeometry(0.34, 0.03, 0.32), PAL.teal, { matrix: c({ pos: [0, 0.42, 0] }) });
      P.add(new THREE.BoxGeometry(0.34, 0.36, 0.03), PAL.teal, { matrix: c({ pos: [0, 0.62, -0.17], rot: [-0.12, 0, 0] }) });
      for (const x of [-0.15, 0.15]) {
        P.add(new THREE.BoxGeometry(0.025, 0.46, 0.025), PAL.iron, { matrix: c({ pos: [x, 0.21, 0.08], rot: [0.25, 0, 0] }) });
        P.add(new THREE.BoxGeometry(0.025, 0.46, 0.025), PAL.iron, { matrix: c({ pos: [x, 0.21, -0.08], rot: [-0.25, 0, 0] }) });
      }
    }
  }
  // Herb trough along the left parapet: sage mounds and lavender spikes.
  {
    P.add(new THREE.BoxGeometry(0.38, 0.32, 1.7), '#8c6244', { pos: [-4.12, G + 0.16, 0.3], jitter: 0.008, shade: 0.06 });
    P.add(new THREE.BoxGeometry(0.32, 0.03, 1.64), PAL.soil, { pos: [-4.12, G + 0.31, 0.3] });
    for (let i = 0; i < 6; i++) {
      const z = -0.4 + i * 0.27 + (rand() - 0.5) * 0.06;
      if (i % 2) for (let k = 0; k < 4; k++) bar(v(-4.12 + (rand() - 0.5) * 0.15, G + 0.31, z + (rand() - 0.5) * 0.12), v(-4.12 + (rand() - 0.5) * 0.25, G + 0.62 + rand() * 0.12, z + (rand() - 0.5) * 0.2), 0.035, '#8d7ac0');
      else P.add(new THREE.IcosahedronGeometry(0.15 + rand() * 0.04, 0), i % 4 ? '#93a77a' : PAL.leaf, { pos: [-4.12, G + 0.4, z], scl: [1, 0.8, 1], ry: rand() * 6 });
    }
  }
  // A fig in a big pot by the hut, and crates stacked against the hut wall.
  {
    const F = v(-2.75, G, -0.15);
    P.add(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 9), PAL.terracotta, { pos: [F.x, G + 0.25, F.z], jitter: 0.008, shade: 0.05 });
    P.add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 9), PAL.soil, { pos: [F.x, G + 0.48, F.z] });
    bar(v(F.x, G + 0.45, F.z), v(F.x + 0.1, G + 1.15, F.z - 0.05), 0.05, '#7a6a5a', { round: true });
    bar(v(F.x + 0.05, G + 0.9, F.z), v(F.x - 0.25, G + 1.3, F.z + 0.15), 0.035, '#7a6a5a', { round: true });
    for (const [dx, dy, dz, r] of [[0.1, 1.35, -0.05, 0.36], [-0.28, 1.4, 0.18, 0.28], [0.3, 1.2, 0.2, 0.26], [-0.05, 1.62, 0.05, 0.25]]) {
      P.add(new THREE.IcosahedronGeometry(r, 1), rand() > 0.4 ? '#5f8a46' : '#729b4e', { pos: [F.x + dx, G + dy, F.z + dz], scl: [1, 0.85, 1], ry: rand() * 6, jitter: 0.03, shade: 0.1 });
    }
    for (const [dx, dy, dz, ry] of [[0, 0.17, 0, 0.1], [0.05, 0.5, 0.02, -0.15], [0.55, 0.17, 0.05, 0.3]]) {
      P.add(new THREE.BoxGeometry(0.48, 0.32, 0.36), '#b08a5a', { pos: [-2.0 + dx, G + dy, -2.55 + dz], ry, jitter: 0.008, shade: 0.06 });
    }
  }
  // Pigeon loft on short legs: pale blue planks, wire front, landing board, a seed sack.
  const LO = compose(THREE, { pos: [-3.45, G, 2.15], ry: 0.12 });
  const lo = (o) => LO.clone().multiply(compose(THREE, o));
  {
    for (const [x, z] of [[-0.4, -0.6], [0.4, -0.6], [-0.4, 0.6], [0.4, 0.6]]) P.add(new THREE.BoxGeometry(0.08, 0.4, 0.08), PAL.wood, { matrix: lo({ pos: [x, 0.2, z] }) });
    P.add(new THREE.BoxGeometry(1.0, 0.06, 1.45), PAL.wood, { matrix: lo({ pos: [0, 0.42, 0] }) });
    P.add(new THREE.BoxGeometry(0.9, 0.95, 1.35), '#8fb6bb', { matrix: lo({ pos: [-0.04, 0.92, 0] }), jitter: 0.01, shade: 0.05 });
    for (let k = 0; k < 6; k++) P.add(new THREE.BoxGeometry(0.92, 0.02, 1.37), '#7aa1a8', { matrix: lo({ pos: [-0.04, 0.5 + k * 0.16, 0] }) });
    // wire front (+X) with a frame
    P.add(new THREE.BoxGeometry(0.03, 0.62, 0.95), '#3e4a4e', { matrix: lo({ pos: [0.42, 1.0, -0.05] }) });
    for (let k = 0; k < 7; k++) P.add(new THREE.BoxGeometry(0.04, 0.64, 0.02), PAL.cream, { matrix: lo({ pos: [0.44, 1.0, -0.5 + k * 0.15] }) });
    for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(0.04, 0.02, 0.97), PAL.cream, { matrix: lo({ pos: [0.44, 0.7 + k * 0.3, -0.05] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.3, 0.22), '#2b3036', { matrix: lo({ pos: [0.43, 0.8, 0.55] }) });
    P.add(new THREE.BoxGeometry(0.3, 0.03, 0.5), PAL.cream, { matrix: lo({ pos: [0.6, 0.66, 0.5] }) });
    // pent roof sloping to the back, with felt
    P.add(new THREE.BoxGeometry(1.25, 0.06, 1.65), '#4c5c5a', { matrix: lo({ pos: [0.0, 1.5, 0], rot: [0, 0, 0.2] }), jitter: 0.01, shade: 0.05 });
    P.add(new THREE.BoxGeometry(0.06, 0.06, 1.65), PAL.cream, { matrix: lo({ pos: [0.6, 1.62, 0], rot: [0, 0, 0.2] }) });
    // seed sack
    P.add(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 7), '#d5bd8a', { matrix: lo({ pos: [0.75, 0.18, -0.6] }), jitter: 0.03 });
    P.add(new THREE.ConeGeometry(0.12, 0.12, 7), '#d5bd8a', { matrix: lo({ pos: [0.75, 0.42, -0.6] }) });
  }

  // Pigeons: the perched ones are part of the static mesh, a little flock circles the tank.
  const pigeon = (m, col) => {
    P.add(new THREE.IcosahedronGeometry(0.075, 0), col, { matrix: m.clone().multiply(compose(THREE, { scl: [0.8, 0.75, 1.3] })) });
    P.add(new THREE.IcosahedronGeometry(0.045, 0), col, { matrix: m.clone().multiply(compose(THREE, { pos: [0, 0.07, 0.08] })) });
    P.add(new THREE.ConeGeometry(0.035, 0.1, 3), '#5d6070', { matrix: m.clone().multiply(compose(THREE, { pos: [0, 0.0, -0.12], rot: [-Math.PI / 2, 0, 0], scl: [1.3, 1, 0.4] })) });
    P.add(new THREE.ConeGeometry(0.012, 0.03, 3), '#e6a07a', { matrix: m.clone().multiply(compose(THREE, { pos: [0, 0.07, 0.13], rot: [Math.PI / 2, 0, 0] })) });
  };
  for (const [x, z, ry, col] of [[0.3, -0.45, 1.4, '#8d93a8'], [0.25, -0.05, 1.7, '#b9b4b0'], [0.2, 0.4, 0.9, '#7d8399'], [0.65, 0.55, 1.6, '#8d93a8']]) {
    const y = x > 0.6 ? 0.73 : 1.67 - x * 0.2;
    pigeon(lo({ pos: [x, y, z], ry }), col);
  }
  pigeon(compose(THREE, { pos: [-1.1, G + 0.42, 4.3], ry: 2.6 }), '#9aa0b2'); // on the parapet
  pigeon(compose(THREE, { pos: [1.68, G + 0.88, 2.13], ry: -0.6 }), '#8d93a8'); // on the deck chair back

  // Statics.
  root.add(P.mesh(lambert(THREE)));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));
  const glowPts = (low ? bulbs.filter((_, i) => i % 2 === 0) : bulbs).map((p) => [p.x, p.y, p.z]);
  glowPts.push([lampPos.x, lampPos.y, lampPos.z]);
  root.add(halos(THREE, glowPts, { color: '#ffc77a', size: 0.55, opacity: 0.85 }));

  // Washing on the line (instanced cloths, swaying).
  const cloth = new THREE.PlaneGeometry(1, 1, 1, 1);
  cloth.translate(0, -0.5, 0);
  const CL = [
    { s: 0.18, w: 0.42, h: 0.5, col: '#f2ede2' },
    { s: 0.36, w: 0.3, h: 0.36, col: PAL.teal2 },
    { s: 0.52, w: 0.5, h: 0.62, col: '#e7b9a4' },
    { s: 0.7, w: 0.24, h: 0.3, col: '#f2ede2' },
    { s: 0.83, w: 0.3, h: 0.42, col: '#d9a441' },
  ];
  const cloths = new THREE.InstancedMesh(cloth, lambert(THREE, { vertexColors: false, side: THREE.DoubleSide }), CL.length);
  const tc = new THREE.Color();
  CL.forEach((c, i) => cloths.setColorAt(i, tc.set(c.col)));
  cloths.castShadow = true;
  root.add(cloths);
  const lineYaw = Math.atan2(W1.x - W0.x, W1.z - W0.z) - Math.PI / 2;

  // Flying pigeons.
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.1, -0.3, 0.06, -0.05, 0, 0.02, -0.06,
    0, 0, 0.1, 0, 0.02, -0.06, 0.3, 0.06, -0.05,
    0, 0, 0.13, 0, -0.04, -0.12, 0, 0.03, -0.12,
  ], 3));
  birdGeo.computeVertexNormals();
  const NB = low ? 3 : 5;
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshLambertMaterial({ color: '#8b8fa6', side: THREE.DoubleSide, flatShading: true }), NB);
  root.add(birds);
  const birdCfg = [
    { r: 1.7, h: 5.3, s: 0.55, p: 0 },
    { r: 1.9, h: 5.0, s: 0.55, p: 0.35 },
    { r: 1.6, h: 5.5, s: 0.55, p: 0.7 },
    { r: 2.1, h: 5.2, s: 0.55, p: 1.0 },
    { r: 1.8, h: 4.8, s: 0.55, p: 1.3 },
  ];

  // Light: low amber sun from the west, cool sky fill, one warm lamp by the hut door.
  root.add(new THREE.HemisphereLight('#ffd6a8', '#6e5a70', 1.4));
  const key = keyLight(THREE, ctx, { color: '#ffb066', intensity: 3.4, pos: [-9, 4.0, 3.2], extent: 7.5 });
  root.add(key, key.target);
  if (!low) {
    const pl = new THREE.PointLight('#ffb46a', 3.0, 4.5, 1.6);
    pl.position.set(0.6, G + 2.0, 1.3);
    root.add(pl);
  }
  root.add(citySky(THREE));

  const dummy = new THREE.Object3D();
  function update(t) {
    for (let i = 0; i < CL.length; i++) {
      const c = CL[i];
      const p = sagAt(W0, W1, c.s, 0.18);
      dummy.position.copy(p);
      dummy.rotation.set(Math.sin(t * 1.3 + i * 1.1) * 0.12 + 0.05, lineYaw, 0, 'YXZ');
      dummy.scale.set(c.w, c.h, 1);
      dummy.updateMatrix();
      cloths.setMatrixAt(i, dummy.matrix);
    }
    cloths.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NB; i++) {
      const b = birdCfg[i];
      const a = b.p + t * b.s;
      dummy.position.set(TK.x - 0.6 + Math.cos(a) * b.r, b.h + Math.sin(t * 0.9 + i) * 0.15, TK.z + 0.6 + Math.sin(a) * b.r * 0.8);
      dummy.rotation.set(0, -a, 0.35, 'XYZ');
      dummy.scale.set(0.7, 0.42 + 0.42 * Math.sin(t * 7 + i * 1.3), 0.7);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate = true;
    cowl.rotation.y = Math.sin(t * 0.3) * 0.6 + 0.4;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f2b27c'),
    fog: new THREE.Fog('#efb07e', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
