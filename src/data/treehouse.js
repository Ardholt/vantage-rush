// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/treehouse.js
export default {
  id: 'treehouse',
  title: 'Oak Loft',
  target: [0, 1.6, -0.3],
  start: { az: -2.6, polar: 1.05, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.654, polar: 0.95, dist: 12.5 }, level: 1, note: 'front three-quarter: the loft with its red roof in the oak fork, rope ladder, wheelbarrow of apples, kennel right' },
    { pose: { az: -1.178, polar: 1.3, dist: 12.5 }, level: 3, note: 'low from the vegetable bed: tyre swing hanging off the long limb, the loft behind the trunk' },
    { pose: { az: 2.225, polar: 1.3, dist: 12.5 }, level: 4, note: 'from the back corner: washing line and the ladder side of the loft, sunflowers at the fence' },
    { pose: { az: 1.5, polar: 0.35, dist: 9 }, level: 5, note: 'straight down through the oak: the red loft roof among the orange leaves, the stepping-stone path, the blue kennel and the apple barrow below' },
  ],
};
