import { ENEMIES } from '../enemies';
import type { LevelDef } from '../types';
import { CHAPTER_1 } from './chapter1';
import { CHAPTER_2 } from './chapter2';
import { CHAPTER_3 } from './chapter3';

/**
 * Global economy and difficulty knobs, applied on top of every stage's own numbers.
 * Each stage must stay clearable with 3 stars (no lives lost): see scripts/balance-report.ts
 * and the "3 stars" test.
 */
export const BALANCE = {
  /** Extra DP at the start, so the first line can be set up. */
  extraStartDp: 4,
  dpPerSecond: 1,
  /** Seconds added before every wave (time to deploy before the first enemy). */
  grace: 5,
  /** Multiplier on the number of regular enemies per wave (bosses are kept). */
  countScale: 1,
};

/** Applies the balance knobs to a stage (exported for scripts/balance-report.ts). */
export function balance(level: LevelDef, b: typeof BALANCE = BALANCE): LevelDef {
  return {
    ...level,
    startDp: level.startDp + b.extraStartDp,
    dpPerSecond: b.dpPerSecond,
    waves: level.waves.map((w) => ({
      ...w,
      time: w.time + b.grace,
      count: ENEMIES[w.enemy]?.boss ? w.count : Math.max(1, Math.round(w.count * b.countScale)),
    })),
  };
}

export const RAW_LEVELS: readonly LevelDef[] = [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3];

export const LEVELS: readonly LevelDef[] = RAW_LEVELS.map((l) => balance(l));

export function getLevel(id: string): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

/** Display label such as "2-7". */
export function levelLabel(level: LevelDef): string {
  const index = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level) + 1;
  return `${level.chapter}-${index}`;
}

export const CHAPTERS: readonly number[] = [...new Set(LEVELS.map((l) => l.chapter))];
