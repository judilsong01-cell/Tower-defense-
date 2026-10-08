import type { EnemyDef } from './types';

const base = { range: 0, flying: false, blockCost: 1, lifeDamage: 1 } as const;

// Each enemy has an "ideal counter" (see docs/DESIGN.md):
//   blade     -> Brasa, Faísca          impact    -> Muralha, Bastião
//   pierce    -> Corvo, Falcão          antiAir   -> Falcão
//   explosive -> Trovão                 burn      -> Lírio (heals put out fires)
export const ENEMIES: Record<string, EnemyDef> = {
  /** Standard regime enforcer. No weakness: anyone can handle it. */
  peacekeeper: { ...base, id: 'peacekeeper', hp: 1650, atk: 210, def: 100, interval: 1.7, speed: 1.0 },
  /** Fast patrol hound: dodges half the shots from high ground. Vanguard blades catch it. */
  hound: { ...base, id: 'hound', hp: 900, atk: 190, def: 40, interval: 1.4, speed: 1.9, weak: ['blade'], evadeRanged: 0.5 },
  /** Riot trooper: the shield stops blades and bullets, but a defender's bash breaks it. */
  riot: { ...base, id: 'riot', hp: 3200, atk: 320, def: 300, interval: 2.5, speed: 0.55, blockCost: 2, weak: ['impact'], resist: ['blade', 'pierce'] },
  /** Rifleman who shoots operators in range while walking. Snipers outgun it. */
  rifleman: { ...base, id: 'rifleman', hp: 1300, atk: 240, def: 60, interval: 2.4, speed: 0.85, range: 2.0, weak: ['pierce'] },
  /** Surveillance drone: flies straight to the base. */
  drone: { ...base, id: 'drone', hp: 1100, atk: 0, def: 50, interval: 1.0, speed: 1.2, flying: true, weak: ['antiAir'] },
  /** Armoured assault drone: shoots operators; plain bullets bounce off, flak brings it down. */
  gunship: { ...base, id: 'gunship', hp: 1500, atk: 230, def: 90, interval: 2.2, speed: 0.9, range: 2.0, flying: true, weak: ['antiAir'], resist: ['pierce'] },
  /** Heavy executioner: armour shrugs off blades, explosives crack it. */
  executor: { ...base, id: 'executor', hp: 5200, atk: 620, def: 320, interval: 2.8, speed: 0.5, blockCost: 2, lifeDamage: 2, weak: ['explosive'], resist: ['blade'] },
  /** Book burner with a flamethrower: sets operators on fire. A medic puts the fire out. */
  incinerator: {
    ...base,
    id: 'incinerator',
    hp: 1700,
    atk: 160,
    def: 120,
    interval: 2.0,
    speed: 0.8,
    range: 1.6,
    weak: ['pierce'],
    burn: { dps: 90, duration: 5 },
  },
  /** Camouflaged infiltrator: invisible to high ground until someone blocks it. */
  infiltrator: { ...base, id: 'infiltrator', hp: 1500, atk: 290, def: 90, interval: 1.2, speed: 1.3, weak: ['blade'], camouflage: true },
  /** Regime medic: patches up nearby enemies. Fragile: shoot it first. */
  medic: { ...base, id: 'medic', hp: 1250, atk: 0, def: 60, interval: 1.0, speed: 0.9, weak: ['pierce'], heals: { amount: 260, interval: 2.5, range: 1.6 } },
  /** Armoured transport: almost immune to blades and bullets; only explosives hurt it. */
  armored: {
    ...base,
    id: 'armored',
    hp: 7000,
    atk: 420,
    def: 700,
    interval: 3.0,
    speed: 0.4,
    blockCost: 3,
    lifeDamage: 2,
    weak: ['explosive'],
    resist: ['blade', 'pierce'],
  },
  /** Elite cleric: gun-kata master who dodges shots. Pin it down with a defender. Boss. */
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
    weak: ['impact'],
    evadeRanged: 0.5,
  },
};
