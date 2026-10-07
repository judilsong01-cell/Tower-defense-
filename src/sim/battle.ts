// Deterministic battle simulation. Runs at a fixed tick rate with no randomness,
// so the same list of actions at the same ticks always produces the same result.
// That property is what makes replays ("auto deploy") work.

import { ENEMIES } from '../data/enemies';
import { OPERATORS } from '../data/operators';
import type { Dir, EnemyDef, LevelDef, OperatorDef, Point } from '../data/types';
import { buildRoutePath, Grid, rangeTiles, tileKey } from './grid';

export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;
export const DP_CAP = 99;
/** How close (in tiles, per axis) an enemy must get to a melee operator's tile centre to be blocked. */
const BLOCK_REACH = 0.8;
/** Physical damage never drops below this fraction of the attack value. */
const MIN_DAMAGE_RATIO = 0.05;
const RETREAT_REFUND = 0.5;
/** Each redeploy raises the cost by 50% of the base cost, up to +100%. */
const REDEPLOY_COST_STEP = 0.5;
const REDEPLOY_COST_MAX_STEPS = 2;

export type Action =
  | { type: 'deploy'; op: string; x: number; y: number; dir: Dir }
  | { type: 'retreat'; op: string }
  | { type: 'skill'; op: string }
  | { type: 'autoSkill'; on: boolean };

export type RosterStatus = 'ready' | 'deployed' | 'cooldown';

export interface RosterEntry {
  readonly def: OperatorDef;
  status: RosterStatus;
  /** Seconds left before the operator can be deployed again. */
  cooldown: number;
  deployCount: number;
}

export interface OperatorUnit {
  readonly uid: number;
  readonly def: OperatorDef;
  readonly x: number;
  readonly y: number;
  readonly dir: Dir;
  readonly maxHp: number;
  readonly paidCost: number;
  readonly rangeList: readonly Point[];
  readonly range: ReadonlySet<number>;
  hp: number;
  sp: number;
  skillActive: boolean;
  skillTime: number;
  attackCooldown: number;
  /** Enemy uids currently blocked by this operator. */
  blocking: number[];
}

export interface EnemyUnit {
  readonly uid: number;
  readonly def: EnemyDef;
  readonly path: readonly Point[];
  readonly totalLength: number;
  progress: number;
  x: number;
  y: number;
  hp: number;
  readonly maxHp: number;
  blockedBy: number | null;
  attackCooldown: number;
}

export type BattleEvent =
  | { type: 'spawn'; uid: number }
  | { type: 'deploy'; uid: number; op: string }
  | { type: 'retreat'; uid: number; op: string }
  | { type: 'opDied'; uid: number; op: string }
  | { type: 'skill'; uid: number; op: string }
  | { type: 'skillEnd'; uid: number; op: string }
  | { type: 'attack'; uid: number; target: number }
  | { type: 'heal'; uid: number; target: number; amount: number }
  | { type: 'enemyAttack'; uid: number; target: number; ranged: boolean }
  | { type: 'enemyHit'; uid: number; amount: number }
  | { type: 'opHit'; uid: number; amount: number }
  | { type: 'enemyDied'; uid: number }
  | { type: 'leak'; uid: number };

export type BattleResult = 'running' | 'won' | 'lost';

interface ScheduledSpawn {
  tick: number;
  enemy: EnemyDef;
  route: string;
}

export function physicalDamage(atk: number, def: number): number {
  return Math.round(Math.max(atk - def, atk * MIN_DAMAGE_RATIO));
}

export class Battle {
  readonly level: LevelDef;
  readonly grid: Grid;
  readonly routePaths: ReadonlyMap<string, readonly Point[]>;
  readonly roster: RosterEntry[];
  readonly totalEnemies: number;

  tick = 0;
  dp: number;
  lives: number;
  result: BattleResult = 'running';
  autoSkill = false;
  killed = 0;
  leaked = 0;
  operators: OperatorUnit[] = [];
  enemies: EnemyUnit[] = [];
  /** Events produced by the last call to step(). */
  events: BattleEvent[] = [];
  /** Called for every action that was valid and applied (used to record replays). */
  onAction?: (tick: number, action: Action) => void;

  private readonly schedule: ScheduledSpawn[];
  private spawnIndex = 0;
  private pending: Action[] = [];
  private nextUid = 1;

  constructor(level: LevelDef) {
    this.level = level;
    this.grid = new Grid(level.map);
    const paths = new Map<string, readonly Point[]>();
    for (const route of level.routes) paths.set(route.id, buildRoutePath(this.grid, route));
    this.routePaths = paths;
    this.roster = level.squad.map((id) => {
      const def = OPERATORS[id];
      if (!def) throw new Error(`Unknown operator in squad: ${id}`);
      return { def, status: 'ready' as RosterStatus, cooldown: 0, deployCount: 0 };
    });
    this.dp = level.startDp;
    this.lives = level.lives;

    const schedule: ScheduledSpawn[] = [];
    for (const wave of level.waves) {
      const enemy = ENEMIES[wave.enemy];
      if (!enemy) throw new Error(`Unknown enemy in wave: ${wave.enemy}`);
      if (!paths.has(wave.route)) throw new Error(`Unknown route in wave: ${wave.route}`);
      for (let i = 0; i < wave.count; i++) {
        schedule.push({ tick: Math.round((wave.time + i * wave.interval) * TICK_RATE), enemy, route: wave.route });
      }
    }
    // Stable sort keeps definition order for spawns on the same tick.
    this.schedule = schedule.sort((a, b) => a.tick - b.tick);
    this.totalEnemies = schedule.length;
  }

  get time(): number {
    return this.tick / TICK_RATE;
  }

  get deployedCount(): number {
    return this.operators.length;
  }

  /** Queues an action to be applied at the start of the next step. */
  queue(action: Action): void {
    this.pending.push(action);
  }

  rosterEntry(opId: string): RosterEntry | undefined {
    return this.roster.find((r) => r.def.id === opId);
  }

  operatorById(opId: string): OperatorUnit | undefined {
    return this.operators.find((o) => o.def.id === opId);
  }

  operatorAt(x: number, y: number): OperatorUnit | undefined {
    return this.operators.find((o) => o.x === x && o.y === y);
  }

  costOf(opId: string): number {
    const entry = this.rosterEntry(opId);
    if (!entry) return Infinity;
    const steps = Math.min(entry.deployCount, REDEPLOY_COST_MAX_STEPS);
    return Math.round(entry.def.cost * (1 + REDEPLOY_COST_STEP * steps));
  }

  refundOf(opId: string): number {
    const unit = this.operatorById(opId);
    return unit ? Math.floor(unit.paidCost * RETREAT_REFUND) : 0;
  }

  /** Whether the operator could be deployed right now on any tile (ignores the tile). */
  canDeployOperator(opId: string): boolean {
    const entry = this.rosterEntry(opId);
    return (
      this.result === 'running' &&
      !!entry &&
      entry.status === 'ready' &&
      this.deployedCount < this.level.deployLimit &&
      Math.floor(this.dp) >= this.costOf(opId)
    );
  }

  canDeployAt(opId: string, x: number, y: number): boolean {
    const entry = this.rosterEntry(opId);
    if (!entry || !this.canDeployOperator(opId)) return false;
    return this.grid.deployable(x, y, entry.def.placement) && !this.operatorAt(x, y);
  }

  canUseSkill(opId: string): boolean {
    const unit = this.operatorById(opId);
    return !!unit && !unit.skillActive && unit.sp >= unit.def.skill.spCost && this.result === 'running';
  }

  stars(): number {
    if (this.result !== 'won') return 0;
    const lost = this.level.lives - this.lives;
    if (lost === 0) return 3;
    if (lost <= 3) return 2;
    return 1;
  }

  /** Advances the simulation by one fixed tick. */
  step(): void {
    this.events = [];
    if (this.result !== 'running') return;

    this.applyPending();
    this.dp = Math.min(DP_CAP, this.dp + this.level.dpPerSecond * DT);
    this.updateRoster();
    this.spawnEnemies();
    this.moveEnemies();
    this.updateSkills();
    this.operatorsAct();
    this.enemiesAct();
    this.cleanup();

    if (this.lives <= 0) {
      this.lives = 0;
      this.result = 'lost';
    } else if (this.spawnIndex >= this.schedule.length && this.enemies.length === 0) {
      this.result = 'won';
    }
    this.tick++;
  }

  // ---------------------------------------------------------------------------

  private applyPending(): void {
    const actions = this.pending;
    this.pending = [];
    for (const action of actions) {
      if (this.apply(action)) this.onAction?.(this.tick, action);
    }
  }

  private apply(action: Action): boolean {
    switch (action.type) {
      case 'deploy':
        return this.deploy(action.op, action.x, action.y, action.dir);
      case 'retreat': {
        const unit = this.operatorById(action.op);
        if (!unit) return false;
        this.dp = Math.min(DP_CAP, this.dp + this.refundOf(action.op));
        this.removeOperator(unit);
        this.events.push({ type: 'retreat', uid: unit.uid, op: unit.def.id });
        return true;
      }
      case 'skill': {
        const unit = this.operatorById(action.op);
        if (!unit || !this.canUseSkill(action.op)) return false;
        this.activateSkill(unit);
        return true;
      }
      case 'autoSkill':
        if (this.autoSkill === action.on) return false;
        this.autoSkill = action.on;
        return true;
    }
  }

  private deploy(opId: string, x: number, y: number, dir: Dir): boolean {
    if (!this.canDeployAt(opId, x, y)) return false;
    const entry = this.rosterEntry(opId)!;
    const def = entry.def;
    const cost = this.costOf(opId);
    this.dp -= cost;
    entry.status = 'deployed';
    entry.deployCount++;
    const rangeList = rangeTiles(def.range, x, y, dir).filter(([tx, ty]) => this.grid.inBounds(tx, ty));
    const unit: OperatorUnit = {
      uid: this.nextUid++,
      def,
      x,
      y,
      dir,
      maxHp: def.hp,
      paidCost: cost,
      rangeList,
      range: new Set(rangeList.map(([tx, ty]) => tileKey(tx, ty))),
      hp: def.hp,
      sp: def.skill.spInitial,
      skillActive: false,
      skillTime: 0,
      attackCooldown: 0,
      blocking: [],
    };
    this.operators.push(unit);
    this.events.push({ type: 'deploy', uid: unit.uid, op: def.id });
    return true;
  }

  private removeOperator(unit: OperatorUnit): void {
    for (const e of this.enemies) if (e.blockedBy === unit.uid) e.blockedBy = null;
    this.operators = this.operators.filter((o) => o !== unit);
    const entry = this.rosterEntry(unit.def.id)!;
    entry.status = 'cooldown';
    entry.cooldown = unit.def.redeploy;
  }

  private updateRoster(): void {
    for (const entry of this.roster) {
      if (entry.status !== 'cooldown') continue;
      entry.cooldown -= DT;
      if (entry.cooldown <= 0) {
        entry.cooldown = 0;
        entry.status = 'ready';
      }
    }
  }

  private spawnEnemies(): void {
    while (this.spawnIndex < this.schedule.length && this.schedule[this.spawnIndex].tick <= this.tick) {
      const s = this.schedule[this.spawnIndex++];
      const path = this.routePaths.get(s.route)!;
      let total = 0;
      for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
      const enemy: EnemyUnit = {
        uid: this.nextUid++,
        def: s.enemy,
        path,
        totalLength: total,
        progress: 0,
        x: path[0][0],
        y: path[0][1],
        hp: s.enemy.hp,
        maxHp: s.enemy.hp,
        blockedBy: null,
        attackCooldown: 0,
      };
      this.enemies.push(enemy);
      this.events.push({ type: 'spawn', uid: enemy.uid });
    }
  }

  private moveEnemies(): void {
    for (const e of this.enemies) {
      if (e.blockedBy !== null) continue;
      e.progress += e.def.speed * DT;
      if (e.progress >= e.totalLength) {
        e.progress = e.totalLength;
        e.hp = 0;
        this.lives -= e.def.lifeDamage;
        this.leaked++;
        this.events.push({ type: 'leak', uid: e.uid });
        continue;
      }
      positionOnPath(e);
      if (!e.def.flying) this.tryBlock(e);
    }
  }

  private tryBlock(e: EnemyUnit): void {
    for (const op of this.operators) {
      if (op.def.placement !== 'ground') continue;
      if (Math.abs(e.x - op.x) >= BLOCK_REACH || Math.abs(e.y - op.y) >= BLOCK_REACH) continue;
      if (this.blockLoad(op) + e.def.blockCost > op.def.block) continue;
      e.blockedBy = op.uid;
      return;
    }
  }

  private blockLoad(op: OperatorUnit): number {
    let load = 0;
    for (const e of this.enemies) if (e.blockedBy === op.uid && e.hp > 0) load += e.def.blockCost;
    return load;
  }

  private updateSkills(): void {
    for (const op of this.operators) {
      const skill = op.def.skill;
      if (op.skillActive) {
        op.skillTime -= DT;
        if (op.skillTime <= 0) {
          op.skillActive = false;
          op.skillTime = 0;
          this.events.push({ type: 'skillEnd', uid: op.uid, op: op.def.id });
        }
        continue;
      }
      op.sp = Math.min(skill.spCost, op.sp + DT);
      if (this.autoSkill && op.sp >= skill.spCost) this.activateSkill(op);
    }
  }

  private activateSkill(op: OperatorUnit): void {
    const skill = op.def.skill;
    op.sp = 0;
    if (skill.effect.gainDp) this.dp = Math.min(DP_CAP, this.dp + skill.effect.gainDp);
    if (skill.duration > 0) {
      op.skillActive = true;
      op.skillTime = skill.duration;
    }
    this.events.push({ type: 'skill', uid: op.uid, op: op.def.id });
  }

  /** Current combat stats including active skill modifiers. */
  stats(op: OperatorUnit): { atk: number; def: number; interval: number; targets: number } {
    const fx = op.skillActive ? op.def.skill.effect : {};
    return {
      atk: op.def.atk * (fx.atkMul ?? 1),
      def: op.def.def * (fx.defMul ?? 1),
      interval: op.def.interval * (fx.intervalMul ?? 1),
      targets: op.def.targets + (fx.extraTargets ?? 0),
    };
  }

  private operatorsAct(): void {
    for (const op of this.operators) {
      if (op.attackCooldown > 0) op.attackCooldown -= DT;
      if (op.attackCooldown > 0) continue;
      const s = this.stats(op);
      const acted = op.def.heals ? this.heal(op, s.atk, s.targets) : this.attack(op, s.atk, s.targets);
      if (acted) op.attackCooldown += s.interval;
      else op.attackCooldown = 0;
    }
  }

  private heal(op: OperatorUnit, amount: number, count: number): boolean {
    const targets = this.operators
      .filter((o) => o.hp > 0 && o.hp < o.maxHp && op.range.has(tileKey(o.x, o.y)))
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.uid - b.uid)
      .slice(0, count);
    for (const t of targets) {
      const healed = Math.min(t.maxHp - t.hp, Math.round(amount));
      t.hp += healed;
      this.events.push({ type: 'heal', uid: op.uid, target: t.uid, amount: healed });
    }
    return targets.length > 0;
  }

  private attack(op: OperatorUnit, atk: number, count: number): boolean {
    const candidates = this.enemies.filter((e) => {
      if (e.hp <= 0) return false;
      if (e.blockedBy === op.uid) return true;
      if (e.def.flying && !op.def.canHitAir) return false;
      return op.range.has(tileKey(Math.round(e.x), Math.round(e.y)));
    });
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => {
      const blockA = a.blockedBy === op.uid ? 0 : 1;
      const blockB = b.blockedBy === op.uid ? 0 : 1;
      if (blockA !== blockB) return blockA - blockB;
      if (op.def.prioritizeAir && a.def.flying !== b.def.flying) return a.def.flying ? -1 : 1;
      const remA = a.totalLength - a.progress;
      const remB = b.totalLength - b.progress;
      return remA - remB || a.uid - b.uid;
    });
    const main = candidates.slice(0, count);
    const hit = new Set<EnemyUnit>(main);
    if (op.def.splash > 0) {
      for (const target of main) {
        for (const e of this.enemies) {
          if (e.hp <= 0 || hit.has(e)) continue;
          if (e.def.flying && !op.def.canHitAir) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) <= op.def.splash) hit.add(e);
        }
      }
    }
    for (const target of main) this.events.push({ type: 'attack', uid: op.uid, target: target.uid });
    for (const e of hit) {
      const dmg = physicalDamage(atk, e.def.def);
      e.hp -= dmg;
      this.events.push({ type: 'enemyHit', uid: e.uid, amount: dmg });
      if (e.hp <= 0) {
        this.killed++;
        if (op.def.dpOnKill) this.dp = Math.min(DP_CAP, this.dp + op.def.dpOnKill);
        this.events.push({ type: 'enemyDied', uid: e.uid });
      }
    }
    return true;
  }

  private enemiesAct(): void {
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.def.atk <= 0) continue;
      if (e.attackCooldown > 0) e.attackCooldown -= DT;
      if (e.attackCooldown > 0) continue;
      let target: OperatorUnit | undefined;
      let ranged = false;
      if (e.blockedBy !== null) {
        target = this.operators.find((o) => o.uid === e.blockedBy);
      } else if (e.def.range > 0) {
        // Like in the genre's classics, ranged enemies focus the most recently deployed operator in range.
        for (const o of this.operators) {
          if (o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= e.def.range && (!target || o.uid > target.uid)) target = o;
        }
        ranged = true;
      }
      if (!target || target.hp <= 0) {
        e.attackCooldown = 0;
        continue;
      }
      const dmg = physicalDamage(e.def.atk, this.stats(target).def);
      target.hp -= dmg;
      e.attackCooldown += e.def.interval;
      this.events.push({ type: 'enemyAttack', uid: e.uid, target: target.uid, ranged });
      this.events.push({ type: 'opHit', uid: target.uid, amount: dmg });
    }
  }

  private cleanup(): void {
    for (const op of [...this.operators]) {
      if (op.hp > 0) continue;
      this.removeOperator(op);
      this.events.push({ type: 'opDied', uid: op.uid, op: op.def.id });
    }
    if (this.enemies.some((e) => e.hp <= 0)) this.enemies = this.enemies.filter((e) => e.hp > 0);
    const alive = new Set(this.operators.map((o) => o.uid));
    for (const e of this.enemies) if (e.blockedBy !== null && !alive.has(e.blockedBy)) e.blockedBy = null;
    for (const op of this.operators) op.blocking = this.enemies.filter((e) => e.blockedBy === op.uid).map((e) => e.uid);
  }
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function positionOnPath(e: EnemyUnit): void {
  let remaining = e.progress;
  for (let i = 1; i < e.path.length; i++) {
    const a = e.path[i - 1];
    const b = e.path[i];
    const len = dist(a, b);
    if (remaining <= len) {
      const t = len === 0 ? 0 : remaining / len;
      e.x = a[0] + (b[0] - a[0]) * t;
      e.y = a[1] + (b[1] - a[1]) * t;
      return;
    }
    remaining -= len;
  }
  const last = e.path[e.path.length - 1];
  e.x = last[0];
  e.y = last[1];
}
