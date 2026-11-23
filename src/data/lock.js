// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/lock.js
export default {
  id: 'lock',
  title: 'Lock Seven',
  target: [0.2, 1.1, -0.3],
  start: { az: -1.9, polar: 0.55, dist: 16 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: -0.39, polar: 0.95, dist: 12.5 }, level: 1, note: 'from the towpath across the lock: boat in the chamber, cottage behind, poplars at the left' },
    { pose: { az: 1.96, polar: 1.35, dist: 12.5 }, level: 3, note: 'low from downstream: the humpback bridge at left, the three dark poplars standing over the far end of the canal' },
    { pose: { az: 3.01, polar: 1.15, dist: 12.5 }, level: 4, note: 'from behind the cottage: slate roof and smoking chimney, the LOCK 7 sign and the poplars beyond to the right' },
  ],
};
