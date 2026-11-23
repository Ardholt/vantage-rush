// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/station.js
export default {
  id: 'station',
  title: 'Last Gas',
  target: [0, 1.2, 0],
  start: { az: 2.0, polar: 0.8, dist: 15 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.13, polar: 1.15, dist: 12.5 }, level: 1, note: 'across the road: canopy and pumps centred, LAST GAS sign left, DINER and the mustard pickup right, mesas behind' },
    { pose: { az: 0.39, polar: 0.95, dist: 9 }, level: 3, note: 'closer and higher from the road: the canopy fills the frame, DINER sign over its right corner, windpump peeking over the sign' },
    { pose: { az: -0.65, polar: 1.35, dist: 12.5 }, level: 2, note: 'low from the west verge: LAST GAS pole sign in front of the canopy, windpump at the left' },
    { pose: { az: -2.49, polar: 0.95, dist: 12.5 }, level: 4, note: 'from behind the big butte: windpump in front of the canopy, the LAST GAS sign beyond, diner roof at left' },
  ],
};
