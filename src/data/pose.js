// Camera pose = spherical coordinates around a scene's fixed orbit target.
// az: azimuth in radians (around +Y, 0 = looking from +Z), polar: radians from +Y (0 = top-down), dist: world units.

export function poseToVec(p) {
  const s = Math.sin(p.polar);
  return [s * Math.sin(p.az), Math.cos(p.polar), s * Math.cos(p.az)];
}

export function angleBetween(a, b) {
  const u = poseToVec(a), v = poseToVec(b);
  const d = Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
  return (Math.acos(d) * 180) / Math.PI;
}

export function distError(a, b) {
  return Math.abs(Math.log(a.dist / b.dist));
}

// Closeness in [0,1]: 1 = exact. Angle dominates; distance matters but is forgiving.
export function closeness(guess, target) {
  const ang = angleBetween(guess, target);
  const de = distError(guess, target);
  const a = Math.exp(-Math.pow(ang / 14, 2));
  const d = Math.exp(-Math.pow(de / 0.28, 2));
  return a * (0.75 + 0.25 * d);
}

// What the hot/cold meter shows: the score's closeness near the spot, and under it a broad curve (half height, about
// 50 degrees wide) so the meter still points the way from across the diorama, where closeness alone reads 0
// beyond ~25 degrees. Warm within ~20 degrees, Cool within ~50, Cold within ~75. Hot and above stay what the score says.
export function warmth(guess, target) {
  const ang = angleBetween(guess, target);
  const d = Math.exp(-Math.pow(distError(guess, target) / 0.6, 2));
  return Math.max(closeness(guess, target), 0.5 * Math.exp(-Math.pow(ang / 50, 2)) * (0.8 + 0.2 * d));
}

export function scoreOf(guess, target) {
  return Math.round(1000 * closeness(guess, target));
}

export const BANDS = [
  { min: 0.97, word: 'Spot on', emoji: '📸' },
  { min: 0.85, word: 'Burning', emoji: '🔥' },
  { min: 0.65, word: 'Hot', emoji: '🌶️' },
  { min: 0.4, word: 'Warm', emoji: '☀️' },
  { min: 0.18, word: 'Cool', emoji: '🌥️' },
  { min: 0.05, word: 'Cold', emoji: '❄️' },
  { min: 0, word: 'Freezing', emoji: '🧊' },
];

export function bandOf(c) {
  return BANDS.find((b) => c >= b.min);
}
