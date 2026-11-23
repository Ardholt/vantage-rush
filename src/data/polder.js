// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/polder.js
export default {
  id: 'polder',
  title: 'Polder Mill',
  target: [0, 1.3, 0],
  start: { az: 3.5, polar: 0.75, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.4, polar: 1.12, dist: 14.5 }, level: 1, note: 'three-quarter front: mill over the bridge, farmhouse right, tulip stripes left' },
    { pose: { az: -0.78, polar: 0.98, dist: 15.5 }, level: 3, note: 'front-left: tulip stripes run toward the bridge, mill sails over the willow' },
    { pose: { az: 1.5, polar: 1.35, dist: 12.5 }, level: 4, note: 'low down the canal from the east end: the lift bridge frames the mill' },
    { pose: { az: -1.57, polar: 1.45, dist: 6.5 }, level: 5, note: 'low down the canal from the west end: the heron in the water, the lift bridge across the far end, willows left and tulip stripes right' },
  ],
};
