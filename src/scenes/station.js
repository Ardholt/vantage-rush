// Last Gas: dusk at a lone desert filling station. Canopy over two old pumps, a diner with a neon sign,
// a camper van with its awning out, saguaros, a windpump, mesas glowing on the horizon.
import { Painter, compose, lambert, unlit, outline, offsetOutline, slab, skyDome, halos, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  sand: '#e2a874',
  sand2: '#d79562',
  rock: '#b85a3a',
  rock2: '#d27a4a',
  rockTop: '#e09a62',
  rockDark: '#8a3f32',
  board: '#3a2628',
  asphalt: '#4a4250',
  asphaltHi: '#5a5160',
  line: '#f2d26a',
  concrete: '#c9b49e',
  stucco: '#efdcbc',
  teal: '#3e9a95',
  red: '#d2433a',
  cream: '#f5ead2',
  chrome: '#c9c6cc',
  dark: '#2c2530',
  cactus: '#55804e',
  cactus2: '#6f9a5a',
  brush: '#a39260',
  wood: '#7a5440',
  lamp: '#ffd890',
  sodium: '#ffb14a',
  neon: '#ff5a7a',
};

function canvasSign(THREE, w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(7311);
  const root = new THREE.Group();
  const P = new Painter(THREE, 311);
  const E = new Painter(THREE, 312); // glowing parts (unlit)
  const mat = lambert(THREE);
  const G = 0.3; // desert floor
  const frame = (pos, ry = 0) => {
    const m = compose(THREE, { pos, ry });
    return (o) => m.clone().multiply(compose(THREE, o));
  };

  // Plinth: a slab of banded sandstone on a dark board.
  const rim = outline(rand, { n: 26, rx: 4.85, rz: 4.5, wob: 0.04, sq: 2.7 });
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.5, -1.2, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.2, -0.8), PAL.rockDark, { jitter: 0.05, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, -0.03), -0.8, -0.5), PAL.rock, { jitter: 0.05, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.02), -0.5, -0.2), PAL.rock2, { jitter: 0.05, shade: 0.1 });
  P.add(slab(THREE, rim, -0.2, 0.05), '#c98a5a', { jitter: 0.05, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.02), 0.05, G, 0.04), PAL.sand, { jitter: 0.03, jitterY: 0.015, shade: 0.06 });
  // wind ripples and low dunes
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2, d = 2 + rand() * 2.2;
    P.add(new THREE.IcosahedronGeometry(0.5 + rand() * 0.4, 1), i % 2 ? PAL.sand : PAL.sand2, { pos: [Math.cos(a) * d, G - 0.06, Math.sin(a) * d * 0.9], scl: [1.4, 0.12, 0.8], ry: rand() * 3, jitter: 0.04, shade: 0.04 });
  }

  // Road: two lanes crossing the slab in front of the station and running off both edges.
  const RZ = 1.75, RA = -0.13; // centre line z at x=0, slight angle
  const roadZ = (x) => RZ + Math.tan(RA) * x;
  {
    const L = 10.2;
    P.add(new THREE.BoxGeometry(L, 0.07, 1.55, 16, 1, 2), PAL.asphalt, { pos: [0, G + 0.0, RZ], ry: RA, jitter: 0.015, jitterY: 0.006, shade: 0.05 });
    P.add(new THREE.BoxGeometry(L, 0.05, 1.9), '#b08868', { pos: [0, G - 0.02, RZ], ry: RA, jitter: 0.03, jitterY: 0 });
    for (let x = -4.6; x < 4.6; x += 0.62) {
      P.add(new THREE.BoxGeometry(0.32, 0.01, 0.06), PAL.line, { pos: [x, G + 0.04, roadZ(x)], ry: RA });
    }
    // tar patches
    for (let i = 0; i < 5; i++) {
      const x = -3.5 + rand() * 7;
      P.add(new THREE.BoxGeometry(0.3 + rand() * 0.4, 0.008, 0.2 + rand() * 0.2), '#3b3442', { pos: [x, G + 0.038, roadZ(x) + (rand() - 0.5) * 1.0], ry: RA + rand() });
    }
  }

  // Forecourt: a cracked concrete apron between the road and the diner.
  {
    P.add(new THREE.BoxGeometry(4.3, 0.06, 2.4, 6, 1, 4), PAL.concrete, { pos: [0.35, G + 0.0, -0.05], ry: RA, jitter: 0.02, jitterY: 0.008, shade: 0.06 });
    for (let i = 0; i < 6; i++) P.add(new THREE.BoxGeometry(0.02, 0.01, 0.5 + rand() * 0.6), '#9e8a78', { pos: [-1.4 + rand() * 3.5, G + 0.035, -0.6 + rand() * 1.4], ry: rand() * 3 });
    // oil stain
    P.add(new THREE.CylinderGeometry(0.25, 0.25, 0.01, 8), '#8c7c74', { pos: [-0.65, G + 0.035, 0.45], scl: [1.3, 1, 0.8] });
  }

  // Canopy over the pump island, with sodium tubes underneath.
  const CX = -0.15, CZ = 0.15, CY = 1.95;
  {
    const c = frame([CX, G, CZ], RA);
    P.add(new THREE.BoxGeometry(1.6, 0.16, 0.42), PAL.concrete, { matrix: c({ pos: [0, 0.08, 0] }), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(1.64, 0.03, 0.46), PAL.line, { matrix: c({ pos: [0, 0.17, 0] }) });
    for (const x of [-0.95, 0.95]) {
      P.add(new THREE.BoxGeometry(0.12, CY, 0.12), PAL.cream, { matrix: c({ pos: [x, CY / 2, 0] }) });
      P.add(new THREE.BoxGeometry(0.2, 0.2, 0.2), PAL.concrete, { matrix: c({ pos: [x, 0.1, 0] }) });
    }
    // swept-up roof slab with a red fascia band
    P.add(new THREE.BoxGeometry(2.9, 0.14, 1.7), PAL.cream, { matrix: c({ pos: [0, CY + 0.07, 0], rot: [0.06, 0, 0] }), shade: 0.03 });
    P.add(new THREE.BoxGeometry(2.96, 0.16, 0.06), PAL.red, { matrix: c({ pos: [0, CY + 0.1, 0.86], rot: [0.06, 0, 0] }) });
    P.add(new THREE.BoxGeometry(2.96, 0.16, 0.06), PAL.red, { matrix: c({ pos: [0, CY + 0.04, -0.86], rot: [0.06, 0, 0] }) });
    for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.06, 0.16, 1.76), PAL.red, { matrix: c({ pos: [s * 1.48, CY + 0.07, 0], rot: [0.06, 0, 0] }) });
    for (const z of [-0.45, 0.45]) E.add(new THREE.BoxGeometry(2.3, 0.03, 0.08), '#ffe2a8', { matrix: c({ pos: [0, CY - 0.02 + z * 0.06, z], rot: [0.06, 0, 0] }) });
    // two pumps: one red, one teal (the teal one has its nozzle hanging out)
    const pump = (x, col, hose) => {
      P.add(new THREE.BoxGeometry(0.34, 0.75, 0.26), col, { matrix: c({ pos: [x, 0.17 + 0.375, 0] }), shade: 0.03 });
      P.add(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 10, 1, false, 0, Math.PI), col, { matrix: c({ pos: [x, 0.92, 0], rot: [Math.PI / 2, 0, Math.PI / 2] }) });
      P.add(new THREE.BoxGeometry(0.24, 0.2, 0.27), PAL.cream, { matrix: c({ pos: [x, 0.7, 0] }) });
      P.add(new THREE.BoxGeometry(0.18, 0.08, 0.28), PAL.dark, { matrix: c({ pos: [x, 0.74, 0] }) });
      P.add(new THREE.BoxGeometry(0.36, 0.05, 0.28), PAL.chrome, { matrix: c({ pos: [x, 0.19, 0] }) });
      P.add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 5), PAL.chrome, { matrix: c({ pos: [x, 1.12, 0] }) });
      E.add(new THREE.SphereGeometry(0.11, 10, 6), '#fff2d0', { matrix: c({ pos: [x, 1.25, 0], scl: [1, 0.85, 1] }) });
      if (hose) {
        P.add(new THREE.TorusGeometry(0.16, 0.018, 4, 10, Math.PI * 1.2), PAL.dark, { matrix: c({ pos: [x + 0.2, 0.42, 0.06], rot: [0, 0, -0.6] }) });
        P.add(new THREE.BoxGeometry(0.06, 0.12, 0.05), PAL.chrome, { matrix: c({ pos: [x + 0.31, 0.27, 0.1], rot: [0, 0, 0.4] }) });
      } else {
        P.add(new THREE.BoxGeometry(0.05, 0.14, 0.06), PAL.chrome, { matrix: c({ pos: [x + 0.19, 0.55, 0] }) });
        P.add(new THREE.TorusGeometry(0.12, 0.016, 4, 10, Math.PI), PAL.dark, { matrix: c({ pos: [x + 0.2, 0.42, 0], rot: [0, 0, Math.PI] }) });
      }
    };
    pump(-0.42, PAL.red, false);
    pump(0.4, PAL.teal, true);
    // oil cans stacked at the island end
    for (const [dx, dy] of [[-0.68, 0.24], [-0.6, 0.24], [-0.64, 0.33]]) P.add(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 7), '#3e6a9a', { matrix: c({ pos: [dx, dy, 0.02] }) });
    // a dog asleep in the warm light, curled at the foot of the island
    P.add(new THREE.IcosahedronGeometry(0.15, 0), '#b07a4a', { matrix: c({ pos: [0.05, 0.08, 0.42], scl: [1.35, 0.55, 0.9] }), jitter: 0.01 });
    P.add(new THREE.IcosahedronGeometry(0.075, 0), '#9a6a40', { matrix: c({ pos: [0.24, 0.1, 0.5] }) });
    P.add(new THREE.ConeGeometry(0.03, 0.06, 4), '#5a3a28', { matrix: c({ pos: [0.27, 0.17, 0.47], rot: [0, 0, -0.4] }) });
    P.add(new THREE.BoxGeometry(0.16, 0.03, 0.035), '#b07a4a', { matrix: c({ pos: [-0.12, 0.05, 0.55], ry: 0.5 }) });
    P.add(new THREE.CylinderGeometry(0.06, 0.05, 0.03, 8), PAL.chrome, { matrix: c({ pos: [-0.25, 0.05, 0.62] }) });
  }

  // Diner: stucco box with turquoise trim, wide glowing windows, a roof sign that flickers.
  const DX = 2.25, DZ = -1.75, DRY = RA - 0.08;
  const diner = frame([DX, G, DZ], DRY);
  {
    const W = 2.4, H = 1.05, D = 1.3;
    P.add(new THREE.BoxGeometry(W + 0.1, 0.1, D + 0.1), PAL.concrete, { matrix: diner({ pos: [0, 0.05, 0] }) });
    P.add(new THREE.BoxGeometry(W, H, D), PAL.stucco, { matrix: diner({ pos: [0, H / 2 + 0.05, 0] }), jitter: 0.01, shade: 0.04 });
    P.add(new THREE.BoxGeometry(W + 0.12, 0.12, D + 0.12), PAL.teal, { matrix: diner({ pos: [0, H + 0.1, 0] }) });
    P.add(new THREE.BoxGeometry(W + 0.02, 0.09, D + 0.02), PAL.teal, { matrix: diner({ pos: [0, 0.18, 0] }) });
    // front windows (lit) and mullions; the door at the right end
    E.add(new THREE.BoxGeometry(1.45, 0.42, 0.03), '#ffcf7a', { matrix: diner({ pos: [-0.35, 0.62, D / 2 + 0.005] }) });
    for (let k = 0; k <= 4; k++) P.add(new THREE.BoxGeometry(0.035, 0.46, 0.05), PAL.teal, { matrix: diner({ pos: [-1.07 + k * 0.36, 0.62, D / 2 + 0.01] }) });
    P.add(new THREE.BoxGeometry(1.5, 0.04, 0.05), PAL.teal, { matrix: diner({ pos: [-0.35, 0.85, D / 2 + 0.01] }) });
    P.add(new THREE.BoxGeometry(1.55, 0.05, 0.22), PAL.chrome, { matrix: diner({ pos: [-0.35, 0.38, D / 2 + 0.1] }) });
    E.add(new THREE.BoxGeometry(0.34, 0.62, 0.03), '#ffd890', { matrix: diner({ pos: [0.8, 0.43, D / 2 + 0.005] }) });
    P.add(new THREE.BoxGeometry(0.42, 0.06, 0.06), PAL.teal, { matrix: diner({ pos: [0.8, 0.76, D / 2 + 0.02] }) });
    // a figure in the window: the cook at the counter
    P.add(new THREE.BoxGeometry(0.14, 0.2, 0.05), PAL.cream, { matrix: diner({ pos: [-0.75, 0.55, D / 2 - 0.04] }) });
    P.add(new THREE.BoxGeometry(0.09, 0.09, 0.05), '#6a4a3a', { matrix: diner({ pos: [-0.75, 0.7, D / 2 - 0.04] }) });
    P.add(new THREE.BoxGeometry(0.11, 0.07, 0.05), PAL.cream, { matrix: diner({ pos: [-0.75, 0.77, D / 2 - 0.04] }) });
    // side window, AC unit, vent stack, ice chest out front
    E.add(new THREE.BoxGeometry(0.03, 0.3, 0.45), '#ffc870', { matrix: diner({ pos: [-W / 2 - 0.005, 0.65, 0.1] }) });
    P.add(new THREE.BoxGeometry(0.4, 0.22, 0.36), PAL.chrome, { matrix: diner({ pos: [0.6, H + 0.27, -0.25] }) });
    P.add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), PAL.dark, { matrix: diner({ pos: [-0.9, H + 0.35, -0.35] }) });
    P.add(new THREE.BoxGeometry(0.42, 0.34, 0.26), '#e8eef2', { matrix: diner({ pos: [1.32, 0.22, D / 2 + 0.05], ry: -0.15 }) });
    P.add(new THREE.BoxGeometry(0.44, 0.06, 0.28), '#3e6a9a', { matrix: diner({ pos: [1.32, 0.31, D / 2 + 0.05], ry: -0.15 }) });
    // roof sign frame
    for (const x of [-0.75, 0.75]) P.add(new THREE.BoxGeometry(0.05, 0.4, 0.05), PAL.dark, { matrix: diner({ pos: [x - 0.3, H + 0.35, 0.3] }) });
    P.add(new THREE.BoxGeometry(1.72, 0.48, 0.06), PAL.dark, { matrix: diner({ pos: [-0.3, H + 0.68, 0.3] }) });
  }

  // Pole sign by the road: the station's name on a tall post, lit from within.
  const SP = [-1.95, G, 0.85];
  {
    P.add(new THREE.CylinderGeometry(0.06, 0.08, 2.9, 6), PAL.dark, { pos: [SP[0], G + 1.45, SP[2]] });
    P.add(new THREE.BoxGeometry(0.3, 0.12, 0.3), PAL.concrete, { pos: [SP[0], G + 0.06, SP[2]] });
    const sm = frame([SP[0], G + 2.85, SP[2]], RA + 0.35);
    P.add(new THREE.BoxGeometry(1.5, 0.78, 0.12), PAL.red, { matrix: sm({ pos: [0, 0, 0] }) });
    P.add(new THREE.BoxGeometry(1.0, 0.24, 0.1), PAL.cream, { matrix: sm({ pos: [0.15, -0.55, 0] }) });
    // an arrow pointing down to the pumps
    P.add(new THREE.ConeGeometry(0.12, 0.3, 3), PAL.line, { matrix: sm({ pos: [0.82, -0.55, 0], rot: [0, 0, -Math.PI / 2] }) });
    // a vulture keeping watch on top
    P.add(new THREE.IcosahedronGeometry(0.12, 0), '#2e2630', { matrix: sm({ pos: [-0.5, 0.52, 0], scl: [0.8, 1.2, 1] }) });
    P.add(new THREE.IcosahedronGeometry(0.05, 0), '#c98a7a', { matrix: sm({ pos: [-0.5, 0.7, 0.05] }) });
    P.add(new THREE.ConeGeometry(0.02, 0.06, 4), '#e0c080', { matrix: sm({ pos: [-0.5, 0.69, 0.11], rot: [Math.PI / 2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.05, 0.06), '#2e2630', { matrix: sm({ pos: [-0.5, 0.48, -0.06], rot: [0, 0, 0.2] }) });
  }

  // Telephone poles along the far side of the road, wires sagging between them.
  {
    const pts = [[-3.7, roadZ(-3.7) + 1.05], [-0.35, roadZ(-0.35) + 1.1], [3.3, roadZ(3.3) + 1.0]];
    const tops = [];
    pts.forEach(([x, z], i) => {
      const h = 2.0 + (i === 1 ? 0.1 : -0.05 * i);
      const tilt = i === 2 ? 0.07 : (rand() - 0.5) * 0.04;
      P.add(new THREE.CylinderGeometry(0.04, 0.055, h, 6), PAL.wood, { pos: [x, G + h / 2, z], rot: [0, 0, tilt] });
      P.add(new THREE.BoxGeometry(0.5, 0.05, 0.05), PAL.wood, { pos: [x - tilt * h * 0.5, G + h - 0.15, z], ry: RA, rot: [0, RA, tilt] });
      tops.push(new THREE.Vector3(x - tilt * h * 0.5, G + h - 0.12, z));
    });
    for (let i = 0; i < tops.length - 1; i++) {
      for (const off of [-0.2, 0.2]) {
        const a = tops[i].clone(), b = tops[i + 1].clone();
        a.x += off; b.x += off;
        // a sagging wire: two straight halves dipping to a low middle
        const mid = a.clone().lerp(b, 0.5);
        mid.y -= 0.22;
        for (const [p, q] of [[a, mid], [mid, b]]) {
          const m = new THREE.Matrix4().compose(p.clone().lerp(q, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()), new THREE.Vector3(1, 1, 1));
          P.add(new THREE.CylinderGeometry(0.008, 0.008, p.distanceTo(q), 3), '#2a2228', { matrix: m });
        }
      }
    }
  }

  // Camper van, parked off the apron with its awning out, two chairs and a cooler.
  {
    const v = frame([-2.75, G, -0.75], 0.55);
    P.add(new THREE.BoxGeometry(0.82, 0.48, 1.75), '#4f9aa8', { matrix: v({ pos: [0, 0.4, 0] }), jitter: 0.008, shade: 0.03 });
    P.add(new THREE.BoxGeometry(0.84, 0.42, 1.7), PAL.cream, { matrix: v({ pos: [0, 0.85, -0.02] }), shade: 0.03 });
    P.add(new THREE.BoxGeometry(0.76, 0.1, 1.5), PAL.cream, { matrix: v({ pos: [0, 1.1, -0.1] }) });
    P.add(new THREE.BoxGeometry(0.6, 0.12, 0.7), '#d8c9a8', { matrix: v({ pos: [0, 1.2, -0.3] }) });
    // windscreen, side windows (one warm: someone reading inside)
    P.add(new THREE.BoxGeometry(0.7, 0.3, 0.03), '#3a3a52', { matrix: v({ pos: [0, 0.86, 0.87], rot: [-0.15, 0, 0] }) });
    for (const z of [0.35, -0.35]) P.add(new THREE.BoxGeometry(0.03, 0.22, 0.42), '#3a3a52', { matrix: v({ pos: [-0.425, 0.88, z] }) });
    E.add(new THREE.BoxGeometry(0.03, 0.2, 0.36), '#ffcf88', { matrix: v({ pos: [0.425, 0.88, -0.45] }) });
    P.add(new THREE.BoxGeometry(0.03, 0.22, 0.3), '#3a3a52', { matrix: v({ pos: [0.425, 0.88, 0.35] }) });
    P.add(new THREE.BoxGeometry(0.86, 0.06, 0.08), PAL.chrome, { matrix: v({ pos: [0, 0.2, 0.9] }) });
    for (const x of [-0.25, 0.25]) E.add(new THREE.BoxGeometry(0.1, 0.08, 0.03), '#fff3d0', { matrix: v({ pos: [x, 0.42, 0.885] }) });
    for (const z of [-0.6, 0.6]) for (const x of [-0.4, 0.4]) P.add(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 10), PAL.dark, { matrix: v({ pos: [x, 0.15, z], rot: [0, 0, Math.PI / 2] }) });
    P.add(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10), PAL.dark, { matrix: v({ pos: [0, 0.5, -0.9], rot: [Math.PI / 2, 0, 0] }) });
    // striped awning on the side away from the road
    for (let k = 0; k < 6; k++) P.add(new THREE.BoxGeometry(0.75, 0.02, 0.22), k % 2 ? PAL.cream : '#e8803a', { matrix: v({ pos: [0.78, 1.0, -0.62 + k * 0.22], rot: [0, 0, -0.2] }) });
    for (const z of [-0.65, 0.5]) P.add(new THREE.BoxGeometry(0.03, 0.9, 0.03), PAL.chrome, { matrix: v({ pos: [1.12, 0.45, z] }) });
    const chair = (x, z, ry, col) => {
      P.add(new THREE.BoxGeometry(0.2, 0.03, 0.2), col, { matrix: v({ pos: [x, 0.2, z], ry }) });
      P.add(new THREE.BoxGeometry(0.2, 0.22, 0.03), col, { matrix: v({ pos: [x - Math.sin(ry) * 0.1, 0.3, z - Math.cos(ry) * 0.1], ry, rot: [-0.25, ry, 0] }) });
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.02, 0.2, 0.02), PAL.chrome, { matrix: v({ pos: [x + s * 0.08, 0.1, z], ry }) });
    };
    chair(0.95, -0.2, 0.9, '#d2433a');
    chair(1.15, 0.3, 2.3, '#e8b040');
    P.add(new THREE.BoxGeometry(0.22, 0.16, 0.15), '#e8eef2', { matrix: v({ pos: [1.3, 0.08, -0.05], ry: 0.3 }) });
    P.add(new THREE.BoxGeometry(0.23, 0.04, 0.16), PAL.red, { matrix: v({ pos: [1.3, 0.17, -0.05], ry: 0.3 }) });
  }

  // An old mustard pickup nosed in by the diner, tailgate down, a spare tyre in the bed.
  {
    const v = frame([3.0, G, -0.1], 0.3);
    const Y = '#d9a83a';
    P.add(new THREE.BoxGeometry(0.62, 0.26, 1.35), Y, { matrix: v({ pos: [0, 0.32, 0] }), jitter: 0.008, shade: 0.03 });
    P.add(new THREE.BoxGeometry(0.58, 0.3, 0.5), Y, { matrix: v({ pos: [0, 0.6, 0.12] }), shade: 0.03 });
    P.add(new THREE.BoxGeometry(0.6, 0.04, 0.54), PAL.cream, { matrix: v({ pos: [0, 0.77, 0.12] }) });
    P.add(new THREE.BoxGeometry(0.5, 0.2, 0.03), '#3a3a52', { matrix: v({ pos: [0, 0.6, 0.38], rot: [-0.25, 0, 0] }) });
    for (const sx of [-1, 1]) P.add(new THREE.BoxGeometry(0.03, 0.16, 0.34), '#3a3a52', { matrix: v({ pos: [sx * 0.295, 0.62, 0.12] }) });
    P.add(new THREE.BoxGeometry(0.64, 0.08, 0.06), PAL.chrome, { matrix: v({ pos: [0, 0.24, 0.69] }) });
    for (const x of [-0.2, 0.2]) E.add(new THREE.BoxGeometry(0.1, 0.06, 0.02), '#fff3d0', { matrix: v({ pos: [x, 0.36, 0.68] }) });
    // bed: dark floor, tailgate down, spare tyre
    P.add(new THREE.BoxGeometry(0.52, 0.02, 0.6), '#5a4030', { matrix: v({ pos: [0, 0.46, -0.36] }) });
    P.add(new THREE.BoxGeometry(0.6, 0.03, 0.22), Y, { matrix: v({ pos: [0, 0.36, -0.78] }) });
    P.add(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), PAL.dark, { matrix: v({ pos: [0.05, 0.52, -0.4] }) });
    for (const z of [-0.42, 0.42]) for (const x of [-0.3, 0.3]) P.add(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), PAL.dark, { matrix: v({ pos: [x, 0.13, z], rot: [0, 0, Math.PI / 2] }) });
  }

  // Mesas on the horizon: flat-topped buttes in sandstone bands.
  {
    const mesa = (x, z, rx, rz, h, ry, layers = 4) => {
      const o = outline(rand, { n: 11, rx, rz, wob: 0.18, sq: 2.2 });
      const cols = [PAL.rockDark, PAL.rock, PAL.rock2, '#c06a44', PAL.rockTop];
      for (let k = 0; k < layers; k++) {
        const y0 = G - 0.1 + (h * k) / layers, y1 = G - 0.1 + (h * (k + 1)) / layers;
        const sh = 1 - k * 0.08;
        const g = slab(THREE, offsetOutline(o, -k * 0.1), y0, y1);
        P.add(g, cols[k % cols.length], { pos: [x, 0, z], ry, scl: [sh, 1, sh], jitter: 0.06, jitterY: 0.04, shade: 0.1 });
      }
      P.add(slab(THREE, offsetOutline(o, -layers * 0.1 + 0.05), G - 0.1 + h, G - 0.05 + h), PAL.rockTop, { pos: [x, 0, z], ry, scl: [1 - layers * 0.08 + 0.04, 1, 1 - layers * 0.08 + 0.04], jitter: 0.05, shade: 0.06 });
      // talus at the foot
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2;
        P.add(new THREE.IcosahedronGeometry(0.25 + rand() * 0.3, 0), PAL.rock, { pos: [x + Math.cos(a) * rx * 0.95, G, z + Math.sin(a) * rz * 0.95], scl: [1, 0.6, 1], jitter: 0.05 });
      }
    };
    mesa(-1.75, -3.35, 1.85, 0.85, 3.2, 0.1, 5);
    mesa(1.55, -3.75, 0.9, 0.55, 2.0, 0.6, 3);
    // a slim spire
    P.add(new THREE.CylinderGeometry(0.22, 0.42, 2.6, 7, 3), PAL.rock, { pos: [0.35, G + 1.2, -3.85], jitter: 0.06, shade: 0.1, top: PAL.rockTop, y0: G + 1, y1: G + 2.5 });
    P.add(new THREE.BoxGeometry(0.55, 0.12, 0.45), PAL.rockTop, { pos: [0.35, G + 2.52, -3.85], ry: 0.4, jitter: 0.03 });
    mesa(3.75, -2.35, 0.65, 0.5, 1.15, 1.2, 2);
  }

  // Windpump and stock tank behind the van.
  const WP = [-3.25, G, -2.05];
  const wheel = new THREE.Group();
  {
    const h = 2.7;
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      P.add(new THREE.BoxGeometry(0.045, h + 0.05, 0.045), PAL.chrome, { pos: [WP[0] + dx * 0.55, G + h / 2, WP[2] + dz * 0.55], rot: [dz * 0.4, 0, -dx * 0.4] });
    }
    for (let k = 0; k < 4; k++) {
      const y = 0.35 + k * 0.6, s = 0.33 - k * 0.055;
      for (const sd of [-1, 1]) {
        P.add(new THREE.BoxGeometry(s * 2, 0.025, 0.025), PAL.chrome, { pos: [WP[0], G + y, WP[2] + sd * s] });
        P.add(new THREE.BoxGeometry(0.025, 0.025, s * 2), PAL.chrome, { pos: [WP[0] + sd * s, G + y, WP[2]] });
      }
    }
    P.add(new THREE.BoxGeometry(0.16, 0.12, 0.16), PAL.dark, { pos: [WP[0], G + h + 0.04, WP[2]] });
    // tail vane points away from the wheel
    P.add(new THREE.BoxGeometry(0.03, 0.03, 0.9), PAL.dark, { pos: [WP[0] - 0.25, G + h + 0.05, WP[2] - 0.4], ry: 0.55 });
    P.add(new THREE.BoxGeometry(0.03, 0.32, 0.45), PAL.cream, { pos: [WP[0] - 0.42, G + h + 0.05, WP[2] - 0.68], ry: 0.55 });
    const W = new Painter(THREE, 321);
    W.add(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), PAL.dark, { rot: [Math.PI / 2, 0, 0] });
    const NB = 16;
    for (let b = 0; b < NB; b++) {
      const a = (b / NB) * Math.PI * 2;
      W.add(new THREE.BoxGeometry(0.13, 0.42, 0.012), b % 4 ? PAL.chrome : PAL.red, { matrix: compose(THREE, { pos: [Math.sin(a) * 0.36, Math.cos(a) * 0.36, 0], rot: [0, 0.5, -a] }) });
    }
    W.add(new THREE.TorusGeometry(0.56, 0.015, 3, 16), PAL.chrome, {});
    wheel.add(W.mesh(lambert(THREE, { side: THREE.DoubleSide })));
    wheel.position.set(WP[0] + 0.17, G + h + 0.05, WP[2] + 0.25);
    wheel.rotation.y = 0.55;
    root.add(wheel);
    // stock tank
    P.add(new THREE.CylinderGeometry(0.55, 0.55, 0.32, 14, 1, true), '#a8a8b0', { pos: [WP[0] + 0.55, G + 0.16, WP[2] + 0.75] });
    P.add(new THREE.CylinderGeometry(0.52, 0.52, 0.02, 14), '#5a7a9a', { pos: [WP[0] + 0.55, G + 0.26, WP[2] + 0.75] });
    P.add(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), PAL.dark, { pos: [WP[0] + 0.25, G + 0.4, WP[2] + 0.4], rot: [0.6, 0, -0.6] });
  }

  // Saguaros and scrub: clustered on the left flank and the far right, none on the road.
  {
    const sag = (x, z, h, arms, ry) => {
      const m = frame([x, G, z], ry);
      P.add(new THREE.CylinderGeometry(0.13, 0.15, h, 8), PAL.cactus, { matrix: m({ pos: [0, h / 2, 0] }), shade: 0.08, top: PAL.cactus2, y0: 0, y1: h });
      P.add(new THREE.SphereGeometry(0.13, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), PAL.cactus2, { matrix: m({ pos: [0, h, 0] }) });
      for (const [side, y, len, up] of arms) {
        P.add(new THREE.CylinderGeometry(0.08, 0.08, len, 7), PAL.cactus, { matrix: m({ pos: [side * (len / 2 + 0.08), y, 0], rot: [0, 0, Math.PI / 2] }) });
        P.add(new THREE.CylinderGeometry(0.085, 0.09, up, 7), PAL.cactus, { matrix: m({ pos: [side * (len + 0.08), y + up / 2, 0] }), top: PAL.cactus2, y0: y, y1: y + up });
        P.add(new THREE.SphereGeometry(0.085, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), PAL.cactus2, { matrix: m({ pos: [side * (len + 0.08), y + up, 0] }) });
      }
    };
    sag(-3.35, 3.05, 1.9, [[1, 0.9, 0.22, 0.6], [-1, 1.2, 0.18, 0.45]], 0.3);
    sag(-4.0, 2.2, 1.25, [[1, 0.6, 0.15, 0.35]], 1.4);
    sag(-2.6, 3.45, 0.7, [], 0);
    sag(3.75, 0.25, 2.25, [[-1, 1.05, 0.2, 0.65], [1, 1.45, 0.2, 0.4], [1, 0.75, 0.16, 0.3]], -0.4);
    sag(4.05, -0.85, 1.05, [[-1, 0.55, 0.14, 0.3]], 0.8);
    sag(-1.3, -2.35, 1.5, [[1, 0.75, 0.2, 0.5]], 2.0);
    sag(1.6, 3.6, 1.15, [[-1, 0.6, 0.15, 0.35]], 0.6);
    // barrel cacti, prickly pear pads, brush, stones
    for (const [x, z] of [[-3.0, 2.55], [3.35, 0.85], [-0.5, 3.3], [2.5, -0.6], [-3.6, 0.5]]) {
      P.add(new THREE.SphereGeometry(0.12, 7, 4), '#6a8a4a', { pos: [x, G + 0.06, z], scl: [1, 1.1, 1], jitter: 0.01 });
      P.add(new THREE.IcosahedronGeometry(0.035, 0), '#f0607a', { pos: [x, G + 0.19, z] });
    }
    for (const [x, z, r] of [[2.8, 3.4, 0.3], [-1.45, 3.65, 0.9]]) {
      for (let k = 0; k < 4; k++) P.add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 7), '#7a9a52', { pos: [x + (k % 2) * 0.1 - 0.05, G + 0.1 + k * 0.08, z], rot: [Math.PI / 2, r + k * 0.6, k * 0.4], scl: [1, 1, 1.4] });
    }
    for (let i = 0; i < 16; i++) {
      const x = -4.3 + rand() * 8.6, z = -3.0 + rand() * 6.8;
      if (Math.abs(z - roadZ(x)) < 1.15) continue;
      if (x > -1.9 && x < 3.6 && z > -2.6 && z < 1.0) continue;
      if (Math.pow(Math.abs(x) / 4.5, 2.7) + Math.pow(Math.abs(z) / 4.2, 2.7) > 1) continue;
      P.add(new THREE.IcosahedronGeometry(0.1 + rand() * 0.1, 0), rand() > 0.5 ? PAL.brush : '#8a7a50', { pos: [x, G + 0.06, z], scl: [1.2, 0.7, 1.2], jitter: 0.02 });
    }
    for (let i = 0; i < 8; i++) {
      const a = rand() * 6.28, d = 3.2 + rand() * 0.9;
      const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9;
      if (Math.abs(z - roadZ(x)) < 1.1) continue;
      P.add(new THREE.IcosahedronGeometry(0.12 + rand() * 0.15, 0), PAL.rock, { pos: [x, G + 0.03, z], scl: [1, 0.6, 0.9], ry: rand() * 3, jitter: 0.03 });
    }
  }

  // Road sign on the near verge: the bad news for anyone heading on.
  let roadSign;
  {
    const x = 2.6, z = roadZ(2.6) + 0.95;
    for (const dx of [-0.25, 0.25]) P.add(new THREE.BoxGeometry(0.04, 0.85, 0.04), PAL.chrome, { pos: [x + dx, G + 0.42, z] });
    const tex = canvasSign(THREE, 256, 128, (g, w, h) => {
      g.fillStyle = '#2f6a4a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f2efe6'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#f2efe6'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 40px sans-serif'; g.fillText('NEXT GAS', w / 2, 44);
      g.font = 'bold 44px sans-serif'; g.fillText('112 MI', w / 2, 92);
    });
    roadSign = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), new THREE.MeshLambertMaterial({ map: tex, emissive: '#1a1418' }));
    roadSign.rotation.y = -0.5;
    roadSign.position.set(x + Math.sin(-0.5) * 0.02, G + 0.82, z + Math.cos(-0.5) * 0.02);
    root.add(roadSign);
    P.add(new THREE.BoxGeometry(0.74, 0.38, 0.03), PAL.chrome, { pos: [x, G + 0.82, z], ry: -0.5 });
  }

  root.add(P.mesh(mat));
  root.add(E.mesh(unlit(THREE), { cast: false, receive: false }));

  // Neon signs: canvas text on unlit planes, glow from halos.
  const signMats = [];
  {
    const tex = canvasSign(THREE, 512, 256, (g, w, h) => {
      g.fillStyle = '#c8313a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffe2a0'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#fff4d8'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#ffd27a'; g.shadowBlur = 18;
      g.font = 'bold 92px Georgia, serif'; g.fillText('LAST GAS', w / 2, h / 2 + 6);
    });
    const m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.7), m);
    const sm = compose(THREE, { pos: [SP[0], G + 2.85, SP[2]], ry: RA + 0.35 });
    s.applyMatrix4(sm);
    s.translateZ(0.065);
    root.add(s);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.7), m);
    s2.applyMatrix4(sm);
    s2.translateZ(-0.065);
    s2.rotateY(Math.PI);
    root.add(s2);
    const t2 = canvasSign(THREE, 256, 64, (g, w, h) => {
      g.fillStyle = '#f5ead2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2c2530'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 40px sans-serif'; g.fillText('OPEN  EAT', w / 2, h / 2 + 2);
    });
    const m2 = new THREE.MeshLambertMaterial({ map: t2, emissive: '#5a4a3a' });
    const s3 = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.22), m2);
    s3.applyMatrix4(sm);
    s3.translateY(-0.55); s3.translateX(0.15); s3.translateZ(0.055);
    root.add(s3);
    // diner roof sign: "DINER" in pink neon; it flickers now and then
    const t3 = canvasSign(THREE, 512, 128, (g, w, h) => {
      g.fillStyle = '#2c2530'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff6a8a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#ffd0dc'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#ff5a7a'; g.shadowBlur = 20;
      g.font = 'bold 84px sans-serif'; g.fillText('D I N E R', w / 2, h / 2 + 4);
    });
    const m3 = new THREE.MeshBasicMaterial({ map: t3 });
    signMats.push(m3);
    const s4 = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 0.42), m3);
    s4.applyMatrix4(diner({ pos: [-0.3, 1.05 + 0.68, 0.335] }));
    root.add(s4);
  }
  const dSign = new THREE.Vector3(-0.3, 1.73, 0.5).applyMatrix4(diner({}));
  const halo1 = halos(THREE, [[SP[0], G + 2.85, SP[2]]], { color: '#ff8a5a', size: 3.2, opacity: 0.55 });
  const halo2 = halos(THREE, [[dSign.x, dSign.y, dSign.z]], { color: '#ff5a8a', size: 2.6, opacity: 0.6 });
  const pumpGlobes = [-0.42, 0.4].map((x) => new THREE.Vector3(x, 1.25, 0).applyMatrix4(compose(THREE, { pos: [CX, G, CZ], ry: RA })));
  const halo3 = halos(THREE, [...pumpGlobes.map((v) => v.toArray()), [CX, G + CY - 0.1, CZ]], { color: '#ffc070', size: 1.1, opacity: 0.8 });
  root.add(halo1, halo2, halo3);

  // Light: low sun just set behind the mesas (pink-orange rim), violet sky fill, sodium under the canopy.
  root.add(new THREE.HemisphereLight('#9a86c8', '#c47a58', 1.55));
  const key = keyLight(THREE, ctx, { color: '#ff9c72', intensity: 2.1, pos: [7.5, 3.6, -6], extent: 7 });
  root.add(key, key.target);
  const canopyLight = new THREE.PointLight(PAL.sodium, 7, 6.5, 1.5);
  canopyLight.position.set(CX, G + CY - 0.3, CZ);
  root.add(canopyLight);
  const dinerLight = new THREE.PointLight('#ffc070', 4, 4.5, 1.6);
  dinerLight.position.copy(new THREE.Vector3(-0.3, 0.7, 1.2).applyMatrix4(diner({})));
  root.add(dinerLight);
  if (!low) {
    const signLight = new THREE.PointLight('#ff7a5a', 2.5, 4, 1.8);
    signLight.position.set(SP[0], G + 2.3, SP[2] + 0.4);
    root.add(signLight);
  }
  root.add(skyDome(THREE, { top: '#2f2a68', mid: '#ff9a72', bottom: '#7a4660', sun: [0.62, 0.04, -0.78], sunColor: '#ffb070', sunPow: 7, horizon: 0.42, stars: 0.6 }));

  // Tumbleweed (animated): drifts along the road verge and rolls.
  const tw = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), new THREE.MeshLambertMaterial({ color: '#a8875a', wireframe: false, flatShading: true }));
  root.add(tw);

  function update(t) {
    wheel.children[0].rotation.z = -t * 1.1;
    // the diner sign stutters for a moment every few seconds
    const f = (t * 0.37) % 1;
    const on = f > 0.9 && (Math.floor(t * 14) % 3 === 0) ? 0.35 : 1;
    signMats[0].color.setScalar(on);
    halo2.material.opacity = 0.6 * on;
    const k = ((t * 0.035) % 1);
    const x = -4.2 + k * 8.4;
    tw.position.set(x, G + 0.18 + Math.abs(Math.sin(t * 2.2)) * 0.06, roadZ(x) - 0.95);
    tw.rotation.set(0, 0, -x / 0.18);
    tw.visible = k < 0.97;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#e08a78'),
    fog: new THREE.Fog('#c9788a', 22, 58),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
