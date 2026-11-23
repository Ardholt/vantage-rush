// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/circus.js
export default {
  id: 'circus',
  title: 'Big Top',
  target: [0, 1.3, 0],
  start: { az: -2.75, polar: 0.6, dist: 16 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.35, polar: 1.15, dist: 13 }, level: 1, note: 'down the trampled path: the arch frames the tent door, wheel up right, sunset behind' },
    { pose: { az: 1.44, polar: 0.95, dist: 12.5 }, level: 3, note: 'from the right flank: the ferris wheel in front of the big top, the arch off to the left' },
    { pose: { az: 1.963, polar: 0.75, dist: 12.5 }, level: 4, note: 'high from behind the ferris wheel: the wheel rim over the striped roof, wagons and cannon beyond' },
    { pose: { az: 0.6, polar: 0.4, dist: 9 }, level: 5, note: 'straight down onto the big top: the red and white stripes from above, the door tent and string lights below it, the gold cannon at the bottom right, a slice of the ferris wheel at the right edge' },
  ],
};
