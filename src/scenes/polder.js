// Polder Mill: a golden spring evening in a reclaimed polder. Smock mill, canal with a white lift bridge,
// striped tulip fields, a stepped-gable farmhouse, a cyclist with a crate of tulips, a heron fishing.
import { Painter, compose, lambert, outline, offsetOutline, slab, gable, roof, skyDome, keyLight, disposeTree, rng } from './kit.js';

const PAL = {
  grass: '#86b456',
  grass2: '#9cc464',
  dyke: '#79a84c',
  soil: '#6e4c34',
  peat: '#4a3830',
  clay: '#8d8579',
  board: '#5a4030',
  water: '#4a8a9c',
  waterHi: '#9fcbd2',
  brick: '#a5493a',
  brickDark: '#7e3a30',
  white: '#f4f1e8',
  black: '#262a2e',
  green: '#2f5a44',
  thatch: '#6f6a55',
  wood: '#7a5a40',
  roofTile: '#3e3a3c',
  leaf: '#9fc055',
  leafHi: '#cfe07a',
  poplar: '#5f8a3e',
  cloth: '#f7ecd4',
  lattice: '#d8cdb8',
  klinker: '#a65a48',
  gravel: '#cdbb94',
};

export function build(THREE, ctx) {
  const low = ctx.quality === 'low';
  const rand = rng(5150);
  const root = new THREE.Group();
  const P = new Painter(THREE, 151);
  const mat = lambert(THREE);
  const G = 0.3; // field level
  const frame = (pos, ry = 0) => {
    const m = compose(THREE, { pos, ry });
    return (o) => m.clone().multiply(compose(THREE, o));
  };

  // Plinth: a squared-off polder bed. Board, peat, blue clay, topsoil, grass.
  const rim = outline(rand, { n: 32, rx: 4.8, rz: 4.5, wob: 0.015, sq: 4 });
  P.add(slab(THREE, offsetOutline(rim, 0.28), -1.45, -1.15, 0.06), PAL.board, { shade: 0.06 });
  P.add(slab(THREE, rim, -1.15, -0.65), PAL.peat, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.65, -0.15), PAL.clay, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, rim, -0.15, 0.16), PAL.soil, { jitter: 0.04, shade: 0.1 });
  P.add(slab(THREE, offsetOutline(rim, 0.03), 0.16, G, 0.04), PAL.grass, { jitter: 0.025, jitterY: 0.01, shade: 0.05 });
  const zEdge = (x) => 4.5 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 4.8, 4)), 0.25);
  const xEdge = (z) => 4.8 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / 4.5, 4)), 0.25);

  // Canal: dark water between two grassy dykes, running the full width of the bed.
  const ZC = -0.55, HW = 0.5;
  {
    const xe = xEdge(ZC) - 0.02;
    P.add(new THREE.BoxGeometry(xe * 2, 0.08, HW * 2, 12, 1, 2), PAL.water, { pos: [0, G - 0.0, ZC], jitter: 0.02, jitterY: 0, shade: 0.04 });
    // glints on the water
    for (let i = 0; i < 9; i++) {
      const x = -3.8 + rand() * 7.4, z = ZC + (rand() - 0.5) * HW * 1.4;
      P.add(new THREE.BoxGeometry(0.4 + rand() * 0.6, 0.01, 0.03), PAL.waterHi, { pos: [x, G + 0.045, z], ry: (rand() - 0.5) * 0.1 });
    }
    for (const s of [-1, 1]) {
      const z = ZC + s * (HW + 0.16);
      P.add(new THREE.BoxGeometry(xe * 2 + 0.02, 0.15, 0.36, 14, 1, 1), PAL.dyke, { pos: [0, G + 0.03, z], jitter: 0.03, jitterY: 0.02, shade: 0.06, top: PAL.grass2, y0: G, y1: G + 0.1 });
      // reed tufts along the banks
      for (let i = 0; i < 11; i++) {
        const x = -4.2 + rand() * 8.4;
        if (Math.abs(x - 1.0) < 0.6) continue;
        P.add(new THREE.ConeGeometry(0.05, 0.3 + rand() * 0.2, 4), '#7c9a48', { pos: [x, G + 0.2, ZC + s * (HW - 0.02)], rot: [(rand() - 0.5) * 0.4, rand(), (rand() - 0.5) * 0.4], top: '#c8c27a', y0: G + 0.15, y1: G + 0.4 });
      }
    }
    // lily pads in the still corner by the mill
    for (let i = 0; i < 6; i++) {
      P.add(new THREE.CylinderGeometry(0.08 + rand() * 0.04, 0.08, 0.015, 7, 1, false, 0.4, 5.6), '#5f9a46', { pos: [-3.3 + rand() * 0.9, G + 0.045, ZC - 0.1 + (rand() - 0.5) * 0.6], ry: rand() * 6 });
    }
  }

  // Lift bridge: a white drawbridge with a balance frame, from the farm lane to the brick road.
  const BX = 1.0;
  {
    const deckY = G + 0.24;
    const z0 = ZC - HW - 0.38, z1 = ZC + HW + 0.38;
    const len = z1 - z0;
    P.add(new THREE.BoxGeometry(0.62, 0.07, len), PAL.wood, { pos: [BX, deckY, (z0 + z1) / 2], shade: 0.04 });
    for (let k = 0; k < 9; k++) P.add(new THREE.BoxGeometry(0.66, 0.02, 0.05), '#5e4632', { pos: [BX, deckY + 0.04, z0 + 0.1 + k * (len - 0.2) / 8] });
    for (const sx of [-1, 1]) {
      // railings
      P.add(new THREE.BoxGeometry(0.035, 0.035, len), PAL.white, { pos: [BX + sx * 0.3, deckY + 0.32, (z0 + z1) / 2] });
      for (let k = 0; k < 5; k++) P.add(new THREE.BoxGeometry(0.03, 0.3, 0.03), PAL.white, { pos: [BX + sx * 0.3, deckY + 0.17, z0 + 0.1 + k * (len - 0.2) / 4] });
      // abutments
      for (const z of [z0 + 0.12, z1 - 0.12]) P.add(new THREE.BoxGeometry(0.1, 0.3, 0.25), PAL.brickDark, { pos: [BX + sx * 0.36, G + 0.07, z], jitter: 0.01 });
      // portal posts on the north bank
      P.add(new THREE.BoxGeometry(0.1, 1.35, 0.1), PAL.white, { pos: [BX + sx * 0.36, deckY + 0.66, z0 + 0.12] });
      P.add(new THREE.BoxGeometry(0.11, 0.12, 0.11), PAL.black, { pos: [BX + sx * 0.36, deckY + 0.06, z0 + 0.12] });
      // balance beams (bridge down: beams level, chains down to the deck end)
      P.add(new THREE.BoxGeometry(0.07, 0.09, 2.3), PAL.white, { pos: [BX + sx * 0.33, deckY + 1.38, z0 + 0.35], rot: [0.04, 0, 0] });
      P.add(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4), PAL.black, { pos: [BX + sx * 0.33, deckY + 0.82, z0 + 1.42], rot: [0.08, 0, 0] });
      P.add(new THREE.BoxGeometry(0.06, 0.06, 0.2), PAL.black, { pos: [BX + sx * 0.33, deckY + 1.4, z0 + 1.48] });
    }
    P.add(new THREE.BoxGeometry(0.85, 0.1, 0.12), PAL.white, { pos: [BX, deckY + 1.32, z0 + 0.12] });
    // cross braces of the balance frame and the counterweight at the back
    P.add(new THREE.BoxGeometry(0.66, 0.06, 0.06), PAL.white, { pos: [BX, deckY + 1.38, z0 + 1.45] });
    P.add(new THREE.BoxGeometry(0.66, 0.06, 0.06), PAL.white, { pos: [BX, deckY + 1.38, z0 + 0.7] });
    P.add(new THREE.BoxGeometry(0.75, 0.2, 0.3), PAL.black, { pos: [BX, deckY + 1.3, z0 - 0.7] });
    // red-white warning band on the portal
    for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(0.16, 0.08, 0.13), k % 2 ? PAL.white : '#c8323a', { pos: [BX - 0.24 + k * 0.16, deckY + 1.2, z0 + 0.12] });
  }

  // Lanes: brick road from the bridge to the front edge; gravel path up to the farmhouse.
  {
    const pts = [[BX, ZC + HW + 0.4], [1.12, 1.6], [1.45, 2.9], [1.6, zEdge(1.6) + 0.05]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const l = Math.hypot(bx - ax, bz - az);
      const ry = Math.atan2(bx - ax, bz - az);
      P.add(new THREE.BoxGeometry(0.6, 0.05, l + 0.1, 1, 1, 4), PAL.klinker, { pos: [(ax + bx) / 2, G + 0.01, (az + bz) / 2], ry, jitter: 0.015, jitterY: 0.005, shade: 0.08 });
      P.add(new THREE.BoxGeometry(0.66, 0.03, l + 0.1), '#8c7a64', { pos: [(ax + bx) / 2, G - 0.005, (az + bz) / 2], ry });
    }
    const gp = [[BX, ZC - HW - 0.4], [1.25, -1.9], [1.75, -2.25]];
    for (let i = 0; i < gp.length - 1; i++) {
      const [ax, az] = gp[i], [bx, bz] = gp[i + 1];
      const l = Math.hypot(bx - ax, bz - az);
      P.add(new THREE.BoxGeometry(0.42, 0.03, l + 0.15), PAL.gravel, { pos: [(ax + bx) / 2, G + 0.005, (az + bz) / 2], ry: Math.atan2(bx - ax, bz - az), jitter: 0.02, jitterY: 0.004 });
    }
  }

  // Tulip fields: stripes running from the south dyke to the front edge, on a ridged soil bed.
  const heads = [];
  {
    const cols = ['#e0283a', '#f7c91c', '#c41c3c', '#f6f2e6', '#f2b51a', '#e8562a', '#e0283a', '#f3a6b8'];
    const x0 = -4.35, pitch = 0.6, w = 0.47;
    const zs = ZC + HW + 0.4;
    for (let i = 0; i < cols.length; i++) {
      const x = x0 + i * pitch + w / 2 + (rand() - 0.5) * 0.04;
      const ze = Math.min(zEdge(x - w / 2), zEdge(x + w / 2)) - 0.22 - rand() * 0.18;
      const len = ze - zs;
      const zc = (zs + ze) / 2;
      const ry = (rand() - 0.5) * 0.02;
      P.add(new THREE.BoxGeometry(w + 0.12, 0.05, len + 0.1), PAL.soil, { pos: [x, G, zc], ry, jitter: 0.02, jitterY: 0.01 });
      // stripe 5 has been topped near the canal: green leaves only on the first stretch
      const topped = i === 5 ? 0.45 : 0;
      const bloomZ0 = zs + len * topped;
      if (topped) P.add(new THREE.BoxGeometry(w, 0.1, len * topped, 2, 1, 4), '#5c8c38', { pos: [x, G + 0.06, zs + (len * topped) / 2], ry, jitter: 0.02, jitterY: 0.015, shade: 0.06 });
      const bl = ze - bloomZ0;
      P.add(new THREE.BoxGeometry(w, 0.13, bl, 2, 1, 8), '#5c8c38', { pos: [x, G + 0.075, (bloomZ0 + ze) / 2], ry, jitter: 0.02, jitterY: 0.015, shade: 0.06, top: cols[i], y0: G + 0.07, y1: G + 0.13 });
      const step = low ? 0.2 : 0.12;
      for (let z = bloomZ0 + 0.06; z < ze - 0.04; z += step) {
        for (let r = 0; r < 3; r++) {
          heads.push({ x: x + (r - 1) * 0.14 + (rand() - 0.5) * 0.06, z: z + (rand() - 0.5) * 0.06, c: cols[i] });
        }
      }
    }
    // a heap of cut heads at the end of the topped stretch, and the wheelbarrow that carried them
    const hx = x0 + 5 * pitch + w / 2, hz = zs + (zEdge(hx) - 0.3 - zs) * 0.45;
    P.add(new THREE.IcosahedronGeometry(0.16, 0), '#e8562a', { pos: [hx + 0.42, G + 0.05, hz - 0.1], scl: [1.2, 0.5, 1], jitter: 0.03 });
    const wb = frame([hx + 0.38, G, hz + 0.35], 0.5);
    P.add(new THREE.BoxGeometry(0.26, 0.14, 0.38), '#4f7a9a', { matrix: wb({ pos: [0, 0.2, 0], rot: [0.12, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.22, 0.06, 0.34), '#e8562a', { matrix: wb({ pos: [0, 0.27, 0], rot: [0.12, 0, 0] }), jitter: 0.02 });
    P.add(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8), PAL.black, { matrix: wb({ pos: [0, 0.07, 0.26], rot: [0, 0, Math.PI / 2] }) });
    for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.025, 0.025, 0.42), PAL.wood, { matrix: wb({ pos: [s * 0.1, 0.18, -0.3], rot: [-0.35, 0, 0] }) });
  }

  // Windmill (hero): brick base, gallery stage, thatched smock, green cap, tail pole.
  const MX = -2.15, MZ = -2.55;
  const SAIL_RY = 0.62; // the cap faces the wind, toward the front-right
  const capY = G + 4.15;
  {
    const m = frame([MX, G, MZ], 0.2);
    P.add(new THREE.CylinderGeometry(0.98, 1.05, 1.0, 8), PAL.brick, { matrix: m({ pos: [0, 0.5, 0] }), jitter: 0.015, shade: 0.06 });
    for (let k = 0; k < 3; k++) P.add(new THREE.CylinderGeometry(1.0, 1.0, 0.025, 8), PAL.brickDark, { matrix: m({ pos: [0, 0.25 + k * 0.28, 0] }) });
    P.add(new THREE.BoxGeometry(0.34, 0.55, 0.06), PAL.green, { matrix: m({ pos: [0, 0.28, 0.98], ry: 0 }) });
    P.add(new THREE.BoxGeometry(0.42, 0.06, 0.08), PAL.white, { matrix: m({ pos: [0, 0.58, 0.99] }) });
    // stage
    P.add(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 8), PAL.wood, { matrix: m({ pos: [0, 1.04, 0], ry: Math.PI / 8 }), shade: 0.05 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      P.add(new THREE.BoxGeometry(0.035, 0.32, 0.035), PAL.white, { matrix: m({ pos: [Math.cos(a) * 1.42, 1.22, Math.sin(a) * 1.42] }) });
    }
    P.add(new THREE.TorusGeometry(1.42, 0.022, 3, 16), PAL.white, { matrix: m({ pos: [0, 1.37, 0], rot: [Math.PI / 2, 0, 0] }) });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      P.add(new THREE.BoxGeometry(0.05, 0.05, 0.75), PAL.wood, { matrix: m({ pos: [Math.cos(a) * 1.15, 0.85, Math.sin(a) * 1.15], ry: -a + Math.PI / 2, rot: [0.6, -a + Math.PI / 2, 0] }) });
    }
    // smock body
    P.add(new THREE.CylinderGeometry(0.5, 0.86, 2.95, 8, 3), PAL.thatch, { matrix: m({ pos: [0, 1.0 + 2.95 / 2, 0] }), jitter: 0.02, shade: 0.07, top: '#8a8466', y0: G + 1.2, y1: G + 3.9 });
    for (const [y, a, s] of [[1.75, 0.3, 0.8], [2.7, 2.2, 0.66], [2.2, 4.1, 0.73]]) {
      P.add(new THREE.BoxGeometry(0.16, 0.22, 0.06), PAL.white, { matrix: m({ pos: [Math.cos(a) * s, y, Math.sin(a) * s], ry: -a + Math.PI / 2 }) });
      P.add(new THREE.BoxGeometry(0.11, 0.16, 0.07), '#33414a', { matrix: m({ pos: [Math.cos(a) * s, y, Math.sin(a) * s], ry: -a + Math.PI / 2 }) });
    }
  }
  {
    // cap, turned toward the sails
    const c = frame([MX, capY, MZ], SAIL_RY);
    P.add(new THREE.CylinderGeometry(0.56, 0.56, 0.1, 8), PAL.white, { matrix: c({ pos: [0, -0.18, 0] }) });
    P.add(new THREE.CylinderGeometry(0.52, 0.52, 1.25, 10, 1, false, 0, Math.PI), PAL.green, { matrix: c({ pos: [0, -0.12, 0.0], rot: [Math.PI / 2, 0, Math.PI / 2], scl: [1, 1, 0.9] }), shade: 0.04 });
    P.add(new THREE.BoxGeometry(1.05, 0.06, 1.3), PAL.white, { matrix: c({ pos: [0, -0.13, 0] }) });
    P.add(new THREE.BoxGeometry(0.18, 0.2, 0.3), PAL.green, { matrix: c({ pos: [0, 0.1, 0.62] }) });
    // tail pole down to the stage, two struts, and the winding wheel at the gallery
    P.add(new THREE.BoxGeometry(0.08, 0.08, 3.1), PAL.wood, { matrix: c({ pos: [0, -1.52, -0.98], rot: [-1.186, 0, 0] }) });
    for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.04, 0.04, 1.45), PAL.wood, { matrix: c({ pos: [s * 0.16, -0.85, -0.72], rot: [-0.95, s * 0.2, 0] }) });
    P.add(new THREE.TorusGeometry(0.22, 0.025, 3, 10), PAL.wood, { matrix: c({ pos: [0, -2.75, -1.5], rot: [0, Math.PI / 2, 0] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.4, 0.04), PAL.wood, { matrix: c({ pos: [0, -2.75, -1.5] }) });
  }
  // Sails (animated): a separate group turning on the tilted wind shaft.
  const sails = new THREE.Group();
  const sailsHub = new THREE.Group();
  {
    const S = new Painter(THREE, 161);
    S.add(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 8), PAL.black, { rot: [Math.PI / 2, 0, 0] });
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + 0.05;
      const bm = compose(THREE, { rot: [0, 0, a] });
      const at = (o) => bm.clone().multiply(compose(THREE, o));
      S.add(new THREE.BoxGeometry(0.07, 2.45, 0.07), '#4a3a30', { matrix: at({ pos: [0, 1.25, 0.06] }) });
      // lattice on the trailing side of the whip
      S.add(new THREE.BoxGeometry(0.025, 2.0, 0.025), PAL.lattice, { matrix: at({ pos: [0.46, 1.42, 0.06] }) });
      for (let k = 0; k < 10; k++) S.add(new THREE.BoxGeometry(0.5, 0.02, 0.02), PAL.lattice, { matrix: at({ pos: [0.24, 0.48 + k * 0.205, 0.06] }) });
      // cloth set on two opposite sails, furled on the others
      if (b % 2 === 0) S.add(new THREE.BoxGeometry(0.42, 1.85, 0.012), PAL.cloth, { matrix: at({ pos: [0.24, 1.43, 0.08] }), shade: 0.03 });
      else S.add(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 5), PAL.cloth, { matrix: at({ pos: [0.06, 1.4, 0.12] }) });
    }
    sailsHub.add(S.mesh(lambert(THREE, { side: THREE.DoubleSide })));
    sails.add(sailsHub);
    const d = new THREE.Vector3(Math.sin(SAIL_RY), 0, Math.cos(SAIL_RY));
    sails.position.set(MX + d.x * 0.85, capY + 0.02, MZ + d.z * 0.85);
    sails.rotation.set(-0.12, SAIL_RY, 0, 'YXZ');
    root.add(sails);
  }

  // Farmhouse with a stepped gable facing the canal, and a lean-to at the back.
  {
    const f = frame([2.15, G, -2.75], -0.22);
    const W = 1.5, H = 1.05, D = 1.9;
    P.add(new THREE.BoxGeometry(W + 0.1, 0.12, D + 0.1), PAL.brickDark, { matrix: f({ pos: [0, 0.06, 0] }) });
    P.add(new THREE.BoxGeometry(W, H, D), PAL.brick, { matrix: f({ pos: [0, H / 2, 0] }), jitter: 0.01, shade: 0.04 });
    P.add(roof(THREE, W + 0.2, 0.95, D - 0.05, 0.07), PAL.roofTile, { matrix: f({ pos: [0, H - 0.02, -0.04] }), shade: 0.05 });
    P.add(gable(THREE, W, 0.95, 0.1), PAL.brick, { matrix: f({ pos: [0, H, -D / 2 + 0.05] }) });
    // stepped front gable with white copings, standing proud of the roof
    const steps = [[1.5, 0], [1.18, 0.2], [0.88, 0.4], [0.58, 0.6], [0.3, 0.8]];
    for (const [sw, sy] of steps) {
      P.add(new THREE.BoxGeometry(sw, 0.2, 0.16), PAL.brick, { matrix: f({ pos: [0, H + sy + 0.1, D / 2 - 0.05] }), shade: 0.04 });
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.1, 0.04, 0.2), PAL.white, { matrix: f({ pos: [s * (sw / 2 - 0.05), H + sy + 0.22, D / 2 - 0.05] }) });
    }
    P.add(new THREE.BoxGeometry(0.34, 0.05, 0.22), PAL.white, { matrix: f({ pos: [0, H + 1.02, D / 2 - 0.05] }) });
    P.add(new THREE.ConeGeometry(0.06, 0.18, 4), PAL.black, { matrix: f({ pos: [0, H + 1.15, D / 2 - 0.05] }) });
    // windows with green shutters, a split door, a hayloft hatch
    for (const x of [-0.45, 0.45]) {
      P.add(new THREE.BoxGeometry(0.3, 0.36, 0.04), PAL.white, { matrix: f({ pos: [x, 0.58, D / 2 + 0.01] }) });
      P.add(new THREE.BoxGeometry(0.22, 0.28, 0.05), '#3b4b55', { matrix: f({ pos: [x, 0.58, D / 2 + 0.012] }) });
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.13, 0.34, 0.03), PAL.green, { matrix: f({ pos: [x + s * 0.23, 0.58, D / 2 + 0.02], ry: s * 0.25 }) });
    }
    P.add(new THREE.BoxGeometry(0.26, 0.24, 0.04), PAL.white, { matrix: f({ pos: [0, H + 0.3, D / 2 + 0.04] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.18, 0.05), PAL.green, { matrix: f({ pos: [0, H + 0.3, D / 2 + 0.05] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.6, 0.38), PAL.green, { matrix: f({ pos: [W / 2 + 0.01, 0.38, 0.35] }) });
    P.add(new THREE.BoxGeometry(0.07, 0.04, 0.42), PAL.white, { matrix: f({ pos: [W / 2 + 0.01, 0.7, 0.35] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.24, 0.3), PAL.white, { matrix: f({ pos: [W / 2 + 0.01, 0.6, -0.4] }) });
    P.add(new THREE.BoxGeometry(0.05, 0.18, 0.24), '#3b4b55', { matrix: f({ pos: [W / 2 + 0.012, 0.6, -0.4] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.55, 0.2), PAL.brickDark, { matrix: f({ pos: [-0.35, H + 0.75, -0.55] }) });
    P.add(new THREE.BoxGeometry(0.26, 0.05, 0.26), PAL.white, { matrix: f({ pos: [-0.35, H + 1.04, -0.55] }) });
    // lean-to barn
    P.add(new THREE.BoxGeometry(1.0, 0.7, 1.25), '#7a4a3a', { matrix: f({ pos: [-1.15, 0.35, -0.45] }), jitter: 0.01 });
    P.add(new THREE.BoxGeometry(1.2, 0.06, 1.4), PAL.roofTile, { matrix: f({ pos: [-1.18, 0.78, -0.45], rot: [0, 0, 0.32] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.5, 0.55), '#2f4a3c', { matrix: f({ pos: [-1.66, 0.3, -0.35] }) });
    // a bicycle against the house: the cyclist's spare? no, the farmer's own, leaning by the door
    P.add(new THREE.TorusGeometry(0.12, 0.012, 3, 10), PAL.black, { matrix: f({ pos: [W / 2 + 0.1, 0.13, 0.85], ry: 0, rot: [0, 0.1, 0.12] }) });
    P.add(new THREE.TorusGeometry(0.12, 0.012, 3, 10), PAL.black, { matrix: f({ pos: [W / 2 + 0.12, 0.13, 1.2], rot: [0, 0.1, 0.12] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.02, 0.36), PAL.black, { matrix: f({ pos: [W / 2 + 0.08, 0.27, 1.02], rot: [0, 0, 0.12] }) });
    // washing line with sheets between the house and a post
    const pA = [W / 2 + 0.85, 0, -0.65];
    P.add(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 5), PAL.wood, { matrix: f({ pos: [pA[0], 0.42, pA[2]] }) });
    P.add(new THREE.CylinderGeometry(0.006, 0.006, 0.85, 3), '#d8d4cc', { matrix: f({ pos: [W / 2 + 0.43, 0.82, -0.65], rot: [0, 0, Math.PI / 2] }) });
    const sheets = [['#ffffff', 0.22, 0.32], ['#e7b9c4', 0.16, 0.22], ['#bcd6ea', 0.18, 0.3]];
    sheets.forEach(([c, w, h], i) => P.add(new THREE.BoxGeometry(w, h, 0.01), c, { matrix: f({ pos: [W / 2 + 0.2 + i * 0.25, 0.81 - h / 2, -0.65], ry: Math.PI / 2 + 0.15, rot: [0, Math.PI / 2 + (rand() - 0.5) * 0.3, 0.05] }) }));
  }

  // Hay barrack: four poles and a sliding pyramid roof over the hay.
  {
    const h = frame([3.75, G, -1.75], 0.4);
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) P.add(new THREE.BoxGeometry(0.07, 1.6, 0.07), PAL.wood, { matrix: h({ pos: [x, 0.8, z] }) });
    P.add(new THREE.CylinderGeometry(0.5, 0.56, 0.75, 8), '#d6b860', { matrix: h({ pos: [0, 0.37, 0] }), jitter: 0.04, shade: 0.08 });
    P.add(new THREE.ConeGeometry(0.66, 0.55, 4), '#5e5246', { matrix: h({ pos: [0, 1.28, 0], ry: Math.PI / 4 }), shade: 0.04 });
  }

  // Poplars: a windbreak row behind the farm (not quite in line).
  {
    for (const [x, z, s] of [[0.55, -3.65, 1.05], [1.35, -3.95, 1.2], [2.35, -4.0, 0.95], [3.2, -3.55, 1.1], [3.9, -3.0, 0.85]]) {
      P.add(new THREE.CylinderGeometry(0.04, 0.06, 0.6 * s, 5), PAL.wood, { pos: [x, G + 0.3 * s, z] });
      P.add(new THREE.IcosahedronGeometry(1, 1), PAL.poplar, { pos: [x, G + 1.35 * s, z], scl: [0.32 * s, 1.15 * s, 0.32 * s], ry: rand() * 3, jitter: 0.04, shade: 0.08, top: '#8fb553', y0: G + 0.8 * s, y1: G + 2.4 * s });
    }
  }

  // Willows: two weeping willows by the canal, a row of knotted pollards along the south dyke.
  {
    const weep = (x, z, s, lean) => {
      P.add(new THREE.CylinderGeometry(0.08 * s, 0.14 * s, 1.1 * s, 6), '#5d4a3a', { pos: [x, G + 0.55 * s, z], rot: [lean[0], 0, lean[1]], jitter: 0.02 });
      const cy = G + 1.25 * s;
      const cx = x - lean[1] * 0.5 * s, cz = z + lean[0] * 0.5 * s;
      P.add(new THREE.IcosahedronGeometry(0.62 * s, 1), PAL.leaf, { pos: [cx, cy + 0.15 * s, cz], scl: [1.1, 0.75, 1.0], jitter: 0.08 * s, shade: 0.08, top: PAL.leafHi, y0: cy, y1: cy + 0.5 * s });
      // the hanging curtain of fronds: drooping cones around the crown
      const nf = 13;
      for (let k = 0; k < nf; k++) {
        const a = (k / nf) * Math.PI * 2 + rand() * 0.3;
        const r = 0.6 * s * (0.85 + rand() * 0.25);
        const L = (0.7 + rand() * 0.45) * s;
        P.add(new THREE.ConeGeometry(0.13 * s, L, 4), '#93b34c', { pos: [cx + Math.cos(a) * r, cy + 0.05 * s - L / 2, cz + Math.sin(a) * r * 0.95], rot: [Math.PI + Math.sin(a) * 0.12, a, -Math.cos(a) * 0.12], jitter: 0.02, shade: 0.1, top: PAL.leaf, y0: cy - L, y1: cy });
      }
      P.add(new THREE.IcosahedronGeometry(0.35 * s, 0), PAL.leafHi, { pos: [cx + 0.25 * s, cy + 0.45 * s, cz - 0.1 * s], jitter: 0.04 * s });
    };
    weep(-0.55, ZC - HW - 0.55, 1.15, [0.1, 0.12]);
    weep(-4.0, -1.85, 0.95, [-0.05, -0.1]);
    const pollard = (x, z, s) => {
      P.add(new THREE.CylinderGeometry(0.1 * s, 0.13 * s, 0.75 * s, 6), '#6a5848', { pos: [x, G + 0.37 * s, z], rot: [(rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2], jitter: 0.02 });
      P.add(new THREE.IcosahedronGeometry(0.15 * s, 0), '#6a5848', { pos: [x, G + 0.78 * s, z], jitter: 0.02 });
      for (let k = 0; k < 4; k++) {
        const a = rand() * 6.28;
        P.add(new THREE.IcosahedronGeometry(0.2 * s, 0), k % 2 ? PAL.leaf : '#b4cc62', { pos: [x + Math.cos(a) * 0.14 * s, G + (1.0 + rand() * 0.2) * s, z + Math.sin(a) * 0.14 * s], scl: [1, 1.35, 1], jitter: 0.03 * s, shade: 0.08 });
      }
    };
    pollard(-2.55, ZC + HW + 0.42, 1.0);
    pollard(-1.25, ZC + HW + 0.4, 0.85);
    pollard(2.6, ZC + HW + 0.48, 0.95);
    pollard(3.55, ZC + HW + 0.45, 1.1);
  }

  // Meadow on the right: two cows, a white farm gate and a ditch.
  {
    const XD = 2.35;
    const z0 = ZC + HW + 0.45, z1 = zEdge(XD) - 0.05;
    P.add(new THREE.BoxGeometry(0.22, 0.05, z1 - z0, 1, 1, 4), PAL.water, { pos: [XD, G - 0.005, (z0 + z1) / 2], jitter: 0.015, jitterY: 0 });
    // gate across a culvert
    const gz = 2.1;
    P.add(new THREE.BoxGeometry(0.4, 0.06, 0.4), '#8c7a64', { pos: [XD, G + 0.01, gz] });
    for (const dz of [-0.24, 0.24]) P.add(new THREE.BoxGeometry(0.06, 0.45, 0.06), PAL.white, { pos: [XD + 0.08, G + 0.22, gz + dz] });
    for (let k = 0; k < 4; k++) P.add(new THREE.BoxGeometry(0.03, 0.03, 0.5), PAL.white, { pos: [XD + 0.08, G + 0.1 + k * 0.1, gz] });
    P.add(new THREE.BoxGeometry(0.03, 0.03, 0.62), PAL.white, { pos: [XD + 0.08, G + 0.25, gz], rot: [0.62, 0, 0] });
    const cow = (x, z, ry, grazing) => {
      const c = frame([x, G, z], ry);
      P.add(new THREE.BoxGeometry(0.26, 0.24, 0.52), PAL.white, { matrix: c({ pos: [0, 0.34, 0] }), jitter: 0.01 });
      P.add(new THREE.BoxGeometry(0.27, 0.16, 0.2), '#22252a', { matrix: c({ pos: [0.005, 0.38, 0.06] }) });
      P.add(new THREE.BoxGeometry(0.2, 0.12, 0.14), '#22252a', { matrix: c({ pos: [-0.04, 0.4, -0.18] }) });
      const hy = grazing ? 0.18 : 0.42;
      P.add(new THREE.BoxGeometry(0.14, 0.16, 0.2), '#22252a', { matrix: c({ pos: [0, hy, 0.33], rot: [grazing ? 0.7 : 0, 0, 0] }) });
      P.add(new THREE.BoxGeometry(0.11, 0.07, 0.06), '#e8b0a8', { matrix: c({ pos: [0, hy - 0.06, 0.42] }) });
      for (const [lx, lz] of [[-0.09, -0.18], [0.09, -0.18], [-0.09, 0.18], [0.09, 0.18]]) P.add(new THREE.BoxGeometry(0.05, 0.22, 0.05), PAL.white, { matrix: c({ pos: [lx, 0.11, lz] }) });
      P.add(new THREE.BoxGeometry(0.02, 0.2, 0.02), '#22252a', { matrix: c({ pos: [0, 0.28, -0.27], rot: [0.2, 0, 0] }) });
    };
    cow(3.25, 1.35, 2.3, true);
    cow(3.85, 2.75, -0.6, false);
    // a few buttercups in the meadow
    for (let i = 0; i < 14; i++) P.add(new THREE.OctahedronGeometry(0.035, 0), '#f6dc3a', { pos: [2.6 + rand() * 1.9, G + 0.04, 0.6 + rand() * 3.0] });
  }

  // Roadside tulip cart: buckets of cut flowers for sale.
  {
    const s = frame([0.45, G, 3.35], 0.35);
    P.add(new THREE.BoxGeometry(0.6, 0.06, 0.32), PAL.wood, { matrix: s({ pos: [0, 0.32, 0] }) });
    for (const x of [-0.26, 0.26]) P.add(new THREE.BoxGeometry(0.04, 0.32, 0.28), PAL.wood, { matrix: s({ pos: [x, 0.16, 0] }) });
    ['#e0283a', '#f7c91c', '#f3a6b8'].forEach((c, i) => {
      P.add(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 7), '#9aa3a8', { matrix: s({ pos: [-0.18 + i * 0.18, 0.42, 0] }) });
      P.add(new THREE.IcosahedronGeometry(0.08, 0), c, { matrix: s({ pos: [-0.18 + i * 0.18, 0.53, 0] }), jitter: 0.02 });
    });
    P.add(new THREE.BoxGeometry(0.03, 0.55, 0.03), PAL.wood, { matrix: s({ pos: [0.32, 0.6, 0.1] }) });
    P.add(new THREE.BoxGeometry(0.26, 0.14, 0.02), PAL.white, { matrix: s({ pos: [0.32, 0.86, 0.11], ry: -0.2 }) });
    P.add(new THREE.BoxGeometry(0.18, 0.04, 0.025), '#c41c3c', { matrix: s({ pos: [0.32, 0.87, 0.115], ry: -0.2 }) });
  }

  // Cyclist on the brick road, heading for the bridge with a crate of tulips on the front.
  {
    const c = frame([1.17, G + 0.03, 1.95], Math.PI + 0.12);
    for (const z of [-0.2, 0.2]) P.add(new THREE.TorusGeometry(0.13, 0.014, 4, 12), PAL.black, { matrix: c({ pos: [0, 0.14, z], rot: [0, Math.PI / 2, 0] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.02, 0.36), '#2b5f8f', { matrix: c({ pos: [0, 0.26, 0], rot: [0.1, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.22, 0.02), '#2b5f8f', { matrix: c({ pos: [0, 0.22, -0.08], rot: [-0.2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.02, 0.2, 0.02), '#2b5f8f', { matrix: c({ pos: [0, 0.24, 0.18], rot: [0.25, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.2, 0.02, 0.02), PAL.black, { matrix: c({ pos: [0, 0.36, 0.16] }) });
    // crate of tulips
    P.add(new THREE.BoxGeometry(0.16, 0.08, 0.14), '#b7865a', { matrix: c({ pos: [0, 0.34, 0.27] }) });
    for (const [dx, col] of [[-0.05, '#e0283a'], [0, '#f7c91c'], [0.05, '#e0283a']]) P.add(new THREE.OctahedronGeometry(0.035, 0), col, { matrix: c({ pos: [dx, 0.41, 0.27 + dx * 0.4] }) });
    // rider: blue coat, orange scarf, sitting upright
    P.add(new THREE.BoxGeometry(0.06, 0.2, 0.06), '#3a3f52', { matrix: c({ pos: [0.05, 0.27, -0.02], rot: [0.5, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.06, 0.2, 0.06), '#3a3f52', { matrix: c({ pos: [-0.05, 0.25, -0.0], rot: [-0.3, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.15, 0.24, 0.1), '#e0b030', { matrix: c({ pos: [0, 0.49, -0.07], rot: [0.12, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.16, 0.04, 0.11), '#e8562a', { matrix: c({ pos: [0, 0.6, -0.06] }) });
    P.add(new THREE.IcosahedronGeometry(0.06, 0), '#e8c0a0', { matrix: c({ pos: [0, 0.67, -0.05] }) });
    P.add(new THREE.BoxGeometry(0.11, 0.035, 0.11), '#3a3f52', { matrix: c({ pos: [0, 0.72, -0.05] }) });
    for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.035, 0.03, 0.2), '#e0b030', { matrix: c({ pos: [s * 0.08, 0.45, 0.06], rot: [0.5, 0, 0] }) });
  }

  // Heron fishing at the canal edge, below the weeping willow.
  {
    const h = frame([-3.2, G + 0.12, ZC + HW + 0.02], Math.PI + 0.5);
    P.add(new THREE.IcosahedronGeometry(0.1, 0), '#9aa3ad', { matrix: h({ pos: [0, 0.32, 0], scl: [0.8, 0.9, 1.5], rot: [-0.3, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.015, 0.25, 0.015), '#6a5a40', { matrix: h({ pos: [0, 0.13, 0.02] }) });
    P.add(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 4), '#c8ccd2', { matrix: h({ pos: [0, 0.45, 0.13], rot: [0.6, 0, 0] }) });
    P.add(new THREE.IcosahedronGeometry(0.035, 0), '#e8ecef', { matrix: h({ pos: [0, 0.53, 0.2] }) });
    P.add(new THREE.ConeGeometry(0.012, 0.12, 4), '#e0b030', { matrix: h({ pos: [0, 0.49, 0.27], rot: [2.2, 0, 0] }) });
    P.add(new THREE.BoxGeometry(0.04, 0.012, 0.06), '#262a2e', { matrix: h({ pos: [0, 0.55, 0.18] }) });
  }

  root.add(P.mesh(mat));

  // Tulip heads: one instanced cloud over the stripes for a bumpy, picked-by-hand texture.
  {
    const hg = new THREE.OctahedronGeometry(0.045, 0);
    hg.scale(1, 1.35, 1);
    const n = heads.length;
    const im = new THREE.InstancedMesh(hg, new THREE.MeshLambertMaterial({ flatShading: true }), n);
    im.castShadow = false;
    im.receiveShadow = true;
    const dm = new THREE.Object3D();
    const c = new THREE.Color();
    heads.forEach((h, i) => {
      dm.position.set(h.x, G + 0.16 + rand() * 0.03, h.z);
      dm.rotation.set((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4);
      dm.scale.setScalar(0.8 + rand() * 0.45);
      dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix);
      im.setColorAt(i, c.set(h.c).multiplyScalar(0.92 + rand() * 0.16));
    });
    root.add(im);
  }

  // Moored rowing boat (animated) by the willow, tied to a post on the north bank.
  const boatP = new Painter(THREE, 171);
  const hull = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  {
    const hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const t = Math.max(0, hp.getZ(i));
      hp.setX(i, hp.getX(i) * (1 - 0.6 * t * t));
    }
  }
  boatP.add(hull, '#2f6a52', { scl: [0.25, 0.16, 0.6], shade: 0.05, top: PAL.white, y0: -0.06, y1: 0 });
  boatP.add(new THREE.BoxGeometry(0.4, 0.025, 0.1), PAL.wood, { pos: [0, -0.03, 0.05] });
  boatP.add(new THREE.BoxGeometry(0.03, 0.02, 0.75), PAL.wood, { pos: [0.1, -0.01, -0.05], rot: [0, 0.1, 0.15] });
  const boat = boatP.mesh(lambert(THREE, { side: THREE.DoubleSide }));
  const boatHome = new THREE.Vector3(-1.45, G + 0.08, ZC - 0.15);
  boat.position.copy(boatHome);
  boat.rotation.y = Math.PI / 2 + 0.15;
  root.add(boat);
  {
    const Q = new Painter(THREE, 181);
    Q.add(new THREE.CylinderGeometry(0.03, 0.035, 0.45, 5), PAL.wood, { pos: [-1.95, G + 0.15, ZC - HW + 0.02] });
    const a = new THREE.Vector3(-1.95, G + 0.3, ZC - HW + 0.02), b = new THREE.Vector3(-1.95 + 0.42, G + 0.12, ZC - 0.17);
    const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1));
    Q.add(new THREE.CylinderGeometry(0.008, 0.008, a.distanceTo(b), 3), '#d8cbb5', { matrix: m });
    root.add(Q.mesh(mat));
  }

  // Light: golden late-afternoon sun low from the west, a warm horizon over a blue zenith, a low green bounce.
  root.add(new THREE.HemisphereLight('#ffe1bd', '#5d7a52', 1.15));
  const key = keyLight(THREE, ctx, { color: '#ffc47e', intensity: 3.6, pos: [-9, 3.5, 3.4], extent: 7 });
  root.add(key, key.target);
  root.add(skyDome(THREE, { top: '#5a82c4', mid: '#ffd49c', bottom: '#f3c595', sun: [-0.88, 0.2, 0.34], sunColor: '#fff0c4', sunPow: 22, horizon: 0.62 }));

  function update(t) {
    sailsHub.rotation.z = -t * 0.55;
    boat.position.y = boatHome.y + Math.sin(t * 1.2) * 0.012;
    boat.rotation.z = Math.sin(t * 0.9) * 0.04;
  }
  update(0);

  return {
    root,
    background: new THREE.Color('#f6d3a2'),
    fog: new THREE.Fog('#f4d2a6', 24, 60),
    update: (t) => update(t),
    dispose: () => disposeTree(root),
  };
}
