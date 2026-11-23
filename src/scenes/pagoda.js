// Lily Pagoda: an autumn water garden at sunset. Three-tier pagoda on an island, red arched bridge,
// stepping stones, lilies, koi under the water, a heron eyeing them, a bamboo deer-scarer that tips.
import { Painter, compose, lambert, unlit, slab, keyLight, disposeTree, rng, halos } from './kit.js';

const PAL = {
  water: '#377a74',
  bed: '#24403c',
  stone: '#a3a8a2',
  stoneDark: '#7c837f',
  moss: '#8fae5c',
  moss2: '#6f9150',
  earth: '#5a4639',
  board: '#3b2b25',
  plaster: '#efe9dc',
  timber: '#5b4a42',
  verdigris: '#4f8a7c',
  verdiDark: '#2f5a50',
  vermilion: '#d23a26',
  pine: '#2c5240',
  pine2: '#56785c',
  maple: '#c8402e',
  maple2: '#e8902e',
  pad: '#6f9a63',
  pink: '#f0a6b8',
  bamboo: '#b9b56e',
};

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
  const rand = rng(7307);
  const root = new THREE.Group();
  const P = new Painter(THREE, 73);
  const E = new Painter(THREE, 74);

  const BED = 0.05; // pond floor
  const W = 0.3; // water surface
  const G = 0.5; // bank top
  const IY = 0.62; // island top
  const glowPts = [];

  // Rim: a soft superellipse with a slow wobble; banks reuse the same curve so their outer edge follows it.
  const RX = 4.7, RZ = 4.45, SQ = 2.3;
  const rimAt = (t) => {
    const c = Math.cos(t), s = Math.sin(t), e = 2 / SQ;
    const w = 1 + 0.025 * Math.sin(t * 3 + 1.3) + 0.015 * Math.sin(t * 7 + 0.4);
    return [Math.sign(c) * Math.pow(Math.abs(c), e) * RX * w, Math.sign(s) * Math.pow(Math.abs(s), e) * RZ * w];
  };
  const NR = 40;
  const rim = [];
  for (let i = 0; i < NR; i++) rim.push(rimAt((i / NR) * Math.PI * 2));
  const grow = (pts, d) => pts.map(([x, z]) => { const l = Math.hypot(x, z); return [x + (x / l) * d, z + (z / l) * d]; });

  // Plinth: dark board, earth, two grey stone courses, then the pond bed.
  P.add(slab(THREE, grow(rim, 0.3), -1.5, -1.2, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.2, -0.75), PAL.earth, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, grow(rim, 0.02), -0.75, -0.38), PAL.stoneDark, { jitter: 0.03, shade: 0.12 });
  P.add(slab(THREE, rim, -0.38, BED), '#8c918b', { jitter: 0.03, shade: 0.1, top: '#2a4a44', y0: -0.02, y1: BED });
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2, d = rand() * 3.2;
    P.add(new THREE.IcosahedronGeometry(0.08 + rand() * 0.12, 0), rand() > 0.5 ? '#56746a' : '#4a675e', { pos: [Math.cos(a) * d, BED, Math.sin(a) * d], scl: [1, 0.4, 1], ry: rand() * 6 });
  }

  // Banks: crescents between the rim and a wobbly inner edge, with moss on top and edging stones.
  const bank = (t0, t1, width, steps, seed) => {
    const outer = [], inner = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, t = t0 + (t1 - t0) * k;
      const [x, z] = rimAt(t);
      const l = Math.hypot(x, z);
      const w = Math.max(0.05, width(k) * (1 + 0.12 * Math.sin(k * 23 + seed)));
      outer.push([x + (x / l) * 0.03, z + (z / l) * 0.03]);
      inner.push([x * (1 - w / l), z * (1 - w / l), w]);
    }
    const poly = outer.concat(inner.slice().reverse().map(([x, z]) => [x, z]));
    P.add(slab(THREE, poly, BED - 0.01, G - 0.08), '#8a8174', { jitter: 0.02, shade: 0.08 });
    P.add(slab(THREE, poly, G - 0.08, G, 0.02), PAL.moss, { jitter: 0.02, jitterY: 0.01, shade: 0.07 });
    // edging stones along the water side (skip the very ends)
    for (let i = 1; i < inner.length - 1; i++) {
      if (inner[i][2] < 0.25) continue;
      const [x, z] = inner[i];
      const s = 0.13 + rand() * 0.14;
      P.add(new THREE.IcosahedronGeometry(s, 0), rand() > 0.4 ? PAL.stone : PAL.stoneDark, { pos: [x * 0.985, G - 0.12 - rand() * 0.06, z * 0.985], scl: [1.3, 0.8, 1], ry: rand() * 6, jitter: s * 0.15 });
    }
    return inner;
  };
  const bump = (k, c, w) => Math.exp(-((k - c) * (k - c)) / (w * w));
  // back and right: wide at the back-right corner, tapering to the front-right
  bank(3.5, Math.PI * 2 + 0.85, (k) => 0.35 + 1.25 * bump(k, 0.55, 0.32) + 0.5 * bump(k, 0.2, 0.12), 44, 1.7);
  // front-left: a small spit where the stepping stones start
  bank(1.9, 3.2, (k) => 0.3 + 1.35 * bump(k, 0.45, 0.3), 18, 4.2);

  // Water: polar grid over the rim (ripples in the vertex shader) plus a glassy side wall.
  const RINGS = low ? 5 : 8;
  const wv = [], wIdx = [];
  for (let r = 0; r <= RINGS; r++) {
    for (let i = 0; i < NR; i++) {
      if (r === 0 && i > 0) break;
      const k = r / RINGS;
      wv.push(rim[i][0] * k, W, rim[i][1] * k);
    }
  }
  const vi = (r, i) => (r === 0 ? 0 : 1 + (r - 1) * NR + (i % NR));
  for (let r = 0; r < RINGS; r++) {
    for (let i = 0; i < NR; i++) {
      if (r === 0) wIdx.push(0, vi(1, i + 1), vi(1, i));
      else wIdx.push(vi(r, i), vi(r, i + 1), vi(r + 1, i), vi(r, i + 1), vi(r + 1, i + 1), vi(r + 1, i));
    }
  }
  const wgI = new THREE.BufferGeometry();
  wgI.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3));
  wgI.setIndex(wIdx);
  const wg = wgI.toNonIndexed();
  wgI.dispose();
  // side wall
  {
    const sv = [];
    for (let i = 0; i < NR; i++) {
      const a = rim[i], b = rim[(i + 1) % NR];
      sv.push(a[0], BED, a[1], b[0], BED, b[1], b[0], W, b[1], a[0], BED, a[1], b[0], W, b[1], a[0], W, a[1]);
    }
    const sideG = new THREE.BufferGeometry();
    sideG.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    const merged = new THREE.BufferGeometry();
    const pa = new Float32Array(wg.attributes.position.array.length + sv.length);
    pa.set(wg.attributes.position.array);
    pa.set(sv, wg.attributes.position.array.length);
    merged.setAttribute('position', new THREE.BufferAttribute(pa, 3));
    wg.dispose();
    sideG.dispose();
    const col = new Float32Array(pa.length);
    const c1 = new THREE.Color(PAL.water), c2 = new THREE.Color('#5d9f93'), c = new THREE.Color();
    for (let f = 0; f < pa.length / 3; f += 3) {
      c.copy(c1).lerp(c2, rand() * 0.4);
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f + v) * 3);
    }
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
    merged.computeVertexNormals();
    var waterGeo = merged;
  }
  const rimR = Math.min(...rim.map(([x, z]) => Math.hypot(x, z)));
  const waterMat = lambert(THREE, { transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const uTime = { value: 0 };
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      if (position.y > ${(W - 0.01).toFixed(3)}) {
        float edge = clamp((${rimR.toFixed(3)} - length(position.xz)) / 0.8, 0.0, 1.0);
        transformed.y = ${W.toFixed(3)} + edge * 0.012 * (sin(position.x * 2.1 + uTime * 0.7) + cos(position.z * 1.7 - uTime * 0.55));
      }`);
  };
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.receiveShadow = true;
  water.renderOrder = 1;
  root.add(water);

  // Island: rock lumps under a moss cap, a gravel apron round the pagoda.
  const IC = [-1.35, -0.75];
  const rockD = low ? 0 : 1;
  const lump = (x, y, z, sx, sy, sz, col, ry) => P.add(new THREE.IcosahedronGeometry(1, rockD), col, { pos: [x, y, z], scl: [sx, sy, sz], ry, jitter: 0.08, shade: 0.12 });
  lump(IC[0], 0.25, IC[1], 1.55, 0.42, 1.35, PAL.stoneDark, 0.3);
  lump(IC[0] + 0.9, 0.3, IC[1] + 0.55, 0.65, 0.4, 0.55, PAL.stone, 1.1);
  lump(IC[0] - 1.1, 0.28, IC[1] - 0.3, 0.6, 0.35, 0.7, PAL.stone, 0.6);
  lump(IC[0] - 0.2, 0.25, IC[1] - 1.15, 0.7, 0.32, 0.5, PAL.stoneDark, 2.0);
  P.add(new THREE.CylinderGeometry(1.32, 1.42, 0.2, 14), PAL.moss2, { pos: [IC[0], IY - 0.1, IC[1]], scl: [1, 1, 0.88], jitter: 0.07, jitterY: 0.02, shade: 0.08 });
  P.add(new THREE.CylinderGeometry(0.98, 1.02, 0.04, 12), '#cfcabd', { pos: [IC[0] + 0.05, IY, IC[1] + 0.05], scl: [1, 1, 0.9], jitter: 0.04, jitterY: 0, shade: 0.04 });
  // raked rings in the gravel
  for (const r of [0.86, 0.96]) P.add(new THREE.TorusGeometry(r, 0.012, 3, 28), '#b9b3a4', { pos: [IC[0] + 0.05, IY + 0.02, IC[1] + 0.05], rot: [Math.PI / 2, 0, 0], scl: [1, 0.9, 1] });

  // Pagoda: three tiers with verdigris roofs and a spire.
  const PG = compose(THREE, { pos: [IC[0] + 0.05, IY, IC[1] + 0.05], ry: 0.32, scl: 1.15 });
  const pat = (o) => PG.clone().multiply(compose(THREE, o));
  P.add(new THREE.BoxGeometry(1.36, 0.16, 1.36), PAL.stone, { matrix: pat({ pos: [0, 0.08, 0] }), jitter: 0.02 });
  P.add(new THREE.BoxGeometry(1.2, 0.08, 1.2), '#8e8a80', { matrix: pat({ pos: [0, 0.2, 0] }) });
  P.add(new THREE.BoxGeometry(0.4, 0.1, 0.25), PAL.stone, { matrix: pat({ pos: [0, 0.05, 0.78] }) });
  const tiers = [
    { s: 0.48, h: 0.58, eave: 0.95 },
    { s: 0.38, h: 0.42, eave: 0.8 },
    { s: 0.3, h: 0.36, eave: 0.66 },
  ];
  const R2 = Math.SQRT2;
  let y = 0.24;
  const corner = [];
  tiers.forEach((t, k) => {
    // walls, corner posts, a band under the eaves
    P.add(new THREE.BoxGeometry(t.s * 2, t.h, t.s * 2), PAL.plaster, { matrix: pat({ pos: [0, y + t.h / 2, 0] }), shade: 0.03 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(new THREE.BoxGeometry(0.07, t.h, 0.07), PAL.timber, { matrix: pat({ pos: [sx * t.s, y + t.h / 2, sz * t.s] }) });
    P.add(new THREE.BoxGeometry(t.s * 2 + 0.06, 0.07, t.s * 2 + 0.06), PAL.timber, { matrix: pat({ pos: [0, y + t.h - 0.035, 0] }) });
    if (k === 0) {
      P.add(new THREE.BoxGeometry(0.3, 0.42, 0.04), PAL.timber, { matrix: pat({ pos: [0, y + 0.21, t.s + 0.01] }) });
      P.add(new THREE.BoxGeometry(t.s * 2 + 0.24, 0.05, t.s * 2 + 0.24), '#7a6458', { matrix: pat({ pos: [0, y + 0.02, 0] }) });
    } else {
      // little railed balcony and a lit window slit on the upper tiers
      P.add(new THREE.BoxGeometry(t.s * 2 + 0.16, 0.04, t.s * 2 + 0.16), PAL.timber, { matrix: pat({ pos: [0, y + 0.02, 0] }) });
      P.add(new THREE.BoxGeometry(t.s * 2 + 0.16, 0.025, t.s * 2 + 0.16), PAL.vermilion, { matrix: pat({ pos: [0, y + 0.14, 0] }) });
      E.add(new THREE.BoxGeometry(0.14, 0.18, 0.02), '#f7e3b0', { matrix: pat({ pos: [0, y + t.h * 0.55, t.s + 0.005] }) });
      glowPts.push(new THREE.Vector3(0, y + t.h * 0.55, t.s + 0.06).applyMatrix4(pat({})).toArray());
    }
    y += t.h;
    // roof: shallow wide flare under a steeper hip, so the eave reads concave
    const ro = t.eave * R2, rm = (t.s + 0.2) * R2;
    const rt = (k < 2 ? tiers[k + 1].s : 0.05) * R2 * 0.9;
    P.add(new THREE.CylinderGeometry(rm, ro, 0.09, 4, 1), PAL.verdiDark, { matrix: pat({ pos: [0, y + 0.045, 0], ry: Math.PI / 4 }), shade: 0.03 });
    const up = k < 2 ? 0.26 : 0.42;
    P.add(new THREE.CylinderGeometry(rt, rm, up, 4, 1), PAL.verdigris, { matrix: pat({ pos: [0, y + 0.09 + up / 2, 0], ry: Math.PI / 4 }), shade: 0.03 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = pat({ pos: [sx * t.eave * 0.98, y + 0.12, sz * t.eave * 0.98], ry: Math.atan2(sx, sz), rot: [0.85, Math.atan2(sx, sz), 0] });
      P.add(new THREE.ConeGeometry(0.035, 0.2, 4), PAL.verdiDark, { matrix: m });
      if (k === 0) corner.push(new THREE.Vector3(sx * t.eave, y - 0.02, sz * t.eave).applyMatrix4(PG));
    }
    y += 0.09 + (k < 2 ? up - 0.06 : up);
  });
  // spire with rings and a jewel
  P.add(new THREE.CylinderGeometry(0.025, 0.03, 0.75, 5), '#6d6a5e', { matrix: pat({ pos: [0, y + 0.3, 0] }) });
  for (let r = 0; r < 5; r++) P.add(new THREE.CylinderGeometry(0.08 - r * 0.008, 0.08 - r * 0.008, 0.025, 8), '#8d8a6e', { matrix: pat({ pos: [0, y + 0.12 + r * 0.1, 0] }) });
  P.add(new THREE.IcosahedronGeometry(0.06, 0), '#c9b16a', { matrix: pat({ pos: [0, y + 0.72, 0] }) });
  const spireTop = new THREE.Vector3(0, y + 0.72, 0).applyMatrix4(PG);

  // Arched bridge from the island to the right bank.
  const B0 = new THREE.Vector3(IC[0] + 1.25, IY - 0.04, IC[1] + 0.3);
  const B1 = new THREE.Vector3(2.95, G - 0.02, -0.1);
  const BH = 0.72, BW = 0.52;
  const bd = B1.clone().sub(B0).setY(0);
  const BL = bd.length();
  bd.normalize();
  const bn = new THREE.Vector3(-bd.z, 0, bd.x);
  const byaw = Math.atan2(bd.x, bd.z);
  const arc = (s, n = 0) => {
    const p = B0.clone().lerp(B1, s).addScaledVector(bn, n);
    p.y += BH * Math.sin(Math.PI * s);
    return p;
  };
  const slope = (s) => Math.atan2(BH * Math.PI * Math.cos(Math.PI * s) + (B1.y - B0.y), BL);
  const PLK = 15;
  for (let i = 0; i < PLK; i++) {
    const s = (i + 0.5) / PLK;
    const p = arc(s);
    P.add(new THREE.BoxGeometry(BW, 0.05, BL / PLK + 0.02), i % 4 ? '#8a6a55' : '#7a5c49', { pos: [p.x, p.y, p.z], rot: [-slope(s), byaw + (rand() - 0.5) * 0.04, 0], shade: 0.06 });
  }
  // stringers under the deck
  for (let i = 0; i < 10; i++) {
    const s0 = i / 10, s1 = (i + 1) / 10;
    for (const n of [-BW / 2 + 0.03, BW / 2 - 0.03]) bridgeBar(arc(s0, n).add(new THREE.Vector3(0, -0.08, 0)), arc(s1, n).add(new THREE.Vector3(0, -0.08, 0)), 0.05, PAL.vermilion);
  }
  // railings: posts with knob caps, a top rail along the arc
  const NP = 7;
  for (const n of [-BW / 2, BW / 2]) {
    for (let i = 0; i < NP; i++) {
      const s = 0.04 + (i / (NP - 1)) * 0.92;
      const p = arc(s, n);
      P.add(new THREE.BoxGeometry(0.06, 0.34, 0.06), PAL.vermilion, { pos: [p.x, p.y + 0.17, p.z], ry: byaw });
      if (i === 0 || i === NP - 1) P.add(new THREE.SphereGeometry(0.05, 6, 4), '#d9b25a', { pos: [p.x, p.y + 0.37, p.z] });
    }
    for (let i = 0; i < 12; i++) {
      const s0 = 0.04 + (i / 12) * 0.92, s1 = 0.04 + ((i + 1) / 12) * 0.92;
      bridgeBar(arc(s0, n).add(new THREE.Vector3(0, 0.32, 0)), arc(s1, n).add(new THREE.Vector3(0, 0.32, 0)), 0.045, PAL.vermilion);
      bridgeBar(arc(s0, n).add(new THREE.Vector3(0, 0.15, 0)), arc(s1, n).add(new THREE.Vector3(0, 0.15, 0)), 0.025, PAL.vermilion);
    }
  }
  // piers where the bridge meets the water
  for (const s of [0.22, 0.78]) for (const n of [-BW / 2 + 0.05, BW / 2 - 0.05]) {
    const p = arc(s, n);
    P.add(new THREE.CylinderGeometry(0.045, 0.05, p.y - BED, 6), PAL.vermilion, { pos: [p.x, (p.y + BED) / 2, p.z] });
  }
  // a straw hat left on the bridge, at the top of the arch
  {
    const p = arc(0.52, -0.08);
    P.add(new THREE.ConeGeometry(0.2, 0.09, 10), '#d8c27a', { pos: [p.x, p.y + 0.07, p.z], rot: [0.08, 0, -0.06], jitter: 0.005 });
    P.add(new THREE.CylinderGeometry(0.21, 0.21, 0.012, 10), '#c9ae64', { pos: [p.x, p.y + 0.03, p.z] });
  }
  function bridgeBar(a, b, r, col) {
    const len = a.distanceTo(b);
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1));
    P.add(new THREE.BoxGeometry(r, len + 0.02, r), col, { matrix: m, shade: 0.03 });
  }

  // Stepping stones: from the front-left spit to the island, not quite in a line.
  const stones = [[-2.95, 2.0, 0.27], [-2.55, 1.45, 0.24], [-2.4, 0.85, 0.26], [-2.05, 0.38, 0.22], [-1.9, -0.05, 0.25]];
  stones.forEach(([x, z, s], i) => {
    P.add(new THREE.CylinderGeometry(s, s * 1.2, 0.36, 7), i % 2 ? '#c2c3ba' : '#b3b5ac', { pos: [x, W - 0.11 + i * 0.008, z], ry: rand() * 6, scl: [1.1, 1, 0.9], jitter: 0.03, jitterY: 0.01, shade: 0.06 });
  });
  // a bowl of koi food on the middle stone
  P.add(new THREE.CylinderGeometry(0.07, 0.045, 0.05, 8), '#3d4a6a', { pos: [stones[2][0] + 0.06, W + 0.1, stones[2][1] - 0.02] });
  P.add(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 8), '#d7a560', { pos: [stones[2][0] + 0.06, W + 0.12, stones[2][1] - 0.02] });

  // Stone lantern on the spit, watching the stepping stones.
  const toro = (x, z, s, ry) => {
    const m = compose(THREE, { pos: [x, G, z], ry, scl: s });
    const t = (o) => m.clone().multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 6), PAL.stone, { matrix: t({ pos: [0, 0.05, 0] }), jitter: 0.01 });
    P.add(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6), PAL.stone, { matrix: t({ pos: [0, 0.37, 0] }), jitter: 0.008 });
    P.add(new THREE.CylinderGeometry(0.19, 0.13, 0.09, 6), PAL.stone, { matrix: t({ pos: [0, 0.69, 0] }) });
    P.add(new THREE.BoxGeometry(0.22, 0.2, 0.22), PAL.stoneDark, { matrix: t({ pos: [0, 0.84, 0] }) });
    glowPts.push(new THREE.Vector3(0, 0.84, 0).applyMatrix4(m).toArray());
    E.add(new THREE.BoxGeometry(0.12, 0.11, 0.235), '#ffe2a6', { matrix: t({ pos: [0, 0.84, 0] }) });
    E.add(new THREE.BoxGeometry(0.235, 0.11, 0.12), '#ffe2a6', { matrix: t({ pos: [0, 0.84, 0] }) });
    P.add(new THREE.CylinderGeometry(0.05, 0.3, 0.17, 6), '#8f948e', { matrix: t({ pos: [0, 1.02, 0] }), jitter: 0.01 });
    P.add(new THREE.SphereGeometry(0.06, 6, 4), PAL.stone, { matrix: t({ pos: [0, 1.14, 0] }) });
    // moss on the cap
    P.add(new THREE.IcosahedronGeometry(0.09, 0), PAL.moss2, { matrix: t({ pos: [0.1, 1.0, 0.05], scl: [1, 0.4, 1] }) });
  };
  toro(-3.35, 2.6, 1.0, 0.2);
  toro(-2.2, -1.25, 0.6, 0.9); // a small one on the island's back

  // Bamboo deer-scarer by a stone basin on the right bank (animated).
  const SO = new THREE.Vector3(3.15, G, -1.75);
  P.add(new THREE.CylinderGeometry(0.26, 0.3, 0.26, 8), '#9a9d96', { pos: [SO.x - 0.55, G + 0.13, SO.z + 0.15], jitter: 0.02 });
  P.add(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 8), '#7fb2a5', { pos: [SO.x - 0.55, G + 0.26, SO.z + 0.15] });
  for (const dz of [-0.1, 0.1]) P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 5), PAL.bamboo, { pos: [SO.x, G + 0.21, SO.z + dz] });
  P.add(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), PAL.bamboo, { pos: [SO.x + 0.35, G + 0.37, SO.z - 0.05] });
  P.add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), PAL.bamboo, { pos: [SO.x + 0.22, G + 0.7, SO.z - 0.05], rot: [0, 0, 1.2] });
  P.add(new THREE.IcosahedronGeometry(0.1, 0), PAL.stoneDark, { pos: [SO.x - 0.42, G + 0.03, SO.z + 0.05], scl: [1, 0.5, 1] });
  const scarerP = new Painter(THREE, 75);
  scarerP.add(new THREE.CylinderGeometry(0.04, 0.045, 0.62, 7), PAL.bamboo, { pos: [0, 0, 0], rot: [0, 0, Math.PI / 2] });
  scarerP.add(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 7), '#9f9a58', { pos: [0.08, 0, 0], rot: [0, 0, Math.PI / 2] });
  const scarer = new THREE.Group();
  scarer.add(scarerP.mesh(lambert(THREE)));
  scarer.children[0].position.x = -0.12;
  scarer.position.set(SO.x, G + 0.4, SO.z);
  root.add(scarer);

  // Heron in the shallows by the island, eyeing the koi.
  {
    const H = compose(THREE, { pos: [0.05, W, 0.95], ry: 2.1 });
    const h = (o) => H.clone().multiply(compose(THREE, o));
    for (const dx of [-0.04, 0.04]) P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), '#4d4a48', { matrix: h({ pos: [dx, 0.16, 0] }) });
    P.add(new THREE.IcosahedronGeometry(0.15, 0), '#d6dadb', { matrix: h({ pos: [0, 0.45, -0.03], scl: [0.75, 0.75, 1.5], rot: [-0.35, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.06, 0.24, 4), '#8e9799', { matrix: h({ pos: [0, 0.42, -0.25], rot: [-1.9, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.025, 0.035, 0.32, 5), '#e8eaea', { matrix: h({ pos: [0, 0.62, 0.14], rot: [0.75, 0, 0] }) });
    P.add(new THREE.IcosahedronGeometry(0.05, 0), '#f1f2f0', { matrix: h({ pos: [0, 0.76, 0.27] }) });
    P.add(new THREE.ConeGeometry(0.02, 0.18, 4), '#d9a540', { matrix: h({ pos: [0, 0.72, 0.38], rot: [1.95, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.012, 0.012, 0.1), '#2f3436', { matrix: h({ pos: [0, 0.79, 0.24], rot: [-0.4, 0, 0] }) });
    P.add(new THREE.RingGeometry(0.06, 0.1, 8), '#d7ebe3', { matrix: h({ pos: [0, 0.015, 0], rot: [-Math.PI / 2, 0, 0] }) });
  }

  // Cloud-pruned pine on the right bank, leaning out over the water.
  const branch = (a, b, r0, r1, col) => {
    const len = a.distanceTo(b);
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1));
    P.add(new THREE.CylinderGeometry(r1, r0, len + 0.03, 6), col, { matrix: m, jitter: 0.01 });
  };
  {
    const v = (x, yy, z) => new THREE.Vector3(x, yy, z);
    const trunk = [v(3.45, G - 0.05, 0.95), v(3.35, 1.1, 0.95), v(3.05, 1.55, 1.05), v(2.7, 1.85, 1.1), v(2.55, 2.3, 1.05)];
    for (let i = 0; i < trunk.length - 1; i++) branch(trunk[i], trunk[i + 1], 0.15 - i * 0.025, 0.13 - i * 0.025, '#6a5348');
    const pads = [
      [v(2.55, 2.3, 1.05), v(2.55, 2.42, 1.05), 0.55],
      [v(3.05, 1.55, 1.05), v(2.25, 1.55, 1.5), 0.48],
      [v(3.0, 1.62, 1.0), v(3.55, 1.85, 0.25), 0.42],
      [v(2.7, 1.85, 1.1), v(1.95, 2.0, 0.65), 0.4],
      [v(3.35, 1.1, 0.95), v(3.9, 1.2, 1.5), 0.36],
      [v(2.7, 1.85, 1.1), v(2.95, 2.05, 1.75), 0.3],
    ];
    for (const [a, b, s] of pads) {
      if (a.distanceTo(b) > 0.2) branch(a, b, 0.05, 0.035, '#6a5348');
      P.add(new THREE.IcosahedronGeometry(s * 0.82, 1), PAL.pine, { pos: [b.x, b.y + 0.06, b.z], scl: [1.3, 0.34, 1.05], ry: rand() * 6, jitter: 0.05, shade: 0.08, top: PAL.pine2, y0: b.y, y1: b.y + 0.2 });
      P.add(new THREE.IcosahedronGeometry(s * 0.5, 0), PAL.pine2, { pos: [b.x + 0.08, b.y + 0.16, b.z - 0.04], scl: [1.3, 0.38, 1], ry: rand() * 6, jitter: 0.03 });
    }
    // a prop under the longest bough, as gardeners do
    branch(v(2.35, G, 1.55), v(2.3, 1.48, 1.5), 0.025, 0.025, '#8a7a62');
  }

  // Maples: one big rust maple behind the pagoda, a small amber one on the back-right bank.
  const maple = (x, z, h, s, col, col2, lean) => {
    const v = (a, b, c) => new THREE.Vector3(a, b, c);
    const fork = v(x + lean[0] * 0.3, G + h * 0.42, z + lean[1] * 0.3);
    branch(v(x, G - 0.05, z), fork, 0.13 * s, 0.09 * s, '#5e4a44');
    const tips = [[0.7, 0.62, 0.25], [-0.6, 0.66, -0.2], [0.15, 0.74, -0.6], [-0.2, 0.58, 0.55]];
    for (const [tx, ty, tz] of tips) branch(fork, v(x + tx * s + lean[0] * 0.4, G + h * ty, z + tz * s + lean[1] * 0.4), 0.065 * s, 0.03 * s, '#5e4a44');
    const blobs = [[0, 0.82, 0, 0.72], [0.62, 0.72, 0.28, 0.55], [-0.62, 0.74, -0.18, 0.58], [0.2, 0.92, -0.5, 0.5], [-0.25, 0.66, 0.55, 0.5], [0.45, 0.9, 0.3, 0.42], [-0.4, 0.95, 0.15, 0.4], [0.9, 0.62, -0.25, 0.36]];
    for (const [bx, by, bz, br] of blobs) {
      P.add(new THREE.IcosahedronGeometry(br * s, 1), rand() > 0.35 ? col : col2, { pos: [x + bx * s + lean[0] * 0.45, G + by * h, z + bz * s + lean[1] * 0.45], scl: [1.15, 0.62, 1.05], ry: rand() * 6, jitter: 0.06 * s, shade: 0.1 });
    }
  };
  maple(-1.35, -3.35, 2.4, 1.2, PAL.maple, '#a8483f', [0.3, 0.35]);
  maple(2.35, -3.0, 1.55, 0.78, PAL.maple2, '#c9744a', [-0.25, 0.3]);
  // garden rocks set upright in odd-numbered groups
  for (const [x, z, h, r, ry] of [[-2.9, -2.55, 0.75, 0.24, 0.3], [-2.55, -2.85, 0.45, 0.2, 1.4], [-3.25, -2.2, 0.3, 0.17, 2.2], [3.95, 1.0, 0.5, 0.2, 0.9], [4.05, 1.4, 0.28, 0.15, 2.5], [1.55, -3.6, 0.4, 0.2, 0.2]]) {
    P.add(new THREE.CylinderGeometry(r * 0.55, r, h, 6, 2), '#8f948e', { pos: [x, G + h / 2 - 0.05, z], ry, rot: [(rand() - 0.5) * 0.2, ry, (rand() - 0.5) * 0.2], jitter: 0.05, shade: 0.12, top: '#a9ada6', y0: G, y1: G + h });
  }
  // fallen maple leaves floating near the back bank
  for (let i = 0; i < 16; i++) {
    const x = -1.6 + rand() * 3.6, z = -2.6 + rand() * 0.9;
    P.add(new THREE.CircleGeometry(0.05, 5), rand() > 0.5 ? PAL.maple : PAL.maple2, { pos: [x, W + 0.025, z], rot: [-Math.PI / 2, 0, rand() * 6] });
  }

  // Viewing bench under a red paper parasol on the back bank, with a teapot left on it.
  {
    const bm = compose(THREE, { pos: [1.05, G, -3.55], ry: -0.15 });
    const b = (o) => bm.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(1.0, 0.06, 0.4), '#7a5c49', { matrix: b({ pos: [0, 0.3, 0] }) });
    P.add(new THREE.BoxGeometry(0.96, 0.025, 0.36), '#c4493a', { matrix: b({ pos: [0, 0.345, 0] }) });
    for (const x of [-0.42, 0.42]) for (const z of [-0.15, 0.15]) P.add(new THREE.BoxGeometry(0.05, 0.3, 0.05), '#5b4a42', { matrix: b({ pos: [x, 0.15, z] }) });
    P.add(new THREE.SphereGeometry(0.06, 7, 5), '#3d4a6a', { matrix: b({ pos: [0.25, 0.41, 0.02], scl: [1, 0.85, 1] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.02, 0.02), '#3d4a6a', { matrix: b({ pos: [0.33, 0.43, 0.02] }) });
    P.add(new THREE.CylinderGeometry(0.03, 0.025, 0.045, 6), '#e8e2d4', { matrix: b({ pos: [0.1, 0.39, 0.06] }) });
    P.add(new THREE.CylinderGeometry(0.018, 0.018, 1.75, 5), '#6d5a3e', { matrix: b({ pos: [-0.55, 0.72, 0.1], rot: [0.08, 0, -0.12] }) });
    P.add(new THREE.ConeGeometry(0.75, 0.28, 14, 1, true), '#c94b3c', { matrix: b({ pos: [-0.65, 1.5, 0.17], rot: [0.08, 0, -0.12] }), shade: 0.04 });
    P.add(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 14, 1, true), '#e0d4b8', { matrix: b({ pos: [-0.63, 1.36, 0.16], rot: [0.08, 0, -0.12] }) });
  }
  // Flat path stones on the banks: bridge foot to the bench, and the spit to the lantern.
  {
    const path = [[3.35, 0.05], [3.6, -0.45], [3.5, -1.0], [3.3, -2.35], [2.9, -2.7], [2.2, -3.65], [1.55, -3.25]];
    const path2 = [[-3.05, 2.45], [-3.75, 2.75], [-3.3, 3.2]];
    for (const [x, z] of path.concat(path2)) P.add(new THREE.CylinderGeometry(0.16 + rand() * 0.06, 0.18, 0.04, 7), '#c9c6bb', { pos: [x, G + 0.01, z], ry: rand() * 6, scl: [1.2, 1, 0.9], jitter: 0.02, jitterY: 0 });
  }
  // Clipped azalea mounds and grasses, clustered at the bank corners.
  const mounds = [[-3.7, 1.35, 0.42], [-3.95, 2.0, 0.3], [-2.75, 3.15, 0.33], [3.75, 0.1, 0.38], [3.9, -0.6, 0.3], [-2.3, -3.25, 0.4], [-3.0, -2.8, 0.3], [3.75, 2.05, 0.3], [-1.85, -0.45, 0.22], [-0.65, -1.2, 0.2]];
  mounds.forEach(([x, z, s], i) => {
    const yy = Math.hypot(x - IC[0], z - IC[1]) < 1.5 ? IY : G;
    P.add(new THREE.IcosahedronGeometry(s, 1), i % 3 ? '#7f9f72' : '#93ad80', { pos: [x, yy + s * 0.35, z], scl: [1.2, 0.7, 1], ry: rand() * 6, jitter: s * 0.08, shade: 0.08 });
    if (i % 4 === 1) for (let f = 0; f < 4; f++) P.add(new THREE.IcosahedronGeometry(0.04, 0), '#e9b6c4', { pos: [x + (rand() - 0.5) * s * 1.6, yy + s * 0.65, z + (rand() - 0.5) * s * 1.2] });
  });
  // irises and reeds in the margins (instanced blades)
  const bladeGeo = new THREE.ConeGeometry(0.025, 0.45, 3);
  bladeGeo.translate(0, 0.22, 0);
  const reedSpots = [];
  const reedClump = (cx, cz, n, y0) => { for (let i = 0; i < n; i++) reedSpots.push([cx + (rand() - 0.5) * 0.45, y0, cz + (rand() - 0.5) * 0.35]); };
  reedClump(-3.0, 1.05, 9, W - 0.02);
  reedClump(2.55, 2.25, 8, W - 0.02);
  reedClump(-0.15, -2.45, 7, W - 0.02);
  reedClump(1.85, -0.75, 6, W - 0.02);
  reedClump(-3.3, -1.45, 6, W - 0.02);
  const reeds = low ? reedSpots.filter((_, i) => i % 2 === 0) : reedSpots;
  const reedMesh = new THREE.InstancedMesh(bladeGeo, lambert(THREE, { vertexColors: false, color: '#7f9e62' }), reeds.length);
  const dm = new THREE.Object3D();
  const tc = new THREE.Color();
  reeds.forEach(([x, yy, z], i) => {
    dm.position.set(x, yy, z);
    dm.rotation.set((rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5);
    dm.scale.set(1, 0.7 + rand() * 0.9, 1);
    dm.updateMatrix();
    reedMesh.setMatrixAt(i, dm.matrix);
    reedMesh.setColorAt(i, tc.setRGB(1, 1, 1).multiplyScalar(0.8 + rand() * 0.35));
  });
  reedMesh.castShadow = true;
  root.add(reedMesh);
  // iris flowers on a few blades
  for (const [x, , z] of reeds.filter((_, i) => i % 5 === 2)) P.add(new THREE.IcosahedronGeometry(0.045, 0), '#8c7fc4', { pos: [x, W + 0.5, z] });

  // Lily pads in three loose rafts, with a few pink flowers.
  const padRafts = [[1.65, 2.45, 10, 0.75], [-0.75, 2.75, 6, 0.55], [-2.75, -1.95, 5, 0.45], [0.55, -1.75, 4, 0.4]];
  const flowers = [];
  for (const [cx, cz, n, sp] of padRafts) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * sp;
      const r = 0.12 + rand() * 0.13;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.8;
      P.add(new THREE.CircleGeometry(r, 9, 0.35, Math.PI * 2 - 0.7), rand() > 0.3 ? PAL.pad : '#86ad74', { pos: [x, W + 0.02 + rand() * 0.006, z], rot: [-Math.PI / 2, 0, rand() * 6], shade: 0.05 });
      if (i % 4 === 1) flowers.push([x + 0.03, z - 0.02]);
    }
  }
  for (const [x, z] of flowers) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand();
      P.add(new THREE.ConeGeometry(0.035, 0.11, 3), PAL.pink, { pos: [x + Math.cos(a) * 0.035, W + 0.08, z + Math.sin(a) * 0.035], rot: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5 * -1] });
    }
    P.add(new THREE.IcosahedronGeometry(0.03, 0), '#f3d36b', { pos: [x, W + 0.1, z] });
  }

  root.add(P.mesh(lambert(THREE)));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));

  // Koi: a handful of instanced fish circling under the surface.
  const koiP = new Painter(THREE, 76);
  koiP.add(new THREE.OctahedronGeometry(0.1, 0), '#ffffff', { scl: [0.55, 0.35, 1.5], shade: 0 });
  koiP.add(new THREE.ConeGeometry(0.06, 0.1, 3), '#ffffff', { pos: [0, 0, -0.17], rot: [-Math.PI / 2, 0, 0], scl: [1.3, 1, 0.3], shade: 0 });
  const koiGeo = koiP.geometry();
  const KOI = [
    { c: [0.85, 1.75], rx: 0.95, rz: 0.55, w: 0.32, p: 0.0, col: '#f07a32' },
    { c: [0.85, 1.75], rx: 0.85, rz: 0.6, w: 0.32, p: 0.5, col: '#f4efe6' },
    { c: [1.4, 0.95], rx: 0.55, rz: 0.4, w: -0.42, p: 2.0, col: '#e8592b' },
    { c: [0.2, 2.2], rx: 0.6, rz: 0.45, w: 0.27, p: 4.0, col: '#f7b25a' },
    { c: [1.4, 0.95], rx: 0.6, rz: 0.42, w: -0.42, p: 3.2, col: '#f6f1ea' },
    { c: [-0.6, 1.1], rx: 0.5, rz: 0.35, w: 0.36, p: 1.0, col: '#ef6b2e' },
    { c: [0.2, 2.2], rx: 0.5, rz: 0.4, w: 0.27, p: 1.3, col: '#e9e2d2' },
  ].slice(0, low ? 4 : 7);
  const koi = new THREE.InstancedMesh(koiGeo, lambert(THREE), KOI.length);
  KOI.forEach((k, i) => koi.setColorAt(i, tc.set(k.col)));
  root.add(koi);

  // Light: low warm autumn sun from the left, cool dusk sky fill; the lanterns and pagoda windows glow.
  root.add(new THREE.HemisphereLight('#b4c4e0', '#6a5544', 1.5));
  const key = keyLight(THREE, ctx, { color: '#ffc68a', intensity: 3.1, pos: [-5.5, 5.5, 6], extent: 6.6 });
  root.add(key, key.target);
  root.add(sunsetSky(THREE, { topSun: '#c98a6a', topAway: '#1f2f63', midSun: '#ffb46a', midAway: '#7a6aa0', bottom: '#4a3550', sun: [-0.75, 0.1, -0.55], sunColor: '#ff9a3a', sunPow: 10, horizon: 0.6 }));
  root.add(halos(THREE, glowPts, { color: '#ffb35c', size: 1.4, opacity: 1 }));

  const dummy = new THREE.Object3D();
  function update(t) {
    uTime.value = t;
    for (let i = 0; i < KOI.length; i++) {
      const k = KOI[i];
      const a = k.p + t * k.w + Math.sin(t * 0.6 + i) * 0.15;
      const x = k.c[0] + Math.cos(a) * k.rx, z = k.c[1] + Math.sin(a) * k.rz;
      const dx = -Math.sin(a) * k.rx * Math.sign(k.w), dz = Math.cos(a) * k.rz * Math.sign(k.w);
      dummy.position.set(x, W - 0.05 - (i % 3) * 0.025, z);
      dummy.rotation.set(0, Math.atan2(dx, dz) + Math.sin(t * 3 + i) * 0.15, 0);
      dummy.scale.setScalar(1.05 + (i % 3) * 0.18);
      dummy.updateMatrix();
      koi.setMatrixAt(i, dummy.matrix);
    }
    koi.instanceMatrix.needsUpdate = true;
    // the deer-scarer fills (slow tilt), tips, clacks back
    const c = (t % 7) / 7;
    scarer.rotation.z = c < 0.86 ? 0.32 - c * 0.35 : -0.35 + Math.min(1, (c - 0.86) * 20) * 0.67;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f2b27a'),
    fog: new THREE.Fog('#e8a878', 26, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
