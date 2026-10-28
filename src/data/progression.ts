// Operator levels: experience from won stages raises an operator's level, which scales its
// HP, ATK (heal for medics) and DEF. Every stage is verified 3-starrable at level 1
// (src/data/solutions.ts), so levels only ever make the game easier.

import type { LevelDef, OperatorDef } from './types';

export const MAX_LEVEL = 30;

/** Per level above 1. Level 30: HP +87%, ATK/DEF +72.5%. */
export const LEVEL_GROWTH = { hp: 0.03, atk: 0.025, def: 0.025 };

export interface OperatorProgress {
  level: number;
  /** Experience towards the next level. */
  xp: number;
}

/** Experience needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

/** The operator's stats at a level (cost, range and skill do not change). */
export function levelledDef(def: OperatorDef, level: number): OperatorDef {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))) - 1;
  if (l === 0) return def;
  return {
    ...def,
    hp: Math.round(def.hp * (1 + LEVEL_GROWTH.hp * l)),
    atk: Math.round(def.atk * (1 + LEVEL_GROWTH.atk * l)),
    def: Math.round(def.def * (1 + LEVEL_GROWTH.def * l)),
  };
}

/** Experience each squad member earns for winning a stage. */
export function stageXp(level: LevelDef, stars: number, firstClear: boolean): number {
  const base = 80 + 40 * level.chapter;
  const byStars = [0, 0.6, 0.8, 1][Math.max(0, Math.min(3, stars))];
  return Math.round(base * byStars * (firstClear ? 2 : 1));
}

/** Adds experience; returns the new progress and how many levels were gained. */
export function addXp(p: OperatorProgress, gain: number): OperatorProgress & { gained: number } {
  let { level, xp } = p;
  let gained = 0;
  xp += gain;
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    gained++;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { level, xp, gained };
}
