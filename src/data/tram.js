// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/tram.js
export default {
  id: 'tram',
  title: 'Rain Tram',
  target: [0, 1.2, 0],
  start: { az: 2.9, polar: 0.55, dist: 16 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.3, polar: 0.95, dist: 12.5 }, level: 1, note: 'from the square: shelter left, the lit tram in the middle, clock tower over the brick house, café and HOTEL sign right' },
    { pose: { az: 0.69, polar: 1.35, dist: 12.5 }, level: 3, note: 'low over the corner of the square: newsstand and postbox in front, the clock tower rising above the shelter, café at right' },
    { pose: { az: 0, polar: 1.45, dist: 8 }, level: 4, note: 'low on the wet square: the shelter and a red umbrella in front of the tram, the brick house above it, café at right, a bicycle on the cobbles' },
  ],
};
