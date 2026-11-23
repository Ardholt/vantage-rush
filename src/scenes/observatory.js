// Star Ridge: blue hour on a mountain top, the last afterglow behind the peak. A white observatory dome with its slit open, a radio dish
// on the shoulder, a car climbing the switchbacks with its headlights on, an amateur with a tripod scope.
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  rock: '#7d7a9c',
  rock2: '#a19cb8',
  rockDark: '#4c4868',
  snow: '#f4f7ff',
  board: '#2a2236',
  strata1: '#3e3a5c',
  strata2: '#6a5f80',
  white: '#eef1f8',
  steel: '#a8b0c4',
  dark: '#1a1d2c',
  road: '#4a4860',
  pine: '#2f5a50',
  warm: '#ffc77a',
  red: '#c8433a',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(6601);
  const root = new THREE.Group();
  const P = new Painter(THREE, 601);
  const E = new Painter(THREE, 602);
  const mat = lambert(THREE);
  const G = 0.25;
  const frame = (pos, ry = 0) => {
    const m = compose(THREE, { pos, ry });
    return (o) => m.clone().multiply(compose(THREE, o));
  };

  // Height field: a summit plateau at S, a lower shoulder at R, falling to the plinth rim.
  const S = [-0.45, -0.95], SH = 2.15, SR = 1.25;
  const R = [2.35, 0.25], RH = 0.95, RR = 0.55;
  const bump = (x, z, c, H, r0, r1, ax = 1, az = 1) => {
    const d = Math.hypot((x - c[0]) / ax, (z - c[1]) / az);
    if (d <= r0) return H;
    if (d >= r1) return 0;
    const k = (d - r0) / (r1 - r0);
    return H * (1 - k * k * (3 - 2 * k)) ** 1.15;
  };
  const height = (x, z) => G + Math.max(bump(x, z, S, SH, SR, 4.4, 1.05, 0.9), bump(x, z, R, RH, RR, 2.1));

  // Switchback road: from the front-right edge up to the plateau.
  const roadCurve = new THREE.CatmullRomCurve3([
    [4.35, 0, 2.55], [2.6, 0, 3.05], [0.6, 0, 3.0], [-1.25, 0, 2.55], [-1.75, 0, 2.05], [-1.2, 0, 1.75],
    [0.6, 0, 1.55], [1.35, 0, 0.95], [1.1, 0, 0.45], [0.35, 0, 0.3], [-0.2, 0, -0.05],
  ].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);
  const NR = 90;
  const road = [];
  for (let i = 0; i <= NR; i++) {
    const p = roadCurve.getPointAt(i / NR);
    road.push({ x: p.x, z: p.z, y: height(p.x, p.z) });
  }
  // smooth the grade so the road climbs evenly
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < NR; i++) road[i].y = (road[i - 1].y + road[i].y * 2 + road[i + 1].y) / 4;
  const nearRoad = (x, z) => {
    let best = null, bd = 1e9;
    for (const r of road) {
      const d = (r.x - x) ** 2 + (r.z - z) ** 2;
      if (d < bd) { bd = d; best = r; }
    }
    return [Math.sqrt(bd), best];
  };

  // Plinth: dark slate strata under the mountain.
  const rim = outline(rand, { n: 40, rx: 4.75, rz: 4.5, wob: 0.06, sq: 2.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.3), -1.55, -1.25, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.25, -0.75), PAL.strata1, { jitter: 0.06, shade: 0.12 });
  P.add(slab(THREE, offsetOutline(rim, 0.03), -0.75, -0.3), PAL.strata2, { jitter: 0.06, shade: 0.12 });
  P.add(slab(THREE, rim, -0.3, G - 0.02), PAL.rockDark, { jitter: 0.05, shade: 0.1 });

  // Mountain surface: a polar grid on the rim outline, displaced by the height field, flat-shaded.
  {
    const RINGS = low ? 10 : 13, n = rim.length;
    const pts = [];
    for (let r = 0; r <= RINGS; r++) {
      for (let i = 0; i < n; i++) {
        if (r === 0 && i > 0) break;
        const k = r / RINGS;
        let x = rim[i][0] * k, z = rim[i][1] * k;
        if (r > 0 && r < RINGS) { x += (rand() - 0.5) * 0.2; z += (rand() - 0.5) * 0.2; }
        let y = height(x, z);
        if (r < RINGS) {
          y += (rand() - 0.5) * 0.16 * Math.min(1, (y - G) * 2 + 0.3);
          const [d, rp] = nearRoad(x, z);
          if (d < 0.3) y = Math.min(y, rp.y - 0.03);
          else if (d < 0.5) y = Math.min(y, rp.y + (d - 0.3) * 2.5);
        } else y = G;
        pts.push(new THREE.Vector3(x, y, z));
      }
    }
    const vi = (r, i) => (r === 0 ? 0 : 1 + (r - 1) * n + (i % n));
    const pos = [], col = [];
    const cRock = new THREE.Color(PAL.rock), cRock2 = new THREE.Color(PAL.rock2), cDark = new THREE.Color(PAL.rockDark), cSnow = new THREE.Color(PAL.snow);
    const c = new THREE.Color(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
    const tri = (a, b, d) => {
      const A = pts[a], B = pts[b], D = pts[d];
      e1.subVectors(B, A); e2.subVectors(D, A); nrm.crossVectors(e1, e2).normalize();
      if (nrm.y < 0) nrm.negate();
      const cy = (A.y + B.y + D.y) / 3, cx = (A.x + B.x + D.x) / 3, cz = (A.z + B.z + D.z) / 3;
      const noise = Math.sin(cx * 3.1 + cz * 1.7) + Math.sin(cz * 4.3 - cx * 2.2) * 0.7 + (rand() - 0.5) * 0.9;
      const snowy = nrm.y > 0.62 && cy > G + 0.3 && noise > 0.35 - (cy - G) * 0.5 && nearRoad(cx, cz)[0] > 0.3;
      if (snowy) c.copy(cSnow).multiplyScalar(0.94 + rand() * 0.08);
      else c.copy(nrm.y > 0.55 ? cRock2 : cRock).lerp(cDark, Math.max(0, 0.6 - nrm.y) * 0.8 + rand() * 0.15);
      for (const p of [A, B, D]) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); }
    };
    for (let r = 0; r < RINGS; r++) {
      for (let i = 0; i < n; i++) {
        if (r === 0) tri(0, vi(1, i + 1), vi(1, i));
        else { tri(vi(r, i), vi(r, i + 1), vi(r + 1, i)); tri(vi(r, i + 1), vi(r + 1, i + 1), vi(r + 1, i)); }
      }
    }
    // keep winding consistent with an upward face
    for (let f = 0; f < pos.length; f += 9) {
      const ax = pos[f], az = pos[f + 2], bx = pos[f + 3], bz = pos[f + 5], dx = pos[f + 6], dz = pos[f + 8];
      const cross = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
      if (cross > 0) {
        for (let k = 0; k < 3; k++) { const t = pos[f + 3 + k]; pos[f + 3 + k] = pos[f + 6 + k]; pos[f + 6 + k] = t; }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }

  // Boulders and crags on the slopes, with snow caps.
  {
    // Crags: chunky 5-sided tapered blocks, pale lit tops over darker flanks (reads as rock at phone size).
    const crag = (x, z, s, sy = 0.8) => {
      const y = height(x, z);
      const h = s * sy * 1.3;
      const ry = rand() * 6;
      P.add(new THREE.CylinderGeometry(s * 0.6, s, h, 5, 1), PAL.rockDark, { pos: [x, y + h / 2 - 0.08, z], ry, rot: [(rand() - 0.5) * 0.2, ry, (rand() - 0.5) * 0.2], jitter: s * 0.1, shade: 0.1, top: PAL.rock, y0: y, y1: y + h });
      P.add(new THREE.CylinderGeometry(s * 0.45, s * 0.62, s * 0.22, 5), PAL.snow, { pos: [x, y + h - 0.04, z], ry: ry + 0.3, jitter: s * 0.06, shade: 0.05 });
    };
    for (const [x, z, s, sy] of [[-2.4, -2.6, 0.75, 1.3], [-3.3, -1.0, 0.55, 1.0], [1.4, -2.9, 0.6, 1.2], [-1.9, 0.35, 0.4, 0.9], [3.4, -1.4, 0.5, 0.9], [-3.4, 1.6, 0.45, 0.8], [0.4, -3.2, 0.5, 1.0], [2.9, 1.9, 0.3, 0.8], [-0.9, 3.6, 0.35, 0.7]]) crag(x, z, s, sy);
    for (let i = 0; i < 8; i++) {
      const a = rand() * 6.28, d = 1.6 + rand() * 2.6;
      const x = Math.cos(a) * d + S[0] * 0.3, z = Math.sin(a) * d * 0.9 + S[1] * 0.3;
      if (nearRoad(x, z)[0] < 0.4) continue;
      if (Math.pow(Math.abs(x) / 4.5, 2.1) + Math.pow(Math.abs(z) / 4.3, 2.1) > 1) continue;
      crag(x, z, 0.18 + rand() * 0.14, 0.8);
    }
  }

  // Road surface, guard posts with reflectors along the drops.
  const postGlints = [];
  const warmPts = [];
  {
    for (let i = 0; i < NR; i++) {
      const a = road[i], b = road[i + 1];
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      const ry = Math.atan2(b.x - a.x, b.z - a.z);
      const pitch = -Math.atan2(b.y - a.y, l);
      P.add(new THREE.BoxGeometry(0.46, 0.06, l + 0.06), PAL.road, { pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 + 0.01, (a.z + b.z) / 2], rot: [pitch, ry, 0], shade: 0.04 });
      // a shoulder under the road so it reads as a cut shelf
      P.add(new THREE.BoxGeometry(0.62, 0.3, l + 0.08), PAL.rockDark, { pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 - 0.15, (a.z + b.z) / 2], rot: [pitch, ry, 0], shade: 0.08 });
      if (i % 3 === 1) P.add(new THREE.BoxGeometry(0.03, 0.005, l * 0.5), '#d8d4c0', { pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 + 0.045, (a.z + b.z) / 2], rot: [pitch, ry, 0] });
      // guard posts on the outside of the bends
      if (i % 5 === 2 && i > 4 && i < NR - 4) {
        const nx = Math.cos(ry), nz = -Math.sin(ry);
        const out = (height(a.x + nx * 0.6, a.z + nz * 0.6) < height(a.x - nx * 0.6, a.z - nz * 0.6)) ? 1 : -1;
        const px = a.x + nx * 0.29 * out, pz = a.z + nz * 0.29 * out;
        P.add(new THREE.BoxGeometry(0.04, 0.2, 0.04), PAL.white, { pos: [px, a.y + 0.1, pz] });
        postGlints.push([px, a.y + 0.17, pz]);
      }
      // warm lamp posts on the inside of the road every so often
      if (i % 15 === 7) {
        const nx = Math.cos(ry), nz = -Math.sin(ry);
        const inn = (height(a.x + nx * 0.6, a.z + nz * 0.6) < height(a.x - nx * 0.6, a.z - nz * 0.6)) ? -1 : 1;
        const px = a.x + nx * 0.34 * inn, pz = a.z + nz * 0.34 * inn;
        P.add(new THREE.CylinderGeometry(0.022, 0.03, 0.62, 5), '#2a2838', { pos: [px, a.y + 0.31, pz] });
        P.add(new THREE.ConeGeometry(0.08, 0.06, 6), '#2a2838', { pos: [px, a.y + 0.69, pz] });
        E.add(new THREE.BoxGeometry(0.07, 0.08, 0.07), '#ffd08a', { pos: [px, a.y + 0.62, pz] });
        warmPts.push([px, a.y + 0.62, pz]);
      }
    }
  }

  // Summit plateau: the observatory drum, its control building, and a paved yard.
  const SY = height(S[0], S[1]);
  const DX = S[0] - 0.25, DZ = S[1] - 0.2;
  {
    P.add(new THREE.CylinderGeometry(1.35, 1.45, 0.14, 12), '#7a7f98', { pos: [S[0], SY + 0.0, S[1]], jitter: 0.03, jitterY: 0.01, shade: 0.06 });
    P.add(new THREE.CylinderGeometry(0.92, 0.95, 0.85, 20), PAL.white, { pos: [DX, SY + 0.48, DZ], shade: 0.02 });
    P.add(new THREE.CylinderGeometry(0.96, 0.96, 0.06, 20), PAL.steel, { pos: [DX, SY + 0.9, DZ] });
    P.add(new THREE.BoxGeometry(0.3, 0.5, 0.06), '#4a5068', { pos: [DX - 0.55, SY + 0.32, DZ + 0.73], ry: -0.65 });
    // control building on the side toward the road
    const cb = frame([S[0] + 0.85, SY + 0.05, S[1] + 0.45], -0.35);
    P.add(new THREE.BoxGeometry(1.0, 0.55, 0.7), '#d8dce8', { matrix: cb({ pos: [0, 0.28, 0] }), jitter: 0.005 });
    P.add(new THREE.BoxGeometry(1.08, 0.07, 0.78), '#5a607a', { matrix: cb({ pos: [0, 0.59, 0] }) });
    E.add(new THREE.BoxGeometry(0.22, 0.17, 0.03), PAL.warm, { matrix: cb({ pos: [-0.22, 0.33, 0.36] }) });
    E.add(new THREE.BoxGeometry(0.22, 0.17, 0.03), PAL.warm, { matrix: cb({ pos: [0.14, 0.33, 0.36] }) });
    E.add(new THREE.BoxGeometry(0.03, 0.17, 0.22), '#ffb866', { matrix: cb({ pos: [0.51, 0.33, -0.05] }) });
    P.add(new THREE.BoxGeometry(0.17, 0.36, 0.03), '#3a4058', { matrix: cb({ pos: [0.38, 0.19, 0.36] }) });
    E.add(new THREE.BoxGeometry(0.06, 0.04, 0.04), '#fff0c0', { matrix: cb({ pos: [0.38, 0.42, 0.38] }) });
    // mast with a red aircraft light
    P.add(new THREE.CylinderGeometry(0.015, 0.02, 0.9, 4), PAL.steel, { matrix: cb({ pos: [-0.38, 1.05, -0.2] }) });
    E.add(new THREE.SphereGeometry(0.035, 6, 4), '#ff4a3a', { matrix: cb({ pos: [-0.38, 1.52, -0.2] }) });
    // the astronomers' car parked at the yard
    const pc = frame([S[0] + 1.1, SY + 0.07, S[1] - 0.55], 1.3);
    P.add(new THREE.BoxGeometry(0.3, 0.13, 0.55), '#4a5a7a', { matrix: pc({ pos: [0, 0.12, 0] }) });
    P.add(new THREE.BoxGeometry(0.26, 0.1, 0.3), '#3e4a66', { matrix: pc({ pos: [0, 0.23, -0.04] }) });
    P.add(new THREE.BoxGeometry(0.27, 0.03, 0.31), PAL.snow, { matrix: pc({ pos: [0, 0.29, -0.04] }) });
  }

  // Warm light inside the dome: an inside-out unlit hemisphere, static, seen through the slit while the dome slews.
  E.add(new THREE.SphereGeometry(0.88, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#ffb45a', { pos: [DX, SY + 0.93, DZ], scl: [-1, 1, 1], shade: 0.04 });
  E.add(new THREE.CylinderGeometry(0.88, 0.88, 0.02, 16), '#ffb45a', { pos: [DX, SY + 0.94, DZ] });
  warmPts.push([DX + Math.cos(-2.05) * -0.75, SY + 1.5, DZ + Math.sin(-2.05) * -0.75]);

  // Dome (animated): turns slowly; the slit and the telescope turn with it.
  const dome = new THREE.Group();
  const DOME_RY = 2.05; // slit faces the front-right; it slews a little either side while tracking
  {
    const Dm = new Painter(THREE, 611);
    const gap = 0.55;
    Dm.add(new THREE.SphereGeometry(0.97, 22, 9, gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2), PAL.white, { shade: 0.0 });
    Dm.add(new THREE.SphereGeometry(0.93, 22, 9, gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2), '#262a40', { shade: 0.02 });
    // shutter rails along the slit edges and a band around the base
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const th = (k + 0.5) / 6 * (Math.PI / 2);
        const ph = s * (gap / 2 + 0.03);
        Dm.add(new THREE.BoxGeometry(0.07, 0.07, 0.07), PAL.steel, { pos: [-Math.cos(ph) * Math.sin(th) * 0.98, Math.cos(th) * 0.98, Math.sin(ph) * Math.sin(th) * 0.98], ry: ph });
      }
    }
    Dm.add(new THREE.CylinderGeometry(0.99, 0.99, 0.06, 22), PAL.steel, { pos: [0, 0.03, 0] });
    // telescope: fork mount and an open-truss tube aimed out of the slit (the slit faces local -x)
    Dm.add(new THREE.CylinderGeometry(0.12, 0.16, 0.35, 8), '#4a5068', { pos: [0, 0.15, 0] });
    const tm = compose(THREE, { pos: [-0.05, 0.42, 0], rot: [0, 0, 0.8] });
    const at = (o) => tm.clone().multiply(compose(THREE, o));
    Dm.add(new THREE.CylinderGeometry(0.17, 0.17, 0.25, 10), '#e8e2d0', { matrix: at({ pos: [0, -0.15, 0] }) });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      Dm.add(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), '#c8ccd8', { matrix: at({ pos: [Math.cos(a) * 0.14, 0.25, Math.sin(a) * 0.14] }) });
    }
    Dm.add(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10, 1, true), '#e8e2d0', { matrix: at({ pos: [0, 0.6, 0] }) });
    for (const s of [-1, 1]) Dm.add(new THREE.BoxGeometry(0.1, 0.38, 0.05), '#4a5068', { pos: [-0.05, 0.42, s * 0.22] });
    // a dim red work light on the dome floor
    Dm.add(new THREE.CylinderGeometry(0.8, 0.8, 0.02, 16), '#3a2030', { pos: [0, 0.01, 0] });
    dome.add(Dm.mesh(lambert(THREE, { side: THREE.DoubleSide }), { cast: false, receive: false }));
    dome.position.set(DX, SY + 0.93, DZ);
    root.add(dome);
  }

  // Radio dish on the shoulder, tipped toward the sky.
  {
    const ry0 = height(R[0], R[1]);
    P.add(new THREE.CylinderGeometry(0.5, 0.58, 0.1, 9), '#7a7f98', { pos: [R[0], ry0 + 0.0, R[1]], jitter: 0.02 });
    P.add(new THREE.CylinderGeometry(0.08, 0.13, 0.65, 6), PAL.steel, { pos: [R[0], ry0 + 0.35, R[1]] });
    P.add(new THREE.BoxGeometry(0.3, 0.14, 0.2), PAL.steel, { pos: [R[0], ry0 + 0.7, R[1]], ry: 0.6 });
    const dm = compose(THREE, { pos: [R[0], ry0 + 0.88, R[1]], rot: [-0.75, 0.6 + Math.PI, 0] });
    const at = (o) => dm.clone().multiply(compose(THREE, o));
    P.add(new THREE.SphereGeometry(0.75, 14, 4, 0, Math.PI * 2, 0, 0.75), PAL.white, { matrix: at({ pos: [0, -0.75, 0], rot: [0, 0, 0] }), shade: 0.02 });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      P.add(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 3), PAL.steel, { matrix: at({ pos: [Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22], rot: [Math.sin(a) * -0.6, 0, Math.cos(a) * 0.6] }) });
    }
    P.add(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), '#4a5068', { matrix: at({ pos: [0, 0.32, 0] }) });
    // a footpath of stones from the road to the dish
    for (let k = 0; k < 4; k++) {
      const x = R[0] - 0.55 - k * 0.22, z = R[1] + 0.35 + k * 0.1;
      P.add(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 6), '#8a8ea8', { pos: [x, height(x, z) + 0.01, z], ry: rand() });
    }
  }

  // Krummholz: a few wind-bent pines low on the slopes (instanced).
  {
    const pp = new Painter(THREE, 621);
    pp.add(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 5), '#4a3a34', { pos: [0, 0.15, 0] });
    pp.add(new THREE.ConeGeometry(0.26, 0.45, 6), PAL.pine, { pos: [0.04, 0.42, 0], scl: [1.2, 1, 0.9], jitter: 0.03, top: PAL.snow, y0: 0.45, y1: 0.62 });
    pp.add(new THREE.ConeGeometry(0.17, 0.36, 6), PAL.pine, { pos: [0.08, 0.7, 0], jitter: 0.02, top: PAL.snow, y0: 0.72, y1: 0.86 });
    const spots = [];
    let tries = 0;
    while (spots.length < 16 && tries++ < 2000) {
      const x = (rand() * 2 - 1) * 4.3, z = (rand() * 2 - 1) * 4.1;
      if (Math.pow(Math.abs(x) / 4.4, 2.1) + Math.pow(Math.abs(z) / 4.2, 2.1) > 0.92) continue;
      const y = height(x, z);
      if (y > G + 0.9) continue;
      if (nearRoad(x, z)[0] < 0.45) continue;
      if (Math.hypot(x - R[0], z - R[1]) < 0.8) continue;
      if (spots.some((s) => Math.hypot(s[0] - x, s[2] - z) < 0.45)) continue;
      // clustered on the left flank and the near-left corner
      if (!(x < -1.8 || (x < 0.5 && z > 2.6)) && rand() > 0.2) continue;
      spots.push([x, y, z, 0.7 + rand() * 0.6]);
    }
    const use = low ? spots.filter((_, i) => i % 2 === 0) : spots;
    const im = new THREE.InstancedMesh(pp.geometry(), lambert(THREE), use.length);
    im.castShadow = true;
    im.receiveShadow = true;
    const dmy = new THREE.Object3D();
    use.forEach(([x, y, z, s], i) => {
      dmy.position.set(x, y - 0.05, z);
      dmy.rotation.set((rand() - 0.5) * 0.15, 0.3 + (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.15);
      dmy.scale.setScalar(s);
      dmy.updateMatrix();
      im.setMatrixAt(i, dmy.matrix);
    });
    root.add(im);
  }

  // Car on the lower switchback, climbing, headlights on.
  const carAt = road[Math.round(NR * 0.47)];
  const carNext = road[Math.round(NR * 0.47) + 2];
  const carYaw = Math.atan2(carNext.x - carAt.x, carNext.z - carAt.z);
  const carPitch = -Math.atan2(carNext.y - carAt.y, Math.hypot(carNext.x - carAt.x, carNext.z - carAt.z));
  const car = frame([carAt.x, carAt.y + 0.05, carAt.z], carYaw);
  const lampPts = [];
  {
    const cm = (o) => car({ rot: [carPitch, 0, 0] }).multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.28, 0.12, 0.52), '#c8433a', { matrix: cm({ pos: [0, 0.1, 0] }) });
    P.add(new THREE.BoxGeometry(0.25, 0.1, 0.27), '#a8362e', { matrix: cm({ pos: [0, 0.2, -0.04] }) });
    P.add(new THREE.BoxGeometry(0.26, 0.07, 0.04), '#2a3048', { matrix: cm({ pos: [0, 0.2, 0.1], rot: [0.5, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.05, 0.12), '#d8c8a0', { matrix: cm({ pos: [0, 0.27, -0.1] }) });
    for (const x of [-0.14, 0.14]) for (const z of [-0.16, 0.16]) P.add(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8), PAL.dark, { matrix: cm({ pos: [x, 0.05, z], rot: [0, 0, Math.PI / 2] }) });
    for (const x of [-0.09, 0.09]) {
      E.add(new THREE.BoxGeometry(0.06, 0.04, 0.02), '#fff6d8', { matrix: cm({ pos: [x, 0.12, 0.265] }) });
      E.add(new THREE.BoxGeometry(0.05, 0.03, 0.02), '#ff3a30', { matrix: cm({ pos: [x, 0.12, -0.265] }) });
      lampPts.push(new THREE.Vector3(x, 0.12, 0.3).applyMatrix4(cm({})));
    }
    // headlight beams on the road ahead: faint additive wedges
  }

  // An amateur astronomer on a ledge by the road, with a tripod scope and a red torch.
  const AM = road[Math.round(NR * 0.2)];
  {
    const ax = AM.x + 0.05, az = AM.z - 0.5;
    const ay = height(ax, az);
    P.add(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 7), '#6a6f8a', { pos: [ax, ay + 0.02, az], jitter: 0.02 });
    const am = frame([ax - 0.08, ay + 0.06, az], 2.6);
    P.add(new THREE.BoxGeometry(0.05, 0.16, 0.05), '#2a2e44', { matrix: am({ pos: [-0.03, 0.08, 0] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.16, 0.05), '#2a2e44', { matrix: am({ pos: [0.03, 0.08, 0] }) });
    P.add(new THREE.BoxGeometry(0.13, 0.18, 0.09), '#d8a040', { matrix: am({ pos: [0, 0.25, 0] }) });
    P.add(new THREE.IcosahedronGeometry(0.05, 0), '#e0b090', { matrix: am({ pos: [0, 0.39, 0] }) });
    P.add(new THREE.ConeGeometry(0.055, 0.07, 6), '#c8433a', { matrix: am({ pos: [0, 0.45, 0] }) });
    E.add(new THREE.BoxGeometry(0.025, 0.025, 0.025), '#ff3a30', { matrix: am({ pos: [0.07, 0.24, 0.06] }) });
    const tp = frame([ax + 0.14, ay + 0.06, az + 0.06], 0.4);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      P.add(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 3), PAL.steel, { matrix: tp({ pos: [Math.cos(a) * 0.05, 0.14, Math.sin(a) * 0.05], rot: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] }) });
    }
    P.add(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 7), PAL.white, { matrix: tp({ pos: [0, 0.34, 0.02], rot: [-0.9, 0, 0] }) });
    // a thermos and a folding stool
    P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), '#3e6a9a', { pos: [ax - 0.18, ay + 0.1, az + 0.1] });
    P.add(new THREE.BoxGeometry(0.1, 0.02, 0.1), '#7a5a40', { pos: [ax - 0.12, ay + 0.15, az - 0.12] });
  }

  root.add(P.mesh(mat));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));

  // Moon: an unlit disc far behind the peak, with a soft halo; the key light comes from it.
  const moonDir = new THREE.Vector3(-0.5, 0.24, -0.83).normalize();
  // afterglow from the west-southwest, low, so the slopes get a warm rim and long shadows
  const glowDir = new THREE.Vector3(0.75, 0.42, -0.5).normalize();
  {
    const mp = moonDir.clone().multiplyScalar(30);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 8), new THREE.MeshBasicMaterial({ color: '#f4efdc', fog: false }));
    moon.position.copy(mp);
    moon.lookAt(0, 0, 0);
    root.add(moon);
    root.add(halos(THREE, [mp.toArray()], { color: '#9fb4ff', size: 9, opacity: 0.45 }));
  }

  // Glows: windows, headlights, reflector posts, aircraft light.
  const cbm = compose(THREE, { pos: [S[0] + 0.85, SY + 0.05, S[1] + 0.45], ry: -0.35 });
  const win = new THREE.Vector3(-0.04, 0.33, 0.45).applyMatrix4(cbm);
  root.add(halos(THREE, [win.toArray(), ...warmPts, ...lampPts.map((v) => v.toArray())], { color: '#ffc070', size: 1.1, opacity: 0.85 }));
  const glints = halos(THREE, postGlints, { color: '#ffb070', size: 0.22, opacity: 0.9 });
  root.add(glints);
  const mastLight = halos(THREE, [new THREE.Vector3(-0.38, 1.52, -0.2).applyMatrix4(cbm).toArray()], { color: '#ff4a3a', size: 0.7, opacity: 0.9 });
  root.add(mastLight);

  // Headlight beam: a faint additive wedge along the road ahead of the car.
  {
    const beamMat = new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const bg = new THREE.ConeGeometry(0.35, 1.4, 8, 1, true);
    bg.translate(0, -0.7, 0);
    bg.rotateX(-Math.PI / 2);
    const beam = new THREE.Mesh(bg, beamMat);
    beam.position.copy(lampPts[0].clone().lerp(lampPts[1], 0.5));
    beam.rotation.set(0, carYaw, 0);
    beam.rotateX(carPitch + 0.08);
    beam.rotateY(Math.PI);
    beam.renderOrder = 2;
    root.add(beam);
  }

  // Light: blue hour. A low rose afterglow key, lilac sky fill; warm lamps at the building, road and dome.
  root.add(new THREE.HemisphereLight('#9aa6e0', '#4a3858', 1.25));
  const key = keyLight(THREE, ctx, { color: '#ffc0a0', intensity: 2.2, pos: glowDir.clone().multiplyScalar(11).toArray(), extent: 6.8 });
  root.add(key, key.target);
  const winLight = new THREE.PointLight('#ffb35c', 3.5, 3.5, 1.6);
  winLight.position.copy(new THREE.Vector3(-0.04, 0.45, 0.85).applyMatrix4(cbm));
  root.add(winLight);
  if (!low) {
    const head = new THREE.PointLight('#fff0c8', 2.5, 2.2, 1.6);
    head.position.copy(new THREE.Vector3(0, 0.25, 0.7).applyMatrix4(car({ rot: [carPitch, 0, 0] })));
    root.add(head);
  }
  root.add(skyDome(THREE, { top: '#1c2a66', mid: '#d88a86', bottom: '#4a3e6a', sun: [glowDir.x, 0.05, glowDir.z], sunColor: '#ffb070', sunPow: 6, horizon: 0.75, stars: 1.0 }));

  // Shooting star (animated): a short additive streak that crosses the sky every few seconds.
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.035), new THREE.MeshBasicMaterial({ color: '#f0f4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  streak.renderOrder = 3;
  root.add(streak);
  const sA = new THREE.Vector3(3.5, 9.5, -9), sB = new THREE.Vector3(-1.5, 7.2, -10);
  streak.lookAt(0, 8, 10);

  function update(t) {
    dome.rotation.y = DOME_RY + Math.sin(t * 0.12) * 0.22;
    const k = (t % 9) / 9;
    const life = Math.max(0, (k - 0.82) / 0.12);
    streak.visible = life > 0 && life < 1;
    if (streak.visible) {
      streak.position.lerpVectors(sA, sB, life);
      streak.material.opacity = Math.sin(Math.PI * life) * 0.9;
      streak.rotation.z = Math.atan2(sB.y - sA.y, sB.x - sA.x);
    }
    mastLight.material.opacity = (t % 2.2) < 1.1 ? 0.95 : 0.25;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#3a3a6e'),
    fog: new THREE.Fog('#4a4478', 22, 58),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
