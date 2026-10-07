import type { EnemyDef } from './types';

const base = { range: 0, flying: false, blockCost: 1, lifeDamage: 1 } as const;

export const ENEMIES: Record<string, EnemyDef> = {
  /** Standard regime enforcer with a baton. */
  peacekeeper: { ...base, id: 'peacekeeper', hp: 1650, atk: 210, def: 100, interval: 1.7, speed: 1.0 },
  /** Fast, fragile patrol hound. */
  hound: { ...base, id: 'hound', hp: 820, atk: 190, def: 0, interval: 1.4, speed: 1.9 },
  /** Slow riot trooper with a shield; takes two block slots. */
  riot: { ...base, id: 'riot', hp: 3200, atk: 320, def: 300, interval: 2.5, speed: 0.55, blockCost: 2 },
  /** Rifleman who shoots operators in range while walking. */
  rifleman: { ...base, id: 'rifleman', hp: 1300, atk: 240, def: 60, interval: 2.4, speed: 0.85, range: 2.0 },
  /** Surveillance drone: flies straight to the base, cannot be blocked. */
  drone: { ...base, id: 'drone', hp: 1100, atk: 0, def: 50, interval: 1.0, speed: 1.2, flying: true },
  /** Armed drone: flies straight to the base and shoots operators in range. */
  gunship: { ...base, id: 'gunship', hp: 1500, atk: 230, def: 90, interval: 2.2, speed: 0.9, range: 2.0, flying: true },
  /** Heavy executioner with a hammer: slow, tough, takes two block slots and costs two lives. */
  executor: { ...base, id: 'executor', hp: 5200, atk: 620, def: 320, interval: 2.8, speed: 0.5, blockCost: 2, lifeDamage: 2 },
  /** Elite cleric: gun-kata master. Boss of the level. */
  cleric: {
    ...base,
    id: 'cleric',
    hp: 9000,
    atk: 520,
    def: 220,
    interval: 1.6,
    speed: 0.75,
    range: 1.6,
    lifeDamage: 2,
    boss: true,
  },
};
