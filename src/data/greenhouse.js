// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/greenhouse.js
export default {
  id: 'greenhouse',
  title: 'Glasshouse',
  target: [-0.2, 1.1, -0.3],
  start: { az: -2.6, polar: 0.7, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.5, polar: 1.1, dist: 13 }, level: 1, note: 'three-quarter from the gate: the glowing glasshouse centred, sunflowers and the red-door shed to its right' },
    { pose: { az: -1.5, polar: 1.05, dist: 11 }, level: 3, note: 'from the west: the bench at the glasshouse end, the scarecrow in front of it' },
    { pose: { az: 1.9, polar: 1.3, dist: 9 }, level: 4, note: 'low past the teal shed: the shed filling the bottom right, the glowing glasshouse behind it, the scarecrow over the cabbage bed and a chair at the left' },
  ],
};
