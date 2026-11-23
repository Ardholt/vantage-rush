// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/rooftop.js
export default {
  id: 'rooftop',
  title: 'Roof Garden',
  target: [0, 1.4, 0],
  start: { az: -2.6, polar: 0.65, dist: 16 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.35, polar: 1.05, dist: 12.5 }, level: 1, note: 'over the front parapet: parasol and deck in front, the water tank up right, string lights between' },
    { pose: { az: -0.9, polar: 1.4, dist: 11 }, level: 4, note: 'low from the front-left corner: pigeon loft under the tank, sunflowers, skyline behind' },
    { pose: { az: 1.5, polar: 1.38, dist: 9 }, level: 4, note: 'low over the right neighbour: the tank fills the right, string lights sag over the bistro table, the hut door beyond' },
  ],
};
