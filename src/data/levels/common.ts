import type { WaveDef } from '../types';

export const BASE_SQUAD = ['brasa', 'faisca', 'muralha', 'lirio', 'corvo', 'trovao'] as const;
/** From 1-4 on, two more operators join to handle multiple fronts and air raids. */
export const FULL_SQUAD = [...BASE_SQUAD, 'bastiao', 'falcao'] as const;

/** Shorthand for a wave: `count` enemies on `route`, `interval` seconds apart, starting at `time`. */
export function w(time: number, enemy: string, route: string, count = 1, interval = 0): WaveDef {
  return { time, enemy, route, count, interval };
}
