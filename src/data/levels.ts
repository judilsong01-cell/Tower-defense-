import type { LevelDef } from './types';

// Legend: see LevelDef in ./types.ts
export const LEVEL_1: LevelDef = {
  id: 'l1',
  map: [
    '##############',
    'S....HH#######',
    '#HH#.HH#HHH###',
    '####.......,,B',
    '#HH#.HH#HHH###',
    'S....HH#######',
    '##############',
  ],
  routes: [
    { id: 'top', spawn: [0, 1], base: [13, 3] },
    { id: 'bottom', spawn: [0, 5], base: [13, 3] },
    { id: 'airTop', spawn: [0, 1], base: [13, 3], flying: true },
    { id: 'airBottom', spawn: [0, 5], base: [13, 3], flying: true },
  ],
  waves: [
    { time: 3, enemy: 'peacekeeper', route: 'top', count: 3, interval: 3 },
    { time: 9, enemy: 'peacekeeper', route: 'bottom', count: 3, interval: 3 },
    { time: 20, enemy: 'hound', route: 'top', count: 4, interval: 1.2 },
    { time: 28, enemy: 'rifleman', route: 'bottom', count: 2, interval: 4 },
    { time: 36, enemy: 'drone', route: 'airTop', count: 2, interval: 3 },
    { time: 44, enemy: 'riot', route: 'bottom', count: 2, interval: 6 },
    { time: 50, enemy: 'peacekeeper', route: 'top', count: 4, interval: 2.5 },
    { time: 62, enemy: 'hound', route: 'bottom', count: 3, interval: 1.2 },
    { time: 64, enemy: 'drone', route: 'airBottom', count: 2, interval: 3 },
    { time: 76, enemy: 'rifleman', route: 'top', count: 2, interval: 3 },
    { time: 78, enemy: 'riot', route: 'bottom', count: 2, interval: 5 },
    { time: 92, enemy: 'cleric', route: 'top', count: 1, interval: 0 },
    { time: 94, enemy: 'peacekeeper', route: 'bottom', count: 4, interval: 2.5 },
    { time: 100, enemy: 'drone', route: 'airTop', count: 2, interval: 3 },
  ],
  lives: 10,
  startDp: 10,
  dpPerSecond: 1,
  deployLimit: 5,
  squad: ['brasa', 'faisca', 'muralha', 'lirio', 'corvo', 'trovao'],
};

export const LEVELS: readonly LevelDef[] = [LEVEL_1];

export function getLevel(id: string): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}
