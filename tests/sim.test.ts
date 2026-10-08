import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';

const LEVEL_1 = LEVELS[0];
import { OPERATORS } from '../src/data/operators';
import { AutoDeployer } from '../src/sim/ai';
import { ENEMIES } from '../src/data/enemies';
import type { LevelDef } from '../src/data/types';
import { Battle, operatorDamage, physicalDamage, TICK_RATE } from '../src/sim/battle';
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
  it('there are 30 stages in 3 chapters with unique ids', () => {
    expect(LEVELS.length).toBe(30);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(30);
    expect([1, 2, 3].map((c) => LEVELS.filter((l) => l.chapter === c).length)).toEqual([10, 10, 10]);
  });

  it('every map stays within the scrollable size (max 24x13) and every stage has 2+ portals', () => {
    for (const level of LEVELS) {
      expect(level.map.length).toBeLessThanOrEqual(13);
      expect(level.map[0].length).toBeLessThanOrEqual(24);
      const portals = level.map.join('').split('').filter((c) => c === 'S' || c === 'A').length;
      expect(portals, level.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every wave uses a route of the right kind', () => {
    for (const level of LEVELS) {
      for (const wave of level.waves) {
        const route = level.routes.find((r) => r.id === wave.route)!;
        expect(!!route.flying, `${level.id} ${wave.enemy} on ${wave.route}`).toBe(ENEMIES[wave.enemy].flying);
      }
    }
  });

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

  it.each(LEVELS.map((l) => [l.id, l] as const))('%s is lost when nobody defends', (_id, level) => {
    expect(run(new Battle(level)).result).toBe('lost');
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
  // Guarantees every stage is beatable with its squad (and keeps balance changes honest).
  it.each(LEVELS.map((l) => [l.id, l] as const))('the AI clears %s', (_id, level) => {
    const b = new Battle(level);
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

/** A straight corridor: spawn on the left, base on the right, one high tile above column 3. */
function corridor(enemy: string, count = 1): LevelDef {
  return {
    id: 'test',
    chapter: 0,
    biome: 'city',
    map: ['###H#####', 'S.......B', '#########'],
    routes: [{ id: 'r', spawn: [0, 1], base: [8, 1] }],
    waves: [{ time: 1, enemy, route: 'r', count, interval: 1 }],
    lives: 10,
    startDp: 99,
    dpPerSecond: 1,
    deployLimit: 8,
    squad: ['brasa', 'faisca', 'muralha', 'bastiao', 'lirio', 'corvo', 'falcao', 'trovao'],
  };
}

describe('weaknesses', () => {
  it('a weakness ignores DEF and deals x1.5, a resistance halves damage', () => {
    expect(operatorDamage(340, ['impact'], ENEMIES.riot)).toEqual({ amount: 510, effect: 'weak' });
    expect(operatorDamage(420, ['pierce'], ENEMIES.riot).effect).toBe('resist');
    expect(operatorDamage(420, ['pierce'], ENEMIES.riot).amount).toBe(Math.round(physicalDamage(420, 300) * 0.5));
    // Falcão is both pierce and anti-air: the weakness wins over the gunship's pierce resistance.
    expect(operatorDamage(400, ['pierce', 'antiAir'], ENEMIES.gunship).effect).toBe('weak');
  });

  it('the ideal operator out-damages the wrong one', () => {
    for (const [enemy, ideal, other] of [
      ['riot', ['impact'], ['blade']],
      ['executor', ['explosive'], ['blade']],
      ['armored', ['explosive'], ['pierce']],
      ['rifleman', ['pierce'], ['impact']],
    ] as const) {
      expect(operatorDamage(400, ideal, ENEMIES[enemy]).amount).toBeGreaterThan(operatorDamage(400, other, ENEMIES[enemy]).amount);
    }
  });

  it('evasive enemies dodge half of the shots from high ground', () => {
    const b = new Battle(corridor('hound'));
    b.queue({ type: 'deploy', op: 'corvo', x: 3, y: 0, dir: 'down' });
    let hits = 0;
    let dodges = 0;
    for (let i = 0; i < TICK_RATE * 6 && b.result === 'running'; i++) {
      b.step();
      for (const e of b.events) {
        if (e.type === 'dodge') dodges++;
        if (e.type === 'enemyHit') hits++;
      }
    }
    expect(dodges).toBeGreaterThan(0);
    expect(Math.abs(dodges - hits)).toBeLessThanOrEqual(1);
  });

  it('camouflaged enemies cannot be shot until someone blocks them', () => {
    const open = new Battle(corridor('infiltrator'));
    open.queue({ type: 'deploy', op: 'corvo', x: 3, y: 0, dir: 'down' });
    run(open);
    expect(open.killed).toBe(0);

    const blocked = new Battle(corridor('infiltrator'));
    blocked.queue({ type: 'deploy', op: 'corvo', x: 3, y: 0, dir: 'down' });
    blocked.queue({ type: 'deploy', op: 'muralha', x: 3, y: 1, dir: 'left' });
    run(blocked);
    expect(blocked.killed).toBe(1);
  });

  it('fire keeps hurting until a medic heals it away', () => {
    const b = new Battle(corridor('incinerator'));
    b.queue({ type: 'deploy', op: 'muralha', x: 4, y: 1, dir: 'left' });
    let burned = false;
    for (let i = 0; i < TICK_RATE * 20 && !burned; i++) {
      b.step();
      burned = !!b.operatorById('muralha')?.burn;
    }
    expect(burned).toBe(true);
    b.queue({ type: 'deploy', op: 'lirio', x: 3, y: 0, dir: 'down' });
    let cleansed = false;
    for (let i = 0; i < TICK_RATE * 10 && !cleansed; i++) {
      b.step();
      cleansed = b.events.some((e) => e.type === 'heal') && !b.operatorById('muralha')?.burn;
    }
    expect(cleansed).toBe(true);
  });

  it('enemy medics heal their allies', () => {
    const level = corridor('peacekeeper');
    const b = new Battle({ ...level, waves: [...level.waves, { time: 1.5, enemy: 'medic', route: 'r', count: 1, interval: 0 }] });
    b.queue({ type: 'deploy', op: 'muralha', x: 5, y: 1, dir: 'left' });
    let healed = false;
    for (let i = 0; i < TICK_RATE * 30 && !healed && b.result === 'running'; i++) {
      b.step();
      healed = b.events.some((e) => e.type === 'enemyHeal');
    }
    expect(healed).toBe(true);
  });
});
