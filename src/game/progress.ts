// Squad choice and stage unlocking. Pure helpers over the save data, so they can be tested.

import { LEVELS } from '../data/levels';
import { FULL_SQUAD } from '../data/levels/common';
import { OPERATORS } from '../data/operators';
import type { LevelDef } from '../data/types';
import type { LevelProgress } from './save';

/** How many operators a squad can take into battle. */
export const SQUAD_MAX = 8;
/** Stars needed on a stage to unlock the next one. */
export const STARS_TO_UNLOCK = 3;

export const DEFAULT_SQUAD: readonly string[] = FULL_SQUAD;

/** The saved squad, cleaned of unknown or repeated ids; the default squad when empty. */
export function playerSquad(saved: readonly string[] | undefined): string[] {
  const squad = [...new Set((saved ?? []).filter((id) => id in OPERATORS))].slice(0, SQUAD_MAX);
  return squad.length > 0 ? squad : [...DEFAULT_SQUAD];
}

/** The stage as played with the player's squad (the AI, replays and the deck all use it). */
export function withSquad(level: LevelDef, squad: readonly string[]): LevelDef {
  return { ...level, squad };
}

/** The first stage is always open; every other one needs 3 stars on the stage before it. */
export function isUnlocked(levelId: string, progress: Record<string, LevelProgress>): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return i === 0;
  return (progress[LEVELS[i - 1].id]?.stars ?? 0) >= STARS_TO_UNLOCK;
}

/** The stage that has to be 3-starred to open this one (undefined for the first stage). */
export function previousLevel(levelId: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i > 0 ? LEVELS[i - 1] : undefined;
}

export function totalStars(progress: Record<string, LevelProgress>): number {
  return LEVELS.reduce((n, l) => n + (progress[l.id]?.stars ?? 0), 0);
}
