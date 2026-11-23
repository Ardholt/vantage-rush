// Oak Loft: an early-autumn evening in a back garden. A gnarled oak holding a plank treehouse with a flag,
// rope ladder, tyre swing, a dog asleep by its kennel, a wheelbarrow of apples, tall grass and sunflowers.
import { Painter, compose, lambert, outline, offsetOutline, slab, gable, roof, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  lawn: '#6c9a3c',
  lawn2: '#82ad48',
  lawnDark: '#6d9440',
  earth: '#7a5636',
  soil: '#5d4130',
  clay: '#8d6a48',
  board: '#4a3426',
  bark: '#6a5444',
  bark2: '#7d6650',
  plank: '#c48d55',
  plank2: '#b07a45',
  plank3: '#d5a067',
  roofR: '#b23a28',
  rope: '#d8bf8a',
  tyre: '#26262b',
  white: '#f1ece0',
  red: '#d8452e',
  apple: '#c7322b',
  apple2: '#8fb03a',
  gold: '#e7b23c',
  dog: '#b9773f',
  dark: '#2b2a2e',
};
const LEAVES = ['#d08a2c', '#e0a838', '#b8582a', '#8f9a36', '#c7702a', '#6f8a34'];

// Sunset sky with an azimuth gradient: warm toward the sun, lavender to deep blue away from it, so every
// direction of the orbit has its own sky (kit.skyDome only varies with height).
function sunsetSky(THREE, { topSun, topAway, midSun, midAway, bottom, sun, sunColor, sunPow = 12, horizon = 0.5 }) {
  const C = (c) => ({ value: new THREE.Color(c) });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tS: C(topSun), tA: C(topAway), mS: C(midSun), mA: C(midAway), cB: C(bottom), cSun: C(sunColor), sunDir: { value: new THREE.Vector3(...sun).normalize() }, sunPow: { value: sunPow }, hor: { value: horizon } },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; gl_Position.z = p.w * 0.99999; }`,
    fragmentShader: `uniform vec3 tS; uniform vec3 tA; uniform vec3 mS; uniform vec3 mA; uniform vec3 cB; uniform vec3 cSun; uniform vec3 sunDir; uniform float sunPow; uniform float hor;
      varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec2 hz = normalize(d.xz + vec2(1e-5)); float k = 0.5 + 0.5 * dot(hz, normalize(sunDir.xz));
        vec3 cMid = mix(mA, mS, smoothstep(0.0, 1.0, k)); vec3 cTop = mix(tA, tS, k * k);
        vec3 c = h > 0.0 ? mix(cMid, cTop, smoothstep(0.0, hor, h)) : mix(cMid, cB, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, sunDir), 0.0);
        c += cSun * (pow(s, sunPow) + 0.3 * pow(s, 3.0));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthWrite: false, depthTest: false, side: THREE.BackSide, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.matrixAutoUpdate = false;
  return m;
}

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(5150);
  const root = new THREE.Group();
  const P = new Painter(THREE, 51);
  const C = new Painter(THREE, 52); // canopy (sways)
  const Gr = new Painter(THREE, 53); // tall grass (sways)
  const uTime = { value: 0 };

  const G = 0.3; // lawn level

  // Plinth: a raised garden bed on a board: clay, dark soil, topsoil, and the lawn.
  const rim = outline(rand, { n: 28, rx: 4.7, rz: 4.4, wob: 0.04, sq: 2.3 });
  P.add(slab(THREE, offsetOutline(rim, 0.3), -1.45, -1.12, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.12, -0.7), PAL.clay, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.7, -0.15), PAL.soil, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.15, G - 0.08), PAL.earth, { jitter: 0.03, shade: 0.08 });
  P.add(slab(THREE, offsetOutline(rim, 0.03), G - 0.08, G, 0.03), PAL.lawn, { jitter: 0.03, jitterY: 0.01, shade: 0.04 });
  // pebbles and a root showing in the soil face
  for (let i = 0; i < 10; i++) {
    const k = Math.floor(rand() * rim.length), [x, z] = rim[k];
    P.add(new THREE.IcosahedronGeometry(0.08 + rand() * 0.07, 0), rand() > 0.5 ? '#a89a88' : '#8d7f70', { pos: [x * 1.005, -0.9 + rand() * 0.7, z * 1.005], jitter: 0.02 });
  }
  // mown stripes across the lawn
  for (let i = -4; i <= 4; i++) {
    if (i % 2) continue;
    const x = i * 0.55;
    const pts = [];
    const strip = [[x - 0.275, -5], [x + 0.275, -5], [x + 0.275, 5], [x - 0.275, 5]];
    // clip to the rim, slightly shrunk
    let poly = offsetOutline(rim, -0.08);
    for (const [a, b, c] of [[-1, 0, -(x - 0.275)], [1, 0, x + 0.275]]) {
      const out = [];
      for (let j = 0; j < poly.length; j++) {
        const p = poly[j], q = poly[(j + 1) % poly.length];
        const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
        if (fp <= 0) out.push(p);
        if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      poly = out;
    }
    void pts; void strip;
    if (poly.length > 2) P.add(slab(THREE, poly, G - 0.02, G + 0.006), PAL.lawn2, { shade: 0.03 });
  }

  // The oak: a leaning, twisting trunk from stacked segments, root flares, heavy limbs.
  const T = new THREE.Vector3(-0.75, G, -0.85);
  const trunkPts = [[0, 0, 0], [0.08, 0.7, 0.04], [0.02, 1.4, 0.12], [0.16, 2.05, 0.05], [0.1, 2.55, -0.02]];
  const rad = [0.5, 0.4, 0.36, 0.33, 0.3];
  const seg = (a, b, r0, r1, col, sides = 8) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const m = new THREE.Matrix4().compose(A.clone().lerp(B, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new THREE.Vector3(1, 1, 1));
    P.add(new THREE.CylinderGeometry(r1, r0, len, sides, 2), col, { matrix: m, jitter: Math.min(0.05, r0 * 0.12), shade: 0.1, top: PAL.bark2, y0: a[1], y1: b[1] + 1 });
  };
  for (let i = 0; i < trunkPts.length - 1; i++) {
    const a = trunkPts[i], b = trunkPts[i + 1];
    seg([T.x + a[0], T.y + a[1] - (i ? 0.05 : 0.1), T.z + a[2]], [T.x + b[0], T.y + b[1] + 0.05, T.z + b[2]], rad[i], rad[i + 1], PAL.bark, 9);
  }
  // root flares
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rand() * 0.5, l = 0.55 + rand() * 0.35;
    seg([T.x, G + 0.28, T.z], [T.x + Math.cos(a) * l, G - 0.02, T.z + Math.sin(a) * l], 0.16, 0.04, PAL.bark, 5);
  }
  // knot hole with a little face of shadow
  P.add(new THREE.SphereGeometry(0.09, 7, 5), '#2e241d', { pos: [T.x + 0.06, G + 1.25, T.z + 0.38], scl: [0.8, 1.2, 0.4] });
  // limbs: [from height, dir angle, elevation, length, radius]; tips collect canopy clusters
  const top = new THREE.Vector3(T.x + 0.1, G + 2.55, T.z - 0.02);
  const tips = [];
  const limb = (from, ang, elev, len, r, kinks = 2, leaves = true) => {
    let p = from.clone();
    let a = ang, e = elev;
    for (let k = 0; k < kinks; k++) {
      const l = len / kinks;
      const q = p.clone().add(new THREE.Vector3(Math.cos(a) * Math.cos(e) * l, Math.sin(e) * l, Math.sin(a) * Math.cos(e) * l));
      const r0 = r * (1 - k / kinks * 0.55), r1 = r * (1 - (k + 1) / kinks * 0.55);
      seg(p.toArray(), q.toArray(), r0, r1, PAL.bark, 7);
      p = q;
      a += (rand() - 0.5) * 0.6;
      e += 0.15 + (rand() - 0.5) * 0.2;
    }
    if (leaves) tips.push(p);
    return p;
  };
  // the swing limb reaches out west, nearly level
  const swingTip = limb(new THREE.Vector3(T.x, G + 2.0, T.z), Math.PI - 0.15, 0.1, 2.0, 0.17, 2);
  limb(top, -2.2, 0.6, 1.9, 0.2, 2);
  limb(top, -0.95, 0.65, 1.9, 0.2, 2);
  limb(top, 0.75, 0.95, 1.6, 0.18, 2, false);
  limb(top, 2.3, 0.7, 1.6, 0.17, 2);
  limb(top, -1.4, 1.1, 1.3, 0.2, 2);
  limb(top, 1.6, 0.8, 1.7, 0.17, 2);
  limb(new THREE.Vector3(T.x + 0.1, G + 1.6, T.z), 0.15, 0.2, 1.4, 0.15, 2, false); // under the platform
  // canopy: clusters grouped around each tip plus a crown over the top, leaving gaps for dappled light
  {
    const cl = (x, y, z, s) => {
      const col = LEAVES[Math.floor(rand() * LEAVES.length)];
      const lighter = new THREE.Color(col).lerp(new THREE.Color('#d9d66a'), 0.35);
      C.add(new THREE.IcosahedronGeometry(s, 1), col, { pos: [x, y, z], scl: [1, 0.78, 1], ry: rand() * 6, jitter: s * 0.14, shade: 0.12, top: lighter, y0: y - s * 0.1, y1: y + s * 0.85 });
    };
    for (const t of tips) {
      // one chunky cluster per tip and a smaller one tucked beside it: gaps between tips stay open
      const o = new THREE.Vector3(t.x - top.x, 0, t.z - top.z).normalize();
      cl(t.x + o.x * 0.25, Math.max(t.y + 0.35, G + 3.6), t.z + o.z * 0.25, 0.7 + rand() * 0.15);
      cl(t.x - o.z * 0.55, Math.max(t.y + 0.05, G + 3.45), t.z + o.x * 0.55, 0.42 + rand() * 0.1);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 2.6, d = 0.55;
      cl(top.x + Math.cos(a) * d, top.y + 1.75 + rand() * 0.3, top.z + Math.sin(a) * d, 0.62 + rand() * 0.12);
    }
    cl(top.x - 0.1, top.y + 2.35, top.z - 0.1, 0.62);
  }

  // Treehouse: a plank platform resting in the fork, walls of uneven boards, a rust roof, a flag.
  const H0 = G + 1.85; // platform height
  const HM = compose(THREE, { pos: [T.x + 1.25, H0, T.z + 0.5], ry: -0.22 });
  const hat = (o) => HM.clone().multiply(compose(THREE, o));
  let flag;
  {
    // platform boards with uneven ends
    for (let i = 0; i < 9; i++) {
      const z = -0.8 + i * 0.2;
      const l = 1.75 + (rand() - 0.5) * 0.12;
      P.add(new THREE.BoxGeometry(l, 0.05, 0.19), i % 3 === 1 ? PAL.plank2 : PAL.plank, { matrix: hat({ pos: [(rand() - 0.5) * 0.06, 0, z], ry: (rand() - 0.5) * 0.03 }), shade: 0.06 });
    }
    for (const z of [-0.75, 0.75]) P.add(new THREE.BoxGeometry(1.8, 0.12, 0.1), PAL.plank2, { matrix: hat({ pos: [0, -0.09, z] }) });
    // braces back to the trunk
    for (const [x, z] of [[0.75, -0.7], [0.75, 0.7]]) {
      const A = new THREE.Vector3(x, -0.08, z).applyMatrix4(HM);
      const B = new THREE.Vector3(T.x + 0.25, G + 1.35, T.z + z * 0.25);
      seg(A.toArray(), B.toArray(), 0.05, 0.05, PAL.plank2, 4);
    }
    // a post down to the lawn at the front corner
    {
      const A = new THREE.Vector3(0.8, -0.1, 0.72).applyMatrix4(HM);
      seg([A.x, G - 0.05, A.z], A.toArray(), 0.06, 0.06, PAL.plank2, 5);
    }
    // walls: horizontal boards, alternating tones, a door gap facing the ladder
    const WH = 0.85, hx = 0.55, hz = 0.5, x0 = -0.15;
    const board = (w, y, pos, ry) => {
      const t = rand();
      P.add(new THREE.BoxGeometry(w, 0.13, 0.04), t > 0.66 ? PAL.plank3 : t > 0.33 ? PAL.plank : PAL.plank2, { matrix: hat({ pos: [pos[0], y, pos[1]], ry, rot: [0, ry, (rand() - 0.5) * 0.04] }), shade: 0.05 });
    };
    for (let k = 0; k < 6; k++) {
      const y = 0.1 + k * 0.14;
      // back and sides
      board(hx * 2, y, [x0, -hz], 0);
      board(hz * 2, y, [x0 - hx, 0], Math.PI / 2);
      if (!(k >= 2 && k <= 3)) board(hz * 2, y, [x0 + hx, 0], Math.PI / 2);
      else { board(0.3, y, [x0 + hx, -0.35], Math.PI / 2); board(0.3, y, [x0 + hx, 0.35], Math.PI / 2); }
      // front: door gap on the right
      board(0.62, y, [x0 - 0.24, hz], 0);
      if (k >= 5) board(0.45, y, [x0 + 0.32, hz], 0);
    }
    // corner posts
    for (const [x, z] of [[x0 - hx, -hz], [x0 + hx, -hz], [x0 - hx, hz], [x0 + hx, hz]]) P.add(new THREE.BoxGeometry(0.07, WH + 0.05, 0.07), PAL.plank2, { matrix: hat({ pos: [x, WH / 2, z] }) });
    // window shutters on the east side, one hanging crooked
    P.add(new THREE.BoxGeometry(0.03, 0.3, 0.14), '#4f7f6a', { matrix: hat({ pos: [x0 + hx + 0.03, 0.47, -0.43], rot: [0, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.3, 0.14), '#4f7f6a', { matrix: hat({ pos: [x0 + hx + 0.06, 0.45, 0.45], rot: [0.25, 0.5, 0] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.26, 0.38), '#2c2620', { matrix: hat({ pos: [x0 + hx - 0.02, 0.48, 0] }) });
    // door gap darkness
    P.add(new THREE.BoxGeometry(0.4, 0.68, 0.02), '#2c2620', { matrix: hat({ pos: [x0 + 0.32, 0.38, hz - 0.03] }) });
    // roof: gable ends and a rust-red pitched roof, slightly skew
    P.add(gable(THREE, hx * 2 + 0.04, 0.4, 0.04), PAL.plank, { matrix: hat({ pos: [x0, WH, hz], ry: 0 }) });
    P.add(gable(THREE, hx * 2 + 0.04, 0.4, 0.04), PAL.plank, { matrix: hat({ pos: [x0, WH, -hz], ry: 0 }) });
    P.add(roof(THREE, hx * 2 + 0.35, 0.45, hz * 2 + 0.3, 0.05), PAL.roofR, { matrix: hat({ pos: [x0, WH - 0.04, 0], rot: [0, 0, 0.02] }), jitter: 0.008, shade: 0.08 });
    // a patch nailed on the roof
    P.add(new THREE.BoxGeometry(0.22, 0.02, 0.2), '#a5a8a8', { matrix: hat({ pos: [x0 + 0.3, WH + 0.2, 0.15], rot: [0, 0, -0.68] }) });
    // railing round the open deck (front right)
    for (let i = 0; i < 6; i++) P.add(new THREE.BoxGeometry(0.05, 0.35, 0.05), PAL.plank2, { matrix: hat({ pos: [0.55 + (i % 3) * 0.15, 0.18, i < 3 ? -0.78 : 0.78] }) });
    P.add(new THREE.BoxGeometry(0.4, 0.05, 0.06), PAL.plank, { matrix: hat({ pos: [0.7, 0.36, -0.78] }) });
    P.add(new THREE.BoxGeometry(0.4, 0.05, 0.06), PAL.plank, { matrix: hat({ pos: [0.7, 0.36, 0.78] }) });
    for (let i = 0; i < 4; i++) P.add(new THREE.BoxGeometry(0.05, 0.35, 0.05), PAL.plank2, { matrix: hat({ pos: [0.86, 0.18, -0.55 + i * 0.37] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.05, 1.2), PAL.plank, { matrix: hat({ pos: [0.86, 0.36, 0] }) });
    // pulley arm with a bucket on a rope
    P.add(new THREE.BoxGeometry(0.5, 0.06, 0.06), PAL.plank2, { matrix: hat({ pos: [1.05, 0.62, -0.35] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.62, 0.06), PAL.plank2, { matrix: hat({ pos: [0.82, 0.31, -0.35] }) });
    P.add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), '#7d7d80', { matrix: hat({ pos: [1.25, 0.58, -0.35], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 3), PAL.rope, { matrix: hat({ pos: [1.29, 0.03, -0.35] }) });
    P.add(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 8), '#4a7fc0', { matrix: hat({ pos: [1.29, -0.55, -0.35] }) });
    // KEEP OUT sign on the front board, painted by a child
    {
      const cv = document.createElement('canvas');
      cv.width = 128; cv.height = 64;
      const g = cv.getContext('2d');
      g.fillStyle = '#e7d3a6'; g.fillRect(0, 0, 128, 64);
      g.fillStyle = '#b8321f'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.translate(64, 33); g.rotate(-0.06); g.fillText('KEEP', 0, -12); g.fillText('OUT!', 4, 14); g.restore();
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshLambertMaterial({ map: tex }));
      s.applyMatrix4(hat({ pos: [x0 - 0.25, 0.55, hz + 0.03], rot: [0, 0, 0.07] }));
      root.add(s);
    }
    // flag pole on the ridge; the flag itself waves
    P.add(new THREE.CylinderGeometry(0.015, 0.02, 0.8, 5), PAL.white, { matrix: hat({ pos: [x0 + 0.45, WH + 0.75, -0.35] }) });
    const fp = new Painter(THREE, 54);
    fp.add(new THREE.BoxGeometry(0.42, 0.22, 0.01), PAL.red, { pos: [0.21, 0, 0] });
    fp.add(new THREE.BoxGeometry(0.42, 0.05, 0.012), PAL.gold, { pos: [0.21, 0, 0] });
    flag = fp.mesh(lambert(THREE, { side: THREE.DoubleSide }));
    flag.applyMatrix4(hat({ pos: [x0 + 0.45, WH + 1.02, -0.35] }));
    flag.userData.ry = flag.rotation.y;
    root.add(flag);
  }

  // Rope ladder from the platform edge to the lawn (sways as one piece).
  const ladder = new THREE.Group();
  {
    const top = new THREE.Vector3(0.95, -0.02, 0.35).applyMatrix4(HM);
    const L = top.y - G - 0.02;
    const lp = new Painter(THREE, 55);
    for (const dx of [-0.13, 0.13]) lp.add(new THREE.CylinderGeometry(0.012, 0.012, L, 4), PAL.rope, { pos: [dx, -L / 2, 0] });
    for (let k = 0; k < 7; k++) lp.add(new THREE.BoxGeometry(0.32, 0.035, 0.05), PAL.plank, { pos: [(rand() - 0.5) * 0.02, -0.2 - k * (L - 0.25) / 6, 0], rot: [0, 0, (rand() - 0.5) * 0.08] });
    ladder.add(lp.mesh(lambert(THREE)));
    ladder.position.copy(top);
    ladder.rotation.y = -0.22 + Math.PI / 2;
    root.add(ladder);
  }

  // Tyre swing on the long west limb (a pendulum).
  const swing = new THREE.Group();
  {
    const pivot = new THREE.Vector3(T.x - 1.35, 0, T.z - 0.1);
    // find the limb height there: the swing limb runs nearly level at ~G+2.15
    pivot.y = G + 2.1;
    const L = pivot.y - G - 0.55;
    const sp = new Painter(THREE, 56);
    sp.add(new THREE.CylinderGeometry(0.014, 0.014, L, 4), PAL.rope, { pos: [0, -L / 2, 0] });
    sp.add(new THREE.TorusGeometry(0.2, 0.08, 6, 12), PAL.tyre, { pos: [0, -L - 0.02, 0], rot: [0, 0.4, 0], shade: 0.08 });
    sp.add(new THREE.TorusGeometry(0.06, 0.02, 4, 8), PAL.rope, { pos: [0, -L + 0.16, 0], rot: [Math.PI / 2, 0, 0] });
    swing.add(sp.mesh(lambert(THREE)));
    swing.position.copy(pivot);
    root.add(swing);
    // the knot round the limb, and the worn earth beneath
    P.add(new THREE.TorusGeometry(0.17, 0.03, 4, 8), PAL.rope, { pos: [pivot.x, pivot.y + 0.02, pivot.z], rot: [0, 0, Math.PI / 2] });
    P.add(new THREE.CylinderGeometry(0.55, 0.6, 0.02, 9), '#9a7a52', { pos: [pivot.x, G + 0.002, pivot.z], scl: [1, 1, 0.6], jitter: 0.06, jitterY: 0 });
    void swingTip;
  }

  // Dog kennel with the dog asleep in the sun, a bowl and a chewed ball.
  {
    const km = compose(THREE, { pos: [2.55, G, -1.75], ry: -0.75 });
    const at = (o) => km.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.75, 0.55, 0.85), '#d6c49a', { matrix: at({ pos: [0, 0.28, 0] }), jitter: 0.01, shade: 0.04 });
    P.add(gable(THREE, 0.75, 0.3, 0.85), '#d6c49a', { matrix: at({ pos: [0, 0.55, 0], ry: 0 }) });
    P.add(roof(THREE, 0.95, 0.36, 1.0, 0.05), '#3f6a8a', { matrix: at({ pos: [0, 0.5, 0], ry: 0 }), shade: 0.06 });
    // arched doorway on the +z face
    P.add(new THREE.BoxGeometry(0.32, 0.3, 0.02), '#2b241f', { matrix: at({ pos: [0, 0.18, 0.43] }) });
    P.add(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 10, 1, false, -Math.PI / 2, Math.PI), '#2b241f', { matrix: at({ pos: [0, 0.33, 0.43], rot: [Math.PI / 2, 0, 0] }) });
    // name board
    P.add(new THREE.BoxGeometry(0.3, 0.08, 0.02), '#f1ece0', { matrix: at({ pos: [0, 0.58, 0.44] }) });
    P.add(new THREE.BoxGeometry(0.18, 0.025, 0.022), '#8e3d2c', { matrix: at({ pos: [0, 0.58, 0.445] }) });
    // the dog: curled, chin on paws, one ear flopped
    const d = (o) => at({ ...o, pos: [o.pos[0] + 0.15, o.pos[1], o.pos[2] + 0.75] });
    P.add(new THREE.SphereGeometry(0.2, 8, 6), PAL.dog, { matrix: d({ pos: [0, 0.13, 0], scl: [1.25, 0.6, 0.85] }) });
    P.add(new THREE.SphereGeometry(0.1, 8, 6), PAL.dog, { matrix: d({ pos: [0.26, 0.1, 0.1], scl: [1.1, 0.8, 1] }) });
    P.add(new THREE.SphereGeometry(0.05, 6, 4), '#f1e3cc', { matrix: d({ pos: [0.35, 0.08, 0.14], scl: [1.3, 0.8, 1] }) });
    P.add(new THREE.SphereGeometry(0.02, 4, 3), PAL.dark, { matrix: d({ pos: [0.41, 0.09, 0.15] }) });
    P.add(new THREE.BoxGeometry(0.1, 0.02, 0.06), '#8a5228', { matrix: d({ pos: [0.24, 0.17, 0.02], rot: [0, 0.3, 0.4] }) });
    P.add(new THREE.BoxGeometry(0.1, 0.02, 0.06), '#8a5228', { matrix: d({ pos: [0.22, 0.13, 0.17], rot: [0.9, -0.3, 0] }) });
    P.add(new THREE.SphereGeometry(0.11, 6, 4), '#f1e3cc', { matrix: d({ pos: [0.05, 0.12, 0.12], scl: [1.2, 0.6, 0.6] }) });
    P.add(new THREE.CylinderGeometry(0.025, 0.015, 0.25, 4), PAL.dog, { matrix: d({ pos: [-0.25, 0.06, 0.1], rot: [Math.PI / 2, 0, 0.6] }) });
    P.add(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 10), '#c0402e', { matrix: at({ pos: [-0.35, 0.025, 0.7] }) });
    P.add(new THREE.SphereGeometry(0.06, 7, 5), '#e8d84a', { matrix: at({ pos: [0.6, 0.06, 1.1] }) });
  }

  // Wheelbarrow heaped with apples, a few windfalls rolling off towards the oak.
  {
    const wm = compose(THREE, { pos: [1.65, G, 1.55], ry: 0.55 });
    const at = (o) => wm.clone().multiply(compose(THREE, o));
    // tray: tapered box from a frustum
    P.add(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4, 1), '#4a7a5a', { matrix: at({ pos: [0, 0.42, 0], ry: Math.PI / 4, scl: [1.0, 1, 1.45] }), shade: 0.05 });
    P.add(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10), PAL.dark, { matrix: at({ pos: [0, 0.15, 0.55], rot: [0, 0, Math.PI / 2] }) });
    P.add(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6), '#9aa0a8', { matrix: at({ pos: [0, 0.15, 0.55], rot: [0, 0, Math.PI / 2] }) });
    for (const s of [-1, 1]) {
      P.add(new THREE.BoxGeometry(0.04, 0.04, 1.25), PAL.plank2, { matrix: at({ pos: [s * 0.2, 0.3, -0.1], rot: [-0.18, 0, 0] }) });
      P.add(new THREE.BoxGeometry(0.03, 0.27, 0.03), PAL.dark, { matrix: at({ pos: [s * 0.18, 0.14, -0.35] }) });
    }
    for (let i = 0; i < 26; i++) {
      const a = rand() * 6.28, d = Math.sqrt(rand()) * 0.3;
      const x = Math.cos(a) * d * 0.75, z = Math.sin(a) * d;
      const y = 0.55 + (0.3 - d) * 0.45 + rand() * 0.04;
      P.add(new THREE.SphereGeometry(0.065, 6, 4), rand() > 0.25 ? PAL.apple : PAL.apple2, { matrix: at({ pos: [x, y, z] }), shade: 0.1 });
    }
    for (const [x, z] of [[-0.55, -0.3], [-0.85, -0.55], [-1.3, -0.7], [0.3, -0.7]]) P.add(new THREE.SphereGeometry(0.065, 6, 4), PAL.apple, { matrix: at({ pos: [x, 0.06, z] }) });
    // a half-eaten one
    P.add(new THREE.SphereGeometry(0.065, 6, 4, 0, Math.PI), '#f2e6c0', { matrix: at({ pos: [-1.0, 0.06, 0.15], ry: 1 }) });
    P.add(new THREE.SphereGeometry(0.066, 6, 4, Math.PI, Math.PI), PAL.apple, { matrix: at({ pos: [-1.0, 0.06, 0.15], ry: 1 }) });
  }

  // Raised vegetable bed: cabbages, a fat pumpkin, a bean-cane wigwam with runner beans.
  {
    const bm = compose(THREE, { pos: [-2.15, G, 1.35], ry: 0.35 });
    const at = (o) => bm.clone().multiply(compose(THREE, o));
    for (const [x, z, w, d] of [[0, -0.42, 1.5, 0.08], [0, 0.42, 1.5, 0.08], [-0.71, 0, 0.08, 0.76], [0.71, 0, 0.08, 0.76]]) P.add(new THREE.BoxGeometry(w, 0.2, d), PAL.plank2, { matrix: at({ pos: [x, 0.1, z] }), jitter: 0.006 });
    P.add(new THREE.BoxGeometry(1.36, 0.16, 0.78), '#5a3e2a', { matrix: at({ pos: [0, 0.09, 0] }), jitter: 0.01 });
    for (const [x, z] of [[-0.45, -0.18], [-0.45, 0.18], [-0.1, -0.2], [-0.1, 0.17]]) P.add(new THREE.IcosahedronGeometry(0.12, 1), '#7aa86a', { matrix: at({ pos: [x, 0.24, z], scl: [1, 0.75, 1] }), jitter: 0.015, top: '#a9cf8a', y0: 0.2, y1: 0.33 });
    P.add(new THREE.SphereGeometry(0.17, 9, 6), '#e0832e', { matrix: at({ pos: [0.32, 0.27, 0.12], scl: [1.15, 0.75, 1] }), shade: 0.06 });
    P.add(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 4), '#4d6b2f', { matrix: at({ pos: [0.32, 0.4, 0.12] }) });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      P.add(new THREE.CylinderGeometry(0.012, 0.015, 1.2, 4), '#b89a64', { matrix: at({ pos: [0.45 + Math.cos(a) * 0.12, 0.72, -0.18 + Math.sin(a) * 0.12], rot: [-Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2] }) });
      P.add(new THREE.IcosahedronGeometry(0.1, 0), '#5f9a40', { matrix: at({ pos: [0.45 + Math.cos(a) * 0.15, 0.45 + (k % 2) * 0.3, -0.18 + Math.sin(a) * 0.15], scl: [0.8, 1.4, 0.8] }) });
      P.add(new THREE.IcosahedronGeometry(0.03, 0), '#e2483a', { matrix: at({ pos: [0.45 + Math.cos(a) * 0.2, 0.6 + (k % 3) * 0.12, -0.18 + Math.sin(a) * 0.2] }) });
    }
    // trowel stuck in the soil
    P.add(new THREE.BoxGeometry(0.06, 0.1, 0.01), '#9aa0a8', { matrix: at({ pos: [-0.3, 0.2, 0.05], rot: [0.3, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4), '#c0402e', { matrix: at({ pos: [-0.3, 0.29, 0.07], rot: [0.3, 0, 0] }) });
  }
  // Washing line between two T-posts behind the oak, sheets and a striped towel.
  {
    const A = [-3.2, -1.55], B = [-1.1, -3.35];
    for (const [x, z] of [A, B]) {
      P.add(new THREE.CylinderGeometry(0.035, 0.04, 1.7, 5), '#d8d2c2', { pos: [x, G + 0.85, z], rot: [0.02, 0, -0.03] });
      P.add(new THREE.BoxGeometry(0.45, 0.04, 0.04), '#d8d2c2', { pos: [x, G + 1.65, z], ry: Math.atan2(-(B[1] - A[1]), B[0] - A[0]) + Math.PI / 2 });
    }
    const yaw = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    P.add(new THREE.BoxGeometry(len, 0.01, 0.01), '#e8e2d2', { pos: [(A[0] + B[0]) / 2, G + 1.6, (A[1] + B[1]) / 2], ry: yaw });
    const items = [[0.18, 0.4, 0.5, '#f4f1e8'], [0.42, 0.25, 0.3, '#e46a5a'], [0.6, 0.45, 0.42, '#8fc0e0'], [0.8, 0.2, 0.18, '#f2c94c']];
    for (const [t, w, h, c] of items) {
      const x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
      P.add(new THREE.BoxGeometry(w * len * 0.5, h, 0.015), c, { pos: [x, G + 1.6 - h / 2 - 0.02 * Math.sin(t * Math.PI), z], ry: yaw, rot: [0.05, yaw, 0], jitter: 0.01, shade: 0.04 });
      if (c === '#e46a5a') for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(w * len * 0.5 + 0.005, 0.03, 0.02), '#f4f1e8', { pos: [x, G + 1.5 - k * 0.07, z], ry: yaw });
      for (const d of [-1, 1]) P.add(new THREE.BoxGeometry(0.02, 0.06, 0.03), '#c9a77a', { pos: [x + Math.cos(yaw) * d * w * len * 0.22, G + 1.6, z - Math.sin(yaw) * d * w * len * 0.22], ry: yaw });
    }
  }

  // Garden fence round the back and right with a gate, sunflowers leaning over it.
  {
    const pts = offsetOutline(rim, -0.3);
    const n = pts.length;
    const fence = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = pts[i];
      const a = Math.atan2(z, x);
      if (a > -2.9 && a < 0.35) fence.push([x, z, i]); // back (-z) and right side
    }
    fence.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
    for (let i = 0; i < fence.length; i++) {
      const [x, z] = fence[i];
      const gate = i === 5;
      P.add(new THREE.BoxGeometry(0.08, 0.62, 0.08), PAL.white, { pos: [x, G + 0.3, z], rot: [(rand() - 0.5) * 0.06, rand(), (rand() - 0.5) * 0.06] });
      P.add(new THREE.ConeGeometry(0.06, 0.08, 4), PAL.white, { pos: [x, G + 0.65, z], ry: Math.PI / 4 });
      if (i < fence.length - 1) {
        const [x2, z2] = fence[i + 1];
        const l = Math.hypot(x2 - x, z2 - z), yaw = Math.atan2(-(z2 - z), x2 - x);
        if (gate) {
          // the gate, swung open
          let best = null;
          for (const sw of [0.9, -0.9]) {
            const gx = x + Math.cos(yaw + sw) * l * 0.45, gz = z - Math.sin(yaw + sw) * l * 0.45;
            if (!best || Math.hypot(gx, gz) < Math.hypot(best[0], best[1])) best = [gx, gz, yaw + sw];
          }
          P.add(new THREE.BoxGeometry(l * 0.9, 0.42, 0.03), '#e3dccb', { pos: [best[0], G + 0.32, best[1]], ry: best[2] });
          continue;
        }
        for (const y of [0.22, 0.48]) P.add(new THREE.BoxGeometry(l + 0.04, 0.06, 0.03), PAL.white, { pos: [(x + x2) / 2, G + y, (z + z2) / 2], ry: yaw, rot: [0, yaw, (rand() - 0.5) * 0.04] });
        // pickets
        const np = Math.floor(l / 0.16);
        for (let k = 1; k < np; k++) {
          const t = k / np;
          P.add(new THREE.BoxGeometry(0.06, 0.5 + rand() * 0.04, 0.02), '#ebe6d8', { pos: [x + (x2 - x) * t, G + 0.27, z + (z2 - z) * t], ry: yaw });
        }
      }
    }
    // sunflowers along the right-hand fence
    for (let i = 0; i < 6; i++) {
      const [fx, fz] = fence[fence.length - 2 - Math.floor(i * 0.8)] || fence[0];
      const x = fx * 0.93 + (rand() - 0.5) * 0.2, z = fz * 0.93 + (rand() - 0.5) * 0.3;
      const h = 0.9 + rand() * 0.6;
      P.add(new THREE.CylinderGeometry(0.02, 0.03, h, 5), '#5f8a35', { pos: [x, G + h / 2, z], rot: [(rand() - 0.5) * 0.15, 0, (rand() - 0.5) * 0.15] });
      for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.08, 5, 3), '#5f8a35', { pos: [x + s * 0.07, G + h * 0.55, z], scl: [1.2, 0.3, 0.7], rot: [0, 0, s * 0.4] });
      const fm = compose(THREE, { pos: [x, G + h, z], rot: [0.35, Math.atan2(-x, -z) + (rand() - 0.5) * 0.6, 0] });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        P.add(new THREE.ConeGeometry(0.035, 0.12, 3), PAL.gold, { matrix: fm.clone().multiply(compose(THREE, { pos: [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0], rot: [0, 0, a - Math.PI / 2], scl: [1.5, 1.5, 0.3] })) });
      }
      P.add(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8), '#5a3a1e', { matrix: fm.clone().multiply(compose(THREE, { rot: [Math.PI / 2, 0, 0] })) });
    }
  }

  // Fallen leaves drifted round the oak and along the fence: small warm flecks that break up the lawn.
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, d = 0.6 + Math.pow(rand(), 0.7) * 2.6;
    const x = T.x + Math.cos(a) * d * 1.1, z = T.z + Math.sin(a) * d;
    if (Math.pow(Math.abs(x) / 4.2, 3) + Math.pow(Math.abs(z) / 4.0, 3) > 1) continue;
    P.add(new THREE.CircleGeometry(0.07 + rand() * 0.05, 4), LEAVES[Math.floor(rand() * 5)], { pos: [x, G + 0.012 + rand() * 0.004, z], rot: [-Math.PI / 2, 0, rand() * 6], scl: [1, 0.6, 1], shade: 0.1 });
  }

  // Stepping stones from the gate to the oak, a paper aeroplane on the lawn, a forgotten trowel.
  {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const x = 1.25 - t * 1.4 + Math.sin(t * 4) * 0.15, z = -3.3 + t * 2.0;
      P.add(new THREE.CylinderGeometry(0.17 + rand() * 0.04, 0.18, 0.04, 7), '#ddd0b6', { pos: [x, G + 0.01, z], ry: rand(), scl: [1.3, 1, 1.0], jitter: 0.015, jitterY: 0 });
    }
    const pm = compose(THREE, { pos: [0.55, G + 0.04, 2.4], ry: 0.7, rot: [0, 0.7, 0.08] });
    const pa = new THREE.BufferGeometry();
    pa.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0.22, -0.13, 0.02, -0.12, 0, 0, -0.1,
      0, 0, 0.22, 0, 0, -0.1, 0.13, 0.02, -0.12,
      0, 0, 0.22, 0, 0, -0.1, 0, -0.04, -0.1,
    ], 3));
    P.add(pa, '#f6f3ea', { matrix: pm, shade: 0.03 });
    P.add(pa.clone(), '#f6f3ea', { matrix: pm.clone().multiply(compose(THREE, { rot: [0, 0, 0.0], scl: [1, -1, 1] })), shade: 0.03 });
  }

  // Lawn detail: clover, daisies, a molehill; tall grass and seed heads along the edges and fence.
  {
    for (let i = 0; i < 40; i++) {
      const a = rand() * 6.28, d = 0.8 + rand() * 3.1;
      const x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d;
      if (Math.pow(Math.abs(x) / 4.4, 2.3) + Math.pow(Math.abs(z) / 4.1, 2.3) > 1) continue;
      P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 5), rand() > 0.3 ? '#fbf7ea' : '#f2d04a', { pos: [x, G + 0.015, z] });
    }
    P.add(new THREE.ConeGeometry(0.22, 0.14, 7), '#6a4a32', { pos: [-2.6, G + 0.05, 1.9], jitter: 0.03 });
    const tuft = (x, z, h, n, gold) => {
      Gr.add(new THREE.IcosahedronGeometry(0.11 + h * 0.12, 0), '#6f9a3f', { pos: [x, G + 0.03, z], scl: [1.2, 0.7, 1.2], ry: rand() * 3, shade: 0.06 });
      for (let k = 0; k < n; k++) {
        const a = rand() * 6.28, r = rand() * 0.12;
        const hh = h * (0.7 + rand() * 0.5);
        Gr.add(new THREE.ConeGeometry(0.045, hh, 3), gold && rand() > 0.5 ? '#c9b25a' : rand() > 0.5 ? '#6f9a3f' : '#8aaa48', { pos: [x + Math.cos(a) * r, G + hh / 2 - 0.02, z + Math.sin(a) * r], rot: [(rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5], shade: 0.08, top: '#c8c068', y0: G, y1: G + hh * 1.3 });
        if (gold && rand() > 0.6) Gr.add(new THREE.ConeGeometry(0.025, 0.12, 4), '#d6b85c', { pos: [x + Math.cos(a) * r, G + hh + 0.02, z + Math.sin(a) * r] });
      }
    };
    // clumps hugging the rim (front-left meadow edge left unmown), and round the fence posts
    const edge = offsetOutline(rim, -0.25);
    for (let i = 0; i < edge.length; i++) {
      const [x, z] = edge[i];
      const a = Math.atan2(z, x);
      const meadow = a > 1.3 && a < 3.0; // front-left
      if (!meadow && rand() > 0.22) continue;
      tuft(x, z, meadow ? 0.55 : 0.35, low ? 4 : meadow ? 9 : 6, meadow);
      if (meadow) tuft(x * 0.85, z * 0.85, 0.5, low ? 3 : 7, true);
    }
    // poppies in the meadow edge
    for (let i = 0; i < 9; i++) {
      const a = 1.4 + rand() * 1.5, d = 3.4 + rand() * 0.6;
      P.add(new THREE.CylinderGeometry(0.045, 0.02, 0.04, 5), '#d83a2a', { pos: [Math.cos(a) * d * 1.05, G + 0.4 + rand() * 0.15, Math.sin(a) * d * 0.95] });
    }
    // tufts round the oak's roots
    for (let i = 0; i < 6; i++) {
      const a = rand() * 6.28;
      tuft(T.x + Math.cos(a) * 0.75, T.z + Math.sin(a) * 0.75, 0.3, 4, false);
    }
  }

  root.add(P.mesh(lambert(THREE)));
  // Canopy and grass sway in the vertex shader; their shadows stay baked at rest.
  const sway = (amp, base, height, freq) => {
    const m = lambert(THREE);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float w = clamp((position.y - ${base.toFixed(2)}) / ${height.toFixed(2)}, 0.0, 1.0) * ${amp.toFixed(3)};
        transformed.x += w * sin(uTime * ${freq.toFixed(2)} + position.x * 0.9 + position.z * 0.6);
        transformed.z += w * 0.6 * cos(uTime * ${(freq * 0.8).toFixed(2)} + position.x * 0.7 - position.z * 0.5);`);
    };
    return m;
  };
  root.add(C.mesh(sway(0.045, G + 3.0, 2.5, 1.1)));
  const grass = Gr.mesh(sway(0.05, G, 0.6, 1.7), { cast: false, receive: true });
  root.add(grass);

  // Light: low warm evening sun from the right-front, cool sky fill, earthy bounce.
  root.add(new THREE.HemisphereLight('#a9c3e6', '#5c5a2e', 1.25));
  const key = keyLight(THREE, ctx, { color: '#ffc983', intensity: 3.4, pos: [7, 4.8, 4.5], extent: 7.2 });
  root.add(key, key.target);
  root.add(sunsetSky(THREE, { topSun: '#7aa0d0', topAway: '#2f5fa8', midSun: '#ffc27a', midAway: '#a8c0d8', bottom: '#d8b88a', sun: [0.75, 0.12, 0.5], sunColor: '#ffae50', sunPow: 9, horizon: 0.5 }));

  // Bees: a few dots looping over the sunflowers (one Points cloud, moved in the vertex shader).
  {
    const NB = low ? 3 : 6;
    const pos = [], ph = [];
    for (let i = 0; i < NB; i++) { pos.push(3.0 + rand() * 0.6, G + 1.2 + rand() * 0.4, -0.4 + rand() * 1.4); ph.push(rand() * 6.28); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('ph', new THREE.Float32BufferAttribute(ph, 1));
    const m = new THREE.PointsMaterial({ color: '#2b2a1e', size: 0.06 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\nattribute float ph;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += vec3(0.3 * sin(uTime * 1.3 + ph), 0.12 * sin(uTime * 2.7 + ph * 2.0), 0.25 * sin(uTime * 1.9 + ph * 1.3));`);
    };
    const bees = new THREE.Points(g, m);
    bees.frustumCulled = false;
    root.add(bees);
  }

  function update(t) {
    uTime.value = t;
    swing.rotation.z = Math.sin(t * 1.2) * 0.07;
    swing.rotation.x = Math.sin(t * 0.6 + 1) * 0.03;
    ladder.rotation.z = Math.sin(t * 0.9) * 0.025;
    flag.rotation.y = flag.userData.ry + Math.sin(t * 2.3) * 0.25;
    flag.scale.x = 0.92 + 0.08 * Math.sin(t * 3.1);
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f3c48c'),
    fog: new THREE.Fog('#efc795', 28, 64),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
