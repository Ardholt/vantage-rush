// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/observatory.js
export default {
  id: 'observatory',
  title: 'Star Ridge',
  target: [0, 1.4, 0],
  start: { az: -2.6, polar: 1.2, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.6, polar: 0.95, dist: 12 }, level: 1, note: 'three-quarter from the front: the dome slit glowing straight at you, the lit control building beside it, switchbacks below' },
    { pose: { az: -1.0, polar: 1.1, dist: 11 }, level: 3, note: 'from the west flank: the dome over the pines, the lamp-lit hairpins curling round to the right' },
    { pose: { az: 2.4, polar: 0.45, dist: 11 }, level: 4, note: 'high from the back right: the dome roof above the control building, the road coiling down past the pines' },
  ],
};
