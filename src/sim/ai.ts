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
  /** Indices of the ground routes that cross this tile. */
  routeIds: Set<number>;
  /** Tiles left until the base (smallest across routes). */
  distToBase: number;
  /** Tiles walked since the spawn (smallest across routes). */
  distFromSpawn: number;
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

  let routeCount = 0;
  for (const route of battle.level.routes) {
    const tiles = routeTiles(grid, route);
    if (route.flying) {
      for (const t of tiles) air.add(tileKey(t[0], t[1]));
      continue;
    }
    const routeId = routeCount++;
    tiles.forEach((t, i) => {
      const key = tileKey(t[0], t[1]);
      const dist = tiles.length - 1 - i;
      const upstream = i > 0 ? dirTowards(t, tiles[i - 1]) : 'left';
      const info = ground.get(key);
      if (info) {
        info.routeIds.add(routeId);
        info.distToBase = Math.min(info.distToBase, dist);
        info.distFromSpawn = Math.min(info.distFromSpawn, i);
      } else {
        ground.set(key, { tile: t, routeIds: new Set([routeId]), distToBase: dist, distFromSpawn: i, upstream });
      }
    });
  }

  const highTiles: Point[] = [];
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (grid.deployable(x, y, 'high')) highTiles.push([x, y]);

  const groundCandidates = [...ground.values()]
    .filter((g) => grid.deployable(g.tile[0], g.tile[1], 'ground'))
    .map((g) => {
      const highNear = highTiles.filter((h) => chebyshev(h, g.tile) <= 2).length;
      // Far from the spawn = enemies take longer to arrive, so a blocker deployed late still catches them.
      return { ...g, score: g.routeIds.size * 100 + highNear * 5 + Math.min(g.distFromSpawn, 12) * 2 };
    })
    .sort((a, b) => b.score - a.score || a.tile[1] - b.tile[1] || a.tile[0] - b.tile[0]);

  const used = new Set<number>();
  const plan: PlannedDeploy[] = [];
  const defs = battle.roster.map((r) => r.def);
  const meleeDefs = defs.filter((d) => d.placement === 'ground');
  const rangedDefs = defs.filter((d) => d.placement === 'high' && !d.heals);
  const medicDefs = defs.filter((d) => d.heals);

  // Blockers: first make sure every ground route has someone blocking it (defenders
  // first, at the busiest chokepoints), then add backups right next to those spots.
  const melee = [...meleeDefs].sort((a, b) => (a.cls === 'defender' ? -1 : 0) - (b.cls === 'defender' ? -1 : 0) || b.block - a.block);
  const spots: typeof groundCandidates = [];
  const primary = new Set<number>();
  const covered = new Set<number>();
  for (const def of melee) {
    const free = groundCandidates.filter((g) => !spots.includes(g));
    const uncovered = (g: (typeof free)[number]) => [...g.routeIds].filter((r) => !covered.has(r)).length;
    let pick = free
      .filter((g) => uncovered(g) > 0)
      .sort((a, b) => uncovered(b) - uncovered(a) || b.score - a.score)[0];
    let isPrimary = !!pick;
    if (!pick) {
      const backupScore = (g: (typeof free)[number]): number => {
        let best = -1;
        for (const sp of spots) {
          if (Math.abs(sp.tile[0] - g.tile[0]) + Math.abs(sp.tile[1] - g.tile[1]) !== 1) continue;
          const shared = [...g.routeIds].filter((r) => sp.routeIds.has(r)).length;
          if (shared === 0) continue;
          best = Math.max(best, shared * 100 + (g.distToBase < sp.distToBase ? 50 : 0) + g.score / 100);
        }
        return best;
      };
      pick = free.filter((g) => backupScore(g) >= 0).sort((a, b) => backupScore(b) - backupScore(a))[0] ?? free[0];
      isPrimary = false;
    }
    if (!pick) break;
    spots.push(pick);
    for (const r of pick.routeIds) covered.add(r);
    const key = tileKey(pick.tile[0], pick.tile[1]);
    used.add(key);
    if (isPrimary) primary.add(key);
    plan.push({ op: def.id, x: pick.tile[0], y: pick.tile[1], dir: pick.upstream });
  }

  const meleeTiles = plan.map((p) => ({ tile: [p.x, p.y] as Point, weight: primary.has(tileKey(p.x, p.y)) ? 3 : 1 }));
  /** How many ranged operators already cover each tile, so later ones spread out. */
  const rangedCover = new Map<number, number>();

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
        let v = 0;
        if (ground.has(key)) v += 1;
        if (def.canHitAir && air.has(key)) v += def.prioritizeAir ? 1.5 : 0.5;
        const near = meleeTiles.find((m) => chebyshev(m.tile, [x, y]) <= 1);
        if (near && ground.has(key)) v += 2 * (near.weight === 3 ? 1.5 : 1);
        s += v / (1 + (rangedCover.get(key) ?? 0));
      }
      return s;
    }, def);
    if (spot) {
      plan.push(spot);
      for (const [x, y] of rangeTiles(def.range, spot.x, spot.y, spot.dir)) {
        const key = tileKey(x, y);
        rangedCover.set(key, (rangedCover.get(key) ?? 0) + 1);
      }
    }
  }

  for (const def of medicDefs) {
    const allies = plan.map((p) => ({ tile: [p.x, p.y] as Point, weight: primary.has(tileKey(p.x, p.y)) ? 3 : 1 }));
    const spot = bestHigh((tiles) => {
      let s = 0;
      for (const [x, y] of tiles) for (const a of allies) if (a.tile[0] === x && a.tile[1] === y) s += a.weight;
      return s;
    }, def);
    if (spot) plan.push(spot);
  }

  // Order: every route's first blocker (cheapest first) so no route stays open,
  // then the usual vanguard / defender / sniper / medic order.
  const seen = new Map<string, number>();
  const prio = new Map(defs.map((d) => [d.id, 0]));
  for (const d of [...defs].sort((a, b) => a.cost - b.cost)) prio.set(d.id, priority(d, seen));
  for (const p of plan) {
    if (primary.has(tileKey(p.x, p.y))) prio.set(p.op, -1 + battle.rosterEntry(p.op)!.def.cost / 1000);
  }
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
