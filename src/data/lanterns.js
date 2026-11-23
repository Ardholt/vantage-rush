// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/lanterns.js
export default {
  id: 'lanterns',
  title: 'Lantern Lane',
  target: [0, 1.4, 0],
  start: { az: 2.5, polar: 0.8, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: -0.39, polar: 1.15, dist: 12.5 }, level: 2, note: 'up the lane from the front-left: the bell tower over the lane, lantern strings stepping up, the striped noodle stall at the right' },
    { pose: { az: -0.92, polar: 0.75, dist: 12.5 }, level: 3, note: 'high over the left-hand houses: the blossom tree and garden wall in front, the bell tower top-left, the stall awning at the right edge' },
    { pose: { az: 0.92, polar: 0.75, dist: 12.5 }, level: 4, note: 'high from the right, behind the stall: the striped awning bottom-left, the lane running away diagonally, lanterns along the far roofs' },
  ],
};
