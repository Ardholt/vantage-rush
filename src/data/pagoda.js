// Pure data for one diorama (shared by client and server). Builder: src/client/scenes/pagoda.js
export default {
  id: 'pagoda',
  title: 'Lily Pagoda',
  target: [0, 1.2, 0],
  start: { az: -1.7, polar: 0.75, dist: 16 },
  limits: { minDist: 6, maxDist: 20, minPolar: 0.3, maxPolar: 1.48 },
  // level 1 (easy) .. 5 (hard); see src/shared/scenes.js for the scale
  shots: [
    { pose: { az: 0.393, polar: 0.95, dist: 12.5 }, level: 1, note: 'front three-quarter from above the pond: pagoda left, red bridge right, lilies in front, sunset glow behind' },
    { pose: { az: -0.654, polar: 1.3, dist: 12.5 }, level: 3, note: 'low from the lantern spit: stepping stones lead to the island, pagoda between the rust maple and the pruned pine' },
    { pose: { az: 2.749, polar: 1.3, dist: 12.5 }, level: 4, note: 'from behind the tea bench: parasol under the orange maple, the bridge rail, pagoda tip against the dusk' },
    { pose: { az: 1.57, polar: 1.45, dist: 8 }, level: 5, note: 'at water level, end-on to the red bridge: the pruned pine at the left, the bridge rails in a narrow arch with the pagoda straight above them' },
  ],
};
