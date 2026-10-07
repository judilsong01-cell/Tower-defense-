// Static game data definitions. Everything here is plain data so the
// simulation can run without Phaser (tests, replays, AI).

export type Dir = 'right' | 'down' | 'left' | 'up';
export const DIRS: readonly Dir[] = ['right', 'down', 'left', 'up'];

export type OperatorClass = 'vanguard' | 'defender' | 'medic' | 'sniper';

/** Where an operator may be deployed: ground (melee) tiles or high ground (ranged) tiles. */
export type Placement = 'ground' | 'high';

/** A tile offset relative to the operator, defined as if the operator faces right (+x forward, +y down). */
export type Offset = readonly [number, number];

export interface SkillEffect {
  /** Instantly grants DP when the skill starts. */
  gainDp?: number;
  atkMul?: number;
  defMul?: number;
  /** Multiplier on the attack interval (< 1 means faster attacks). */
  intervalMul?: number;
  /** Extra simultaneous targets (attacks or heals) while active. */
  extraTargets?: number;
}

export interface SkillDef {
  /** i18n key suffix: `skill.<id>.name` / `skill.<id>.desc`. */
  id: string;
  spCost: number;
  spInitial: number;
  /** Seconds. 0 means an instant skill. */
  duration: number;
  effect: SkillEffect;
}

export interface OperatorDef {
  id: string;
  /** Proper name, shown as-is in every language. */
  name: string;
  cls: OperatorClass;
  placement: Placement;
  cost: number;
  /** Redeploy cooldown in seconds after retreat or defeat. */
  redeploy: number;
  hp: number;
  /** Attack power. For medics this is the heal amount. */
  atk: number;
  def: number;
  /** Seconds between attacks. */
  interval: number;
  block: number;
  range: readonly Offset[];
  /** Number of enemies hit (or allies healed) per action. */
  targets: number;
  /** Splash radius in tiles around the main target (0 = single target). */
  splash: number;
  canHitAir: boolean;
  prioritizeAir: boolean;
  heals: boolean;
  /** DP gained when this operator lands a killing blow. */
  dpOnKill: number;
  skill: SkillDef;
}

export interface EnemyDef {
  id: string;
  hp: number;
  atk: number;
  def: number;
  interval: number;
  /** Tiles per second. */
  speed: number;
  /** Attack range in tiles while walking. 0 = only attacks the operator blocking it. */
  range: number;
  flying: boolean;
  /** How many block slots this enemy uses. */
  blockCost: number;
  /** Lives lost when this enemy reaches the base. */
  lifeDamage: number;
  boss?: boolean;
}

export type Point = readonly [number, number];

export interface RouteDef {
  id: string;
  spawn: Point;
  base: Point;
  /** Optional points the route must pass through, in order. */
  checkpoints?: readonly Point[];
  /** Flying routes go in straight lines between points and ignore walls. */
  flying?: boolean;
}

export interface WaveDef {
  /** Seconds since battle start. */
  time: number;
  enemy: string;
  route: string;
  count: number;
  /** Seconds between each spawn of this group. */
  interval: number;
}

/**
 * Map legend:
 *  `.` ground, deployable (melee)     `,` ground, not deployable
 *  `H` high ground, deployable (ranged)  `h` high ground, not deployable
 *  `#` wall / void                   `S` enemy spawn       `B` base (protect it)
 */
export interface LevelDef {
  id: string;
  /** i18n key prefix: `level.<id>.name` / `level.<id>.desc`. */
  map: readonly string[];
  routes: readonly RouteDef[];
  waves: readonly WaveDef[];
  lives: number;
  startDp: number;
  dpPerSecond: number;
  deployLimit: number;
  squad: readonly string[];
}
