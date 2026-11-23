// Shared helpers for the diorama builders: seeded randomness, hand-made jitter,
// per-material geometry merging with vertex colours, plinth slabs, gradient sky, glow sprites.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z, s) {
  let h =
    Math.imul(Math.round(x * 200) | 0, 73856093) ^
    Math.imul(Math.round(y * 200) | 0, 19349663) ^
    Math.imul(Math.round(z * 200) | 0, 83492791) ^
    Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function compose(THREE, o = {}) {
  const m = new THREE.Matrix4();
  const p = o.pos || [0, 0, 0];
  const r = o.rot || [0, o.ry || 0, 0];
  const s = o.scl === undefined ? 1 : o.scl;
  const sv = Array.isArray(s) ? s : [s, s, s];
  m.compose(
    new THREE.Vector3(p[0], p[1], p[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')),
    new THREE.Vector3(sv[0], sv[1], sv[2])
  );
  return m;
}

// Collects primitives (position + per-face colour) and merges them into one mesh per material.
export class Painter {
  constructor(THREE, seed = 1) {
    this.T = THREE;
    this.parts = [];
    this.rand = rng(seed);
    this.seed = seed;
    this.tmp = new THREE.Color();
  }
  add(geom, color, o = {}) {
    const T = this.T;
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    geom.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    g.applyMatrix4(o.matrix || compose(T, o));
    const pos = g.attributes.position;
    const n = pos.count;
    const j = o.jitter || 0;
    if (j > 0) {
      const jy = o.jitterY === undefined ? j : o.jitterY;
      for (let i = 0; i < n; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        pos.setXYZ(
          i,
          x + (hash3(x, y, z, this.seed) - 0.5) * 2 * j,
          y + (hash3(x, y, z, this.seed + 7) - 0.5) * 2 * jy,
          z + (hash3(x, y, z, this.seed + 13) - 0.5) * 2 * j
        );
      }
    }
    const base = new T.Color(color);
    const top = o.top ? new T.Color(o.top) : null;
    const y0 = o.y0 ?? 0, y1 = o.y1 ?? 1;
    const shade = o.shade ?? 0.06;
    const col = new Float32Array(n * 3);
    const c = this.tmp;
    for (let f = 0; f < n; f += 3) {
      const k = 1 + (this.rand() - 0.5) * 2 * shade;
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      c.copy(base);
      if (top) c.lerp(top, Math.min(1, Math.max(0, (cy - y0) / (y1 - y0))));
      for (let v = 0; v < 3; v++) {
        col[(f + v) * 3] = c.r * k;
        col[(f + v) * 3 + 1] = c.g * k;
        col[(f + v) * 3 + 2] = c.b * k;
      }
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }
  geometry() {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  mesh(material, shadows = { cast: true, receive: true }) {
    const g = this.geometry();
    if (!g) return null;
    const m = new this.T.Mesh(g, material);
    m.castShadow = !!shadows.cast;
    m.receiveShadow = !!shadows.receive;
    return m;
  }
}

export function lambert(THREE, extra = {}) {
  return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...extra });
}
export function unlit(THREE, extra = {}) {
  return new THREE.MeshBasicMaterial({ vertexColors: true, ...extra });
}

// Irregular closed outline in XZ: n points around an ellipse/superellipse with wobble.
export function outline(rand, { n = 16, rx = 5, rz = 5, wob = 0.05, sq = 2 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const e = 2 / sq;
    const x = Math.sign(c) * Math.pow(Math.abs(c), e);
    const z = Math.sign(s) * Math.pow(Math.abs(s), e);
    const w = 1 + (rand() - 0.5) * 2 * wob;
    pts.push([x * rx * w, z * rz * w]);
  }
  return pts;
}

export function offsetOutline(pts, d) {
  return pts.map(([x, z]) => {
    const l = Math.hypot(x, z) || 1;
    return [x + (x / l) * d, z + (z / l) * d];
  });
}

// Vertical slab with the given XZ outline from y0 to y1 (chamfered top edge when bevel > 0).
export function slab(THREE, pts, y0, y1, bevel = 0) {
  const shape = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const h = y1 - y0 - (bevel ? bevel * 2 : 0);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, h),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + (bevel || 0), 0);
  return g;
}

// Triangular prism roof / gable: width along X, ridge along Z.
export function gable(THREE, w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

// Pitched roof made of two thin slabs, with eaves overhang. Ridge along Z.
export function roof(THREE, w, h, d, t = 0.06) {
  const half = w / 2;
  const len = Math.hypot(half, h);
  const ang = Math.atan2(h, half);
  const a = new THREE.BoxGeometry(len, t, d);
  a.translate(len / 2, 0, 0);
  a.rotateZ(ang);
  a.translate(-half, 0, 0);
  const b = new THREE.BoxGeometry(len, t, d);
  b.translate(-len / 2, 0, 0);
  b.rotateZ(-ang);
  b.translate(half, 0, 0);
  const g = mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]);
  a.dispose();
  b.dispose();
  return g;
}

// Gradient sky drawn behind everything, independent of the camera far plane.
export function skyDome(THREE, { top, mid, bottom, sun = [0, 0.2, -1], sunColor = '#000000', sunPow = 24, horizon = 0.35, stars = 0 }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      cTop: { value: new THREE.Color(top) },
      cMid: { value: new THREE.Color(mid) },
      cBot: { value: new THREE.Color(bottom) },
      cSun: { value: new THREE.Color(sunColor) },
      sunDir: { value: new THREE.Vector3(...sun).normalize() },
      sunPow: { value: sunPow },
      hor: { value: horizon },
      stars: { value: stars },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; gl_Position.z = p.w * 0.99999; }`,
    fragmentShader: `uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot; uniform vec3 cSun; uniform vec3 sunDir; uniform float sunPow; uniform float hor; uniform float stars;
      varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(cMid, cTop, smoothstep(0.0, hor, h)) : mix(cMid, cBot, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, sunDir), 0.0);
        c += cSun * (pow(s, sunPow) + 0.35 * pow(s, 4.0));
        if (stars > 0.0) {
          vec3 q = floor(d * 140.0);
          float r = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          vec3 f = fract(d * 140.0) - 0.5;
          c += vec3(1.0, 0.95, 0.85) * step(0.985, r) * (1.0 - smoothstep(0.06, 0.16, length(f))) * smoothstep(0.12, 0.5, h) * stars * (0.4 + 0.6 * fract(r * 91.7));
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
  m.frustumCulled = false;
  m.renderOrder = -1000;
  m.matrixAutoUpdate = false;
  return m;
}

export function glowTexture(THREE, inner = 'rgba(255,255,255,1)', size = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// One draw call for any number of soft additive halos.
export function halos(THREE, points, { color = '#ffb35c', size = 1, opacity = 1 } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const mat = new THREE.PointsMaterial({
    map: glowTexture(THREE),
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

export function keyLight(THREE, ctx, { color, intensity, pos, extent = 7, target = [0, 0, 0] }) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos);
  l.target.position.set(...target);
  if (ctx.quality !== 'low') {
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    const c = l.shadow.camera;
    c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
    c.near = 0.5; c.far = 40;
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.03;
  }
  return l;
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
  });
}
