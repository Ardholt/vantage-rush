// Rush scoring: where did the photographer stand? Distances are world units on the ground plane, from the clicked
// map point to the camera's ground position. Speed only scales an accurate click, so spam-clicking pays nothing.
import { poseToVec } from './pose.js';

export const ROUND_SECS = 25;
export const MAP_HALF = 15; // the map shows +-15 units around the diorama's centre
export const TOL = 5;       // accuracy falls to 1/e at this distance

export function camGround(pose) {
  const v = poseToVec(pose);
  return { x: v[0] * pose.dist, z: v[2] * pose.dist };
}
export const accuracy = (d) => Math.exp(-Math.pow(d / TOL, 2));
export function roundScore(d, secsLeft) {
  const frac = Math.max(0, Math.min(1, secsLeft / ROUND_SECS));
  return Math.round(accuracy(d) * (700 + 300 * frac));
}
