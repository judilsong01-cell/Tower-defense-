import type { LevelDef } from '../types';
import { CHAPTER_1 } from './chapter1';
import { CHAPTER_2 } from './chapter2';
import { CHAPTER_3 } from './chapter3';

export const LEVELS: readonly LevelDef[] = [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3];

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
