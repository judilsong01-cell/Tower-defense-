// Automatic deployment for levels the player has not cleared yet.
// It builds a plan once (who goes where, facing which way, in which order) from the
// map geometry, then deploys/redeploys following that plan as DP allows.

import type { Dir, OperatorDef, Point } from '../data/types';
import { DIRS } from '../data/types';
import type { Battle } from './battle';
import { Grid, rangeTiles, routeTiles, tileKey } from './grid';

export interface PlannedDeploy {
  op: string;
  x: number;
  y: number;
  dir: Dir;
}

interface PathInfo {
  routes: number;
  /** Tiles left until the base (smallest across routes). */
  distToBase: number;
  /** Direction from this tile towards where enemies come from. */
  upstream: Dir;
}

function dirTowards(from: Point, to: Point): Dir {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

function priority(def: OperatorDef, seen: Map<string, number>): number {
  const n = seen.get(def.cls) ?? 0;
  seen.set(def.cls, n + 1);
  if (def.cls === 'vanguard') return n === 0 ? 0 : 5;
  if (def.cls === 'defender') return 1;
  if (def.cls === 'sniper') return n === 0 ? 2 : 4;
  return 3; // medic
}

export function planAutoDeploy(battle: Battle): PlannedDeploy[] {
  const grid: Grid = battle.grid;
  const ground = new Map<number, PathInfo & { tile: Point }>();
  const air = new Set<number>();

  for (const route of battle.level.routes) {
    const tiles = routeTiles(grid, route);
    if (route.flying) {
      for (const t of tiles) air.add(tileKey(t[0], t[1]));
      continue;
    }
    tiles.forEach((t, i) => {
      const key = tileKey(t[0], t[1]);
      const dist = tiles.length - 1 - i;
      const upstream = i > 0 ? dirTowards(t, tiles[i - 1]) : 'left';
      const info = ground.get(key);
      if (info) {
        info.routes++;
        if (dist < info.distToBase) info.distToBase = dist;
      } else {
        ground.set(key, { tile: t, routes: 1, distToBase: dist, upstream });
      }
    });
  }

  const highTiles: Point[] = [];
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (grid.deployable(x, y, 'high')) highTiles.push([x, y]);

  const groundCandidates = [...ground.values()]
    .filter((g) => grid.deployable(g.tile[0], g.tile[1], 'ground'))
    .map((g) => {
      const highNear = highTiles.filter((h) => chebyshev(h, g.tile) <= 2).length;
      return { ...g, score: g.routes * 100 + highNear * 5 + g.distToBase };
    })
    .sort((a, b) => b.score - a.score || a.tile[1] - b.tile[1] || a.tile[0] - b.tile[0]);

  const used = new Set<number>();
  const plan: PlannedDeploy[] = [];
  const defs = battle.roster.map((r) => r.def);
  const meleeDefs = defs.filter((d) => d.placement === 'ground');
  const rangedDefs = defs.filter((d) => d.placement === 'high' && !d.heals);
  const medicDefs = defs.filter((d) => d.heals);

  // Main blocker: the defender (or first melee) holds the best chokepoint.
  const anchor = groundCandidates[0];
  if (!anchor) return [];
  const melee = [...meleeDefs].sort((a, b) => (a.cls === 'defender' ? -1 : 0) - (b.cls === 'defender' ? -1 : 0) || b.block - a.block);
  // Backup blockers line up downstream of the anchor, closest first.
  const downstream = groundCandidates
    .filter((g) => g !== anchor && g.distToBase < anchor.distToBase)
    .sort((a, b) => b.distToBase - a.distToBase);
  const meleeSpots = [anchor, ...downstream];
  melee.forEach((def, i) => {
    const spot = meleeSpots[i];
    if (!spot) return;
    used.add(tileKey(spot.tile[0], spot.tile[1]));
    plan.push({ op: def.id, x: spot.tile[0], y: spot.tile[1], dir: spot.upstream });
  });

  const meleeTiles = plan.map((p) => ({ tile: [p.x, p.y] as Point, weight: p.op === melee[0]?.id ? 3 : 1 }));

  const bestHigh = (score: (tiles: Point[]) => number, def: OperatorDef): PlannedDeploy | null => {
    let best: PlannedDeploy | null = null;
    let bestScore = 0;
    for (const h of highTiles) {
      if (used.has(tileKey(h[0], h[1]))) continue;
      for (const dir of DIRS) {
        const s = score(rangeTiles(def.range, h[0], h[1], dir));
        if (s > bestScore) {
          bestScore = s;
          best = { op: def.id, x: h[0], y: h[1], dir };
        }
      }
    }
    if (best) used.add(tileKey(best.x, best.y));
    return best;
  };

  for (const def of [...rangedDefs].sort((a, b) => a.cost - b.cost)) {
    const spot = bestHigh((tiles) => {
      let s = 0;
      for (const [x, y] of tiles) {
        const key = tileKey(x, y);
        if (ground.has(key)) s += 1;
        if (def.canHitAir && air.has(key)) s += 0.5;
        if (meleeTiles.some((m) => chebyshev(m.tile, [x, y]) <= 1 && ground.has(key))) s += 2;
      }
      return s;
    }, def);
    if (spot) plan.push(spot);
  }

  for (const def of medicDefs) {
    const allies = plan.map((p) => ({ tile: [p.x, p.y] as Point, weight: p.op === melee[0]?.id ? 3 : 1 }));
    const spot = bestHigh((tiles) => {
      let s = 0;
      for (const [x, y] of tiles) for (const a of allies) if (a.tile[0] === x && a.tile[1] === y) s += a.weight;
      return s;
    }, def);
    if (spot) plan.push(spot);
  }

  const seen = new Map<string, number>();
  const prio = new Map(defs.map((d) => [d.id, 0]));
  for (const d of [...defs].sort((a, b) => a.cost - b.cost)) prio.set(d.id, priority(d, seen));
  return plan.sort((a, b) => prio.get(a.op)! - prio.get(b.op)!);
}

export class AutoDeployer {
  readonly plan: PlannedDeploy[];
  private started = false;

  constructor(battle: Battle) {
    this.plan = planAutoDeploy(battle);
  }

  /** Call before every battle.step(). */
  update(battle: Battle): void {
    if (!this.started) {
      battle.queue({ type: 'autoSkill', on: true });
      this.started = true;
    }
    for (const p of this.plan) {
      const entry = battle.rosterEntry(p.op);
      if (!entry || entry.status !== 'ready') continue;
      if (battle.canDeployAt(p.op, p.x, p.y)) battle.queue({ type: 'deploy', op: p.op, x: p.x, y: p.y, dir: p.dir });
      // Wait for this one before considering the next, so the plan's order is respected.
      break;
    }
  }
}
