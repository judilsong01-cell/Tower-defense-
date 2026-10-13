// Runs the AI on every stage with the default squad and prints the result (lives lost, stars, DP spent).
// Usage: npx tsx scripts/balance-report.ts
import { LEVELS, levelLabel } from '../src/data/levels';
import { AutoDeployer } from '../src/sim/ai';
import { Battle, TICK_RATE } from '../src/sim/battle';
import { DEFAULT_SQUAD, withSquad } from '../src/game/progress';

let bad = 0;
for (const level of LEVELS) {
  const b = new Battle(withSquad(level, DEFAULT_SQUAD));
  const ai = new AutoDeployer(b);
  const kinds = new Map<number, string>();
  const leaks: string[] = [];
  while (b.result === 'running' && b.tick < TICK_RATE * 900) {
    ai.update(b);
    b.step();
    for (const ev of b.events) {
      if (ev.type === 'spawn') kinds.set(ev.uid, b.enemies.find((e) => e.uid === ev.uid)?.def.id ?? '?');
      if (ev.type === 'leak') leaks.push(`${kinds.get(ev.uid)}@${Math.round(b.tick / TICK_RATE)}s`);
    }
  }
  const enemies = level.waves.reduce((n, w) => n + w.count, 0);
  const stars = b.stars();
  if (stars < 3) bad++;
  console.log(
    `${levelLabel(level).padEnd(5)} ${level.id.padEnd(4)} ${b.result.padEnd(7)} stars ${stars}  lives ${b.lives}/${level.lives}  enemies ${String(enemies).padStart(3)}  dp ${level.startDp}+${level.dpPerSecond}/s  limit ${level.deployLimit}  t ${Math.round(b.tick / TICK_RATE)}s  ${leaks.join(' ')}`,
  );
}
console.log(`\n${bad} stages without 3 stars`);
