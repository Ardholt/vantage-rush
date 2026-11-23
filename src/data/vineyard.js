// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/vineyard.js
export default {
  id: 'vineyard',
  title: 'Cypress Row',
  target: [0.2, 1.3, -0.1],
  start: { az: -1.0, polar: 0.9, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.55, polar: 1.2, dist: 12.5 }, level: 2, note: 'up the steps to the farmhouse, cypress row and chapel on the right, scooter at the foot' },
    { pose: { az: 1.7, polar: 1.1, dist: 10 }, level: 3, note: 'side-on along the road: three cypresses stand in front of the steps, chapel at the right edge' },
    { pose: { az: 2.6, polar: 1.2, dist: 10 }, level: 4, note: 'from behind the chapel: its apse in front, the dovecote tower over the terraces beyond' },
  ],
};
