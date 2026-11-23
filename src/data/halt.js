// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/halt.js
export default {
  id: 'halt',
  title: 'Fir Halt',
  target: [0, 1.2, 0],
  start: { az: 2.2, polar: 0.75, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: -0.5, polar: 1.24, dist: 11.5 }, level: 2, note: 'phase-1 postcard' },
    { pose: { az: -1.7, polar: 0.95, dist: 9 }, level: 3, note: 'from the left beside the mountain: the water tower over the line, the signal, then the hut and the red carriage behind' },
    { pose: { az: 0.65, polar: 0.75, dist: 9 }, level: 4, note: 'high and close over the end of the line: the red carriage roof leading up the track to the tunnel mouth, the water tower to its right, the snowman bottom-left' },
  ],
};
