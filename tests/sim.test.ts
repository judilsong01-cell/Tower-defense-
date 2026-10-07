import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_1 } from '../src/data/levels';
import { OPERATORS } from '../src/data/operators';
import { AutoDeployer } from '../src/sim/ai';
import { Battle, physicalDamage, TICK_RATE } from '../src/sim/battle';
import { buildRoutePath, Grid, rotateOffset } from '../src/sim/grid';
import { ReplayPlayer, ReplayRecorder } from '../src/sim/replay';

const MAX_TICKS = TICK_RATE * 60 * 10;

function run(battle: Battle, before?: (b: Battle) => void): Battle {
  while (battle.result === 'running' && battle.tick < MAX_TICKS) {
    before?.(battle);
    battle.step();
  }
  return battle;
}

describe('grid', () => {
  it('every level route is walkable from spawn to base', () => {
    for (const level of LEVELS) {
      const grid = new Grid(level.map);
      for (const route of level.routes) {
        const path = buildRoutePath(grid, route);
        expect(path[0]).toEqual(route.spawn);
        expect(path[path.length - 1]).toEqual(route.base);
      }
    }
  });

  it('rotates ranges clockwise in screen space', () => {
    expect(rotateOffset([1, 0], 'down')).toEqual([-0, 1]);
    expect(rotateOffset([1, 0], 'left')).toEqual([-1, -0]);
    expect(rotateOffset([1, 0], 'up')).toEqual([0, -1]);
  });
});

describe('battle rules', () => {
  it('damage never drops below 5% of attack', () => {
    expect(physicalDamage(100, 500)).toBe(5);
    expect(physicalDamage(500, 100)).toBe(400);
  });

  it('loses when nobody defends', () => {
    const b = run(new Battle(LEVEL_1));
    expect(b.result).toBe('lost');
  });

  it('only deploys melee on ground and ranged on high ground', () => {
    const b = new Battle(LEVEL_1);
    expect(b.canDeployAt('brasa', 4, 3)).toBe(true);
    expect(b.canDeployAt('brasa', 5, 2)).toBe(false);
    expect(b.canDeployAt('brasa', 11, 3)).toBe(false); // ground, but not deployable
    b.dp = 50;
    expect(b.canDeployAt('corvo', 5, 2)).toBe(true);
    expect(b.canDeployAt('corvo', 4, 3)).toBe(false);
  });

  it('blocks enemies and refunds half the cost on retreat', () => {
    const b = new Battle(LEVEL_1);
    b.queue({ type: 'deploy', op: 'brasa', x: 2, y: 1, dir: 'left' });
    b.step();
    expect(b.dp).toBeLessThan(1);
    for (let i = 0; i < TICK_RATE * 6; i++) b.step();
    expect(b.enemies.some((e) => e.blockedBy !== null)).toBe(true);
    const dpBefore = b.dp;
    b.queue({ type: 'retreat', op: 'brasa' });
    b.step();
    expect(b.dp).toBeGreaterThanOrEqual(dpBefore + 5);
    expect(b.rosterEntry('brasa')!.status).toBe('cooldown');
    expect(b.costOf('brasa')).toBe(15);
  });

  it('respects the deploy limit', () => {
    const b = new Battle(LEVEL_1);
    b.dp = 99;
    const spots: [string, number, number][] = [
      ['brasa', 1, 1], ['faisca', 2, 1], ['muralha', 3, 1], ['lirio', 5, 2], ['corvo', 6, 2], ['trovao', 8, 2],
    ];
    for (const [op, x, y] of spots) b.queue({ type: 'deploy', op, x, y, dir: 'right' });
    b.step();
    expect(b.deployedCount).toBe(LEVEL_1.deployLimit);
  });

  it('skills cost SP and auto-cast when enabled', () => {
    const b = new Battle(LEVEL_1);
    b.queue({ type: 'deploy', op: 'brasa', x: 4, y: 3, dir: 'left' });
    b.queue({ type: 'autoSkill', on: true });
    b.step();
    const needed = OPERATORS.brasa.skill.spCost - OPERATORS.brasa.skill.spInitial;
    for (let i = 0; i < TICK_RATE * (needed + 1); i++) b.step();
    expect(b.operatorById('brasa')!.sp).toBeLessThan(2);
  });
});

describe('auto deploy', () => {
  it('the AI clears level 1', () => {
    const b = new Battle(LEVEL_1);
    const ai = new AutoDeployer(b);
    run(b, (x) => ai.update(x));
    expect(b.result).toBe('won');
  });

  it('a recorded run replays to the exact same outcome', () => {
    const original = new Battle(LEVEL_1);
    const ai = new AutoDeployer(original);
    const rec = new ReplayRecorder(original);
    run(original, (x) => ai.update(x));
    const data = rec.toData(LEVEL_1);
    expect(data.actions.length).toBeGreaterThan(3);

    const copy = new Battle(LEVEL_1);
    const player = new ReplayPlayer(data);
    run(copy, (x) => player.update(x));
    expect(copy.result).toBe(original.result);
    expect(copy.tick).toBe(original.tick);
    expect(copy.lives).toBe(original.lives);
    expect(copy.dp).toBeCloseTo(original.dp, 6);
  });
});
