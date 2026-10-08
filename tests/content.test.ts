import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { idealOperators } from '../src/data/counters';
import { ENEMIES } from '../src/data/enemies';
import { LEVELS } from '../src/data/levels';
import { FULL_SQUAD } from '../src/data/levels/common';
import { OPERATORS } from '../src/data/operators';
import { en } from '../src/i18n/en';
import { pt } from '../src/i18n/pt';

const keys = (table: Record<string, string>) => new Set(Object.keys(table));

describe('content', () => {
  it('every stage, enemy, operator skill and damage tag has PT and EN text', () => {
    for (const table of [keys(pt), keys(en)]) {
      for (const level of LEVELS) expect(table.has(`level.${level.id}.name`) && table.has(`level.${level.id}.desc`), level.id).toBe(true);
      for (const id of Object.keys(ENEMIES)) expect(table.has(`enemy.${id}`) && table.has(`trait.${id}`), id).toBe(true);
      for (const op of Object.values(OPERATORS)) {
        expect(table.has(`skill.${op.skill.id}.name`), op.id).toBe(true);
        for (const tag of op.tags) expect(table.has(`tag.${tag}`), tag).toBe(true);
      }
    }
  });

  it('every enemy with a weakness or trait has an ideal counter in the full squad', () => {
    for (const enemy of Object.values(ENEMIES)) {
      if (!enemy.weak?.length && !enemy.burn) continue;
      expect(idealOperators(enemy, FULL_SQUAD).length, enemy.id).toBeGreaterThan(0);
    }
  });

  it('the art guide lists every operator, enemy and biome in use', () => {
    const guide = readFileSync('docs/ART_GUIDE.md', 'utf8');
    for (const id of Object.keys(OPERATORS)) expect(guide.includes(`\`op_${id}\``), id).toBe(true);
    for (const id of Object.keys(ENEMIES)) expect(guide.includes(`\`en_${id}\``), id).toBe(true);
    for (const biome of new Set(LEVELS.map((l) => l.biome))) expect(guide.includes(`\`${biome}\``), biome).toBe(true);
  });

  it('every stage has a 3D map image', () => {
    for (const level of LEVELS) expect(existsSync(`public/assets/maps/${level.id}.jpg`), level.id).toBe(true);
  });
});
