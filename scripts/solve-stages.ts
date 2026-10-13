// Finds, for each stage, a deployment plan that wins with 3 stars (no lives lost) using the
// default squad, by local search over the deterministic simulation. Results go to
// src/data/solutions.ts; a stage with no solution is reported so it can be fixed by hand.
//
// Usage: npx tsx scripts/solve-stages.ts [l1,l2,...] [--iters=4000] [--out=file.json]
// Without --out it rewrites src/data/solutions.ts (merging with the solutions already there).

import { writeFileSync } from 'node:fs';
import { LEVELS } from '../src/data/levels';
import type { Dir, LevelDef } from '../src/data/types';
import { DIRS } from '../src/data/types';
import { DEFAULT_SQUAD, withSquad } from '../src/game/progress';
import { AutoDeployer, planAutoDeploy, type PlannedDeploy } from '../src/sim/ai';
import { Battle, TICK_RATE } from '../src/sim/battle';
import { SOLUTIONS } from '../src/data/solutions';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const ids = (args.find((a) => !a.startsWith('--')) ?? LEVELS.map((l) => l.id).join(',')).split(',');
const ITERS = Number(opt('iters', '4000'));
const OUT = opt('out', '');

// Small deterministic RNG so runs are reproducible.
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

interface Result {
  score: number;
  lost: number;
  won: boolean;
}

function evaluate(level: LevelDef, plan: PlannedDeploy[]): Result {
  const b = new Battle(level);
  const ai = new AutoDeployer(b, plan);
  let deaths = 0;
  while (b.result === 'running' && b.tick < TICK_RATE * 900) {
    ai.update(b);
    b.step();
    for (const ev of b.events) if (ev.type === 'opDied') deaths++;
  }
  const lost = level.lives - b.lives;
  const won = b.result === 'won';
  return { score: (won ? 0 : 100000) + lost * 1000 + deaths * 10 + b.tick / (TICK_RATE * 60), lost, won };
}

function mutate(level: LevelDef, plan: PlannedDeploy[], tiles: { ground: [number, number][]; high: [number, number][] }, placement: Map<string, 'ground' | 'high'>): PlannedDeploy[] {
  const next = plan.map((p) => ({ ...p }));
  const n = 1 + Math.floor(rnd() * 2);
  for (let k = 0; k < n; k++) {
    const r = rnd();
    const i = Math.floor(rnd() * next.length);
    const p = next[i];
    const taken = new Set(next.filter((q) => q !== p).map((q) => `${q.x},${q.y}`));
    if (r < 0.35) {
      // Move to any free tile of the right kind.
      const pool = (placement.get(p.op) === 'ground' ? tiles.ground : tiles.high).filter(([x, y]) => !taken.has(`${x},${y}`));
      if (pool.length) {
        const [x, y] = pick(pool);
        p.x = x;
        p.y = y;
        p.dir = pick(DIRS);
      }
    } else if (r < 0.6) {
      // Nudge to a neighbouring free tile.
      const pool = (placement.get(p.op) === 'ground' ? tiles.ground : tiles.high).filter(
        ([x, y]) => Math.abs(x - p.x) + Math.abs(y - p.y) <= 2 && !taken.has(`${x},${y}`),
      );
      if (pool.length) [p.x, p.y] = pick(pool);
    } else if (r < 0.8) {
      p.dir = pick(DIRS.filter((d) => d !== p.dir)) as Dir;
    } else {
      // Change the deploy order.
      const j = Math.floor(rnd() * next.length);
      [next[i], next[j]] = [next[j], next[i]];
    }
  }
  return next;
}

function solve(base: LevelDef): { plan: PlannedDeploy[]; result: Result; evals: number } {
  const level = withSquad(base, DEFAULT_SQUAD);
  const probe = new Battle(level);
  const placement = new Map(probe.roster.map((r) => [r.def.id, r.def.placement] as const));
  const tiles = { ground: [] as [number, number][], high: [] as [number, number][] };
  for (let y = 0; y < probe.grid.height; y++) {
    for (let x = 0; x < probe.grid.width; x++) {
      if (probe.grid.deployable(x, y, 'ground')) tiles.ground.push([x, y]);
      if (probe.grid.deployable(x, y, 'high')) tiles.high.push([x, y]);
    }
  }
  const starts = [SOLUTIONS[base.id], planAutoDeploy(probe)].filter((p): p is PlannedDeploy[] => !!p);
  let best = starts[0];
  let bestR = evaluate(level, best);
  for (const s of starts.slice(1)) {
    const r = evaluate(level, s);
    if (r.score < bestR.score) [best, bestR] = [s, r];
  }
  let cur = best;
  let curR = bestR;
  let stale = 0;
  let evals = starts.length;
  for (let i = 0; i < ITERS && (bestR.lost > 0 || !bestR.won); i++) {
    const t = 400 * (1 - i / ITERS) + 5;
    const cand = mutate(level, cur, tiles, placement);
    const r = evaluate(level, cand);
    evals++;
    if (r.score <= curR.score || rnd() < Math.exp(-(r.score - curR.score) / t)) {
      cur = cand;
      curR = r;
    }
    if (r.score < bestR.score) {
      best = cand;
      bestR = r;
      stale = 0;
    } else if (++stale > 500) {
      cur = best;
      curR = bestR;
      stale = 0;
    }
  }
  return { plan: best, result: bestR, evals };
}

const found: Record<string, PlannedDeploy[]> = {};
const report: Record<string, { lost: number; won: boolean; evals: number }> = {};
for (const id of ids) {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) continue;
  const t0 = Date.now();
  const { plan, result, evals } = solve(level);
  report[id] = { lost: result.lost, won: result.won, evals };
  if (result.won && result.lost === 0) found[id] = plan;
  console.log(`${id}: ${result.won ? 'won' : 'LOST'} lives lost ${result.lost} (${evals} runs, ${Math.round((Date.now() - t0) / 1000)}s)`);
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ found, report }));
} else {
  const merged = { ...SOLUTIONS, ...found };
  const order = LEVELS.map((l) => l.id).filter((id) => merged[id]);
  const body = order
    .map((id) => `  ${id}: [\n${merged[id].map((p) => `    { op: '${p.op}', x: ${p.x}, y: ${p.y}, dir: '${p.dir}' },`).join('\n')}\n  ],`)
    .join('\n');
  writeFileSync(
    'src/data/solutions.ts',
    `// Generated by scripts/solve-stages.ts: a deployment plan per stage that clears it with 3 stars
// using the default squad. It proves every stage is beatable without losing a life, and the
// AUTO: AI mode follows it. Regenerate after changing a stage, an enemy or an operator.
import type { PlannedDeploy } from '../sim/ai';

export const SOLUTIONS: Record<string, PlannedDeploy[]> = {
${body}
};
`,
  );
}
