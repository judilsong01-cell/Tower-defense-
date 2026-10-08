import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { AutoDeployer } from '../src/sim/ai';
import { Battle, TICK_RATE } from '../src/sim/battle';
import { DEFAULT_SQUAD, isUnlocked, playerSquad, SQUAD_MAX, withSquad } from '../src/game/progress';

describe('stage unlocking', () => {
  it('opens only the first stage on a new save', () => {
    expect(isUnlocked(LEVELS[0].id, {})).toBe(true);
    expect(isUnlocked(LEVELS[1].id, {})).toBe(false);
  });

  it('needs 3 stars on the previous stage, across chapters too', () => {
    expect(isUnlocked('l2', { l1: { cleared: true, stars: 2 } })).toBe(false);
    expect(isUnlocked('l2', { l1: { cleared: true, stars: 3 } })).toBe(true);
    expect(isUnlocked('l11', { l10: { cleared: true, stars: 3 } })).toBe(true);
    expect(isUnlocked('nope', {})).toBe(false);
  });
});

describe('player squad', () => {
  it('falls back to the default squad and drops unknown or repeated ids', () => {
    expect(playerSquad(undefined)).toEqual([...DEFAULT_SQUAD]);
    expect(playerSquad([])).toEqual([...DEFAULT_SQUAD]);
    expect(playerSquad(['lirio', 'ghost', 'lirio', 'brasa'])).toEqual(['lirio', 'brasa']);
    expect(DEFAULT_SQUAD.length).toBeLessThanOrEqual(SQUAD_MAX);
  });

  // The default squad is what a new player takes everywhere, so the AI must clear every stage with it.
  it.each(LEVELS.map((l) => [l.id, l] as const))('the AI clears %s with the default squad', (_id, level) => {
    const b = new Battle(withSquad(level, DEFAULT_SQUAD));
    const ai = new AutoDeployer(b);
    while (b.result === 'running' && b.tick < TICK_RATE * 600) {
      ai.update(b);
      b.step();
    }
    expect(b.result).toBe('won');
  });
});
