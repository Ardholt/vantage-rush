// Renders one round's two images (the "postcard" from the camera pose, and a top-down map) to 2D canvases.
import * as THREE from 'three';
import { sceneById } from './data/scenes.js';
import { MAP_HALF } from './data/rules.js';
import { disposeTree } from './scenes/kit.js';

const builders = {
  lighthouse: () => import('./scenes/lighthouse.js'),
  lanterns: () => import('./scenes/lanterns.js'),
  halt: () => import('./scenes/halt.js'),
  polder: () => import('./scenes/polder.js'),
  station: () => import('./scenes/station.js'),
  observatory: () => import('./scenes/observatory.js'),
  lock: () => import('./scenes/lock.js'),
  tram: () => import('./scenes/tram.js'),
  treehouse: () => import('./scenes/treehouse.js'),
  pagoda: () => import('./scenes/pagoda.js'),
  rooftop: () => import('./scenes/rooftop.js'),
  circus: () => import('./scenes/circus.js'),
  vineyard: () => import('./scenes/vineyard.js'),
  beachhuts: () => import('./scenes/beachhuts.js'),
  greenhouse: () => import('./scenes/greenhouse.js'),
};
let renderer = null;

function gl() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setPixelRatio(1);
  return renderer;
}
export const hasGL = () => { try { gl(); return true; } catch { return false; } };

function snap(r, scene, cam, w, h) {
  r.setSize(w, h, false);
  r.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(r.domElement, 0, 0);
  return c;
}

// want: { map: bool }. Returns { postcard, map }.
export async function renderShot(sceneId, pose, want = {}) {
  const r = gl();
  const meta = sceneById(sceneId);
  const built = (await builders[sceneId]()).build(THREE, { renderer: r, quality: 'high' });
  const scene = new THREE.Scene();
  scene.add(built.root);
  scene.background = built.background instanceof THREE.Color ? built.background : new THREE.Color(built.background || '#888');
  scene.fog = built.fog || null;
  r.shadowMap.needsUpdate = true;
  const t = new THREE.Vector3().fromArray(meta.target);
  const cam = new THREE.PerspectiveCamera(45, 4 / 5, 0.1, 300);
  const s = Math.sin(pose.polar);
  cam.position.set(t.x + s * Math.sin(pose.az) * pose.dist, t.y + Math.cos(pose.polar) * pose.dist, t.z + s * Math.cos(pose.az) * pose.dist);
  cam.lookAt(t);
  const out = { postcard: snap(r, scene, cam, want.w || 560, Math.round((want.w || 560) * 1.25)) };
  if (want.map) {
    scene.fog = null;
    scene.background = new THREE.Color('#14478f'); // map ground colour (the scene's sky is not wanted from above)
    const m = new THREE.OrthographicCamera(-MAP_HALF, MAP_HALF, MAP_HALF, -MAP_HALF, 1, 200);
    m.position.set(t.x, 80, t.z);
    m.up.set(0, 0, -1); // north (-z) is up the screen
    m.lookAt(t.x, 0, t.z);
    out.map = snap(r, scene, m, 900, 900);
  }
  built.dispose?.();
  scene.remove(built.root);
  disposeTree(built.root);
  return out;
}
