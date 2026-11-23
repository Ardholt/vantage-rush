// Big Top: a travelling circus at twilight. Striped tent, a small ferris wheel turning, painted caravans,
// the ticket booth with a balloon tied to it, a cannon aimed over the tent, bunting and carnival bulbs.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, roof, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  grass: '#5d7d5c',
  grass2: '#6d8c62',
  path: '#a98a62',
  straw: '#d9b45a',
  soil: '#5a4234',
  board: '#3a2a2a',
  red: '#c8323a',
  cream: '#f3e6c8',
  gold: '#e0b04a',
  teal: '#2c8a8a',
  navy: '#2d3550',
  wood: '#6e4a36',
  iron: '#2f2c36',
  bulb: '#ffd98a',
};

// One canvas atlas for every sign and painted panel (one material, one draw call).
function atlas(THREE) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');
  // 0: arch sign, y 0-128
  g.fillStyle = '#b72a33'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f0c25a'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#ffe6a0'; g.font = 'bold 76px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('CIRCUS', 256, 68);
  for (const x of [34, 478]) { g.beginPath(); g.arc(x, 64, 12, 0, Math.PI * 2); g.fill(); }
  // 1: ticket sign, y 128-224
  g.fillStyle = '#f3e6c8'; g.fillRect(0, 128, 512, 96);
  g.strokeStyle = '#2c8a8a'; g.lineWidth = 8; g.strokeRect(8, 136, 496, 80);
  g.fillStyle = '#2c3550'; g.font = 'bold 58px Georgia, serif';
  g.fillText('TICKETS', 256, 178);
  // 2 and 3: painted caravan sides, y 224-368 and 368-512
  const panel = (y0, bg, fg, star) => {
    g.fillStyle = bg; g.fillRect(0, y0, 512, 144);
    g.strokeStyle = fg; g.lineWidth = 7; g.strokeRect(10, y0 + 10, 492, 124);
    g.lineWidth = 4;
    for (const s of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, x = 256 + s * (40 + t * 190), y = y0 + 72 + Math.sin(t * Math.PI * 3) * 30 * (1 - t * 0.5);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.beginPath(); g.arc(256 + s * 150, y0 + 72, 9, 0, Math.PI * 2); g.fillStyle = fg; g.fill();
    }
    g.fillStyle = star;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 16 : 38;
      const x = 256 + Math.cos(a) * r, y = y0 + 74 + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
  };
  panel(224, '#2c6f7a', '#f0c25a', '#f6e2a8');
  panel(368, '#a8323a', '#f3dca0', '#f0c25a');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const REGION = { arch: [0, 128], tickets: [128, 224], panelA: [224, 368], panelB: [368, 512] };

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(3131);
  const root = new THREE.Group();
  const P = new Painter(THREE, 31);
  const E = new Painter(THREE, 32);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const G = 0.3;

  const bar = (a, b, r, col, o = {}) => {
    const len = a.distanceTo(b);
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize()), v(1, 1, 1));
    (o.painter || P).add(o.round ? new THREE.CylinderGeometry(r, r, len, 5) : new THREE.BoxGeometry(r, len, r), col, { matrix: m, ...o });
  };
  const sagAt = (a, b, s, sag) => a.clone().lerp(b, s).add(v(0, -sag * 4 * s * (1 - s), 0));

  // Textured planes (signs, painted panels), merged into one mesh.
  const tex = atlas(THREE);
  const texParts = [];
  const sign = (region, w, h, matrix) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    const [y0, y1] = REGION[region];
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (y1 - (y1 - y0) * uv.getY(i)) / 512);
    g.applyMatrix4(matrix);
    texParts.push(g);
  };

  // Plinth: a field on a dark board, soil and a sandy band, grass on top.
  const rim = outline(rand, { n: 26, rx: 4.75, rz: 4.45, wob: 0.035, sq: 2.6 });
  P.add(slab(THREE, offsetOutline(rim, 0.3), -1.45, -1.15, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.15, -0.6), PAL.soil, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.6, -0.2), '#8a6a4a', { jitter: 0.035, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.03), -0.2, G, 0.04), PAL.grass, { jitter: 0.03, jitterY: 0.015, shade: 0.08 });
  // grass tussocks clustered near the rim
  for (let i = 0; i < 28; i++) {
    const a = rand() * Math.PI * 2, d = 3.6 + rand() * 0.7;
    P.add(new THREE.ConeGeometry(0.07 + rand() * 0.05, 0.22 + rand() * 0.15, 4), rand() > 0.5 ? PAL.grass2 : '#4f6e50', { pos: [Math.cos(a) * d * 0.98, G + 0.08, Math.sin(a) * d * 0.92], rot: [(rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4] });
  }

  // Trampled paths: worn dirt blotches from the arch to the tent door, and off to the wheel and caravans.
  const trail = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.32);
      for (let k = 0; k < n; k++) {
        const t = k / n, x = a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * 0.12, z = a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * 0.12;
        P.add(new THREE.CylinderGeometry(w * (0.75 + rand() * 0.4), w, 0.02, 7), rand() > 0.3 ? PAL.path : '#b89a6c', { pos: [x, G + 0.005 + rand() * 0.004, z], ry: rand() * 6, scl: [1.2, 1, 0.9], jitter: 0.03, jitterY: 0, shade: 0.05 });
      }
    }
  };
  trail([[1.15, 4.1], [0.95, 3.0], [0.45, 2.0], [0.15, 1.4]], 0.42);
  trail([[0.95, 3.0], [1.9, 2.4], [2.5, 1.2], [2.7, -0.2]], 0.3);
  trail([[0.45, 2.0], [-0.9, 2.3], [-2.2, 1.9]], 0.28);
  // straw scattered at the tent door
  for (let i = 0; i < 18; i++) P.add(new THREE.BoxGeometry(0.12, 0.01, 0.02), PAL.straw, { pos: [0.2 + (rand() - 0.5) * 1.0, G + 0.02, 1.45 + (rand() - 0.5) * 0.6], ry: rand() * 6 });

  // Big top: striped wall and a two-pitch roof with a scalloped valance, king pole and flag.
  const T = v(-0.65, G, -0.55);
  const TR = 2.0, TW = 0.95, TP = 3.15;
  const NS = 18;
  const wallProf = [new THREE.Vector2(TR, 0), new THREE.Vector2(TR, TW)];
  const roofProf = [new THREE.Vector2(TR + 0.12, TW - 0.05), new THREE.Vector2(1.15, TW + 0.82), new THREE.Vector2(0.45, TP - 0.55), new THREE.Vector2(0.08, TP)];
  const doorYaw = 0.42; // the door faces the arch
  for (let i = 0; i < NS; i++) {
    const p0 = (i / NS) * Math.PI * 2, pl = (Math.PI * 2) / NS;
    const col = i % 2 ? PAL.red : PAL.cream;
    const mid = p0 + pl / 2;
    // skip the wall where the door is (lathe phi 0 points to +z)
    const dPhi = Math.atan2(Math.sin(mid - doorYaw), Math.cos(mid - doorYaw));
    if (Math.abs(dPhi) > 0.25) P.add(new THREE.LatheGeometry(wallProf, 1, p0, pl), col, { pos: [T.x, T.y, T.z], shade: 0.03 });
    P.add(new THREE.LatheGeometry(roofProf, 1, p0, pl), col, { pos: [T.x, T.y, T.z], shade: 0.03 });
    // scallops under the eave
    const sx = Math.sin(mid) * (TR + 0.13), sz = Math.cos(mid) * (TR + 0.13);
    P.add(new THREE.ConeGeometry(0.2, 0.22, 3), i % 2 ? PAL.cream : PAL.red, { pos: [T.x + sx, T.y + TW - 0.17, T.z + sz], rot: [Math.PI, mid, 0], scl: [1.6, 1, 0.25] });
  }
  // dark interior so the door reads as an opening; door flaps tied back
  P.add(new THREE.CylinderGeometry(TR - 0.04, TR - 0.04, TW, NS, 1, true), '#2a1f2a', { pos: [T.x, T.y + TW / 2, T.z], shade: 0 });
  const DM = compose(THREE, { pos: [T.x + Math.sin(doorYaw) * TR, G, T.z + Math.cos(doorYaw) * TR], ry: doorYaw });
  const dm = (o) => DM.clone().multiply(compose(THREE, o));
  for (const s of [-1, 1]) {
    P.add(new THREE.ConeGeometry(0.3, TW + 0.1, 3), s > 0 ? PAL.red : PAL.cream, { matrix: dm({ pos: [s * 0.48, (TW + 0.1) / 2, 0.05], rot: [0, 0, 0], scl: [1, 1, 0.25] }) });
    bar(v(0, 0, 0).applyMatrix4(dm({ pos: [s * 0.62, 0, 0.35] })), v(0, 0, 0).applyMatrix4(dm({ pos: [s * 0.62, 1.55, 0.35] })), 0.05, PAL.gold, { round: true });
  }
  // porch awning over the door
  P.add(roof(THREE, 1.4, 0.32, 0.8, 0.05), PAL.red, { matrix: dm({ pos: [0, 1.38, 0.25] }), shade: 0.04 });
  E.add(new THREE.BoxGeometry(0.7, 0.75, 0.04), '#ffb35c', { matrix: dm({ pos: [0, 0.42, -0.35] }) });
  const doorGlow = v(0, 0.6, 0.6).applyMatrix4(DM);
  // king pole, flag
  const peak = v(T.x, T.y + TP, T.z);
  bar(peak, peak.clone().add(v(0, 0.75, 0)), 0.04, PAL.gold, { round: true });
  const flagM = compose(THREE, { pos: [peak.x + 0.22, peak.y + 0.62, peak.z], rot: [0, 0, -Math.PI / 2], scl: [1, 1, 0.12] });
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 3).translate(0, -0.21, 0), new THREE.MeshLambertMaterial({ color: PAL.red, flatShading: true }));
  flag.position.set(peak.x, peak.y + 0.62, peak.z);
  flag.rotation.set(0, 0, -Math.PI / 2);
  flag.scale.set(1, 1, 0.12);
  root.add(flag);
  void flagM;
  // guy ropes and pegs
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    if (Math.abs(Math.atan2(Math.sin(a - doorYaw), Math.cos(a - doorYaw))) < 0.45) continue;
    const top = v(T.x + Math.sin(a) * (TR + 0.1), G + TW - 0.05, T.z + Math.cos(a) * (TR + 0.1));
    const peg = v(T.x + Math.sin(a) * (TR + 0.75), G, T.z + Math.cos(a) * (TR + 0.75));
    bar(top, peg, 0.015, '#d8cbb0');
    P.add(new THREE.BoxGeometry(0.05, 0.12, 0.05), PAL.wood, { pos: [peg.x, G + 0.04, peg.z], rot: [0, a, 0.3] });
  }

  // Entrance arch with a sign and bulbs, at the front of the field.
  const AR = compose(THREE, { pos: [1.15, G, 3.85], ry: 0.25 });
  const ar = (o) => AR.clone().multiply(compose(THREE, o));
  const archBulbs = [];
  {
    for (const s of [-1, 1]) {
      P.add(new THREE.BoxGeometry(0.16, 2.1, 0.16), PAL.red, { matrix: ar({ pos: [s * 0.95, 1.05, 0] }) });
      P.add(new THREE.BoxGeometry(0.22, 0.12, 0.22), PAL.gold, { matrix: ar({ pos: [s * 0.95, 2.14, 0] }) });
      P.add(new THREE.ConeGeometry(0.12, 0.25, 4), PAL.gold, { matrix: ar({ pos: [s * 0.95, 2.32, 0], ry: Math.PI / 4 }) });
      for (let k = 0; k < 6; k++) archBulbs.push(v(s * 1.04, 0.35 + k * 0.3, 0.06).applyMatrix4(AR));
    }
    P.add(new THREE.BoxGeometry(1.8, 0.48, 0.08), '#7a1f26', { matrix: ar({ pos: [0, 1.85, -0.02] }) });
    sign('arch', 1.72, 0.43, ar({ pos: [0, 1.85, 0.025] }));
    for (let k = 0; k < 9; k++) archBulbs.push(v(-0.85 + k * 0.2125, 2.13, 0.05).applyMatrix4(AR));
  }

  // Ticket booth: striped awning, lit window, sign, a red balloon tied to it (animated).
  const BO = compose(THREE, { pos: [2.75, G, 2.45], ry: -0.55 });
  const bo = (o) => BO.clone().multiply(compose(THREE, o));
  {
    P.add(new THREE.BoxGeometry(0.85, 1.25, 0.75), PAL.teal, { matrix: bo({ pos: [0, 0.625, 0] }), jitter: 0.008, shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.89, 0.12, 0.79), PAL.gold, { matrix: bo({ pos: [0, 0.06, 0] }) });
    E.add(new THREE.BoxGeometry(0.5, 0.38, 0.02), '#ffcf80', { matrix: bo({ pos: [0, 0.82, 0.38] }) });
    P.add(new THREE.BoxGeometry(0.6, 0.05, 0.16), PAL.cream, { matrix: bo({ pos: [0, 0.6, 0.45] }) });
    for (let k = 0; k < 6; k++) P.add(new THREE.BoxGeometry(0.16, 0.03, 0.5), k % 2 ? PAL.red : PAL.cream, { matrix: bo({ pos: [-0.4 + k * 0.16, 1.18, 0.55], rot: [0.45, 0, 0] }) });
    P.add(new THREE.ConeGeometry(0.66, 0.42, 4), PAL.red, { matrix: bo({ pos: [0, 1.46, 0], ry: Math.PI / 4 }), shade: 0.04 });
    P.add(new THREE.SphereGeometry(0.06, 6, 4), PAL.gold, { matrix: bo({ pos: [0, 1.7, 0] }) });
    sign('tickets', 0.78, 0.15, bo({ pos: [0, 1.32, 0.395] }));
  }
  const balloonAnchor = v(0.42, 1.1, 0.38).applyMatrix4(BO);
  const balloonP = new Painter(THREE, 33);
  balloonP.add(new THREE.SphereGeometry(0.16, 9, 7), '#e0353a', { scl: [1, 1.15, 1], shade: 0.02 });
  balloonP.add(new THREE.ConeGeometry(0.035, 0.05, 5), '#b02a2f', { pos: [0, -0.19, 0], rot: [Math.PI, 0, 0] });
  balloonP.add(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 3), '#e8e0d0', { pos: [0, -0.66, 0] });
  const balloon = balloonP.mesh(lambert(THREE), { cast: false, receive: false });
  root.add(balloon);

  // Ferris wheel: A-frame legs, a turning wheel with bulbs, gondolas that stay level.
  const FW = v(2.75, G, -1.75);
  const FY = 0.4, HUBY = G + 2.05, FR = 1.4, fyaw = -0.55;
  const fwM = compose(THREE, { pos: [FW.x, 0, FW.z], ry: fyaw });
  const fw = (x, y, z) => v(x, y, z).applyMatrix4(fwM);
  {
    for (const z of [-FY, FY]) {
      bar(fw(-0.95, G, z * 1.5), fw(0, HUBY, z), 0.08, '#f0e6d0');
      bar(fw(0.95, G, z * 1.5), fw(0, HUBY, z), 0.08, '#f0e6d0');
      bar(fw(-0.55, G + 0.85, z * 1.3), fw(0.55, G + 0.85, z * 1.3), 0.05, '#f0e6d0');
    }
    bar(fw(0, HUBY, -FY - 0.08), fw(0, HUBY, FY + 0.08), 0.07, PAL.iron, { round: true });
    // base platform and the operator's booth with a lever
    P.add(new THREE.BoxGeometry(2.4, 0.12, 1.5), '#8a6a4a', { matrix: fwM.clone().multiply(compose(THREE, { pos: [0, G + 0.06, 0] })), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(0.42, 0.5, 0.36), PAL.red, { matrix: fwM.clone().multiply(compose(THREE, { pos: [1.05, G + 0.37, 0.95] })) });
    P.add(new THREE.BoxGeometry(0.5, 0.05, 0.44), PAL.gold, { matrix: fwM.clone().multiply(compose(THREE, { pos: [1.05, G + 0.645, 0.95] })) });
    bar(fw(1.0, G + 0.62, 0.95), fw(0.9, G + 0.95, 1.0), 0.03, PAL.iron);
  }
  const wheel = new THREE.Group();
  wheel.position.set(FW.x, HUBY, FW.z);
  wheel.rotation.y = fyaw;
  root.add(wheel);
  const spin = new THREE.Group();
  wheel.add(spin);
  {
    const wp = new Painter(THREE, 34);
    for (const z of [-FY + 0.05, FY - 0.05]) {
      wp.add(new THREE.TorusGeometry(FR, 0.035, 4, 32), PAL.cream, { pos: [0, 0, z] });
      wp.add(new THREE.TorusGeometry(FR * 0.55, 0.025, 4, 20), PAL.red, { pos: [0, 0, z] });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const L = FR;
        const m = compose(THREE, { pos: [Math.cos(a) * L / 2, Math.sin(a) * L / 2, z], rot: [0, 0, a - Math.PI / 2] });
        wp.add(new THREE.BoxGeometry(0.035, L, 0.035), PAL.cream, { matrix: m });
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      wp.add(new THREE.CylinderGeometry(0.02, 0.02, FY * 2, 4), PAL.iron, { pos: [Math.cos(a) * FR, Math.sin(a) * FR, 0], rot: [Math.PI / 2, 0, 0] });
    }
    wp.add(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10), PAL.gold, { rot: [Math.PI / 2, 0, 0] });
    const wm = wp.mesh(lambert(THREE));
    wm.castShadow = false;
    spin.add(wm);
    const rimB = [];
    const NBW = low ? 12 : 24;
    for (let k = 0; k < NBW; k++) {
      const a = (k / NBW) * Math.PI * 2;
      for (const z of low ? [FY] : [-FY + 0.05, FY - 0.05]) rimB.push([Math.cos(a) * (FR + 0.05), Math.sin(a) * (FR + 0.05), z]);
    }
    spin.add(halos(THREE, rimB, { color: '#ffd37a', size: 0.3, opacity: 0.9 }));
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimB.flat(), 3));
    spin.add(new THREE.Points(bulbGeo, new THREE.PointsMaterial({ color: '#fff1c8', size: 0.07, sizeAttenuation: true, fog: false })));
  }
  const gondP = new Painter(THREE, 35);
  gondP.add(new THREE.BoxGeometry(0.42, 0.24, 0.5), '#ffffff', { pos: [0, -0.36, 0], shade: 0.03 });
  gondP.add(new THREE.BoxGeometry(0.46, 0.04, 0.54), '#e8e0d0', { pos: [0, -0.24, 0] });
  gondP.add(new THREE.ConeGeometry(0.36, 0.14, 4), '#ffffff', { pos: [0, -0.02, 0], ry: Math.PI / 4, scl: [1, 1, 1.2] });
  for (const x of [-0.17, 0.17]) gondP.add(new THREE.BoxGeometry(0.02, 0.26, 0.02), '#d0c8b8', { pos: [x, -0.15, 0] });
  const NG = 8;
  const gond = new THREE.InstancedMesh(gondP.geometry(), lambert(THREE), NG);
  const gcols = ['#2c8a8a', '#e0b04a', '#c8323a', '#f3e6c8', '#2c8a8a', '#e0b04a', '#c8323a', '#7fb8a8'];
  const tc = new THREE.Color();
  gcols.forEach((c, i) => gond.setColorAt(i, tc.set(c)));
  gond.castShadow = false;
  root.add(gond);

  // Caravans: painted sides, curved roofs, spoked wheels; a dog asleep by the steps of the first.
  const caravan = (x, z, ry, body, region, len) => {
    const M = compose(THREE, { pos: [x, G, z], ry });
    const c = (o) => M.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.95, 0.85, len), body, { matrix: c({ pos: [0, 0.83, 0] }), jitter: 0.006, shade: 0.04 });
    P.add(new THREE.BoxGeometry(1.05, 0.06, len + 0.1), PAL.gold, { matrix: c({ pos: [0, 0.4, 0] }) });
    P.add(new THREE.CylinderGeometry(0.55, 0.55, len + 0.2, 12, 1, false, -Math.PI / 2, Math.PI), '#3b3446', { matrix: c({ pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0], scl: [1, 1, 0.42] }), shade: 0.04 });
    P.add(new THREE.BoxGeometry(0.08, 0.38, 0.08), '#3b3446', { matrix: c({ pos: [0.22, 1.55, -len * 0.3] }) });
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const r = sz > 0 ? 0.3 : 0.38;
      P.add(new THREE.TorusGeometry(r, 0.035, 4, 12), PAL.gold, { matrix: c({ pos: [sx * 0.52, r, sz * len * 0.3], rot: [0, Math.PI / 2, 0] }) });
      for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(0.02, r * 2, 0.02), PAL.gold, { matrix: c({ pos: [sx * 0.52, r, sz * len * 0.3], rot: [(k / 4) * Math.PI, Math.PI / 2, 0] }) });
    }
    // door end with steps
    P.add(new THREE.BoxGeometry(0.4, 0.62, 0.04), '#5a3a2a', { matrix: c({ pos: [0, 0.83, len / 2 + 0.01] }) });
    E.add(new THREE.BoxGeometry(0.16, 0.16, 0.02), '#ffcf80', { matrix: c({ pos: [0, 0.98, len / 2 + 0.035] }) });
    for (let k = 0; k < 3; k++) P.add(new THREE.BoxGeometry(0.42, 0.04, 0.16), PAL.wood, { matrix: c({ pos: [0, 0.38 - k * 0.12, len / 2 + 0.1 + k * 0.14] }) });
    // shafts resting on the ground
    for (const sx of [-0.3, 0.3]) P.add(new THREE.BoxGeometry(0.05, 0.05, 1.0), PAL.wood, { matrix: c({ pos: [sx, 0.22, -len / 2 - 0.45], rot: [-0.28, 0, 0] }) });
    // painted side panels
    for (const s of [-1, 1]) sign(region, len * 0.82, 0.58, c({ pos: [s * 0.481, 0.83, 0], ry: s * Math.PI / 2 }));
    return c;
  };
  const cA = caravan(-3.25, 1.35, 2.55, '#2c6f7a', 'panelA', 1.75);
  caravan(-2.9, -2.75, 0.95, '#a8323a', 'panelB', 1.55);
  {
    // dog curled up by the steps of caravan A
    const d = v(0.45, 0, 1.25).applyMatrix4(cA({}));
    P.add(new THREE.IcosahedronGeometry(0.15, 0), '#b07a4a', { pos: [d.x, G + 0.08, d.z], scl: [1.2, 0.6, 0.9], ry: 0.3 });
    P.add(new THREE.IcosahedronGeometry(0.075, 0), '#b07a4a', { pos: [d.x + 0.13, G + 0.1, d.z + 0.08] });
    P.add(new THREE.ConeGeometry(0.03, 0.06, 3), '#5a3a2a', { pos: [d.x + 0.15, G + 0.17, d.z + 0.06] });
    P.add(new THREE.CylinderGeometry(0.06, 0.05, 0.03, 8), '#3d4a6a', { pos: [d.x - 0.2, G + 0.02, d.z + 0.2] });
  }
  // a unicycle leaning on caravan B
  {
    const u = v(-2.25, G, -2.25);
    P.add(new THREE.TorusGeometry(0.17, 0.025, 4, 12), '#2f2c36', { pos: [u.x, G + 0.17, u.z], ry: 0.95, rot: [0, 0.95, 0.15] });
    bar(v(u.x, G + 0.17, u.z), v(u.x - 0.12, G + 0.68, u.z - 0.08), 0.025, '#c8c8d0', { round: true });
    P.add(new THREE.BoxGeometry(0.1, 0.04, 0.22), PAL.red, { pos: [u.x - 0.13, G + 0.71, u.z - 0.09], ry: 0.95 });
  }

  // Hay bales stacked by caravan B, a cannon aimed over the tent.
  for (const [x, y, z, ry] of [[-3.7, 0, -1.25, 0.2], [-3.55, 0, -0.65, 0.1], [-3.95, 0, -0.75, 1.7], [-3.65, 0.36, -0.95, 0.15], [-1.75, 0, -3.65, 0.9], [-1.35, 0, -3.95, 0.7]]) {
    P.add(new THREE.BoxGeometry(0.42, 0.36, 0.62), PAL.straw, { pos: [x, G + 0.18 + y, z], ry, jitter: 0.025, shade: 0.08 });
    P.add(new THREE.BoxGeometry(0.43, 0.025, 0.63), '#b8913e', { pos: [x, G + 0.2 + y, z], ry });
  }
  {
    const CM = compose(THREE, { pos: [2.25, G, 0.75], ry: -1.2 });
    const c = (o) => CM.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.75, 0.32, 1.25), PAL.red, { matrix: c({ pos: [0, 0.42, 0] }), jitter: 0.006 });
    P.add(new THREE.BoxGeometry(0.79, 0.06, 1.29), PAL.gold, { matrix: c({ pos: [0, 0.6, 0] }) });
    for (const sz of [-0.42, 0.42]) for (const sx of [-0.42, 0.42]) {
      P.add(new THREE.TorusGeometry(0.22, 0.035, 4, 12), PAL.gold, { matrix: c({ pos: [sx, 0.22, sz], rot: [0, Math.PI / 2, 0] }) });
      P.add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), PAL.gold, { matrix: c({ pos: [sx, 0.22, sz], rot: [0, 0, Math.PI / 2] }) });
    }
    const BM = c({ pos: [0, 0.75, 0.1], rot: [-0.85, 0, 0] });
    const b = (o) => BM.clone().multiply(compose(THREE, o));
    P.add(new THREE.CylinderGeometry(0.2, 0.28, 1.65, 12), PAL.navy, { matrix: b({ pos: [0, 0.6, 0] }), shade: 0.03 });
    for (const y of [-0.05, 0.6, 1.3]) P.add(new THREE.TorusGeometry(0.25 - y * 0.035, 0.035, 4, 14), PAL.gold, { matrix: b({ pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 10), '#141018', { matrix: b({ pos: [0, 1.435, 0] }) });
    P.add(new THREE.SphereGeometry(0.26, 8, 6), PAL.navy, { matrix: b({ pos: [0, -0.15, 0] }) });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      P.add(new THREE.OctahedronGeometry(0.06, 0), PAL.gold, { matrix: b({ pos: [Math.cos(a) * 0.245, 0.3 + (k % 2) * 0.5, Math.sin(a) * 0.245], scl: [1, 1, 0.3], ry: -a }) });
    }
  }

  // Odds and ends: barrels by caravan A, a strongman's barbell by the hay, a striped tub at the tent.
  for (const [x, z, s] of [[-2.35, 2.35, 1], [-2.05, 2.6, 0.85], [-2.2, 2.0, 0.9]]) {
    P.add(new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.42 * s, 9), PAL.wood, { pos: [x, G + 0.21 * s, z], jitter: 0.006, shade: 0.06 });
    for (const y of [0.1, 0.32]) P.add(new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.03, 9), PAL.iron, { pos: [x, G + y * s, z] });
  }
  P.add(new THREE.BoxGeometry(0.4, 0.38, 0.4), '#8c6244', { pos: [-2.45, G + 0.19, 1.55], ry: 0.4, jitter: 0.01 });
  {
    const bx = -2.95, bz = -0.05;
    bar(v(bx - 0.35, G + 0.12, bz), v(bx + 0.35, G + 0.12, bz + 0.05), 0.03, '#c8c8d0', { round: true });
    for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.12, 8, 6), '#1f1c24', { pos: [bx + s * 0.33, G + 0.12, bz + 0.025 + s * 0.025] });
  }
  {
    const st = v(1.05, G, -0.6);
    for (let k = 0; k < 8; k++) P.add(new THREE.CylinderGeometry(0.26, 0.32, 0.45, 2, 1, true, (k / 8) * Math.PI * 2, Math.PI / 4), k % 2 ? PAL.gold : PAL.teal, { pos: [st.x, G + 0.225, st.z], shade: 0.03 });
    P.add(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 12), PAL.red, { pos: [st.x, G + 0.46, st.z] });
  }
  // lighter, worn grass patches
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2, d = 1.5 + rand() * 2.6;
    P.add(new THREE.CylinderGeometry(0.3 + rand() * 0.35, 0.4, 0.015, 7), rand() > 0.5 ? PAL.grass2 : '#6a7f55', { pos: [Math.cos(a) * d, G + 0.004, Math.sin(a) * d * 0.95], scl: [1.3, 1, 0.8], ry: rand() * 6, jitter: 0.05, jitterY: 0 });
  }
  // Popcorn cart with a glowing case.
  {
    const PM = compose(THREE, { pos: [-1.45, G, 2.65], ry: 0.5 });
    const p = (o) => PM.clone().multiply(compose(THREE, o));
    P.add(new THREE.BoxGeometry(0.6, 0.45, 0.42), PAL.red, { matrix: p({ pos: [0, 0.5, 0] }) });
    E.add(new THREE.BoxGeometry(0.52, 0.38, 0.36), '#ffe8a0', { matrix: p({ pos: [0, 0.92, 0] }) });
    for (let k = 0; k < 9; k++) P.add(new THREE.IcosahedronGeometry(0.035, 0), '#fff6dc', { matrix: p({ pos: [-0.2 + rand() * 0.4, 0.75 + rand() * 0.08, -0.13 + rand() * 0.26] }) });
    P.add(new THREE.ConeGeometry(0.45, 0.2, 4), PAL.red, { matrix: p({ pos: [0, 1.22, 0], ry: Math.PI / 4, scl: [1, 1, 0.75] }) });
    for (const sx of [-0.33, 0.33]) P.add(new THREE.TorusGeometry(0.16, 0.025, 4, 10), PAL.gold, { matrix: p({ pos: [sx, 0.16, 0], rot: [0, Math.PI / 2, 0] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.03, 0.4), PAL.gold, { matrix: p({ pos: [0, 0.55, -0.4] }) });
    P.add(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 6), '#f3e6c8', { pos: [-1.0, G + 0.06, 2.95] }); // a dropped carton
  }

  // Poplars at the back edge, dark against the sky.
  for (const [x, z, h] of [[0.75, -3.8, 2.6], [1.35, -3.6, 2.0], [-0.55, -3.95, 1.75], [4.05, 0.6, 1.9]]) {
    P.add(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 5), PAL.wood, { pos: [x, G + 0.2, z] });
    P.add(new THREE.ConeGeometry(0.38, h, 7, 2), '#2f5048', { pos: [x, G + 0.3 + h / 2, z], scl: [1, 1, 0.9], jitter: 0.04, shade: 0.08, top: '#456b5a', y0: G, y1: G + h });
  }

  // Bunting from the king pole, bulb strings between the arch, booth, tent porch and popcorn cart.
  const buntingCols = [PAL.red, PAL.gold, PAL.teal, PAL.cream];
  const pole = (x, z, h) => {
    bar(v(x, G, z), v(x, G + h, z), 0.045, PAL.cream, { round: true });
    P.add(new THREE.SphereGeometry(0.06, 5, 4), PAL.gold, { pos: [x, G + h + 0.04, z] });
    return v(x, G + h - 0.05, z);
  };
  const bPoles = [pole(-3.95, -0.05, 1.9), pole(0.9, -3.15, 2.0), pole(1.95, 1.75, 1.9)];
  for (const end of bPoles) {
    const a = peak.clone().add(v(0, 0.35, 0));
    for (let i = 0; i < 10; i++) bar(sagAt(a, end, i / 10, 0.35), sagAt(a, end, (i + 1) / 10, 0.35), 0.012, '#e8e0d0');
    const n = Math.round(a.distanceTo(end) / 0.28);
    for (let i = 1; i < n; i++) {
      const p = sagAt(a, end, i / n, 0.35);
      const dir = end.clone().sub(a).setY(0).normalize();
      P.add(new THREE.ConeGeometry(0.075, 0.18, 3), buntingCols[(i + n) % 4], { pos: [p.x, p.y - 0.09, p.z], rot: [Math.PI, Math.atan2(dir.x, dir.z) + Math.PI / 2, 0], scl: [1, 1, 0.2] });
    }
  }
  const bulbs = [...archBulbs];
  const string = (a, b, sag) => {
    for (let i = 0; i < 8; i++) bar(sagAt(a, b, i / 8, sag), sagAt(a, b, (i + 1) / 8, sag), 0.012, '#2b2a30');
    const n = Math.max(4, Math.round(a.distanceTo(b) / 0.3));
    for (let i = 1; i < n; i++) bulbs.push(sagAt(a, b, i / n, sag).add(v(0, -0.04, 0)));
  };
  const archL = v(-0.95, 2.05, 0).applyMatrix4(AR), archR = v(0.95, 2.05, 0).applyMatrix4(AR);
  string(archR, v(0, 1.62, 0).applyMatrix4(BO), 0.3);
  string(archL, v(-0.7, 1.45, 0.65).applyMatrix4(DM), 0.35);
  string(v(0.7, 1.45, 0.65).applyMatrix4(DM), bPoles[2], 0.25);
  string(archL, pole(-1.15, 2.2, 1.6), 0.25);
  for (const p of bulbs) E.add(new THREE.IcosahedronGeometry(0.04, 0), PAL.bulb, { pos: [p.x, p.y, p.z] });

  root.add(P.mesh(lambert(THREE)));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));
  const signMesh = new THREE.Mesh(mergeGeometries(texParts), new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35 }));
  for (const g of texParts) g.dispose();
  root.add(signMesh);
  const glowPts = (low ? bulbs.filter((_, i) => i % 2 === 0) : bulbs).map((p) => [p.x, p.y, p.z]);
  glowPts.push([doorGlow.x, doorGlow.y, doorGlow.z]);
  root.add(halos(THREE, glowPts, { color: '#ffc46e', size: 0.5, opacity: 0.9 }));
  root.add(halos(THREE, [[doorGlow.x, doorGlow.y, doorGlow.z]], { color: '#ff9a48', size: 2.2, opacity: 0.6 }));

  // Light: teal twilight sky fill, the last orange light low in the west, three warm lamps.
  root.add(new THREE.HemisphereLight('#7fb0bc', '#4a3a40', 1.5));
  const key = keyLight(THREE, ctx, { color: '#ffae7a', intensity: 1.5, pos: [-7, 3.5, -6], extent: 7 });
  root.add(key, key.target);
  const lamps = [[doorGlow.x, doorGlow.y + 0.3, doorGlow.z + 0.4], [1.2, G + 1.9, 3.5], [FW.x, HUBY, FW.z + 0.6]];
  for (const w of low ? lamps.slice(0, 1) : lamps) {
    const pl = new THREE.PointLight('#ffa95a', 4.0, 4.5, 1.6);
    pl.position.set(...w);
    root.add(pl);
  }
  root.add(skyDome(THREE, { top: '#174e5e', mid: '#f08d4e', bottom: '#2d3a55', sun: [-0.6, 0.02, -0.8], sunColor: '#ff8a40', sunPow: 5, horizon: 0.55, stars: 0.7 }));

  const dummy = new THREE.Object3D();
  const wq = new THREE.Quaternion();
  function update(t) {
    const ang = t * 0.12;
    spin.rotation.z = ang;
    wq.setFromAxisAngle(v(0, 1, 0), fyaw);
    for (let i = 0; i < NG; i++) {
      const a = ang + (i / NG) * Math.PI * 2 + Math.PI / NG;
      const local = v(Math.cos(a) * FR, Math.sin(a) * FR, 0).applyQuaternion(wq);
      dummy.position.set(FW.x + local.x, HUBY + local.y, FW.z + local.z);
      dummy.rotation.set(Math.sin(t * 1.1 + i) * 0.04, fyaw, Math.sin(t * 0.9 + i * 2) * 0.05);
      dummy.updateMatrix();
      gond.setMatrixAt(i, dummy.matrix);
    }
    gond.instanceMatrix.needsUpdate = true;
    balloon.position.set(balloonAnchor.x + Math.sin(t * 0.8) * 0.05, balloonAnchor.y + 0.85 + Math.sin(t * 1.3) * 0.03, balloonAnchor.z + Math.cos(t * 0.6) * 0.04);
    balloon.rotation.set(Math.cos(t * 0.6) * 0.06, 0, -Math.sin(t * 0.8) * 0.06);
    flag.scale.set(1, 1, 0.12 + 0.05 * Math.sin(t * 3));
    flag.rotation.y = Math.sin(t * 1.7) * 0.25;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#2d3a55'),
    fog: new THREE.Fog('#3d4a62', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
