// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/lighthouse.js
export default {
  id: 'lighthouse',
  title: 'Gull Rock',
  target: [0, 1.5, 0],
  start: { az: -2.0, polar: 0.8, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 1.45, polar: 1.3, dist: 12.5 }, level: 2, note: 'phase-1 postcard' },
    { pose: { az: -0.39, polar: 0.95, dist: 12.5 }, level: 3, note: 'from the sea past the jetty: lighthouse at the left, cottage in the middle, the two sea stacks standing right behind the jetty and boat' },
    { pose: { az: -0.92, polar: 1.35, dist: 11 }, level: 4, note: 'low and close behind the red buoy: the tower filling the left, the cottage with its smoking chimney, a sea stack and the pennant just right of the roof, the jetty at the right edge' },
    { pose: { az: 3.14, polar: 1.45, dist: 6.5 }, level: 5, note: 'low and close from the open sea behind the island: the back of the cottage with its pennant, the jetty poking out at the left, the striped tower cut by the right edge' },
  ],
};
