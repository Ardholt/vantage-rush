// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/beachhuts.js
export default {
  id: 'beachhuts',
  title: 'Beach Huts',
  target: [-0.2, 1.1, -0.4],
  start: { az: -0.6, polar: 1.3, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.9, polar: 1.15, dist: 12.5 }, level: 1, note: 'three-quarter from the sea: the pastel hut row behind the groynes, sailboat in front' },
    { pose: { az: 1.65, polar: 1.2, dist: 12 }, level: 3, note: 'along the beach from the east: the groynes stack up, huts in a curve, kiosk at the far end' },
    { pose: { az: -2.0, polar: 0.7, dist: 10 }, level: 4, note: 'high from behind the promenade: the hut roofs in a curve, lamp post and kiosk, the groynes running out to sea' },
  ],
};
